import { KeyMetrics } from "@/components/dashboard/key-metrics";
import { MonthlyOverview } from "@/components/dashboard/monthly-overview";
import { firstParamValue } from "@/lib/search-params";
import type { MetricsFilters } from "@/lib/types/metrics";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toMonthCount(value: string | undefined): number | undefined {
  const parsed = toOptionalNumber(value);
  if (!parsed) {
    return undefined;
  }

  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const metricsFilters: MetricsFilters = {
    customerId: toOptionalNumber(
      firstParamValue(resolvedSearchParams.customerId),
    ),
    year: toOptionalNumber(firstParamValue(resolvedSearchParams.year)),
  };
  const monthCount =
    toMonthCount(firstParamValue(resolvedSearchParams.monthCount)) ?? 12;

  return (
    <div className="space-y-4">
      <KeyMetrics filters={metricsFilters} />
      <MonthlyOverview filters={metricsFilters} monthCount={monthCount} />
    </div>
  );
}
