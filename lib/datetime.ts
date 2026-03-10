type DateInput = string | number | Date

type FormatDateTimeOptions = Intl.DateTimeFormatOptions & {
  locale?: string
  timeZone?: string
}

export function formatDateTime(value: DateInput, options: FormatDateTimeOptions = {}) {
  const { locale, timeZone, ...formatOptions } = options
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  try {
    return new Intl.DateTimeFormat(locale, {
      ...formatOptions,
      ...(timeZone ? { timeZone } : {}),
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, formatOptions).format(date)
  }
}
