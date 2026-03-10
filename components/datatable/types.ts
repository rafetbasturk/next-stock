export type TableSearch = Record<string, string | number | undefined>;

export type DataTableFilterOption = {
  value: string;
  label: string;
};

type DataTableFilterBase = {
  columnId: string;
  label: string;
};

export type DataTableTextFilter = DataTableFilterBase & {
  type: "text";
};

export type DataTableSelectFilter = DataTableFilterBase & {
  type: "select";
  options: Array<DataTableFilterOption>;
};

export type DataTableMultiFilter = DataTableFilterBase & {
  type: "multi";
  options: Array<DataTableFilterOption>;
};

export type DataTableFilter =
  | DataTableTextFilter
  | DataTableSelectFilter
  | DataTableMultiFilter;
