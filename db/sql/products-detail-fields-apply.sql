-- Applies the staged CSV update after db/sql/products-detail-fields-stage.sql
-- has been run, the CSV has been imported, and validation has passed.
--
-- Blank strings from the CSV are converted to NULL via NULLIF(..., '').
-- Only the six requested columns plus updated_at are changed.

begin;

do $$
declare
  stage_row_count integer;
  duplicate_count integer;
  missing_customer_count integer;
  unmatched_product_count integer;
  ambiguous_match_count integer;
begin
  select count(*)
  into stage_row_count
  from public.product_detail_update_stage;

  if stage_row_count = 0 then
    raise exception
      'Apply aborted: public.product_detail_update_stage is empty. Import the CSV first.';
  end if;

  select count(*)
  into duplicate_count
  from (
    select s.customer_id, s.code
    from public.product_detail_update_stage s
    group by s.customer_id, s.code
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Apply aborted: found % duplicate (customer_id, code) rows in public.product_detail_update_stage.',
      duplicate_count;
  end if;

  select count(*)
  into missing_customer_count
  from public.product_detail_update_stage s
  left join public.customers c
    on c.id = s.customer_id
   and c.deleted_at is null
  where c.id is null;

  if missing_customer_count > 0 then
    raise exception
      'Apply aborted: found % rows with customer_id values that do not exist as active customers.',
      missing_customer_count;
  end if;

  select count(*)
  into unmatched_product_count
  from (
    select s.customer_id, s.code
    from public.product_detail_update_stage s
    left join public.products p
      on p.customer_id = s.customer_id
     and p.code = s.code
     and p.deleted_at is null
    group by s.customer_id, s.code
    having count(p.id) = 0
  ) unmatched;

  if unmatched_product_count > 0 then
    raise exception
      'Apply aborted: found % rows that do not match any active product by (customer_id, code).',
      unmatched_product_count;
  end if;

  select count(*)
  into ambiguous_match_count
  from (
    select s.customer_id, s.code
    from public.product_detail_update_stage s
    join public.products p
      on p.customer_id = s.customer_id
     and p.code = s.code
     and p.deleted_at is null
    group by s.customer_id, s.code
    having count(p.id) > 1
  ) ambiguous;

  if ambiguous_match_count > 0 then
    raise exception
      'Apply aborted: found % rows that match multiple active products by (customer_id, code).',
      ambiguous_match_count;
  end if;
end $$;

with staged_updates as (
  select
    p.id,
    nullif(s.other_codes, '') as other_codes,
    nullif(s.material, '') as material,
    nullif(s.post_process, '') as post_process,
    nullif(s.coating, '') as coating,
    nullif(s.specs, '') as specs,
    nullif(s.specs_net, '') as specs_net
  from public.product_detail_update_stage s
  join public.products p
    on p.customer_id = s.customer_id
   and p.code = s.code
   and p.deleted_at is null
),
updated_rows as (
  update public.products p
  set
    other_codes = s.other_codes,
    material = s.material,
    post_process = s.post_process,
    coating = s.coating,
    specs = s.specs,
    specs_net = s.specs_net,
    updated_at = now()
  from staged_updates s
  where p.id = s.id
    and (
      p.other_codes is distinct from s.other_codes
      or p.material is distinct from s.material
      or p.post_process is distinct from s.post_process
      or p.coating is distinct from s.coating
      or p.specs is distinct from s.specs
      or p.specs_net is distinct from s.specs_net
    )
  returning p.id, p.customer_id, p.code
)
select
  (select count(*) from public.product_detail_update_stage) as staged_rows,
  (select count(*) from staged_updates) as matched_rows,
  (select count(*) from updated_rows) as changed_rows;

commit;

-- Drop the staging table only after you verify the result:
-- drop table public.product_detail_update_stage;
