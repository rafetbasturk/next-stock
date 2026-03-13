import {
  pgTable,
  index,
  foreignKey,
  check,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  boolean,
  bigint,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const currency = pgEnum("currency", ["TRY", "EUR", "USD"]);
export const deliveryKind = pgEnum("delivery_kind", ["DELIVERY", "RETURN"]);
export const status = pgEnum("status", [
  "KAYIT",
  "ÜRETİM",
  "KISMEN HAZIR",
  "HAZIR",
  "BİTTİ",
  "İPTAL",
]);
export const stockMovementType = pgEnum("stock_movement_type", [
  "IN",
  "OUT",
  "DELIVERY",
  "RETURN",
  "ADJUSTMENT",
  "INITIAL",
  "TRANSFER",
]);
export const stockReferenceType = pgEnum("stock_reference_type", [
  "order",
  "delivery",
  "adjustment",
  "purchase",
  "transfer",
]);
export const unit = pgEnum("unit", ["adet", "saat", "kg", "metre"]);

export const customOrderItems = pgTable(
  "custom_order_items",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    name: text().notNull(),
    unit: unit().default("adet").notNull(),
    quantity: integer().default(1).notNull(),
    unitPrice: integer("unit_price").notNull(),
    currency: currency().default("TRY").notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_custom_order_items_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_custom_order_items_order_created").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_custom_order_items_order_id").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_custom_order_items_order_id_id").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
      table.id.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "custom_order_items_order_id_orders_id_fk",
    }).onDelete("cascade"),
    check("custom_order_items_quantity_positive", sql`quantity > 0`),
    check("custom_order_items_unit_price_not_negative", sql`unit_price >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer().default(1).notNull(),
    unitPrice: integer("unit_price").notNull(),
    currency: currency().default("TRY").notNull(),
    materialPlannedAt: timestamp("material_planned_at", {
      withTimezone: true,
      mode: "string",
    }),
    materialPlannedBy: integer("material_planned_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_order_items_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_order_items_order_created").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_order_items_order_id").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_order_items_order_product").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_order_items_material_planned_at").using(
      "btree",
      table.materialPlannedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_order_items_material_planned_by").using(
      "btree",
      table.materialPlannedBy.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_order_items_product_id").using(
      "btree",
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "order_items_order_id_orders_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "order_items_product_id_products_id_fk",
    }),
    foreignKey({
      columns: [table.materialPlannedBy],
      foreignColumns: [users.id],
      name: "order_items_material_planned_by_users_id_fk",
    }),
    check("order_items_quantity_positive", sql`quantity > 0`),
    check("order_items_unit_price_not_negative", sql`unit_price >= 0`),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: serial().primaryKey().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    address: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("idx_customers_code_unique")
      .using("btree", table.code.asc().nullsLast().op("text_ops"))
      .where(sql`(deleted_at IS NULL)`),
  ],
);

export const products = pgTable(
  "products",
  {
    id: serial().primaryKey().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    unit: unit().default("adet").notNull(),
    price: integer().default(0),
    currency: currency().default("TRY").notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    minStockLevel: integer("min_stock_level").default(0).notNull(),
    otherCodes: text("other_codes"),
    material: text(),
    postProcess: text("post_process"),
    coating: text(),
    specs: text(),
    specsNet: text("specs_net"),
    notes: text(),
    customerId: integer("customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_products_coating_trgm").using(
      "gin",
      table.coating.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_code_trgm").using(
      "gin",
      table.code.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_customer").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_products_deleted").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_products_material_trgm").using(
      "gin",
      table.material.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_name_trgm").using(
      "gin",
      table.name.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_name_trgm_active")
      .using("gin", table.name.asc().nullsLast().op("gin_trgm_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("idx_products_notes_trgm").using(
      "gin",
      table.notes.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_other_codes_trgm").using(
      "gin",
      table.otherCodes.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_products_post_process_trgm").using(
      "gin",
      table.postProcess.asc().nullsLast().op("gin_trgm_ops"),
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "products_customer_id_customers_id_fk",
    }).onDelete("restrict"),
    check("products_stock_quantity_not_negative", sql`stock_quantity >= 0`),
    check("products_min_stock_not_negative", sql`min_stock_level >= 0`),
    check("products_price_not_negative", sql`price >= 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey().notNull(),
    isCustomOrder: boolean("is_custom_order").default(false),
    orderNumber: text("order_number").notNull(),
    orderDate: timestamp("order_date", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deliveryAddress: text("delivery_address"),
    customerId: integer("customer_id").notNull(),
    status: status().default("KAYIT").notNull(),
    currency: currency().default("TRY"),
    notes: text(),
    materialPlanningAutoPromotedAt: timestamp(
      "material_planning_auto_promoted_at",
      {
        withTimezone: true,
        mode: "string",
      },
    ),
    materialPlanningAutoPromotedBy: integer(
      "material_planning_auto_promoted_by",
    ),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_orders_currency").using(
      "btree",
      table.currency.asc().nullsLast().op("enum_ops"),
    ),
    index("idx_orders_customer").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_orders_date_customer").using(
      "btree",
      table.orderDate.desc().nullsFirst().op("timestamptz_ops"),
      table.customerId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_orders_deleted").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_orders_notes_trgm_active")
      .using("gin", table.notes.asc().nullsLast().op("gin_trgm_ops"))
      .where(sql`(deleted_at IS NULL)`),
    uniqueIndex("idx_orders_number_customer_unique")
      .using(
        "btree",
        table.orderNumber.asc().nullsLast().op("text_ops"),
        table.customerId.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`(deleted_at IS NULL)`),
    index("idx_orders_order_date").using(
      "btree",
      table.orderDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_orders_material_planning_auto_promoted_at").using(
      "btree",
      table.materialPlanningAutoPromotedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_orders_material_planning_auto_promoted_by").using(
      "btree",
      table.materialPlanningAutoPromotedBy.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_orders_order_number").using(
      "btree",
      table.orderNumber.asc().nullsLast().op("text_ops"),
    ),
    index("idx_orders_order_number_trgm_active")
      .using("gin", table.orderNumber.asc().nullsLast().op("gin_trgm_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("idx_orders_status").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "orders_customer_id_customers_id_fk",
    }),
    foreignKey({
      columns: [table.materialPlanningAutoPromotedBy],
      foreignColumns: [users.id],
      name: "orders_material_planning_auto_promoted_by_users_id_fk",
    }),
  ],
);

export const drizzleMigrations = pgTable("__drizzle_migrations", {
  id: serial().primaryKey().notNull(),
  hash: text().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const deliveries = pgTable(
  "deliveries",
  {
    id: serial().primaryKey().notNull(),
    customerId: integer("customer_id").notNull(),
    deliveryNumber: text("delivery_number").notNull(),
    deliveryDate: timestamp("delivery_date", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    kind: deliveryKind().default("DELIVERY").notNull(),
  },
  (table) => [
    index("idx_deliveries_customer").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_deliveries_date_customer").using(
      "btree",
      table.deliveryDate.asc().nullsLast().op("timestamptz_ops"),
      table.customerId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_deliveries_deleted").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_deliveries_delivery_date").using(
      "btree",
      table.deliveryDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_deliveries_delivery_number_trgm_active")
      .using("gin", table.deliveryNumber.asc().nullsLast().op("gin_trgm_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("idx_deliveries_kind").using(
      "btree",
      table.kind.asc().nullsLast().op("enum_ops"),
    ),
    index("idx_deliveries_notes_trgm_active")
      .using("gin", table.notes.asc().nullsLast().op("gin_trgm_ops"))
      .where(sql`(deleted_at IS NULL)`),
    uniqueIndex("idx_deliveries_number_customer_unique")
      .using(
        "btree",
        table.customerId.asc().nullsLast().op("int4_ops"),
        table.deliveryNumber.asc().nullsLast().op("text_ops"),
      )
      .where(sql`(deleted_at IS NULL)`),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "deliveries_customer_id_customers_id_fk",
    }).onDelete("restrict"),
  ],
);

export const deliveryItems = pgTable(
  "delivery_items",
  {
    id: serial().primaryKey().notNull(),
    deliveryId: integer("delivery_id").notNull(),
    orderItemId: integer("order_item_id"),
    customOrderItemId: integer("custom_order_item_id"),
    deliveredQuantity: integer("delivered_quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_delivery_items_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_delivery_items_custom_order_item_delivery").using(
      "btree",
      table.customOrderItemId.asc().nullsLast().op("int4_ops"),
      table.deliveryId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_delivery_items_custom_order_item_id").using(
      "btree",
      table.customOrderItemId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_delivery_items_delivery_id").using(
      "btree",
      table.deliveryId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_delivery_items_delivery_order_item").using(
      "btree",
      table.deliveryId.asc().nullsLast().op("int4_ops"),
      table.orderItemId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_delivery_items_order_item_delivery").using(
      "btree",
      table.orderItemId.asc().nullsLast().op("int4_ops"),
      table.deliveryId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_delivery_items_order_item_id").using(
      "btree",
      table.orderItemId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [deliveries.id],
      name: "delivery_items_delivery_id_deliveries_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orderItemId],
      foreignColumns: [orderItems.id],
      name: "delivery_items_order_item_id_order_items_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.customOrderItemId],
      foreignColumns: [customOrderItems.id],
      name: "delivery_items_custom_order_item_id_custom_order_items_id_fk",
    }).onDelete("cascade"),
    check(
      "delivery_items_exactly_one_reference",
      sql`((order_item_id IS NOT NULL) AND (custom_order_item_id IS NULL)) OR ((order_item_id IS NULL) AND (custom_order_item_id IS NOT NULL))`,
    ),
    check("delivery_items_quantity_positive", sql`delivered_quantity > 0`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    username: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text().default("user").notNull(),
    timeZone: text("time_zone"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_username_unique").using(
      "btree",
      table.username.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    refreshToken: text("refresh_token").notNull(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sessions_expires_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("sessions_last_activity_idx").using(
      "btree",
      table.lastActivityAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    uniqueIndex("sessions_refresh_token_idx").using(
      "btree",
      table.refreshToken.asc().nullsLast().op("text_ops"),
    ),
    index("sessions_user_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "sessions_user_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial().primaryKey().notNull(),
    username: text().notNull(),
    ip: text().notNull(),
    attempts: integer().default(0).notNull(),
    lockedUntil: timestamp("locked_until", {
      withTimezone: true,
      mode: "string",
    }),
    lastAttemptAt: timestamp("last_attempt_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("login_attempts_username_ip_idx").using(
      "btree",
      table.username.asc().nullsLast().op("text_ops"),
      table.ip.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial().primaryKey().notNull(),
    ip: text().notNull(),
    count: integer().default(0).notNull(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    lockedUntil: timestamp("locked_until", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("rate_limits_ip_unique").on(table.ip)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial().primaryKey().notNull(),
    productId: integer("product_id").notNull(),
    movementType: stockMovementType("movement_type").notNull(),
    quantity: integer().notNull(),
    referenceType: stockReferenceType("reference_type"),
    referenceId: integer("reference_id"),
    notes: text(),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_stock_movements_created").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_stock_movements_created_by").using(
      "btree",
      table.createdBy.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_stock_movements_product").using(
      "btree",
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_stock_movements_product_created").using(
      "btree",
      table.productId.asc().nullsLast().op("int4_ops"),
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_stock_movements_reference").using(
      "btree",
      table.referenceType.asc().nullsLast().op("enum_ops"),
      table.referenceId.asc().nullsLast().op("int4_ops"),
    ),
    index("idx_stock_movements_type").using(
      "btree",
      table.movementType.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "stock_movements_product_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "stock_movements_created_by_fkey",
    }),
    check("stock_movements_quantity_not_zero", sql`quantity <> 0`),
    check(
      "stock_movements_reference_consistency",
      sql`((reference_type IS NULL) AND (reference_id IS NULL)) OR ((reference_type IS NOT NULL) AND (reference_id IS NOT NULL))`,
    ),
  ],
);
