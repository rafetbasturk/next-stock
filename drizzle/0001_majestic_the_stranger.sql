ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_refresh_token_unique";--> statement-breakpoint
DROP INDEX "idx_custom_order_items_order_created";--> statement-breakpoint
DROP INDEX "idx_order_items_order_created";--> statement-breakpoint
DROP INDEX "idx_orders_date_customer";--> statement-breakpoint
DROP INDEX "idx_orders_number_customer_unique";--> statement-breakpoint
DROP INDEX "idx_deliveries_date_customer";--> statement-breakpoint
DROP INDEX "idx_deliveries_number_customer_unique";--> statement-breakpoint
DROP INDEX "idx_stock_movements_reference";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time_zone" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "idx_custom_order_items_order_created" ON "custom_order_items" USING btree ("order_id" int4_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_order_items_order_created" ON "order_items" USING btree ("order_id" int4_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_date_customer" ON "orders" USING btree ("order_date" timestamptz_ops,"customer_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_number_customer_unique" ON "orders" USING btree ("order_number" text_ops,"customer_id" int4_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_deliveries_date_customer" ON "deliveries" USING btree ("delivery_date" timestamptz_ops,"customer_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_deliveries_number_customer_unique" ON "deliveries" USING btree ("customer_id" int4_ops,"delivery_number" text_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_stock_movements_reference" ON "stock_movements" USING btree ("reference_type" enum_ops,"reference_id" int4_ops);