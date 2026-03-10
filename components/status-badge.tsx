"use client";

import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: OrderStatus;
  label?: string;
  className?: string;
};

type StatusBadgeTone = {
  dot: string;
  badge: string;
};

const statusToneByStatus: Record<OrderStatus, StatusBadgeTone> = {
  KAYIT: {
    dot: "bg-slate-500",
    badge:
      "border-slate-300 bg-slate-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200",
  },
  ÜRETİM: {
    dot: "bg-sky-500",
    badge:
      "border-sky-300 bg-sky-50 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
  },
  "KISMEN HAZIR": {
    dot: "bg-amber-500",
    badge:
      "border-amber-300 bg-amber-50 text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  },
  HAZIR: {
    dot: "bg-violet-500",
    badge:
      "border-violet-300 bg-violet-50 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-200",
  },
  BİTTİ: {
    dot: "bg-emerald-500",
    badge:
      "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
  İPTAL: {
    dot: "bg-rose-500",
    badge:
      "border-rose-300 bg-rose-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  },
};

function getStatusTone(status: OrderStatus): StatusBadgeTone {
  return statusToneByStatus[status];
}

export default function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const tone = getStatusTone(status);

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
      <span className="truncate">{label ?? status}</span>
    </Badge>
  );
}
