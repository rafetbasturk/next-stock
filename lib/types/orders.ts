import type {
  Currency,
  DeliveryKind,
  OrderStatus,
  Unit,
} from "@/lib/types/domain";

export type OrderTrackingDeliveryHistoryItem = {
  id: number;
  deliveryDate: string;
  deliveryNumber: string;
  deliveredQuantity: number;
  kind: DeliveryKind;
};

export type OrderTableRow = {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  status: OrderStatus;
  currency: Currency | null;
  notes: string | null;
  deliveryAddress: string | null;
  isCustomOrder: boolean | null;
  totalAmount: number;
};

export type OrderTrackingTableRow = {
  orderId: number;
  itemId: number;
  itemType: "standard" | "custom";
  productId: number | null;
  lineNumber: number;
  orderNumber: string;
  orderDate: string;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  status: OrderStatus;
  deliveryAddress: string | null;
  notes: string | null;
  materialCode: string | null;
  materialName: string;
  material: string | null;
  specs: string | null;
  specsNet: string | null;
  stockQuantity: number | null;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  currency: Currency | null;
  unit: Unit | null;
  hasShortage: boolean;
  deliveryHistory: Array<OrderTrackingDeliveryHistoryItem>;
};

export type MaterialPlanningTableRow = {
  productId: number;
  productCode: string;
  productName: string;
  stockQuantity: number;
  openOrderQuantity: number;
  purchaseQuantity: number;
  material: string | null;
  specs: string | null;
};

export type OrderDetailStandardItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  currency: Currency | null;
};

export type OrderDetailCustomItem = {
  id: number;
  name: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  currency: Currency | null;
  notes: string | null;
};

export type OrderDetail = {
  id: number;
  isCustomOrder: boolean | null;
  orderNumber: string;
  orderDate: string;
  customerId: number;
  status: OrderStatus;
  currency: Currency | null;
  deliveryAddress: string | null;
  notes: string | null;
  items: Array<OrderDetailStandardItem>;
  customItems: Array<OrderDetailCustomItem>;
};

export type OrderMutationResponse = {
  id: number;
  isCustomOrder: boolean | null;
  orderNumber: string;
  orderDate: string;
  customerId: number;
  status: OrderStatus;
  currency: Currency | null;
  deliveryAddress: string | null;
  notes: string | null;
  updatedAt: string;
};

export type MaterialPlanningMutationResponse = {
  success: true;
  orderIds: Array<number>;
};
