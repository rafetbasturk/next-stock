# Product Detail Field Bulk Update

This workflow bulk-updates these `products` columns from a CSV:

- `other_codes`
- `material`
- `post_process`
- `coating`
- `specs`
- `specs_net`

Match key:

- `customer_id`
- `code`

Blank CSV cells are converted to `NULL`.

## CSV format

The CSV must contain exactly these headers:

```csv
customer_id,code,other_codes,material,post_process,coating,specs,specs_net
```

## Runbook

1. Create or reset the staging table:

```sql
\i db/sql/products-detail-fields-stage.sql
```

2. Import the CSV into `public.product_detail_update_stage`.

`psql` example:

```sql
\copy public.product_detail_update_stage (customer_id, code, other_codes, material, post_process, coating, specs, specs_net)
from '/absolute/path/to/products-detail-update.csv'
with (format csv, header true, encoding 'utf8');
```

If you use a SQL editor, import the CSV into `public.product_detail_update_stage` with the same column order.

3. Validate the staged data and preview the matched updates:

```sql
\i db/sql/products-detail-fields-validate.sql
```

The validation fails fast if:

- the CSV contains duplicate `(customer_id, code)` rows
- a `customer_id` does not exist as an active customer
- a row does not match any active product
- a row matches multiple active products

4. Apply the update:

```sql
\i db/sql/products-detail-fields-apply.sql
```

5. Verify the result, then optionally drop the staging table:

```sql
drop table public.product_detail_update_stage;
```

## Notes

- Only the six target columns and `updated_at` are changed.
- `name`, `price`, `currency`, `unit`, `stock_quantity`, `min_stock_level`, and `customer_id` are untouched.
- Rows with no effective change are skipped and do not get a new `updated_at`.
- The apply script repeats the validation checks before writing, so it still fails fast if the staged data changes after preview.
