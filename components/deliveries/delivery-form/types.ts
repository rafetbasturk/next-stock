import type { Currency, DeliveryKind, Unit } from "@/lib/types/domain";

export type DeliveryFormKind = DeliveryKind;

export type DeliveryFormDeliveryRef = {
  id: number;
  deliveredQuantity: number;
  delivery: {
    kind: DeliveryFormKind;
  };
};

export type DeliveryFormOrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  currency: Currency;
  stockQuantity?: number | null;
  product: {
    code: string;
    name: string;
  };
  deliveries?: Array<DeliveryFormDeliveryRef>;
};

export type DeliveryFormCustomOrderItem = {
  id: number;
  name: string;
  customCode?: string | null;
  customName?: string | null;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  currency: Currency;
  notes?: string | null;
  deliveries?: Array<DeliveryFormDeliveryRef>;
};

export type DeliveryFormOrderOption = {
  id: number;
  orderNumber: string;
  customerId: number;
  items: Array<DeliveryFormOrderItem>;
  customItems: Array<DeliveryFormCustomOrderItem>;
};

export type DeliveryFormItem = {
  orderId: number | null;
  orderItemId: number | null;
  customOrderItemId: number | null;
  productId?: number | null;
  productCode: string;
  productName: string;
  unit: Unit;
  price: number;
  currency: Currency;
  stockQuantity?: number | null;
  remainingQuantity: number;
  deliveredQuantity: number;
};

export type DeliveryFormState = {
  customerId: number | null;
  deliveryNumber: string;
  kind: DeliveryFormKind;
  notes: string;
  deliveryDate: Date;
  items: Array<DeliveryFormItem>;
};

export type DeliveryFormFieldErrors = Record<string, string | undefined>;
