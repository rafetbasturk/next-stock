"use client";

import { useMemo, useState } from "react";
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
import { useDeliveriesSearchNavigation } from "@/hooks/use-deliveries-search-navigation";
import { useDeliveryFilterOptions } from "@/lib/queries/delivery-filter-options";
import type { DeliveriesSearch } from "@/lib/types/search";
import { cn } from "@/lib/utils";

type DeliveriesMobileFiltersProps = {
  search: DeliveriesSearch;
};

const DELIVERY_KIND_FALLBACK_VALUES = ["DELIVERY", "RETURN"] as const;

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

export function DeliveriesMobileFilters({ search }: DeliveriesMobileFiltersProps) {
  const tApp = useTranslations("App");
  const tTable = useTranslations("Table.filters");
  const tDeliveries = useTranslations("DeliveriesTable");
  const navigate = useDeliveriesSearchNavigation(search);
  const { data: filterOptions } = useDeliveryFilterOptions();
  const [open, setOpen] = useState(false);

  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const [selectedKinds, setSelectedKinds] = useState<Array<string>>(
    parseList(search.kind),
  );
  const [selectedCustomers, setSelectedCustomers] = useState<Array<string>>(
    parseList(search.customerId),
  );
  const [startDateDraft, setStartDateDraft] = useState(search.startDate ?? "");
  const [endDateDraft, setEndDateDraft] = useState(search.endDate ?? "");

  const kindOptions = useMemo(
    () =>
      (filterOptions?.kinds?.length
        ? filterOptions.kinds
        : DELIVERY_KIND_FALLBACK_VALUES
      ).map((value) => ({
        value,
        label: value === "RETURN" ? tDeliveries("kinds.return") : tDeliveries("kinds.delivery"),
      })),
    [filterOptions?.kinds, tDeliveries],
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
      search.kind ||
      search.customerId ||
      search.startDate ||
      search.endDate,
  );
  const filterButtonClassName =
    "border-muted bg-background font-normal text-muted-foreground hover:bg-muted hover:text-foreground";

  const hasDraftChanges = useMemo(() => {
    const currentSearch = search.q?.trim() ?? "";
    const currentKinds = parseList(search.kind);
    const currentCustomers = parseList(search.customerId);
    const currentStartDate = search.startDate ?? "";
    const currentEndDate = search.endDate ?? "";

    if (searchDraft.trim() !== currentSearch) return true;
    if (!areListsEqual(selectedKinds, currentKinds)) return true;
    if (showCustomerFilter && !areListsEqual(selectedCustomers, currentCustomers)) {
      return true;
    }
    if (startDateDraft !== currentStartDate) return true;
    if (endDateDraft !== currentEndDate) return true;

    return false;
  }, [
    endDateDraft,
    search.customerId,
    search.endDate,
    search.kind,
    search.q,
    search.startDate,
    searchDraft,
    selectedCustomers,
    selectedKinds,
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
          setSelectedKinds(parseList(search.kind));
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
            placeholder={tDeliveries("filters.searchPlaceholder")}
          />

          <MultiSelectFilter
            filter={{
              columnId: "kind",
              label: tDeliveries("columns.kind"),
              options: kindOptions,
            }}
            selectedValues={selectedKinds}
            triggerClassName={cn("md:w-full", filterButtonClassName)}
            onChange={(_, values) => setSelectedKinds(values)}
          />

          {showCustomerFilter ? (
            <MultiSelectFilter
              filter={{
                columnId: "customerId",
                label: tDeliveries("columns.customer"),
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
              setSelectedKinds([]);
              setSelectedCustomers([]);
              setStartDateDraft("");
              setEndDateDraft("");
              navigate(
                {
                  q: undefined,
                  kind: undefined,
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
                  kind: selectedKinds.length ? selectedKinds.join("|") : undefined,
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
