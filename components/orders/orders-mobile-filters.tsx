"use client";

import { useCallback, useMemo, useState } from "react";
import { FunnelIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { MultiSelectFilter } from "@/components/form/multi-select-filter";
import { DateRangeFilter } from "@/components/daterange-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOrdersSearchNavigation } from "@/hooks/use-orders-search-navigation";
import { useOrderFilterOptions } from "@/lib/queries/order-filter-options";
import type { OrdersSearch } from "@/lib/types/search";
import { cn } from "@/lib/utils";

type OrdersMobileFiltersProps = {
  search: OrdersSearch;
};

const ORDER_STATUS_FALLBACK_VALUES = [
  "KAYIT",
  "ÜRETİM",
  "KISMEN HAZIR",
  "HAZIR",
  "BİTTİ",
  "İPTAL",
] as const;

function parseList(value: string | undefined): Array<string> {
  if (!value) return [];

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function areListsEqual(left: Array<string>, right: Array<string>): boolean {
  if (left.length !== right.length) return false;

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

export function OrdersMobileFilters({ search }: OrdersMobileFiltersProps) {
  const tApp = useTranslations("App");
  const tTable = useTranslations("Table.filters");
  const tOrders = useTranslations("OrdersTable");
  const navigate = useOrdersSearchNavigation(search);
  const { data: filterOptions } = useOrderFilterOptions();
  const [open, setOpen] = useState(false);

  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const [selectedStatuses, setSelectedStatuses] = useState<Array<string>>(
    parseList(search.status),
  );
  const [selectedCustomers, setSelectedCustomers] = useState<Array<string>>(
    parseList(search.customerId),
  );
  const [startDateDraft, setStartDateDraft] = useState(search.startDate ?? "");
  const [endDateDraft, setEndDateDraft] = useState(search.endDate ?? "");

  const getStatusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case "KAYIT":
          return tOrders("status.KAYIT");
        case "ÜRETİM":
          return tOrders("status.ÜRETİM");
        case "KISMEN HAZIR":
          return tOrders("status.KISMEN_HAZIR");
        case "HAZIR":
          return tOrders("status.HAZIR");
        case "BİTTİ":
          return tOrders("status.BİTTİ");
        case "İPTAL":
          return tOrders("status.İPTAL");
        default:
          return status;
      }
    },
    [tOrders],
  );

  const statusOptions = useMemo(
    () =>
      (filterOptions?.statuses?.length
        ? filterOptions.statuses
        : ORDER_STATUS_FALLBACK_VALUES
      ).map((value) => ({
        value,
        label: getStatusLabel(value),
      })),
    [filterOptions?.statuses, getStatusLabel],
  );

  const customerOptions = useMemo(
    () =>
      (filterOptions?.customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: customer.name,
      })),
    [filterOptions?.customers],
  );

  const showCustomerFilter = customerOptions.length > 1;
  const hasActiveFilters = Boolean(
    search.q?.trim() ||
    search.status ||
    search.customerId ||
    search.startDate ||
    search.endDate,
  );
  const filterButtonClassName =
    "border-muted bg-background font-normal text-muted-foreground hover:bg-muted hover:text-foreground";

  const hasDraftChanges = useMemo(() => {
    const currentSearch = search.q?.trim() ?? "";
    const currentStatuses = parseList(search.status);
    const currentCustomers = parseList(search.customerId);
    const currentStartDate = search.startDate ?? "";
    const currentEndDate = search.endDate ?? "";

    if (searchDraft.trim() !== currentSearch) return true;
    if (!areListsEqual(selectedStatuses, currentStatuses)) return true;
    if (
      showCustomerFilter &&
      !areListsEqual(selectedCustomers, currentCustomers)
    ) {
      return true;
    }
    if (startDateDraft !== currentStartDate) return true;
    if (endDateDraft !== currentEndDate) return true;

    return false;
  }, [
    endDateDraft,
    search.customerId,
    search.endDate,
    search.q,
    search.startDate,
    search.status,
    searchDraft,
    selectedCustomers,
    selectedStatuses,
    showCustomerFilter,
    startDateDraft,
  ]);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setSearchDraft(search.q ?? "");
          setSelectedStatuses(parseList(search.status));
          if (showCustomerFilter) {
            setSelectedCustomers(parseList(search.customerId));
          }
          setStartDateDraft(search.startDate ?? "");
          setEndDateDraft(search.endDate ?? "");
        }
      }}
    >
      <SheetTrigger
        render={
          <Button
            type="button"
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className={cn(
              "xl:hidden",
              !hasActiveFilters && filterButtonClassName,
            )}
          />
        }
      >
        <FunnelIcon />
        <span className="hidden sm:inline">{tApp("actions.filter")}</span>
      </SheetTrigger>

      <SheetContent side="right" className="w-[92%] p-2 sm:w-105 md:p-4">
        <SheetHeader>
          <SheetTitle>{tTable("title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 px-2">
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={tOrders("filters.searchPlaceholder")}
          />

          <MultiSelectFilter
            filter={{
              columnId: "status",
              label: tOrders("filters.status"),
              options: statusOptions,
            }}
            selectedValues={selectedStatuses}
            triggerClassName={cn("md:w-full", filterButtonClassName)}
            onChange={(_, values) => setSelectedStatuses(values)}
          />

          {showCustomerFilter ? (
            <MultiSelectFilter
              filter={{
                columnId: "customerId",
                label: tOrders("columns.customer"),
                options: customerOptions,
              }}
              selectedValues={selectedCustomers}
              triggerClassName={cn("md:w-full", filterButtonClassName)}
              onChange={(_, values) => setSelectedCustomers(values)}
            />
          ) : null}

          <DateRangeFilter
            label={tTable("range")}
            start={startDateDraft || undefined}
            end={endDateDraft || undefined}
            className={cn("md:w-full", filterButtonClassName)}
            clearLabel={tTable("clear")}
            onChange={({ startDate, endDate }) => {
              setStartDateDraft(startDate ?? "");
              setEndDateDraft(endDate ?? "");
            }}
          />
        </div>

        <SheetFooter className="grid grid-cols-2 gap-2 p-2">
          <Button
            type="button"
            variant="outline"
            className={filterButtonClassName}
            onClick={() => {
              setSearchDraft("");
              setSelectedStatuses([]);
              setSelectedCustomers([]);
              setStartDateDraft("");
              setEndDateDraft("");
              navigate(
                {
                  q: undefined,
                  status: undefined,
                  customerId: undefined,
                  startDate: undefined,
                  endDate: undefined,
                  pageIndex: 0,
                },
                { replace: true },
              );
              setOpen(false);
            }}
            disabled={!hasActiveFilters && !hasDraftChanges}
          >
            {tTable("clear")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              navigate(
                {
                  q: searchDraft.trim() || undefined,
                  status: selectedStatuses.length
                    ? selectedStatuses.join("|")
                    : undefined,
                  customerId: showCustomerFilter
                    ? selectedCustomers.length
                      ? selectedCustomers.join("|")
                      : undefined
                    : undefined,
                  startDate: startDateDraft || undefined,
                  endDate: endDateDraft || undefined,
                  pageIndex: 0,
                },
                { replace: true },
              );
              setOpen(false);
            }}
            disabled={!hasDraftChanges}
          >
            {tTable("apply")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
