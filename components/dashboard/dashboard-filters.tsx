import { useYearRange } from "@/lib/queries/year-range";
import { HomeSearch } from "@/lib/types/search";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { FunnelIcon } from "lucide-react";
import CustomerInput from "../form/customer-input";
import EntitySelect from "../form/entity-select";
import { toClientError } from "@/lib/errors/client-error";

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type DashboardFiltersContentProps = {
  activeFilters: HomeSearch;
  draftFilters: HomeSearch;
  setDraftFilters: React.Dispatch<React.SetStateAction<HomeSearch>>;
  searchParams: ReturnType<typeof useSearchParams>;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
};

function DashboardFiltersContent({
  activeFilters,
  draftFilters,
  setDraftFilters,
  searchParams,
  pathname,
  router,
  onClose,
}: DashboardFiltersContentProps) {
  const t = useTranslations("HomePage.filters");
  const { data: yearRange, isError, error } = useYearRange();
  const hasDraftFilters =
    draftFilters.customerId !== undefined || draftFilters.year !== undefined;
  const hasActiveFilters =
    activeFilters.customerId !== undefined || activeFilters.year !== undefined;
  const hasFilterChanges =
    draftFilters.customerId !== activeFilters.customerId ||
    draftFilters.year !== activeFilters.year;
  const canClear = hasDraftFilters || hasActiveFilters;
  const canApply = hasFilterChanges && (hasDraftFilters || hasActiveFilters);

  const years = useMemo(() => {
    if (!yearRange) {
      return [] as Array<string>;
    }

    const minYear = Math.min(yearRange.minYear, yearRange.maxYear);
    const maxYear = Math.max(yearRange.minYear, yearRange.maxYear);

    return Array.from(
      { length: Math.max(1, maxYear - minYear + 1) },
      (_, index) => String(maxYear - index),
    );
  }, [yearRange]);

  const yearOptions = useMemo(
    () => [
      { id: "all", label: t("allYears"), value: "" },
      ...years.map((year) => ({
        id: year,
        label: year,
        value: year,
      })),
    ],
    [t, years],
  );

  const applyFilters = (filters: HomeSearch) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.customerId === undefined) {
      params.delete("customerId");
    } else {
      params.set("customerId", String(filters.customerId));
    }

    if (filters.year === undefined) {
      params.delete("year");
    } else {
      params.set("year", String(filters.year));
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.replace(nextUrl, { scroll: false });
  };

  const parseYear = (val: string | number | null) => {
    if (!val || val === "all") {
      return undefined;
    }

    const parsed = typeof val === "number" ? val : Number(val);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return (
    <SheetContent side="right" className="w-[92%] sm:w-105 p-2 md:p-4">
      <SheetHeader>
        <SheetTitle>{t("title")}</SheetTitle>
      </SheetHeader>
      <div className="h-full flex flex-col gap-6 justify-between">
        <div className="space-y-4">
          <CustomerInput
            value={draftFilters.customerId ?? null}
            onValueChange={(customerId) =>
              setDraftFilters((prev) => ({
                ...prev,
                customerId: customerId ?? undefined,
              }))
            }
            includeAllOption
            distinct
            allOptionLabel={t("allCustomers")}
            placeholder={t("allCustomers")}
          />
          <EntitySelect
            value={draftFilters.year ? String(draftFilters.year) : ""}
            onValueChange={(yearValue) =>
              setDraftFilters((prev) => ({
                ...prev,
                year: parseYear(yearValue),
              }))
            }
            options={yearOptions}
            placeholder={t("allYears")}
          />
          {isError ? (
            <p className="text-destructive text-sm">
              {toClientError(error).message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 p-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canClear}
            onClick={() => {
              const cleared: HomeSearch = {
                customerId: undefined,
                year: undefined,
              };
              setDraftFilters(cleared);
              applyFilters(cleared);
              onClose();
            }}
          >
            {t("clear")}
          </Button>
          <Button
            type="button"
            disabled={!canApply}
            onClick={() => {
              applyFilters(draftFilters);
              onClose();
            }}
          >
            {t("apply")}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

export function DashboardFilters() {
  const t = useTranslations("HomePage.filters");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HomeSearch>({});

  const activeFilters = useMemo<HomeSearch>(
    () => ({
      customerId: parseOptionalNumber(searchParams.get("customerId")),
      year: parseOptionalNumber(searchParams.get("year")),
    }),
    [searchParams],
  );

  const hasActiveFilters =
    activeFilters.customerId !== undefined || activeFilters.year !== undefined;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftFilters(activeFilters);
    }
    setOpen(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
          />
        }
      >
        <FunnelIcon />
        <span className="hidden sm:inline">{t("trigger")}</span>
      </SheetTrigger>
      {open ? (
        <DashboardFiltersContent
          activeFilters={activeFilters}
          draftFilters={draftFilters}
          setDraftFilters={setDraftFilters}
          searchParams={searchParams}
          pathname={pathname}
          router={router}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Sheet>
  );
}
