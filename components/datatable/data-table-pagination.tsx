"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataTablePaginationProps = {
  showingLabel: ReactNode;
  pageLabel: ReactNode;
  rowsPerPageLabel: string;
  pageSize: number;
  pageSizeOptions: number[];
  hasPrev: boolean;
  hasNext: boolean;
  onPageSizeChange: (value: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function DataTablePagination({
  showingLabel,
  pageLabel,
  rowsPerPageLabel,
  pageSize,
  pageSizeOptions,
  hasPrev,
  hasNext,
  onPageSizeChange,
  onPrev,
  onNext,
}: DataTablePaginationProps) {
  return (
    <div className="flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-center gap-2 text-sm sm:justify-start">
        <p className="text-muted-foreground">{showingLabel}</p>
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs sm:text-sm">
            {rowsPerPageLabel}
          </p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-20 border-muted bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
          <ArrowLeft />
        </Button>

        <p className="text-muted-foreground text-xs md:text-sm">{pageLabel}</p>

        <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
