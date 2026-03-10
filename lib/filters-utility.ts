// src/lib/filters-utility.ts
import type { ColumnFiltersState } from '@tanstack/react-table'
import type { DataTableFilter } from '@/components/datatable/types'

export const FILTER_DELIMITER = '|'

const stripOuterQuotes = (s: string) => {
  const t = s.trim()
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"')
    ? t.slice(1, -1)
    : t
}

export function encodeFiltersToParams(
  filters: ColumnFiltersState,
  filterDefs?: Array<{ columnId: string }>,
) {
  const params: Record<string, string | undefined> = {}
  const allowedFilterIds = filterDefs?.map((f) => f.columnId)

  for (const f of filters) {
    if (allowedFilterIds && !allowedFilterIds.includes(f.id)) continue

    if (!f.value || (Array.isArray(f.value) && f.value.length === 0)) {
      params[f.id] = undefined
      continue
    }

    if (Array.isArray(f.value)) {
      params[f.id] = f.value
        .map((v) => stripOuterQuotes(String(v)))
        .join(FILTER_DELIMITER)
    } else {
      params[f.id] = stripOuterQuotes(String(f.value))
    }
  }

  return params
}

export function decodeParamsToFilters(
  search: Record<string, string | undefined>,
  filterDefs: Array<DataTableFilter>,
): ColumnFiltersState {
  const out: ColumnFiltersState = []

  for (const f of filterDefs) {
    const raw = search[f.columnId]
    if (raw == null || raw === '') continue

    const normalized = stripOuterQuotes(raw)

    if (f.type === 'multi') {
      out.push({
        id: f.columnId,
        value: normalized
          .split(FILTER_DELIMITER)
          .map(stripOuterQuotes)
          .filter(Boolean),
      })
      continue
    }

    if (f.type === 'select' || f.type === 'text') {
      out.push({ id: f.columnId, value: normalized })
      continue
    }
  }

  return out
}
