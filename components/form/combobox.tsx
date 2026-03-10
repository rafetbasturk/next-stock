import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export interface ComboItem {
  value: number | string
  label: string
  searchText?: string // merged text to match against (optional)
  data?: unknown // optional full item access for custom renderers
  disabled?: boolean
}

interface ComboboxProps {
  id?: string
  label?: string
  placeholder?: string
  items: Array<ComboItem>
  value: string | number | null
  onChange: (value: string | number) => void
  searchable?: boolean
  isLoading?: boolean
  error?:
    | string
    | {
        i18n: {
          ns: string
          key: string
        }
        params?: Record<string, string | number>
      }
  required?: boolean
  // allow custom row + trigger UI
  renderItem?: (item: ComboItem, isSelected: boolean) => React.ReactNode
  renderTriggerLabel?: (item: ComboItem | undefined) => React.ReactNode
}

export default function Combobox({
  id,
  items,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  searchable = true,
  label,
  isLoading,
  error,
  required,
  renderItem,
  renderTriggerLabel,
}: ComboboxProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = items.find((i) => i.value === value)

  const filtered = useMemo(() => {
    if (!search) return items
    const s = search.toLowerCase()
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(s) ||
        i.value.toString().toLowerCase().includes(s) ||
        i.searchText?.toLowerCase().includes(s),
    )
  }, [items, search])

  return (
    <Field className="gap-1 relative">
      {label && (
        <FieldLabel htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </FieldLabel>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          render={
            <Button
              type="button"
              role="combobox"
              variant="outline"
              disabled={isLoading}
              aria-invalid={!!error}
              className={cn('w-full justify-between', error && 'border-red-500')}
            />
          }
        >
          <div className="flex-1 min-w-0 text-left truncate capitalize">
            {isLoading
              ? 'Yükleniyor'
              : (renderTriggerLabel?.(selected) ??
                selected?.label ??
                placeholder)}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[min(var(--anchor-width),calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0 max-h-[min(24rem,calc(100dvh-6rem))] overflow-hidden flex flex-col pointer-events-auto"
        >
          <Command className="overflow-hidden flex flex-col pointer-events-auto">
            {searchable && (
              <CommandInput
                placeholder="Ara..."
                value={search}
                onValueChange={setSearch}
              />
            )}

            <CommandList
              className="overflow-y-auto flex-1"
              onWheel={(e) => {
                // Allow wheel scrolling to work on the list
                const element = e.currentTarget
                const canScroll = element.scrollHeight > element.clientHeight
                if (canScroll) {
                  e.stopPropagation()
                }
              }}
            >
              <CommandEmpty>Bulunamadı</CommandEmpty>

              <CommandGroup>
                {filtered.map((item) => {
                  const isSelected = item.value === value

                  return (
                    <CommandItem
                      key={item.value}
                      disabled={item.disabled}
                      onSelect={() => {
                        if (!item.disabled) {
                          onChange(item.value)
                          setOpen(false)
                        }
                      }}
                      title={
                        item.disabled
                          ? 'Bu kalem zaten sevk eklendi'
                          : undefined
                      }
                      className={cn(
                        'flex items-center justify-between gap-2 select-none',
                        item.disabled && 'opacity-40 cursor-not-allowed',
                        !item.disabled && 'cursor-pointer hover:bg-accent',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isSelected && !item.disabled && (
                          <Check className="h-4 w-4 text-primary" />
                        )}

                        {/* 🔒 Lock icon for disabled */}
                        {item.disabled && (
                          <span className="text-gray-500 mr-1">🔒</span>
                        )}

                        <div className="min-w-0">
                          {renderItem ? renderItem(item, isSelected) : item.label}
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <FieldError className="text-xs absolute -bottom-4">
          {typeof error === 'string'
            ? error
            : t(`${error.i18n.ns}:${error.i18n.key}`, error.params)}
        </FieldError>
      )}
    </Field>
  )
}
