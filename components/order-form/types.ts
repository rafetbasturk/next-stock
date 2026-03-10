import type { Currency, OrderStatus, Unit } from "@/lib/types/domain";
import type { OrderProductOption } from "@/lib/queries/order-product-options";

export type SelectProduct = OrderProductOption;

export type OrderFormStandardItem = {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  unitPriceRaw?: string;
  currency: Currency;
};

export type OrderFormCustomItem = {
  id?: number;
  name: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  unitPriceRaw?: string;
  currency: Currency;
  notes: string;
};

export type OrderFormState = {
  isCustomOrder: boolean;
  orderNumber: string;
  orderDate: Date;
  customerId: number;
  status: OrderStatus;
  currency: Currency;
  deliveryAddress: string;
  notes: string;
  items: Array<OrderFormStandardItem>;
  customItems: Array<OrderFormCustomItem>;
};

export type OrderFormFieldErrors = Record<string, string | undefined>;

export type FormErrors = {
  get: (path: string) => string | undefined;
  set: (path: string, message: string | undefined) => void;
  clear: (path: string) => void;
  has: (path: string) => boolean;
};

export type UseOrderFormArgs = {
  order?: OrderFormSource;
  requiredErrorMessage?: string;
  invalidErrorMessage?: string;
};

type OrderFormSourceItem = {
  id?: number;
  productId?: number;
  product_id?: number;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  currency?: Currency | null;
};

type OrderFormSourceCustomItem = {
  id?: number;
  name?: string;
  unit?: Unit | string;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  currency?: Currency | null;
  notes?: string | null;
};

export type OrderFormSource = {
  isCustomOrder?: boolean | null;
  is_custom_order?: boolean | null;
  orderNumber?: string | null;
  order_number?: string | null;
  orderDate?: string | null;
  order_date?: string | null;
  customerId?: number | null;
  customer_id?: number | null;
  status?: string | null;
  currency?: Currency | null;
  deliveryAddress?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  items?: Array<OrderFormSourceItem>;
  customItems?: Array<OrderFormSourceCustomItem>;
};
