import { useCallback } from "react";
import type { Cell, Header } from "@tanstack/react-table";

import {
  getDefaultCellClassName,
  getDefaultHeaderClassName,
  renderDefaultBodyCell,
} from "@/components/datatable/data-table-meta";

export function useDataTableDefaultRenderers<TRow>() {
  const getDesktopHeaderClassName = useCallback(
    (header: Header<TRow, unknown>) => getDefaultHeaderClassName(header),
    [],
  );

  const renderDesktopBodyCell = useCallback(
    (cell: Cell<TRow, unknown>) => renderDefaultBodyCell(cell),
    [],
  );

  const getDesktopCellClassName = useCallback(
    (cell: Cell<TRow, unknown>) => getDefaultCellClassName(cell),
    [],
  );

  return {
    getDesktopHeaderClassName,
    renderDesktopBodyCell,
    getDesktopCellClassName,
  };
}
