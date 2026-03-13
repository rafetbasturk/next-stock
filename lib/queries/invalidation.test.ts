import assert from "node:assert/strict";
import test from "node:test";

import type { QueryKey } from "@tanstack/react-query";

import { deliveriesPaginatedQueryKeys } from "@/lib/queries/deliveries-paginated";
import { deliveryDetailQueryKeys } from "@/lib/queries/delivery-detail";
import { deliveryFilterOptionsQueryKeys } from "@/lib/queries/delivery-filter-options";
import { deliveryHistoryQueryKeys } from "@/lib/queries/delivery-history";
import { deliveryLastNumberQueryKeys } from "@/lib/queries/delivery-last-number";
import { deliveryOrderOptionsQueryKeys } from "@/lib/queries/delivery-order-options";
import {
  invalidateDeliveryCreateQueries,
  invalidateDeliveryRemoveQueries,
  invalidateDeliveryUpdateQueries,
  invalidateMaterialPlanningMutationQueries,
  invalidateMovementQueries,
  invalidateOrderCreateQueries,
  invalidateOrderRemoveQueries,
  invalidateOrderUpdateQueries,
  invalidateProductRemoveQueries,
  invalidateProductStockAdjustmentQueries,
  invalidateProductUpdateQueries,
  type QueryCacheClient,
} from "@/lib/queries/invalidation";
import { movementsPaginatedQueryKeys } from "@/lib/queries/movements-paginated";
import { orderDetailQueryKeys } from "@/lib/queries/order-detail";
import { orderFilterOptionsQueryKeys } from "@/lib/queries/order-filter-options";
import { orderHistoryQueryKeys } from "@/lib/queries/order-history";
import { orderLastNumberQueryKeys } from "@/lib/queries/order-last-number";
import { orderProductOptionsQueryKeys } from "@/lib/queries/order-product-options";
import { orderTrackingFilterOptionsQueryKeys } from "@/lib/queries/order-tracking-filter-options";
import { ordersMaterialPlanningPaginatedQueryKeys } from "@/lib/queries/orders-material-planning-paginated";
import { ordersPaginatedQueryKeys } from "@/lib/queries/orders-paginated";
import { ordersTrackingPaginatedQueryKeys } from "@/lib/queries/orders-tracking-paginated";
import { productDetailQueryKeys } from "@/lib/queries/product-detail";
import { productFilterOptionsQueryKeys } from "@/lib/queries/product-filter-options";
import { productRemovableMovementsQueryKeys } from "@/lib/queries/product-removable-movements";
import { productsPaginatedQueryKeys } from "@/lib/queries/products-paginated";
import { yearRangeQueryKeys } from "@/lib/queries/year-range";
import type { DeliveryDetail } from "@/lib/types/deliveries";

function createQueryClientSpy() {
  const invalidated: Array<QueryKey> = [];
  const seeded: Array<{ queryKey: QueryKey; data: unknown }> = [];

  return {
    invalidated,
    seeded,
    queryClient: {
      invalidateQueries: async (filters) => {
        if (filters?.queryKey) {
          invalidated.push(filters.queryKey);
        }
      },
      setQueryData: (queryKey: QueryKey, data: unknown) => {
        seeded.push({ queryKey, data });
        return data;
      },
    } as QueryCacheClient,
  };
}

function buildDeliveryDetail(): DeliveryDetail {
  return {
    id: 42,
    customerId: 7,
    customerCode: "C-007",
    customerName: "Delta",
    deliveryNumber: "DLV-2026-042",
    deliveryDate: "2026-03-08",
    kind: "DELIVERY",
    notes: "Test",
    items: [
      {
        id: 1,
        orderId: 11,
        orderNumber: "ORD-11",
        orderItemId: 101,
        customOrderItemId: null,
        productId: 1001,
        productCode: "P-1001",
        productName: "Bracket",
        unit: "PCS",
        price: 25,
        currency: "TRY",
        stockQuantity: 5,
        deliveredQuantity: 2,
        remainingQuantity: 3,
      },
      {
        id: 2,
        orderId: 11,
        orderNumber: "ORD-11",
        orderItemId: 102,
        customOrderItemId: null,
        productId: 1002,
        productCode: "P-1002",
        productName: "Frame",
        unit: "PCS",
        price: 30,
        currency: "TRY",
        stockQuantity: 6,
        deliveredQuantity: 1,
        remainingQuantity: 4,
      },
      {
        id: 3,
        orderId: 12,
        orderNumber: "ORD-12",
        orderItemId: 103,
        customOrderItemId: null,
        productId: 1003,
        productCode: "P-1003",
        productName: "Panel",
        unit: "PCS",
        price: 18,
        currency: "TRY",
        stockQuantity: 10,
        deliveredQuantity: 4,
        remainingQuantity: 0,
      },
    ],
  };
}

test("invalidateOrderCreateQueries refreshes order-tracking alongside order lists", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateOrderCreateQueries(queryClient);

  assert.deepEqual(invalidated, [
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    orderProductOptionsQueryKeys.all,
    orderLastNumberQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
  ]);
});

test("invalidateOrderUpdateQueries targets the affected order detail and history caches", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateOrderUpdateQueries(queryClient, 99);

  assert.deepEqual(invalidated, [
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    orderProductOptionsQueryKeys.all,
    orderLastNumberQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.detail(99),
    orderHistoryQueryKeys.detail(99),
  ]);
});

test("invalidateOrderRemoveQueries keeps targeted invalidation for the removed order", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateOrderRemoveQueries(queryClient, 15);

  assert.deepEqual(invalidated, [
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    orderProductOptionsQueryKeys.all,
    orderLastNumberQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.detail(15),
    orderHistoryQueryKeys.detail(15),
  ]);
});

test("invalidateDeliveryCreateQueries seeds detail cache and invalidates order-tracking", async () => {
  const detail = buildDeliveryDetail();
  const { invalidated, queryClient, seeded } = createQueryClientSpy();

  await invalidateDeliveryCreateQueries(queryClient, detail);

  assert.deepEqual(seeded, [
    {
      queryKey: deliveryDetailQueryKeys.detail(detail.id),
      data: detail,
    },
  ]);

  assert.deepEqual(invalidated, [
    deliveriesPaginatedQueryKeys.all,
    deliveryFilterOptionsQueryKeys.all,
    deliveryOrderOptionsQueryKeys.all,
    deliveryLastNumberQueryKeys.all,
    movementsPaginatedQueryKeys.all,
    productsPaginatedQueryKeys.all,
    ["stock", "integrity"],
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.detail(11),
    orderHistoryQueryKeys.detail(11),
    orderDetailQueryKeys.detail(12),
    orderHistoryQueryKeys.detail(12),
    productDetailQueryKeys.detail(1001),
    productDetailQueryKeys.detail(1002),
    productDetailQueryKeys.detail(1003),
  ]);
});

test("invalidateDeliveryUpdateQueries refreshes the specific delivery and affected orders", async () => {
  const detail = buildDeliveryDetail();
  const { invalidated, queryClient, seeded } = createQueryClientSpy();

  await invalidateDeliveryUpdateQueries(queryClient, detail, detail.id);

  assert.deepEqual(seeded, [
    {
      queryKey: deliveryDetailQueryKeys.detail(detail.id),
      data: detail,
    },
  ]);

  assert.deepEqual(invalidated, [
    deliveriesPaginatedQueryKeys.all,
    deliveryFilterOptionsQueryKeys.all,
    deliveryOrderOptionsQueryKeys.all,
    deliveryLastNumberQueryKeys.all,
    movementsPaginatedQueryKeys.all,
    productsPaginatedQueryKeys.all,
    ["stock", "integrity"],
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    deliveryDetailQueryKeys.detail(detail.id),
    deliveryHistoryQueryKeys.detail(detail.id),
    orderDetailQueryKeys.detail(11),
    orderHistoryQueryKeys.detail(11),
    orderDetailQueryKeys.detail(12),
    orderHistoryQueryKeys.detail(12),
    productDetailQueryKeys.detail(1001),
    productDetailQueryKeys.detail(1002),
    productDetailQueryKeys.detail(1003),
  ]);
});

test("invalidateDeliveryRemoveQueries invalidates specific delivery caches and broad order detail caches", async () => {
  const { invalidated, queryClient, seeded } = createQueryClientSpy();

  await invalidateDeliveryRemoveQueries(queryClient, 73);

  assert.deepEqual(seeded, []);
  assert.deepEqual(invalidated, [
    deliveriesPaginatedQueryKeys.all,
    deliveryFilterOptionsQueryKeys.all,
    deliveryOrderOptionsQueryKeys.all,
    deliveryLastNumberQueryKeys.all,
    movementsPaginatedQueryKeys.all,
    productsPaginatedQueryKeys.all,
    ["stock", "integrity"],
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    deliveryDetailQueryKeys.detail(73),
    deliveryHistoryQueryKeys.detail(73),
    productDetailQueryKeys.all,
    orderDetailQueryKeys.all,
    orderHistoryQueryKeys.all,
  ]);
});

test("invalidateProductUpdateQueries refreshes the specific product detail cache", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateProductUpdateQueries(queryClient, 21);

  assert.deepEqual(invalidated, [
    productsPaginatedQueryKeys.all,
    productFilterOptionsQueryKeys.all,
    movementsPaginatedQueryKeys.all,
    orderProductOptionsQueryKeys.all,
    productRemovableMovementsQueryKeys.all,
    ["stock", "integrity"],
    ordersMaterialPlanningPaginatedQueryKeys.all,
    productDetailQueryKeys.detail(21),
  ]);
});

test("invalidateProductRemoveQueries keeps targeted invalidation for the removed product", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateProductRemoveQueries(queryClient, 34);

  assert.deepEqual(invalidated, [
    productsPaginatedQueryKeys.all,
    productFilterOptionsQueryKeys.all,
    orderProductOptionsQueryKeys.all,
    productRemovableMovementsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    productDetailQueryKeys.detail(34),
  ]);
});

test("invalidateProductStockAdjustmentQueries refreshes product detail alongside stock-derived lists", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateProductStockAdjustmentQueries(queryClient, 55);

  assert.deepEqual(invalidated, [
    productsPaginatedQueryKeys.all,
    productFilterOptionsQueryKeys.all,
    movementsPaginatedQueryKeys.all,
    productRemovableMovementsQueryKeys.all,
    ["stock", "integrity"],
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.all,
    orderHistoryQueryKeys.all,
    productDetailQueryKeys.detail(55),
  ]);
});

test("invalidateMovementQueries refreshes movement, product, and order readiness views", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateMovementQueries(queryClient);

  assert.deepEqual(invalidated, [
    movementsPaginatedQueryKeys.all,
    productsPaginatedQueryKeys.all,
    productRemovableMovementsQueryKeys.all,
    ["stock", "integrity"],
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.all,
    orderHistoryQueryKeys.all,
  ]);
});

test("invalidateMaterialPlanningMutationQueries refreshes material planning and affected orders", async () => {
  const { invalidated, queryClient } = createQueryClientSpy();

  await invalidateMaterialPlanningMutationQueries(queryClient, [11, 12, 11]);

  assert.deepEqual(invalidated, [
    ordersPaginatedQueryKeys.all,
    orderFilterOptionsQueryKeys.all,
    yearRangeQueryKeys.all,
    ordersTrackingPaginatedQueryKeys.all,
    orderTrackingFilterOptionsQueryKeys.all,
    ordersMaterialPlanningPaginatedQueryKeys.all,
    orderDetailQueryKeys.detail(11),
    orderHistoryQueryKeys.detail(11),
    orderDetailQueryKeys.detail(12),
    orderHistoryQueryKeys.detail(12),
    orderDetailQueryKeys.detail(11),
    orderHistoryQueryKeys.detail(11),
  ]);
});
