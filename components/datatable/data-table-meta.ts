"use client";

import type { ReactNode } from "react";
import type { Cell, Header } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

type HeaderAlign = "left" | "center" | "right" | undefined;

export function getHeaderAlign<TData>(header: Header<TData, unknown>): HeaderAlign {
  return header.column.columnDef.meta?.headerAlign;
}

export function getHeaderJustifyClass(align: HeaderAlign) {
  return align === "right"
    ? "justify-end"
    : align === "center"
      ? "justify-center"
      : "justify-start";
}

export function getHeaderLabel<TData>(header: Header<TData, unknown>): ReactNode {
  return (
    header.column.columnDef.meta?.headerLabel ??
    (header.column.columnDef.header
      ? flexRender(header.column.columnDef.header, header.getContext())
      : header.column.id)
  );
}

export function getAlignedHeaderMeta<TData>(header: Header<TData, unknown>) {
  const headerAlign = getHeaderAlign(header);
  return {
    headerAlign,
    headerJustifyClass: getHeaderJustifyClass(headerAlign),
    headerLabel: getHeaderLabel(header),
  };
}

export function getDefaultHeaderClassName<TData>(header: Header<TData, unknown>) {
  return header.column.columnDef.meta?.headerClassName;
}

export function renderDefaultBodyCell<TData>(cell: Cell<TData, unknown>) {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

export function getDefaultCellClassName<TData>(cell: Cell<TData, unknown>) {
  const cellAlign = cell.column.columnDef.meta?.headerAlign;
  const cellMetaClass = cell.column.columnDef.meta?.className;
  const cellAlignClass =
    cellAlign === "right"
      ? "text-right"
      : cellAlign === "center"
        ? "text-center"
        : undefined;
  const resolvedCellClass =
    typeof cellMetaClass === "function"
      ? cellMetaClass(cell.getValue(), cell.row.original)
      : cellMetaClass;

  return cn(cellAlignClass, resolvedCellClass);
}
