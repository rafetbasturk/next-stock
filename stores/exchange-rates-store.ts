// src/stores/exchange-rates-store.ts
import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { shallow } from "zustand/shallow";

import { createSelectors } from "./utils";
import type { Rate } from "@/lib/currency";
import { toClientError } from "@/lib/errors/client-error";
import { isCurrency, type Currency } from "@/lib/types/domain";
import {
  fallbackRates,
  fetchRatesForCurrency,
  shouldUpdateRates,
  transformRates,
} from "@/lib/currency";

type ExchangeRatesError = {
  code: string;
  message: string;
  requestId?: string;
};

type ExchangeRatesState = {
  rates: Array<Rate>;
  fetchedAt: number | null;
  ratesBase: Currency | null;
  ratesVersion: string | null;
  isLoading: boolean;
  error: ExchangeRatesError | null;
  preferredCurrency: Currency;
  hasHydrated: boolean;
};

type ExchangeRatesActions = {
  fetchExchangeRates: (base?: Currency, force?: boolean) => Promise<void>;
  getRatesFor: (currency: Currency) => Record<string, number>;
  setPreferredCurrency: (currency: Currency) => Promise<void>;
  setHasHydrated: (v: boolean) => void;
};

const initialState: ExchangeRatesState = {
  rates: fallbackRates,
  fetchedAt: null,
  ratesBase: null,
  ratesVersion: null,
  isLoading: false,
  error: null,
  preferredCurrency: "TRY",
  hasHydrated: false,
};

// SSR-safe storage
const storage = createJSONStorage(() => {
  if (typeof window !== "undefined") return localStorage;
  const serverStorage: StateStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  return serverStorage;
});

const baseStore = createWithEqualityFn<
  ExchangeRatesState & ExchangeRatesActions
>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      fetchExchangeRates: async (base?: Currency, force = false) => {
        const { fetchedAt, preferredCurrency, isLoading } = get();
        const targetBase = base ?? preferredCurrency;

        if (isLoading) return;
        if (!force && !shouldUpdateRates(fetchedAt)) return;

        set({ isLoading: true, error: null });

        try {
          const snapshot = await fetchRatesForCurrency(targetBase);
          const filteredRates = snapshot.rates.filter((rate) =>
            isCurrency(rate.targetCurrency),
          );

          set({
            rates: filteredRates,
            preferredCurrency: targetBase,
            fetchedAt: snapshot.fetchedAt,
            ratesBase: snapshot.base,
            ratesVersion: snapshot.version,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const clientError = toClientError(err);
          set({
            isLoading: false,
            error: {
              code: clientError.code,
              message: clientError.message,
              requestId: clientError.requestId,
            },
          });
        }
      },

      getRatesFor: (currency: Currency) => {
        const { rates } = get();
        return transformRates(rates, currency);
      },

      setPreferredCurrency: async (currency: Currency) => {
        const { preferredCurrency } = get();
        if (currency === preferredCurrency) return;

        set({ isLoading: true, error: null });

        try {
          const snapshot = await fetchRatesForCurrency(currency);
          const filteredRates = snapshot.rates.filter((rate) =>
            isCurrency(rate.targetCurrency),
          );

          set({
            preferredCurrency: currency,
            rates: filteredRates,
            fetchedAt: snapshot.fetchedAt,
            ratesBase: snapshot.base,
            ratesVersion: snapshot.version,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const clientError = toClientError(err);
          set({
            isLoading: false,
            error: {
              code: clientError.code,
              message: clientError.message,
              requestId: clientError.requestId,
            },
          });
        }
      },
    }),
    {
      name: "exchange-rates-storage",
      storage,
      partialize: (state) => ({
        rates: state.rates,
        fetchedAt: state.fetchedAt,
        ratesBase: state.ratesBase,
        ratesVersion: state.ratesVersion,
        preferredCurrency: state.preferredCurrency,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  ),
  shallow
);

// Export BOTH: (1) hook selectors, (2) base store for imperative bootstrap if needed
export const exchangeRatesStore = baseStore;
export const useExchangeRatesStore = createSelectors(baseStore);
