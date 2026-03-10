"use client";

import { useMemo, useState } from "react";
import { FunnelIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMovementsSearchNavigation } from "@/hooks/use-movements-search-navigation";
import { stockMovementTypes, type StockSearch } from "@/lib/types/search";
import { cn } from "@/lib/utils";

type MovementsMobileFiltersProps = {
  search: StockSearch;
};

type MovementTypeValue = (typeof stockMovementTypes)[number];
type MovementTypeFilterValue = MovementTypeValue | "ALL";

export function MovementsMobileFilters({ search }: MovementsMobileFiltersProps) {
  const tApp = useTranslations("App");
  const tTable = useTranslations("Table.filters");
  const tMovements = useTranslations("MovementsTable");
  const navigate = useMovementsSearchNavigation(search);
  const [open, setOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const [movementTypeDraft, setMovementTypeDraft] = useState<MovementTypeFilterValue>(
    search.movementType ?? "ALL",
  );

  const movementTypeOptions = useMemo(
    () =>
      stockMovementTypes.map((type) => ({
        value: type,
        label: tMovements(`movementTypes.${type}`),
      })),
    [tMovements],
  );

  const hasActiveFilters = Boolean(
    search.q?.trim() || search.movementType || search.productId,
  );
  const filterButtonClassName =
    "border-muted bg-background font-normal text-muted-foreground hover:bg-muted hover:text-foreground";

  const hasDraftChanges = useMemo(() => {
    const normalizedSearch = search.q?.trim() ?? "";
    const normalizedDraft = searchDraft.trim();
    const currentType = search.movementType ?? "ALL";
    return normalizedSearch !== normalizedDraft || currentType !== movementTypeDraft;
  }, [movementTypeDraft, search.movementType, search.q, searchDraft]);
  const selectedMovementTypeLabel =
    movementTypeDraft === "ALL"
      ? tMovements("filters.allTypes")
      : movementTypeOptions.find((option) => option.value === movementTypeDraft)
          ?.label ?? movementTypeDraft;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSearchDraft(search.q ?? "");
          setMovementTypeDraft(search.movementType ?? "ALL");
        }
      }}
    >
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "xl:hidden",
              filterButtonClassName,
              hasActiveFilters && "border-primary text-primary",
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
            placeholder={tMovements("filters.searchPlaceholder")}
          />

          <div className="grid gap-1">
            <p className="text-muted-foreground px-1 text-xs font-medium">
              {tMovements("filters.movementType")}
            </p>
            <Select
              value={movementTypeDraft}
              onValueChange={(value) =>
                setMovementTypeDraft((value ?? "ALL") as MovementTypeFilterValue)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{selectedMovementTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="ALL">{tMovements("filters.allTypes")}</SelectItem>
                {movementTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="grid grid-cols-2 gap-2 p-2">
          <Button
            type="button"
            variant="outline"
            className={filterButtonClassName}
            onClick={() => {
              setSearchDraft("");
              setMovementTypeDraft("ALL");
              navigate(
                {
                  q: undefined,
                  movementType: undefined,
                  productId: undefined,
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
                  movementType:
                    movementTypeDraft === "ALL" ? undefined : movementTypeDraft,
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
