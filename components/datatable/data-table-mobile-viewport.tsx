"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableMobileViewportProps = {
  isLoading: boolean;
  isEmpty: boolean;
  emptyLabel: ReactNode;
  loadingContent: ReactNode;
  children: ReactNode;
  className?: string;
  emptyClassName?: string;
};

export function DataTableMobileViewport({
  isLoading,
  isEmpty,
  emptyLabel,
  loadingContent,
  children,
  className,
  emptyClassName,
}: DataTableMobileViewportProps) {
  return (
    <div className={cn("h-full overflow-auto p-3 lg:hidden", className)}>
      {isLoading ? (
        loadingContent
      ) : isEmpty ? (
        <div
          className={cn(
            "text-muted-foreground flex h-full min-h-32 items-center justify-center text-center text-sm",
            emptyClassName,
          )}
        >
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
