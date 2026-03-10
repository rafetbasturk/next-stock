import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { deliveryKindArray, statusArray } from "@/lib/constants";
import {
  isDeliveryKind,
  isOrderStatus,
  type OrderStatus,
} from "@/lib/types/domain";

function toObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function parseOrThrowValidationError<T>(
  schema: z.ZodType<T>,
  value: unknown,
): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid request payload.");
  }

  return parsed.data;
}

const optionalTrimmedStringSchema = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalIsoDateTimeSchema = z.preprocess((value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}, z.string().optional());

const nullableTrimmedStringSchema = z.preprocess((value) => {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const optionalPositiveIntSchema = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}, z.number().int().positive().optional());

const optionalNumberSchema = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().optional());

const optionalNonNegativeIntSchema = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.trunc(parsed));
}, z.number().int().nonnegative().optional());

const positiveIntWithFallbackSchema = (fallback: number) =>
  z.preprocess((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(0, Math.trunc(parsed));
  }, z.number().int().nonnegative())
    .transform((value) => Math.max(1, value || fallback));

const nonNegativeIntWithFallbackSchema = (fallback: number) =>
  z.preprocess((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(0, Math.trunc(parsed));
  }, z.number().int().nonnegative());

const customerInputSchema = z.object({
  code: optionalTrimmedStringSchema,
  name: optionalTrimmedStringSchema,
  email: nullableTrimmedStringSchema,
  phone: nullableTrimmedStringSchema,
  address: nullableTrimmedStringSchema,
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export function parseCustomerInput(raw: unknown): CustomerInput {
  const source = toObjectRecord(raw);

  return parseOrThrowValidationError(customerInputSchema, {
    code: source.code,
    name: source.name,
    email: source.email,
    phone: source.phone,
    address: source.address,
  });
}

const productInputSchema = z.object({
  code: optionalTrimmedStringSchema,
  name: optionalTrimmedStringSchema,
  unit: optionalTrimmedStringSchema,
  price: optionalNumberSchema,
  currency: optionalTrimmedStringSchema,
  stockQuantity: optionalNumberSchema,
  minStockLevel: optionalNumberSchema,
  otherCodes: nullableTrimmedStringSchema,
  material: nullableTrimmedStringSchema,
  postProcess: nullableTrimmedStringSchema,
  coating: nullableTrimmedStringSchema,
  specs: nullableTrimmedStringSchema,
  specsNet: nullableTrimmedStringSchema,
  notes: nullableTrimmedStringSchema,
  customerId: optionalPositiveIntSchema,
});

export type ProductInput = z.infer<typeof productInputSchema>;

export function parseProductInput(raw: unknown): ProductInput {
  const source = toObjectRecord(raw);

  return parseOrThrowValidationError(productInputSchema, {
    code: source.code,
    name: source.name,
    unit: source.unit,
    price: source.price,
    currency: source.currency,
    stockQuantity: source.stockQuantity ?? source.stock_quantity,
    minStockLevel: source.minStockLevel ?? source.min_stock_level,
    otherCodes: source.otherCodes ?? source.other_codes,
    material: source.material,
    postProcess: source.postProcess ?? source.post_process,
    coating: source.coating,
    specs: source.specs,
    specsNet: source.specsNet ?? source.specs_net,
    notes: source.notes,
    customerId: source.customerId ?? source.customer_id,
  });
}

const productStockActionSchema = z.object({
  type: z.enum(["IN", "OUT"]).optional(),
  quantity: optionalNonNegativeIntSchema,
  notes: nullableTrimmedStringSchema,
});

export type ProductStockActionInput = z.infer<typeof productStockActionSchema>;

export function parseProductStockAction(
  raw: unknown,
): ProductStockActionInput | undefined {
  if (raw == null) {
    return undefined;
  }

  return parseOrThrowValidationError(productStockActionSchema, toObjectRecord(raw));
}

const movementUpdateBodySchema = z.object({
  quantity: z.preprocess((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed === 0) {
      return undefined;
    }

    return parsed;
  }, z.number().int()),
  notes: optionalTrimmedStringSchema,
  movementType: z.enum(["IN", "OUT", "ADJUSTMENT"]).optional(),
});

export type MovementUpdateBody = z.infer<typeof movementUpdateBodySchema>;

export function parseMovementUpdateBody(raw: unknown): MovementUpdateBody {
  return parseOrThrowValidationError(movementUpdateBodySchema, toObjectRecord(raw));
}

const stockAdjustmentBodySchema = z
  .object({
    quantity: z.preprocess((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return undefined;
      }

      return Math.trunc(parsed);
    }, z.number().int()),
    notes: optionalTrimmedStringSchema,
    actionType: z.enum(["IN", "OUT", "TRANSFER"]).optional(),
    targetProductId: optionalPositiveIntSchema,
  })
  .superRefine((value, ctx) => {
    if (value.actionType === "TRANSFER") {
      if (value.quantity <= 0 || !value.targetProductId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid request payload.",
        });
      }

      return;
    }

    if ((value.actionType === "IN" || value.actionType === "OUT") && value.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid request payload.",
      });
      return;
    }

    if (value.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid request payload.",
      });
    }
  });

export type StockAdjustmentBody = {
  quantity: number;
  notes?: string;
  actionType?: "IN" | "OUT" | "TRANSFER";
  targetProductId?: number;
};

export function parseStockAdjustmentBody(raw: unknown): StockAdjustmentBody {
  const parsed = parseOrThrowValidationError(
    stockAdjustmentBodySchema,
    toObjectRecord(raw),
  );

  if (parsed.actionType === "TRANSFER") {
    return {
      quantity: parsed.quantity,
      notes: parsed.notes ?? undefined,
      actionType: "TRANSFER",
      targetProductId: parsed.targetProductId,
    };
  }

  if (parsed.actionType === "IN" || parsed.actionType === "OUT") {
    return {
      quantity: parsed.quantity,
      notes: parsed.notes ?? undefined,
      actionType: parsed.actionType,
    };
  }

  return {
    quantity: parsed.quantity,
    notes: parsed.notes ?? undefined,
  };
}

const orderItemSchema = z.object({
  productId: optionalPositiveIntSchema.transform((value) => value ?? 0),
  quantity: positiveIntWithFallbackSchema(1),
  unitPrice: nonNegativeIntWithFallbackSchema(0),
  currency: optionalTrimmedStringSchema,
});

const customOrderItemSchema = z.object({
  name: nullableTrimmedStringSchema.transform((value) => value ?? ""),
  unit: nullableTrimmedStringSchema.transform((value) => value ?? "adet"),
  quantity: positiveIntWithFallbackSchema(1),
  unitPrice: nonNegativeIntWithFallbackSchema(0),
  currency: optionalTrimmedStringSchema,
  notes: nullableTrimmedStringSchema,
});

const orderStatusSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return isOrderStatus(trimmed) ? trimmed : undefined;
}, z.enum(statusArray).optional());

const orderMutationSchema = z.object({
  isCustomOrder: z.coerce.boolean(),
  orderNumber: optionalTrimmedStringSchema,
  orderDate: optionalIsoDateTimeSchema,
  customerId: optionalPositiveIntSchema,
  status: orderStatusSchema.default("KAYIT"),
  currency: optionalTrimmedStringSchema.default("TRY"),
  deliveryAddress: nullableTrimmedStringSchema,
  notes: nullableTrimmedStringSchema,
  items: z.array(orderItemSchema),
  customItems: z.array(customOrderItemSchema),
});

export type OrderMutationInput = z.infer<typeof orderMutationSchema>;

export function parseOrderMutationInput(raw: unknown): OrderMutationInput {
  const source = toObjectRecord(raw);
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const rawCustomItems = Array.isArray(source.customItems)
    ? source.customItems
    : [];

  const parsed = parseOrThrowValidationError(orderMutationSchema, {
    isCustomOrder: source.isCustomOrder ?? source.is_custom_order,
    orderNumber: source.orderNumber ?? source.order_number,
    orderDate: source.orderDate ?? source.order_date,
    customerId: source.customerId ?? source.customer_id,
    status: source.status,
    currency: source.currency,
    deliveryAddress: source.deliveryAddress ?? source.delivery_address,
    notes: source.notes,
    items: rawItems.map((item) => {
      const row = toObjectRecord(item);
      return {
        productId: row.productId ?? row.product_id,
        quantity: row.quantity,
        unitPrice: row.unitPrice ?? row.unit_price,
        currency: row.currency,
      };
    }),
    customItems: rawCustomItems.map((item) => {
      const row = toObjectRecord(item);
      return {
        name: row.name,
        unit: row.unit,
        quantity: row.quantity,
        unitPrice: row.unitPrice ?? row.unit_price,
        currency: row.currency,
        notes: row.notes,
      };
    }),
  });

  return {
    ...parsed,
    items: parsed.items.filter((item) => item.productId > 0),
    customItems: parsed.customItems.filter((item) => item.name.trim().length > 0),
  };
}

export function parseOrderRequestedStatus(raw: unknown): OrderStatus | undefined {
  const source = toObjectRecord(raw);
  return parseOrThrowValidationError(orderStatusSchema, source.status);
}

const deliveryItemSchema = z.object({
  orderItemId: optionalPositiveIntSchema,
  customOrderItemId: optionalPositiveIntSchema,
  deliveredQuantity: optionalPositiveIntSchema.transform((value) => value ?? 0),
});

const deliveryMutationSchema = z.object({
  customerId: optionalPositiveIntSchema,
  deliveryNumber: optionalTrimmedStringSchema,
  deliveryDate: optionalIsoDateTimeSchema,
  kind: z
    .preprocess((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return isDeliveryKind(trimmed) ? trimmed : undefined;
    }, z.enum(deliveryKindArray).optional())
    .default("DELIVERY"),
  notes: nullableTrimmedStringSchema,
  items: z.array(deliveryItemSchema),
});

export type DeliveryMutationInput = z.infer<typeof deliveryMutationSchema>;

export function parseDeliveryMutationInput(raw: unknown): DeliveryMutationInput {
  const source = toObjectRecord(raw);
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const parsed = parseOrThrowValidationError(deliveryMutationSchema, {
    customerId: source.customerId ?? source.customer_id,
    deliveryNumber: source.deliveryNumber ?? source.delivery_number,
    deliveryDate: source.deliveryDate ?? source.delivery_date,
    kind: source.kind,
    notes: source.notes,
    items: rawItems.map((item) => {
      const row = toObjectRecord(item);
      return {
        orderItemId: row.orderItemId ?? row.order_item_id,
        customOrderItemId: row.customOrderItemId ?? row.custom_order_item_id,
        deliveredQuantity: row.deliveredQuantity ?? row.delivered_quantity,
      };
    }),
  });

  return {
    ...parsed,
    items: parsed.items.filter(
      (item) =>
        item.deliveredQuantity > 0 &&
        ((item.orderItemId && !item.customOrderItemId) ||
          (!item.orderItemId && item.customOrderItemId)),
    ),
  };
}
