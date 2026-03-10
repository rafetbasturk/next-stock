import * as React from "react";
import { CalendarIcon } from "lucide-react";
import {
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/datetime";

interface DateRangeFilterProps {
  label: string;
  start?: string;
  end?: string;
  className?: string;
  clearLabel?: string;
  onChange: (updates: { startDate?: string; endDate?: string }) => void;
}

type PresetKey = "thisMonth" | "lastMonth" | "twoMonthsAgo";

export function DateRangeFilter({
  label,
  start,
  end,
  className,
  clearLabel,
  onChange,
}: DateRangeFilterProps) {
  const localeCode = useLocale();
  const tTableFilters = useTranslations("Table.filters");
  const locale = localeCode === "tr" ? tr : enUS;
  const [open, setOpen] = React.useState(false);
  const clearText = clearLabel ?? tTableFilters("clear");

  // Safe parse URL values
  const startDate = React.useMemo(
    () => (start ? new Date(start + "T00:00:00") : undefined),
    [start],
  );

  const endDate = React.useMemo(
    () => (end ? new Date(end + "T00:00:00") : undefined),
    [end],
  );

  // Draft state (UI only)
  const [draftStart, setDraftStart] = React.useState<Date | undefined>(startDate);
  const [draftEnd, setDraftEnd] = React.useState<Date | undefined>(endDate);

  // Sync draft when external values change
  React.useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  // Presets
  const presets = React.useMemo(() => {
    const now = new Date();
    const twoAgo = subMonths(now, 2);
    const last = subMonths(now, 1);

    return {
      thisMonth: {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: formatDateTime(now, {
          locale: localeCode,
          month: "long",
        }),
      },
      lastMonth: {
        start: startOfMonth(last),
        end: endOfMonth(last),
        label: formatDateTime(last, {
          locale: localeCode,
          month: "long",
        }),
      },
      twoMonthsAgo: {
        start: startOfMonth(twoAgo),
        end: endOfMonth(twoAgo),
        label: formatDateTime(twoAgo, {
          locale: localeCode,
          month: "long",
        }),
      },
    };
  }, [localeCode]);

  function applyRange(s?: Date, e?: Date) {
    onChange({
      startDate: s ? format(s, "yyyy-MM-dd") : undefined,
      endDate: e ? format(e, "yyyy-MM-dd") : undefined,
    });
    setOpen(false);
  }

  function applyPreset(key: PresetKey) {
    const preset = presets[key];
    setDraftStart(preset.start);
    setDraftEnd(preset.end);
    applyRange(preset.start, preset.end);
  }

  function clear() {
    setDraftStart(undefined);
    setDraftEnd(undefined);
    applyRange(undefined, undefined);
  }

  // Range selection logic
  function handleSelect(date?: Date) {
    if (!date) return;

    // First click
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd(undefined);
      return;
    }

    // Second click completes range
    let rangeStart = draftStart;
    let rangeEnd = date;
    if (rangeEnd < rangeStart) [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    setDraftStart(rangeStart);
    setDraftEnd(rangeEnd);
    applyRange(rangeStart, rangeEnd);
  }

  // Detect active preset
  const activePreset = React.useMemo<PresetKey | null>(() => {
    if (!draftStart || !draftEnd) return null;

    for (const key of Object.keys(presets) as Array<PresetKey>) {
      const preset = presets[key];

      if (isSameDay(draftStart, preset.start) && isSameDay(draftEnd, preset.end)) {
        return key;
      }
    }

    return null;
  }, [draftStart, draftEnd, presets]);

  // Display label
  const displayLabel = React.useMemo(() => {
    if (!startDate || !endDate) return label;

    try {
      return `${formatDateTime(startDate, {
        locale: localeCode,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })} - ${formatDateTime(endDate, {
        locale: localeCode,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })}`;
    } catch {
      return label;
    }
  }, [startDate, endDate, label, localeCode]);

  const hasActiveRange = Boolean(startDate && endDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !hasActiveRange && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {displayLabel}
      </PopoverTrigger>

      <PopoverContent
        className="w-(--anchor-width) p-3"
        align="start"
      >
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(Object.keys(presets) as Array<PresetKey>).map((key) => {
            const preset = presets[key];

            return (
              <Button
                type="button"
                key={key}
                size="sm"
                variant={activePreset === key ? 'default' : 'outline'}
                onClick={() => applyPreset(key)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={draftEnd ?? draftStart}
            onSelect={handleSelect}
            locale={locale}
            className="mx-auto w-fit"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          disabled={!hasActiveRange}
          onClick={clear}
        >
          {clearText}
        </Button>
      </PopoverContent>
    </Popover>
  );

}
