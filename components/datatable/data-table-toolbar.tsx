"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableToolbarProps = {
  left: ReactNode;
  right?: ReactNode;
  chips?: ReactNode;
  className?: string;
  leftClassName?: string;
};

export function DataTableToolbar({
  left,
  right,
  chips,
  className,
  leftClassName,
}: DataTableToolbarProps) {
  return (
    <div className={cn("hidden border-b p-3 xl:block", className)}>
      <div className="space-y-2">
        <div className={cn("flex items-center justify-between gap-10")}>
          <div className={cn("flex grow items-center gap-2", leftClassName)}>
            {left}
          </div>
          {right}
        </div>
        {chips}
      </div>
    </div>
  );
}
