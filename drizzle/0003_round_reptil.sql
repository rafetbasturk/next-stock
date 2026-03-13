ALTER TABLE "order_items" ADD COLUMN "material_planned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "material_planned_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "material_planning_auto_promoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "material_planning_auto_promoted_by" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_material_planned_by_users_id_fk" FOREIGN KEY ("material_planned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_material_planning_auto_promoted_by_users_id_fk" FOREIGN KEY ("material_planning_auto_promoted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_items_material_planned_at" ON "order_items" USING btree ("material_planned_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_order_items_material_planned_by" ON "order_items" USING btree ("material_planned_by" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_material_planning_auto_promoted_at" ON "orders" USING btree ("material_planning_auto_promoted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_material_planning_auto_promoted_by" ON "orders" USING btree ("material_planning_auto_promoted_by" int4_ops);