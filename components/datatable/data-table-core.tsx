"use client";

import { Fragment, type ReactNode } from "react";
import type { Cell, Header, Table } from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableCoreProps<TData> = {
  table: Table<TData>;
  isLoading?: boolean;
  emptyLabel: string;
  skeletonRowCount?: number;
  containerClassName?: string;
  tableClassName?: string;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string | undefined;
  getHeaderClassName?: (header: Header<TData, unknown>) => string | undefined;
  getCellClassName?: (cell: Cell<TData, unknown>) => string | undefined;
  renderHeaderCell: (header: Header<TData, unknown>) => ReactNode;
  renderBodyCell: (cell: Cell<TData, unknown>) => ReactNode;
  renderExpandedRow?: (row: TData) => ReactNode;
};

function getFixedWidthStyle(size: number) {
  return {
    width: size,
    minWidth: size,
    maxWidth: size,
  };
}

export function DataTableCore<TData>({
  table,
  isLoading = false,
  emptyLabel,
  skeletonRowCount = 8,
  containerClassName,
  tableClassName,
  onRowClick,
  getRowClassName,
  getHeaderClassName,
  getCellClassName,
  renderHeaderCell,
  renderBodyCell,
  renderExpandedRow,
}: DataTableCoreProps<TData>) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <div className={cn("h-full min-h-0 min-w-0 overflow-auto", containerClassName)}>
      <table className={cn("caption-bottom text-sm w-max min-w-full", tableClassName)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn("bg-accent sticky top-0 z-20", getHeaderClassName?.(header))}
                  style={getFixedWidthStyle(header.getSize())}
                >
                  {header.isPlaceholder ? null : renderHeaderCell(header)}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              <TableRow key={`desktop-skeleton-row-${rowIndex}`}>
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`${column.id}-skeleton`}
                    style={getFixedWidthStyle(column.getSize())}
                  >
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-muted-foreground h-20 text-center"
                colSpan={Math.max(1, visibleColumns.length)}
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  className={cn(
                    onRowClick && "cursor-pointer",
                    getRowClassName?.(row.original),
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={getCellClassName?.(cell)}
                      style={getFixedWidthStyle(cell.column.getSize())}
                    >
                      {renderBodyCell(cell)}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && renderExpandedRow ? (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell
                      colSpan={Math.max(1, visibleColumns.length)}
                      className="p-0"
                    >
                      {renderExpandedRow(row.original)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );
}
