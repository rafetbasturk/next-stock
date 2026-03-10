"use client";

import { useMemo } from "react";

import { Loader2 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { convertToCurrencyFormat } from "@/lib/currency";
import { toClientError } from "@/lib/errors/client-error";
import { useFetchMonthlyOverview } from "@/lib/queries/metrics";
import type {
  Currency,
  MetricsFilters,
  MonthlyOverviewPoint,
} from "@/lib/types/metrics";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";
import { useLocale, useTranslations } from "next-intl";

type HomeMonthlyOverviewProps = {
  filters: MetricsFilters;
  monthCount?: number;
};

const MONTHLY_OVERVIEW_HEADING_ID = "dashboard-monthly-overview-heading";

type ChartRow = MonthlyOverviewPoint & {
  monthName: string;
  fullMonthName: string;
};

type MonthlyOverviewTooltipPayloadItem = {
  dataKey?: string;
  value?: unknown;
  payload?: ChartRow;
};

type MonthlyOverviewTooltipProps = {
  active?: boolean;
  payload?: Array<MonthlyOverviewTooltipPayloadItem>;
  preferredCurrency: Currency;
};

function getMonthDate(yearMonth: string): Date | null {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function MonthlyOverviewTooltip({
  active,
  payload,
  preferredCurrency,
}: MonthlyOverviewTooltipProps) {
  const t = useTranslations("HomePage.monthlyOverview");

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) {
    return null;
  }

  const orders = toNumber(
    payload.find((entry) => entry.dataKey === "orders")?.value,
  );
  const deliveries = toNumber(
    payload.find((entry) => entry.dataKey === "deliveries")?.value,
  );
  const revenue = toNumber(
    payload.find((entry) => entry.dataKey === "revenue")?.value,
  );
  const deliveredRevenue = toNumber(
    payload.find((entry) => entry.dataKey === "deliveredRevenue")?.value,
  );

  return (
    <div className="min-w-44 rounded-md border bg-background p-3 text-xs shadow-lg md:min-w-52 md:text-sm">
      <p className="mb-2 border-b pb-1 font-semibold">{row.fullMonthName}</p>
      <div className="space-y-1.5">
        <p className="flex items-center justify-between gap-4 text-primary">
          <span>{t("labels.orders")}</span>
          <span className="font-semibold">{t("pieces", { count: orders })}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-chart-4">
          <span>{t("labels.deliveries")}</span>
          <span className="font-semibold">
            {t("pieces", { count: deliveries })}
          </span>
        </p>
        <p className="flex items-center justify-between gap-4 text-chart-2">
          <span>{t("labels.revenue")}</span>
          <span className="font-semibold">
            {convertToCurrencyFormat({
              cents: revenue,
              currency: preferredCurrency,
            })}
          </span>
        </p>
        <p className="flex items-center justify-between gap-4 text-chart-5">
          <span>{t("labels.deliveredRevenue")}</span>
          <span className="font-semibold">
            {convertToCurrencyFormat({
              cents: deliveredRevenue,
              currency: preferredCurrency,
            })}
          </span>
        </p>
      </div>
    </div>
  );
}

export function MonthlyOverview({
  filters,
  monthCount = 12,
}: HomeMonthlyOverviewProps) {
  const hasHydrated = useExchangeRatesStore((state) => state.hasHydrated);
  const ratesVersion = useExchangeRatesStore((state) => state.ratesVersion);
  const rates = useExchangeRatesStore((state) => state.rates);
  const preferredCurrency = useExchangeRatesStore(
    (state) => state.preferredCurrency,
  );

  if (!hasHydrated || ratesVersion === null || rates.length === 0) {
    return <MonthlyOverviewSkeleton />;
  }

  return (
    <MonthlyOverviewContent
      filters={filters}
      monthCount={monthCount}
      rates={rates}
      preferredCurrency={preferredCurrency}
    />
  );
}

type MonthlyOverviewContentProps = HomeMonthlyOverviewProps & {
  preferredCurrency: Currency;
  rates: ReturnType<typeof useExchangeRatesStore.getState>["rates"];
};

function MonthlyOverviewContent({
  filters,
  monthCount = 12,
  preferredCurrency,
  rates,
}: MonthlyOverviewContentProps) {
  const t = useTranslations("HomePage.monthlyOverview");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const shortMonthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
      }),
    [locale],
  );
  const longMonthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const { data, isPending, isLoading, isError, error, isFetching, refetch } =
    useFetchMonthlyOverview(filters, rates, preferredCurrency, monthCount);
  const normalizedError = isError ? toClientError(error) : null;

  const chartData = useMemo<Array<ChartRow>>(() => {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => {
      const monthDate = getMonthDate(row.yearMonth);

      return {
        ...row,
        monthName: monthDate
          ? shortMonthFormatter.format(monthDate)
          : row.yearMonth,
        fullMonthName: monthDate
          ? longMonthFormatter.format(monthDate)
          : row.yearMonth,
      };
    });
  }, [data, longMonthFormatter, shortMonthFormatter]);

  const summary = useMemo(
    () =>
      chartData.reduce(
        (acc, row) => {
          acc.orders += row.orders;
          acc.deliveries += row.deliveries;
          acc.revenue += row.revenue;
          acc.deliveredRevenue += row.deliveredRevenue;
          return acc;
        },
        {
          orders: 0,
          deliveries: 0,
          revenue: 0,
          deliveredRevenue: 0,
        },
      ),
    [chartData],
  );

  const leftBarSize = isMobile ? 12 : 24;
  const chartHeight = isMobile ? 220 : 330;

  if ((isPending || isLoading) && !data) {
    return <MonthlyOverviewSkeleton />;
  }

  if (normalizedError && !data) {
    return (
      <section aria-labelledby={MONTHLY_OVERVIEW_HEADING_ID}>
        <Card>
          <CardHeader>
            <CardTitle as="h2" id={MONTHLY_OVERVIEW_HEADING_ID} className="text-base">
              {t("title")}
            </CardTitle>
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
      </section>
    );
  }

  return (
    <section aria-labelledby={MONTHLY_OVERVIEW_HEADING_ID}>
      <Card className="gap-2 border-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle as="h2" id={MONTHLY_OVERVIEW_HEADING_ID} className="text-base">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="relative w-full min-h-80 md:min-h-96">
            {isFetching ? (
              <div className="absolute right-2 top-2 z-10 rounded-md border bg-background/85 p-1.5 backdrop-blur-sm">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {chartData.length > 0 ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  <div className="rounded-lg border bg-muted/20 p-2 md:p-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-primary/80 md:text-xs">
                      <span className="inline-block h-2 w-2 rounded-full bg-chart-1" />
                      {t("labels.orders")}
                    </p>
                    <p className="text-sm font-semibold text-primary md:text-base">
                      {summary.orders}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2 md:p-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-chart-4/80 md:text-xs">
                      <span className="inline-block h-2 w-2 rounded-full bg-chart-4" />
                      {t("labels.deliveries")}
                    </p>
                    <p className="text-sm font-semibold text-chart-4 md:text-base">
                      {summary.deliveries}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2 md:p-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-chart-2/80 md:text-xs">
                      <span className="inline-block h-2 w-2 rounded-full bg-chart-2" />
                      {t("labels.revenue")}
                    </p>
                    <p className="text-sm font-semibold text-chart-2 md:text-base">
                      {convertToCurrencyFormat({
                        cents: summary.revenue,
                        currency: preferredCurrency,
                        compact: isMobile,
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-2 md:p-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-chart-5/80 md:text-xs">
                      <span className="inline-block h-2 w-2 rounded-full bg-chart-5" />
                      {t("labels.deliveredRevenue")}
                    </p>
                    <p className="text-sm font-semibold text-chart-5 md:text-base">
                      {convertToCurrencyFormat({
                        cents: summary.deliveredRevenue,
                        currency: preferredCurrency,
                        compact: isMobile,
                      })}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <ComposedChart
                      data={chartData}
                      margin={{ left: 0, right: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-35"
                      />
                      <XAxis
                        dataKey="monthName"
                        fontSize={isMobile ? 9 : 12}
                        tickMargin={8}
                        minTickGap={isMobile ? 16 : 8}
                      />
                      <YAxis
                        yAxisId="left"
                        fontSize={isMobile ? 9 : 12}
                        width={isMobile ? 24 : 40}
                        allowDecimals={false}
                        label={
                          isMobile
                            ? undefined
                            : {
                                value: t("axes.count"),
                                angle: -90,
                                position: "insideLeft",
                                fontSize: 10,
                              }
                        }
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={isMobile ? 9 : 12}
                        width={isMobile ? 36 : 72}
                        tickFormatter={(value) =>
                          convertToCurrencyFormat({
                            cents: Number(value),
                            currency: preferredCurrency,
                            compact: true,
                            style: "decimal",
                          })
                        }
                        label={
                          isMobile
                            ? undefined
                            : {
                                value: t("axes.amount", {
                                  currency: preferredCurrency,
                                }),
                                angle: 90,
                                position: "insideRight",
                                fontSize: 10,
                              }
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                        content={
                          <MonthlyOverviewTooltip
                            preferredCurrency={preferredCurrency}
                          />
                        }
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="orders"
                        name={t("labels.orders")}
                        fill="var(--chart-1)"
                        radius={[2, 2, 0, 0]}
                        barSize={leftBarSize}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="deliveries"
                        name={t("labels.deliveries")}
                        fill="var(--chart-4)"
                        radius={[2, 2, 0, 0]}
                        barSize={leftBarSize}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        name={t("labels.revenue")}
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={isMobile ? false : { r: 3, fill: "var(--chart-2)" }}
                        activeDot={{ r: isMobile ? 4 : 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="deliveredRevenue"
                        name={t("labels.deliveredRevenue")}
                        stroke="var(--chart-5)"
                        strokeWidth={2}
                        dot={isMobile ? false : { r: 3, fill: "var(--chart-5)" }}
                        activeDot={{ r: isMobile ? 4 : 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center text-muted-foreground">
                <p>{t("empty")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MonthlyOverviewSkeleton() {
  const t = useTranslations("HomePage.monthlyOverview");
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 330;

  return (
    <section aria-labelledby={MONTHLY_OVERVIEW_HEADING_ID}>
      <Card className="gap-2 border-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle as="h2" id={MONTHLY_OVERVIEW_HEADING_ID} className="text-base">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <Skeleton className="h-17 rounded-lg" />
              <Skeleton className="h-17 rounded-lg" />
              <Skeleton className="h-17 rounded-lg" />
              <Skeleton className="h-17 rounded-lg" />
            </div>
            <Skeleton
              className="w-full rounded-xl"
              style={{ height: chartHeight }}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
