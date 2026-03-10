"use client";

import type { ReactNode } from "react";

import { DataTableUpdatingOverlay } from "@/components/datatable/data-table-updating-overlay";
import { cn } from "@/lib/utils";

type DataTableViewportProps = {
  isRefetching?: boolean;
  updatingLabel: string;
  mobile: ReactNode;
  desktop: ReactNode;
  className?: string;
};

export function DataTableViewport({
  isRefetching = false,
  updatingLabel,
  mobile,
  desktop,
  className,
}: DataTableViewportProps) {
  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1", className)}>
      {isRefetching ? <DataTableUpdatingOverlay label={updatingLabel} /> : null}
      {mobile}
      {desktop}
    </div>
  );
}
