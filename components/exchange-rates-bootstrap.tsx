"use client";

import { useEffect } from "react";

import { useExchangeRatesStore } from "@/stores/exchange-rates-store";

export function ExchangeRatesBootstrap() {
  const hasHydrated = useExchangeRatesStore((state) => state.hasHydrated);
  const fetchExchangeRates = useExchangeRatesStore(
    (state) => state.fetchExchangeRates,
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    void fetchExchangeRates();
  }, [fetchExchangeRates, hasHydrated]);

  return null;
}
