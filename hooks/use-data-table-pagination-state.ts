import { useMemo } from "react";

type UseDataTablePaginationStateOptions = {
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  pageSizePresets?: number[];
};

export function useDataTablePaginationState({
  total,
  pageIndex,
  pageSize,
  pageCount,
  pageSizePresets = [20, 50, 100],
}: UseDataTablePaginationStateOptions) {
  const fromRow = total === 0 ? 0 : pageIndex * pageSize + 1;
  const toRow = Math.min(total, (pageIndex + 1) * pageSize);
  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex + 1 < pageCount;

  const pageSizeOptions = useMemo(
    () =>
      Array.from(new Set([...pageSizePresets, pageSize])).sort((a, b) => a - b),
    [pageSize, pageSizePresets],
  );

  return {
    fromRow,
    toRow,
    hasPrev,
    hasNext,
    pageSizeOptions,
  };
}
