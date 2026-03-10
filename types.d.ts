declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    headerLabel?: string;
    filterTitle?: string;
    className?: string | ((cell: TValue, row: TData) => string);
    headerClassName?: string;
    headerAlign?: "left" | "center" | "right";
    sortKey?: string;
    isFilterOnly?: boolean;
  }

  interface TableMeta {
    expandedRowId?: string | number | null;
    onExpandToggle?: (rowId: string | number) => void;
  }
}

export {};
