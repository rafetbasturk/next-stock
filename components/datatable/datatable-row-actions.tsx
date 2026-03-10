import type { Row } from '@tanstack/react-table'
import { DataTableActionsMenu } from '@/components/datatable/data-table-actions-menu'
import type { ActionMenuItem } from '@/lib/types/ui'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  actions: Array<ActionMenuItem<TData>>
  alignment?: 'start' | 'center' | 'end' | undefined
}

export function DataTableRowActions<TData>({
  row,
  actions,
  alignment = 'end',
}: DataTableRowActionsProps<TData>) {
  return (
    <DataTableActionsMenu
      align={alignment}
      srLabel="Menüyü aç"
      items={actions.map((actionItem, index) => ({
        key: `${index}-${actionItem.label}`,
        label: actionItem.label,
        onSelect: () => actionItem.action(row.original),
        destructive: actionItem.isDestructive,
        separatorAfter: actionItem.separatorAfter,
      }))}
    />
  )
}
