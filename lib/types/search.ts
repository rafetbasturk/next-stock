import { z } from "zod";

const optionalString = z
  .preprocess((v) => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? undefined : t;
  }, z.string().optional())
  .optional();

const optionalNumber = z
  .preprocess((v) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }, z.number().int().optional())
  .optional();

const optionalPositiveNumber = z
  .preprocess((v) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }, z.number().int().positive().optional())
  .optional();

const sharedSearchSchema = z.object({
  pageIndex: z.coerce.number().int().min(0).catch(0),
  pageSize: z.coerce.number().int().min(10).max(200).catch(20),
  sortDir: z.enum(["asc", "desc"]).catch("asc"),
  q: optionalString,
});

export const homeSearchSchema = z.object({
  customerId: optionalNumber,
  year: optionalNumber,
});

export type HomeSearch = z.infer<typeof homeSearchSchema>;

export const productSortFields = [
  "code",
  "name",
  "price",
  "other_codes",
  "material",
  "post_process",
  "coating",
  "customer",
] as const;

export type ProductSortField = (typeof productSortFields)[number];

export const productsSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(productSortFields).catch("code"),
  material: optionalString,
  customerId: optionalString,
});

export type ProductsSearch = z.infer<typeof productsSearchSchema>;

export const normalizeProductsSearch = (
  s: Partial<ProductsSearch>,
): ProductsSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "code",
  sortDir: s.sortDir ?? "asc",
  material: s.material || undefined,
  customerId: s.customerId || undefined,
});

export const customerSortFields = ["code", "name"] as const;

export const customersSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(customerSortFields).catch("code"),
});

export type CustomersSearch = z.infer<typeof customersSearchSchema>;

export const normalizeCustomersSearch = (
  s: Partial<CustomersSearch>,
): CustomersSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "code",
  sortDir: s.sortDir ?? "asc",
});

export const orderSortFields = [
  "order_date",
  "order_number",
  "status",
  "customer",
] as const;

export const ordersSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(orderSortFields).catch("order_date"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  status: optionalString,
  customerId: optionalString,
  startDate: optionalString,
  endDate: optionalString,
});

export type OrdersSearch = z.infer<typeof ordersSearchSchema>;

export const normalizeOrdersSearch = (
  s: Partial<OrdersSearch>,
): OrdersSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "order_date",
  sortDir: s.sortDir ?? "desc",
  status: s.status || undefined,
  customerId: s.customerId || undefined,
  startDate: s.startDate || undefined,
  endDate: s.endDate || undefined,
});

const optionalBoolean = z
  .preprocess((value) => {
    if (value == null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    return undefined;
  }, z.boolean().optional())
  .optional();

export const orderTrackingSortFields = [
  "order_date",
  "order_number",
  "line_number",
  "customer",
  "status",
  "stock",
  "ordered_quantity",
  "delivered_quantity",
  "remaining_quantity",
  "unit_price",
] as const;

export const orderTrackingSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(orderTrackingSortFields).catch("order_number"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  status: optionalString,
  customerId: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  shortageOnly: optionalBoolean,
});

export type OrderTrackingSearch = z.infer<typeof orderTrackingSearchSchema>;

export const normalizeOrderTrackingSearch = (
  s: Partial<OrderTrackingSearch>,
): OrderTrackingSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "order_number",
  sortDir: s.sortDir ?? "desc",
  status: s.status || undefined,
  customerId: s.customerId || undefined,
  startDate: s.startDate || undefined,
  endDate: s.endDate || undefined,
  shortageOnly: s.shortageOnly ?? false,
});

export const materialPlanningSortFields = [
  "product_code",
  "product_name",
  "stock",
  "open_order_quantity",
  "purchase_quantity",
  "material",
  "specs",
] as const;

export const materialPlanningDefaultStatus =
  "KAYIT|KISMEN HAZIR" as const;

export const materialPlanningSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(materialPlanningSortFields).catch("purchase_quantity"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  status: optionalString,
  customerId: optionalString,
  startDate: optionalString,
  endDate: optionalString,
});

export type MaterialPlanningSearch = z.infer<
  typeof materialPlanningSearchSchema
>;

export const normalizeMaterialPlanningSearch = (
  s: Partial<MaterialPlanningSearch>,
): MaterialPlanningSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "purchase_quantity",
  sortDir: s.sortDir ?? "desc",
  status: s.status || materialPlanningDefaultStatus,
  customerId: s.customerId || undefined,
  startDate: s.startDate || undefined,
  endDate: s.endDate || undefined,
});

export const deliveriesSortFields = [
  "delivery_number",
  "delivery_date",
  "customer",
  "kind",
] as const;

export const deliveriesSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(deliveriesSortFields).catch("delivery_date"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  kind: optionalString,
  customerId: optionalString,
  startDate: optionalString,
  endDate: optionalString,
});

export type DeliveriesSearch = z.infer<typeof deliveriesSearchSchema>;

export const normalizeDeliveriesSearch = (
  s: Partial<DeliveriesSearch>,
): DeliveriesSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "delivery_date",
  sortDir: s.sortDir ?? "desc",
  kind: s.kind || undefined,
  customerId: s.customerId || undefined,
  startDate: s.startDate || undefined,
  endDate: s.endDate || undefined,
});

export const stockMovementTypes = [
  "IN",
  "OUT",
  "DELIVERY",
  "RETURN",
  "ADJUSTMENT",
  "INITIAL",
  "TRANSFER",
] as const;

const optionalStockMovementType = z
  .preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return stockMovementTypes.includes(trimmed as (typeof stockMovementTypes)[number])
      ? trimmed
      : undefined;
  }, z.enum(stockMovementTypes).optional())
  .optional();

export const stockSearchSchema = z.object({
  pageIndex: z.coerce.number().int().min(0).catch(0),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
  q: optionalString,
  movementType: optionalStockMovementType,
  productId: optionalPositiveNumber,
});

export type StockSearch = z.infer<typeof stockSearchSchema>;

export const productDemandSortFields = [
  "avg_pieces_per_order",
  "total_pieces",
  "ordered_times",
  "last_order_date",
  "customer_code",
  "product_code",
] as const;

export const productDemandSearchSchema = z.object({
  ...sharedSearchSchema.shape,
  sortBy: z.enum(productDemandSortFields).catch("ordered_times"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  customerId: optionalString,
  startDate: optionalString,
  endDate: optionalString,
});

export type ProductDemandSearch = z.infer<typeof productDemandSearchSchema>;

export const normalizeProductDemandSearch = (
  s: Partial<ProductDemandSearch>,
): ProductDemandSearch => ({
  pageIndex: s.pageIndex ?? 0,
  pageSize: s.pageSize ?? 20,
  q: s.q || undefined,
  sortBy: s.sortBy ?? "avg_pieces_per_order",
  sortDir: s.sortDir ?? "desc",
  customerId: s.customerId || undefined,
  startDate: s.startDate || undefined,
  endDate: s.endDate || undefined,
});

export type SearchUpdates = Record<string, string | number | undefined>;
