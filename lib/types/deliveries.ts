import type { Currency, DeliveryKind } from "@/lib/types/domain";

export type DeliveryTableRow = {
  id: number;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  deliveryNumber: string;
  deliveryDate: string;
  notes: string | null;
  kind: DeliveryKind;
  totalAmount: number;
  currency: Currency;
};

export type DeliveryDetailItem = {
  id: number;
  orderId: number;
  orderNumber: string;
  orderItemId: number | null;
  customOrderItemId: number | null;
  productId: number | null;
  productCode: string;
  productName: string;
  unit: string;
  price: number;
  currency: string;
  stockQuantity: number | null;
  deliveredQuantity: number;
  remainingQuantity: number;
};

export type DeliveryDetail = {
  id: number;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  deliveryNumber: string;
  deliveryDate: string;
  kind: DeliveryKind;
  notes: string | null;
  items: Array<DeliveryDetailItem>;
};
