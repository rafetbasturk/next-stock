import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { customerFilterQueryKeys } from "@/lib/queries/customer-filter-options";
import { customersPaginatedQueryKeys } from "@/lib/queries/customers-paginated";
import { deliveriesPaginatedQueryKeys } from "@/lib/queries/deliveries-paginated";
import { deliveryDetailQueryKeys } from "@/lib/queries/delivery-detail";
import { deliveryFilterOptionsQueryKeys } from "@/lib/queries/delivery-filter-options";
import { deliveryHistoryQueryKeys } from "@/lib/queries/delivery-history";
import { deliveryLastNumberQueryKeys } from "@/lib/queries/delivery-last-number";
import { deliveryOrderOptionsQueryKeys } from "@/lib/queries/delivery-order-options";
import { movementsPaginatedQueryKeys } from "@/lib/queries/movements-paginated";
import { orderDetailQueryKeys } from "@/lib/queries/order-detail";
import { orderFilterOptionsQueryKeys } from "@/lib/queries/order-filter-options";
import { orderHistoryQueryKeys } from "@/lib/queries/order-history";
import { orderLastNumberQueryKeys } from "@/lib/queries/order-last-number";
import { orderProductOptionsQueryKeys } from "@/lib/queries/order-product-options";
import { orderTrackingFilterOptionsQueryKeys } from "@/lib/queries/order-tracking-filter-options";
import { ordersPaginatedQueryKeys } from "@/lib/queries/orders-paginated";
import { ordersTrackingPaginatedQueryKeys } from "@/lib/queries/orders-tracking-paginated";
import { productDetailQueryKeys } from "@/lib/queries/product-detail";
import { productFilterOptionsQueryKeys } from "@/lib/queries/product-filter-options";
import { productRemovableMovementsQueryKeys } from "@/lib/queries/product-removable-movements";
import { productsPaginatedQueryKeys } from "@/lib/queries/products-paginated";
import { yearRangeQueryKeys } from "@/lib/queries/year-range";
import type { DeliveryDetail } from "@/lib/types/deliveries";

export type QueryCacheClient = Pick<QueryClient, "invalidateQueries" | "setQueryData">;

const stockIntegrityQueryKeys = {
  all: ["stock", "integrity"] as const,
};

const ORDER_TRACKING_QUERY_KEYS = [
  ordersTrackingPaginatedQueryKeys.all,
  orderTrackingFilterOptionsQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const ORDER_MUTATION_SHARED_QUERY_KEYS = [
  ordersPaginatedQueryKeys.all,
  orderFilterOptionsQueryKeys.all,
  orderProductOptionsQueryKeys.all,
  orderLastNumberQueryKeys.all,
  yearRangeQueryKeys.all,
  ...ORDER_TRACKING_QUERY_KEYS,
] as const satisfies ReadonlyArray<QueryKey>;

const DELIVERY_MUTATION_SHARED_QUERY_KEYS = [
  deliveriesPaginatedQueryKeys.all,
  deliveryFilterOptionsQueryKeys.all,
  deliveryOrderOptionsQueryKeys.all,
  deliveryLastNumberQueryKeys.all,
  movementsPaginatedQueryKeys.all,
  productsPaginatedQueryKeys.all,
  stockIntegrityQueryKeys.all,
  ordersPaginatedQueryKeys.all,
  orderFilterOptionsQueryKeys.all,
  yearRangeQueryKeys.all,
  ...ORDER_TRACKING_QUERY_KEYS,
] as const satisfies ReadonlyArray<QueryKey>;

const CUSTOMER_MUTATION_QUERY_KEYS = [
  customersPaginatedQueryKeys.all,
  customerFilterQueryKeys.all,
  productFilterOptionsQueryKeys.all,
  productsPaginatedQueryKeys.all,
  ordersPaginatedQueryKeys.all,
  orderFilterOptionsQueryKeys.all,
  deliveriesPaginatedQueryKeys.all,
  deliveryFilterOptionsQueryKeys.all,
  ...ORDER_TRACKING_QUERY_KEYS,
] as const satisfies ReadonlyArray<QueryKey>;

const PRODUCT_CREATE_QUERY_KEYS = [
  productsPaginatedQueryKeys.all,
  productFilterOptionsQueryKeys.all,
  orderProductOptionsQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const PRODUCT_UPDATE_QUERY_KEYS = [
  productsPaginatedQueryKeys.all,
  productFilterOptionsQueryKeys.all,
  movementsPaginatedQueryKeys.all,
  orderProductOptionsQueryKeys.all,
  productRemovableMovementsQueryKeys.all,
  stockIntegrityQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const PRODUCT_REMOVE_QUERY_KEYS = [
  productsPaginatedQueryKeys.all,
  productFilterOptionsQueryKeys.all,
  orderProductOptionsQueryKeys.all,
  productRemovableMovementsQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const PRODUCT_STOCK_ADJUSTMENT_QUERY_KEYS = [
  productsPaginatedQueryKeys.all,
  productFilterOptionsQueryKeys.all,
  movementsPaginatedQueryKeys.all,
  productRemovableMovementsQueryKeys.all,
  stockIntegrityQueryKeys.all,
  ordersPaginatedQueryKeys.all,
  orderFilterOptionsQueryKeys.all,
  ...ORDER_TRACKING_QUERY_KEYS,
  orderDetailQueryKeys.all,
  orderHistoryQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const MOVEMENT_MUTATION_QUERY_KEYS = [
  movementsPaginatedQueryKeys.all,
  productsPaginatedQueryKeys.all,
  productRemovableMovementsQueryKeys.all,
  stockIntegrityQueryKeys.all,
  ordersPaginatedQueryKeys.all,
  orderFilterOptionsQueryKeys.all,
  ...ORDER_TRACKING_QUERY_KEYS,
  orderDetailQueryKeys.all,
  orderHistoryQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

const STOCK_INTEGRITY_MUTATION_QUERY_KEYS = [
  stockIntegrityQueryKeys.all,
  productsPaginatedQueryKeys.all,
  movementsPaginatedQueryKeys.all,
  productRemovableMovementsQueryKeys.all,
] as const satisfies ReadonlyArray<QueryKey>;

async function invalidateQueryKeys(
  queryClient: QueryCacheClient,
  queryKeys: ReadonlyArray<QueryKey>,
) {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
}

function isPositiveId(value: number | null | undefined): value is number {
  return typeof value === "number" && value > 0;
}

function uniqueOrderIdsFromDeliveryDetail(detail: DeliveryDetail | null): Array<number> {
  if (!detail) {
    return [];
  }

  return [...new Set(detail.items.map((item) => item.orderId).filter(isPositiveId))];
}

function uniqueProductIdsFromDeliveryDetail(detail: DeliveryDetail | null): Array<number> {
  if (!detail) {
    return [];
  }

  return [...new Set(detail.items.map((item) => item.productId).filter(isPositiveId))];
}

function seedDeliveryDetailCache(
  queryClient: QueryCacheClient,
  detail: DeliveryDetail | null,
) {
  if (!detail) {
    return;
  }

  queryClient.setQueryData(deliveryDetailQueryKeys.detail(detail.id), detail);
}

function buildOrderDetailQueryKeys(orderIds: ReadonlyArray<number>): Array<QueryKey> {
  return orderIds.flatMap((orderId) => [
    orderDetailQueryKeys.detail(orderId),
    orderHistoryQueryKeys.detail(orderId),
  ]);
}

function buildProductDetailQueryKeys(productIds: ReadonlyArray<number>): Array<QueryKey> {
  return productIds.map((productId) => productDetailQueryKeys.detail(productId));
}

export async function invalidateOrderCreateQueries(queryClient: QueryCacheClient) {
  await invalidateQueryKeys(queryClient, ORDER_MUTATION_SHARED_QUERY_KEYS);
}

export async function invalidateOrderUpdateQueries(
  queryClient: QueryCacheClient,
  orderId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...ORDER_MUTATION_SHARED_QUERY_KEYS,
    orderDetailQueryKeys.detail(orderId),
    orderHistoryQueryKeys.detail(orderId),
  ]);
}

export async function invalidateOrderRemoveQueries(
  queryClient: QueryCacheClient,
  orderId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...ORDER_MUTATION_SHARED_QUERY_KEYS,
    orderDetailQueryKeys.detail(orderId),
    orderHistoryQueryKeys.detail(orderId),
  ]);
}

export async function invalidateDeliveryCreateQueries(
  queryClient: QueryCacheClient,
  detail: DeliveryDetail | null,
) {
  seedDeliveryDetailCache(queryClient, detail);

  await invalidateQueryKeys(queryClient, [
    ...DELIVERY_MUTATION_SHARED_QUERY_KEYS,
    ...buildOrderDetailQueryKeys(uniqueOrderIdsFromDeliveryDetail(detail)),
    ...buildProductDetailQueryKeys(uniqueProductIdsFromDeliveryDetail(detail)),
  ]);
}

export async function invalidateDeliveryUpdateQueries(
  queryClient: QueryCacheClient,
  detail: DeliveryDetail | null,
  deliveryId: number,
) {
  seedDeliveryDetailCache(queryClient, detail);

  await invalidateQueryKeys(queryClient, [
    ...DELIVERY_MUTATION_SHARED_QUERY_KEYS,
    deliveryDetailQueryKeys.detail(deliveryId),
    deliveryHistoryQueryKeys.detail(deliveryId),
    ...buildOrderDetailQueryKeys(uniqueOrderIdsFromDeliveryDetail(detail)),
    ...buildProductDetailQueryKeys(uniqueProductIdsFromDeliveryDetail(detail)),
  ]);
}

export async function invalidateDeliveryRemoveQueries(
  queryClient: QueryCacheClient,
  deliveryId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...DELIVERY_MUTATION_SHARED_QUERY_KEYS,
    deliveryDetailQueryKeys.detail(deliveryId),
    deliveryHistoryQueryKeys.detail(deliveryId),
    productDetailQueryKeys.all,
    orderDetailQueryKeys.all,
    orderHistoryQueryKeys.all,
  ]);
}

export async function invalidateCustomerQueries(queryClient: QueryCacheClient) {
  await invalidateQueryKeys(queryClient, CUSTOMER_MUTATION_QUERY_KEYS);
}

export async function invalidateProductCreateQueries(queryClient: QueryCacheClient) {
  await invalidateQueryKeys(queryClient, PRODUCT_CREATE_QUERY_KEYS);
}

export async function invalidateProductUpdateQueries(
  queryClient: QueryCacheClient,
  productId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...PRODUCT_UPDATE_QUERY_KEYS,
    productDetailQueryKeys.detail(productId),
  ]);
}

export async function invalidateProductRemoveQueries(
  queryClient: QueryCacheClient,
  productId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...PRODUCT_REMOVE_QUERY_KEYS,
    productDetailQueryKeys.detail(productId),
  ]);
}

export async function invalidateProductStockAdjustmentQueries(
  queryClient: QueryCacheClient,
  productId: number,
) {
  await invalidateQueryKeys(queryClient, [
    ...PRODUCT_STOCK_ADJUSTMENT_QUERY_KEYS,
    productDetailQueryKeys.detail(productId),
  ]);
}

export async function invalidateMovementQueries(queryClient: QueryCacheClient) {
  await invalidateQueryKeys(queryClient, MOVEMENT_MUTATION_QUERY_KEYS);
}

export async function invalidateStockIntegrityQueries(queryClient: QueryCacheClient) {
  await invalidateQueryKeys(queryClient, STOCK_INTEGRITY_MUTATION_QUERY_KEYS);
}
