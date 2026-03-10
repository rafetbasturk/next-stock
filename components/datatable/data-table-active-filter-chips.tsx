"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DataTableActiveFilterChipsProps<TChip> = {
  chips: TChip[];
  clearChipLabel: string;
  getChipKey: (chip: TChip) => string;
  getChipLabel: (chip: TChip) => ReactNode;
  onRemove: (chip: TChip) => void;
};

export function DataTableActiveFilterChips<TChip>({
  chips,
  clearChipLabel,
  getChipKey,
  getChipLabel,
  onRemove,
}: DataTableActiveFilterChipsProps<TChip>) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={getChipKey(chip)} variant="outline" className="h-6 max-w-full gap-1 pr-1">
          <span className="max-w-56 truncate">{getChipLabel(chip)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-4 rounded-full p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(chip)}
            aria-label={clearChipLabel}
          >
            <XIcon className="size-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
