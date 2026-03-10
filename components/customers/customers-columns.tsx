import type { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/datatable/datatable-row-actions";
import type { CustomerTableRow } from "@/lib/types/customers";
import type { ActionMenuItem } from "@/lib/types/ui";

type CustomerColumnsOptions = {
  t: (key: string) => string;
  onEdit: (customer: CustomerTableRow) => void;
  onDelete: (customer: CustomerTableRow) => void;
};

function toDisplayValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "-";
}

export function getCustomerColumns({
  t,
  onEdit,
  onDelete,
}: CustomerColumnsOptions): Array<ColumnDef<CustomerTableRow>> {
  const rowActions: Array<ActionMenuItem<CustomerTableRow>> = [
    {
      label: t("actions.edit"),
      action: (customer) => onEdit(customer),
      separatorAfter: true,
    },
    {
      label: t("actions.delete"),
      action: (customer) => onDelete(customer),
      isDestructive: true,
    },
  ];

  return [
    {
      id: "actions",
      size: 40,
      meta: { headerLabel: "" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <DataTableRowActions row={row} actions={rowActions} />,
    },
    {
      accessorKey: "code",
      size: 150,
      meta: { sortKey: "code", headerLabel: t("columns.code") },
      cell: ({ row }) => <div className="font-medium truncate">{row.original.code}</div>,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      size: 260,
      meta: { sortKey: "name", headerLabel: t("columns.name") },
      cell: ({ row }) => <div className="truncate">{row.original.name}</div>,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      size: 240,
      meta: { headerLabel: t("columns.email") },
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {toDisplayValue(row.original.email)}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      size: 180,
      meta: { headerLabel: t("columns.phone") },
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {toDisplayValue(row.original.phone)}
        </div>
      ),
    },
    {
      accessorKey: "address",
      size: 320,
      meta: { headerLabel: t("columns.address") },
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate">
          {toDisplayValue(row.original.address)}
        </div>
      ),
    },
  ];
}
