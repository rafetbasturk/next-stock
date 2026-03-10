import Combobox, { ComboItem } from "./combobox"


type Entity = {
  id: number
  code?: string
  name: string
  price?: number | string | null
  currency?: string | null
  [key: string]: unknown
}

type Props<T extends Entity> = {
  id?: string
  label?: string
  placeholder?: string
  entities: Array<T>
  value: number | null
  onChange: (id: number) => void
  isLoading?: boolean
  error?: string
  required?: boolean
}

export default function EntityCombobox<T extends Entity>({
  id = 'entity_id',
  label,
  placeholder = 'Bir kayıt seçin',
  entities,
  value,
  onChange,
  isLoading = false,
  error,
  required = false,
}: Props<T>) {
  const items: Array<ComboItem> = entities.map((entity) => ({
    value: entity.id,
    label: entity.code ? `${entity.code} - ${entity.name}` : entity.name,
    searchText: `${entity.code ?? ''} ${entity.name}`,
    data: entity,
  }))

  return (
    <Combobox
      id={id}
      label={label}
      placeholder={placeholder}
      items={items}
      value={value}
      onChange={(selectedValue) => onChange(Number(selectedValue))}
      isLoading={isLoading}
      error={error}
      required={required}
      renderItem={(item) => {
        const entity = item.data as T | undefined
        const hasPrice =
          entity &&
          typeof entity.price !== 'undefined' &&
          entity.price !== null &&
          entity.currency

        return (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">{item.label}</span>
            {hasPrice && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {(Number(entity.price ?? 0) / 100).toFixed(2)} {entity.currency}
              </span>
            )}
          </div>
        )
      }}
    />
  )
}
