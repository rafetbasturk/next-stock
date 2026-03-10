import type { Rate } from "@/lib/currency";
import type { Currency } from "@/lib/types/domain";

export type { Currency } from "@/lib/types/domain";

export type MetricsFilters = {
  customerId?: number;
  year?: number;
};

export type KeyMetricsInput = {
  rates: Array<Rate>;
  filters?: MetricsFilters;
  preferredCurrency?: Currency;
  timeZone?: string;
};

export type KeyMetricsResult = {
  totalOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  pendingOrders: number;
};

export type MonthlyOverviewPoint = {
  yearMonth: string;
  monthIndex: number;
  orders: number;
  deliveries: number;
  revenue: number;
  deliveredRevenue: number;
};

export type MonthlyOverviewInput = KeyMetricsInput & {
  monthCount?: number;
};
