"use client";

import type { ReactNode } from "react";

type DataTableMobileSkeletonListProps = {
  count?: number;
  renderItem: (index: number) => ReactNode;
};

export function DataTableMobileSkeletonList({
  count = 6,
  renderItem,
}: DataTableMobileSkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => renderItem(index))}
    </div>
  );
}
