"use client";

import type { ReactNode } from "react";
import type { Column, Table } from "@tanstack/react-table";
import { Columns3Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DataTableColumnVisibilityProps<TData> = {
  table: Table<TData>;
  label: string;
  triggerClassName?: string;
  contentClassName?: string;
  getColumnLabel?: (column: Column<TData, unknown>) => ReactNode;
};

export function DataTableColumnVisibility<TData>({
  table,
  label,
  triggerClassName,
  contentClassName = "w-56",
  getColumnLabel,
}: DataTableColumnVisibilityProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" className={triggerClassName} />}
      >
        <Columns3Icon className="size-4" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClassName}>
        {table
          .getAllLeafColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="w-full"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {getColumnLabel?.(column) ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
