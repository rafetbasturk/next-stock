"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectFilterProps {
  filter: {
    columnId: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  };
  selectedValues: Array<string>;
  onChange: (columnId: string, selectedValues: Array<string>) => void;
  triggerClassName?: string;
}

export function MultiSelectFilter({
  filter,
  selectedValues,
  onChange,
  triggerClassName,
}: MultiSelectFilterProps) {
  const t = useTranslations("Table.multiSelect");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allValues = useMemo(
    () => filter.options.map((option) => option.value),
    [filter.options],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      filter.options.filter((option) =>
        option.label.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [filter.options, normalizedQuery],
  );

  const isAllSelected =
    selectedValues.length === 0 || selectedValues.length === allValues.length;

  function toggleValue(value: string) {
    let next: Array<string>;

    if (value === "__all__") {
      next = [];
    } else if (selectedValues.includes(value)) {
      next = selectedValues.filter((item) => item !== value);
    } else {
      next = [...selectedValues, value];
    }

    if (next.length === allValues.length) {
      next = [];
    }

    onChange(filter.columnId, next);
  }

  const triggerLabel = useMemo(() => {
    if (isAllSelected) return filter.label;

    if (selectedValues.length === 1) {
      const selected = filter.options.find(
        (option) => option.value === selectedValues[0],
      );
      return selected?.label ?? filter.label;
    }

    return t("selected", { count: selectedValues.length });
  }, [filter.label, filter.options, isAllSelected, selectedValues, t]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between font-normal text-muted-foreground md:w-48",
              triggerClassName,
            )}
          />
        }
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground opacity-50" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder", { label: filter.label })}
          />
        </div>

        <div className="max-h-64 overflow-auto p-1">
          <FilterOptionButton
            label={t("all")}
            checked={isAllSelected}
            onClick={() => toggleValue("__all__")}
          />

          {filteredOptions.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              {t("noResults")}
            </p>
          ) : (
            filteredOptions.map((option) => (
              <FilterOptionButton
                key={option.value}
                label={option.label}
                checked={selectedValues.includes(option.value)}
                onClick={() => toggleValue(option.value)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterOptionButton({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 w-full justify-start px-2 text-sm font-normal"
      onClick={onClick}
    >
      <span
        className={cn(
          "mr-2 flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-primary bg-primary" : "border-muted",
        )}
      >
        {checked ? <span className="h-2 w-2 rounded-sm bg-white" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </Button>
  );
}
