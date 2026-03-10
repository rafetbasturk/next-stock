"use client";

import { useMemo } from "react";
import type {
  OrderFormCustomItem,
  OrderFormStandardItem,
} from "@/components/order-form/types";
import { convertToCurrencyFormat } from "@/lib/currency";
import type { Currency } from "@/lib/types/domain";

export function useOrderCalculations(
  items: Array<OrderFormStandardItem | OrderFormCustomItem>,
  currency: Currency,
) {
  const totalCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);
        return sum + quantity * unitPrice;
      }, 0),
    [items],
  );

  const formattedTotal = useMemo(
    () =>
      convertToCurrencyFormat({
        cents: totalCents,
        currency,
      }),
    [currency, totalCents],
  );

  return { totalCents, formattedTotal };
}
