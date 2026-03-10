"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { convertToCurrencyFormat } from "@/lib/currency";
import { toClientError } from "@/lib/errors/client-error";
import { useFetchMetrics } from "@/lib/queries/metrics";
import type { MetricsFilters } from "@/lib/types/metrics";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";
import { Clock, PackageCheck, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "../ui/badge";
import DashboardCard from "./dashboard-card";

type HomeKeyMetricsProps = {
  filters: MetricsFilters;
};

const KEY_METRICS_HEADING_ID = "dashboard-key-metrics-heading";

function KeyMetricCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="px-6 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <div className="flex min-h-24 flex-col gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-3 w-52" />
          <div className="mt-auto flex justify-end pt-3">
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type KeyMetricsContentProps = HomeKeyMetricsProps & {
  preferredCurrency: "TRY" | "EUR" | "USD";
  rates: ReturnType<typeof useExchangeRatesStore.getState>["rates"];
};

function KeyMetricsContent({
  filters,
  preferredCurrency,
  rates,
}: KeyMetricsContentProps) {
  const t = useTranslations("HomePage.keyMetrics");
  const { data, isLoading, isError, error, refetch } = useFetchMetrics(
    filters,
    rates,
    preferredCurrency,
  );

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KeyMetricCardSkeleton />
        <KeyMetricCardSkeleton />
        <KeyMetricCardSkeleton />
      </div>
    );
  }

  if (isError && !data) {
    const normalizedError = toClientError(error);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("errorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {normalizedError.message}
          </p>
          {normalizedError.requestId ? (
            <p className="text-muted-foreground text-xs">
              {t("supportReference", { requestId: normalizedError.requestId })}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
          >
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const deliveredRevenue = convertToCurrencyFormat({
    cents: data.deliveredRevenue,
    currency: preferredCurrency,
  });

  const totalRevenue = convertToCurrencyFormat({
    cents: data.totalRevenue,
    currency: preferredCurrency,
  });

  const openRevenue = convertToCurrencyFormat({
    cents: data.totalRevenue - data.deliveredRevenue,
    currency: preferredCurrency,
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <DashboardCard
        title={t("cards.totalRevenue.title")}
        value={totalRevenue}
        icon={Wallet}
        description={t("cards.totalRevenue.description")}
        footerRight={
          <Badge variant={"secondary"} className="font-medium tracking-wide">
            {t("cards.totalRevenue.badge", { count: data.totalOrders })}
          </Badge>
        }
      />
      <DashboardCard
        title={t("cards.deliveredRevenue.title")}
        value={deliveredRevenue}
        icon={PackageCheck}
        status="success"
        description={t("cards.deliveredRevenue.description")}
        footerRight={
          <Badge variant="secondary" className="font-medium tracking-wide">
            {t("cards.deliveredRevenue.badge", {
              count: data.totalOrders - data.pendingOrders,
            })}
          </Badge>
        }
      />
      <DashboardCard
        title={t("cards.openRevenue.title")}
        value={openRevenue}
        icon={Clock}
        status="warning"
        description={t("cards.openRevenue.description")}
        footerRight={
          <Badge variant="secondary" className="font-medium tracking-wide">
            {t("cards.openRevenue.badge", { count: data.pendingOrders })}
          </Badge>
        }
      />
    </div>
  );
}

export function KeyMetrics({ filters }: HomeKeyMetricsProps) {
  const t = useTranslations("HomePage.keyMetrics");
  const hasHydrated = useExchangeRatesStore((state) => state.hasHydrated);
  const ratesVersion = useExchangeRatesStore((state) => state.ratesVersion);
  const rates = useExchangeRatesStore((state) => state.rates);
  const preferredCurrency = useExchangeRatesStore(
    (state) => state.preferredCurrency,
  );

  if (!hasHydrated || ratesVersion === null || rates.length === 0) {
    return (
      <section aria-labelledby={KEY_METRICS_HEADING_ID} className="space-y-4">
        <h2 id={KEY_METRICS_HEADING_ID} className="sr-only">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KeyMetricCardSkeleton />
          <KeyMetricCardSkeleton />
          <KeyMetricCardSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={KEY_METRICS_HEADING_ID} className="space-y-4">
      <h2 id={KEY_METRICS_HEADING_ID} className="sr-only">
        {t("title")}
      </h2>
      <KeyMetricsContent
        filters={filters}
        preferredCurrency={preferredCurrency}
        rates={rates}
      />
    </section>
  );
}
