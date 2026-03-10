"use client";

import { useMemo, useState } from "react";
import { FunnelIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { MultiSelectFilter } from "@/components/form/multi-select-filter";
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
import { useProductFilterOptions } from "@/lib/queries/product-filter-options";
import type { ProductsSearch } from "@/lib/types/search";
import { useProductsSearchNavigation } from "@/hooks/use-products-search-navigation";
import { cn } from "@/lib/utils";

type ProductsMobileFiltersProps = {
  search: ProductsSearch;
};

function parseMaterials(material: string | undefined): Array<string> {
  if (!material) return [];

  return material
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCustomerIds(customerId: string | undefined): Array<string> {
  if (!customerId) return [];

  return customerId
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductsMobileFilters({ search }: ProductsMobileFiltersProps) {
  const tApp = useTranslations("App");
  const tTable = useTranslations("Table.filters");
  const tProducts = useTranslations("ProductsTable");
  const navigate = useProductsSearchNavigation(search);
  const { data: filterOptions } = useProductFilterOptions();
  const [open, setOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const [selectedMaterials, setSelectedMaterials] = useState<Array<string>>(
    parseMaterials(search.material),
  );
  const [selectedCustomers, setSelectedCustomers] = useState<Array<string>>(
    parseCustomerIds(search.customerId),
  );

  const materialOptions = useMemo(
    () =>
      (filterOptions?.materials ?? []).map((material) => ({
        value: material,
        label: material,
      })),
    [filterOptions?.materials],
  );
  const customerOptions = useMemo(
    () =>
      (filterOptions?.customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: `${customer.code} - ${customer.name}`,
      })),
    [filterOptions?.customers],
  );
  const showCustomerFilter = customerOptions.length > 1;

  const hasActiveFilters = Boolean(
    search.q?.trim() || search.material || search.customerId,
  );
  const filterButtonClassName =
    "border-muted bg-background font-normal text-muted-foreground hover:bg-muted hover:text-foreground";

  const hasDraftChanges = useMemo(() => {
    const normalizedSearch = search.q?.trim() ?? "";
    const normalizedDraft = searchDraft.trim();
    const currentMaterials = parseMaterials(search.material);
    const currentCustomers = parseCustomerIds(search.customerId);

    if (normalizedSearch !== normalizedDraft) return true;
    if (currentMaterials.length !== selectedMaterials.length) return true;
    if (
      showCustomerFilter &&
      currentCustomers.length !== selectedCustomers.length
    )
      return true;

    const currentSet = new Set(currentMaterials);
    if (selectedMaterials.some((value) => !currentSet.has(value))) return true;

    if (!showCustomerFilter) return false;

    const customerSet = new Set(currentCustomers);
    return selectedCustomers.some((value) => !customerSet.has(value));
  }, [
    search.customerId,
    search.material,
    search.q,
    searchDraft,
    selectedCustomers,
    selectedMaterials,
    showCustomerFilter,
  ]);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setSearchDraft(search.q ?? "");
          setSelectedMaterials(parseMaterials(search.material));
          if (showCustomerFilter) {
            setSelectedCustomers(parseCustomerIds(search.customerId));
          }
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
      <SheetContent side="right" className="w-[92%] sm:w-105 p-2 md:p-4">
        <SheetHeader>
          <SheetTitle>{tTable("title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 px-2">
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={tProducts("filters.searchPlaceholder")}
          />

          <MultiSelectFilter
            filter={{
              columnId: "material",
              label: tProducts("columns.material"),
              options: materialOptions,
            }}
            selectedValues={selectedMaterials}
            triggerClassName={cn("md:w-full", filterButtonClassName)}
            onChange={(_, values) => setSelectedMaterials(values)}
          />
          {showCustomerFilter ? (
            <MultiSelectFilter
              filter={{
                columnId: "customerId",
                label: tProducts("columns.customer"),
                options: customerOptions,
              }}
              selectedValues={selectedCustomers}
              triggerClassName={cn("md:w-full", filterButtonClassName)}
              onChange={(_, values) => setSelectedCustomers(values)}
            />
          ) : null}
        </div>

        <SheetFooter className="grid grid-cols-2 gap-2 p-2">
          <Button
            type="button"
            variant="outline"
            className={filterButtonClassName}
            onClick={() => {
              setSearchDraft("");
              setSelectedMaterials([]);
              setSelectedCustomers([]);
              navigate(
                {
                  q: undefined,
                  material: undefined,
                  customerId: undefined,
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
                  material: selectedMaterials.length
                    ? selectedMaterials.join("|")
                    : undefined,
                  customerId: showCustomerFilter
                    ? selectedCustomers.length
                      ? selectedCustomers.join("|")
                      : undefined
                    : undefined,
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
