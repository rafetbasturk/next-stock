-- Validates the staged CSV and previews the matched updates.
-- Run this after importing CSV rows into public.product_detail_update_stage.

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
      'Validation failed: public.product_detail_update_stage is empty. Import the CSV first.';
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
      'CSV validation failed: found % duplicate (customer_id, code) rows in public.product_detail_update_stage.',
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
      'CSV validation failed: found % rows with customer_id values that do not exist as active customers.',
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
      'CSV validation failed: found % rows that do not match any active product by (customer_id, code).',
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
      'CSV validation failed: found % rows that match multiple active products by (customer_id, code).',
      ambiguous_match_count;
  end if;
end $$;

select
  p.id as product_id,
  p.customer_id,
  p.code,
  p.other_codes as current_other_codes,
  nullif(s.other_codes, '') as next_other_codes,
  p.material as current_material,
  nullif(s.material, '') as next_material,
  p.post_process as current_post_process,
  nullif(s.post_process, '') as next_post_process,
  p.coating as current_coating,
  nullif(s.coating, '') as next_coating,
  p.specs as current_specs,
  nullif(s.specs, '') as next_specs,
  p.specs_net as current_specs_net,
  nullif(s.specs_net, '') as next_specs_net
from public.product_detail_update_stage s
join public.products p
  on p.customer_id = s.customer_id
 and p.code = s.code
 and p.deleted_at is null
order by p.customer_id, p.code, p.id;
