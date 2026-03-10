-- Creates or resets the CSV staging table used to bulk-update product detail fields.
-- Match key: (customer_id, code)
-- Target columns: other_codes, material, post_process, coating, specs, specs_net
--
-- Usage:
-- 1. Run this file to create/reset the staging table.
-- 2. Import the CSV into public.product_detail_update_stage with your SQL editor
--    or by using psql \copy.
-- 3. Run db/sql/products-detail-fields-validate.sql.
-- 4. Run db/sql/products-detail-fields-apply.sql to perform the update.

create table if not exists public.product_detail_update_stage (
  customer_id integer not null,
  code text not null,
  other_codes text,
  material text,
  post_process text,
  coating text,
  specs text,
  specs_net text
);

truncate table public.product_detail_update_stage;

comment on table public.product_detail_update_stage is
  'CSV staging table for bulk updates to products.other_codes, material, post_process, coating, specs, and specs_net.';

comment on column public.product_detail_update_stage.customer_id is
  'CSV column: customer_id';

comment on column public.product_detail_update_stage.code is
  'CSV column: code';

comment on column public.product_detail_update_stage.other_codes is
  'CSV column: other_codes';

comment on column public.product_detail_update_stage.material is
  'CSV column: material';

comment on column public.product_detail_update_stage.post_process is
  'CSV column: post_process';

comment on column public.product_detail_update_stage.coating is
  'CSV column: coating';

comment on column public.product_detail_update_stage.specs is
  'CSV column: specs';

comment on column public.product_detail_update_stage.specs_net is
  'CSV column: specs_net';

-- Optional psql import example:
-- \copy public.product_detail_update_stage (customer_id, code, other_codes, material, post_process, coating, specs, specs_net)
--   from '/absolute/path/to/products-detail-update.csv'
--   with (format csv, header true, encoding 'utf8');
