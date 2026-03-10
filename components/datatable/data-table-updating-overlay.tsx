"use client";

import { Loader2Icon } from "lucide-react";

type DataTableUpdatingOverlayProps = {
  label: string;
};

export function DataTableUpdatingOverlay({ label }: DataTableUpdatingOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/35 backdrop-blur-[1px]">
      <div className="inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs text-muted-foreground">
        <Loader2Icon className="size-3 animate-spin" />
        {label}
      </div>
    </div>
  );
}
