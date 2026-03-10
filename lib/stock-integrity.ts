export type StockIntegritySnapshotRow = {
  id: number;
  code: string;
  name: string;
  shelf: number;
  ledger: number;
};

export type StockIntegrityMismatch = StockIntegritySnapshotRow & {
  diff: number;
};

export function buildStockIntegrityReport(
  rows: Array<StockIntegritySnapshotRow>,
): Array<StockIntegrityMismatch> {
  return rows
    .filter((row) => row.shelf !== row.ledger)
    .map((row) => ({
      ...row,
      diff: row.ledger - row.shelf,
    }));
}
