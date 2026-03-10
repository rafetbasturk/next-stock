"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DeliveryKindBadgeProps = {
  kind: "DELIVERY" | "RETURN";
  label?: string;
  className?: string;
};

const deliveryKindTone = {
  DELIVERY: {
    dot: "bg-sky-500",
    badge:
      "border-sky-300 bg-sky-50 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
  },
  RETURN: {
    dot: "bg-rose-500",
    badge:
      "border-rose-300 bg-rose-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  },
} as const;

export default function DeliveryKindBadge({
  kind,
  label,
  className,
}: DeliveryKindBadgeProps) {
  const tone = deliveryKindTone[kind];

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-7 gap-2 rounded-full px-3 text-[11px] font-semibold tracking-[0.02em]",
        tone.badge,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", tone.dot)}
      />
      <span className="truncate">{label ?? kind}</span>
    </Badge>
  );
}
