"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableMobileFieldProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

export function DataTableMobileField({
  label,
  value,
  className,
}: DataTableMobileFieldProps) {
  return (
    <div className={cn("flex justify-between min-w-0 space-y-1", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="min-w-0 wrap-break-word text-sm font-medium">{value}</div>
    </div>
  );
}
