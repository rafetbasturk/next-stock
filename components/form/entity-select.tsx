"use client";

import { Field, FieldError, FieldLabel } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Option<T extends number | string> = {
  id?: number | string;
  label: string;
  value?: string;
  returnValue?: T | null;
};

export type EntitySelectError =
  | string
  | {
      message?: string;
      i18n?: {
        key: string;
        ns?: string;
      };
      params?: Record<string, unknown>;
    };

export type EntitySelectFieldErrors = Record<string, EntitySelectError | undefined>;

type Props<T extends number | string> = {
  /** Field name (used for error tracking, id, etc.) */
  name?: string;
  /** Label text for the field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Currently selected value */
  value: T | null;
  /** Called when value changes */
  onValueChange: (value: T | null) => void;
  /** Error message (if any) */
  error?: EntitySelectError;
  /** Error setter for parent form */
  onErrorChange?: React.Dispatch<React.SetStateAction<EntitySelectFieldErrors>>;
  /** Whether field is required */
  required?: boolean;
  /** Whether data is still loading */
  loading?: boolean;
  /** The available options */
  options?: Array<Option<T>>;
  /** Optional: Disable input */
  disabled?: boolean;
};

export default function EntitySelect<T extends number | string>({
  name = "entity",
  value,
  onValueChange,
  error,
  onErrorChange = () => {},
  label,
  required = false,
  loading = false,
  options = [],
  placeholder = "Bir seçim yapın",
  disabled = false,
}: Props<T>) {
  const normalizedOptions = options.map((opt, index) => {
    const primaryValue =
      opt.value !== undefined && opt.value !== ""
        ? String(opt.value)
        : opt.id !== undefined && opt.id !== ""
          ? String(opt.id)
          : `option-${index}`;

    const key =
      opt.id !== undefined && opt.id !== ""
        ? opt.id
        : opt.value !== undefined && opt.value !== ""
          ? opt.value
          : `option-${index}`;

    return {
      option: opt,
      value: primaryValue,
      key,
    };
  });

  const currentStringValue = value !== null ? String(value) : null;
  const selectedEntry =
    currentStringValue === null
      ? undefined
      : normalizedOptions.find((entry) => {
          if (entry.value === currentStringValue) return true;
          if (
            entry.option.returnValue !== undefined &&
            entry.option.returnValue !== null &&
            String(entry.option.returnValue) === currentStringValue
          ) {
            return true;
          }
          return (
            entry.option.id !== undefined &&
            String(entry.option.id) === currentStringValue
          );
        });
  const selectedValue = selectedEntry?.value ?? null;
  const selectedOption = selectedEntry;

  const handleChange = (val: string | null) => {
    const selectedValue = val ?? "";
    const matchedOption = normalizedOptions.find(
      (entry) => entry.value === selectedValue,
    );

    if (!selectedValue) {
      onValueChange(null);
    } else if (
      matchedOption &&
      Object.prototype.hasOwnProperty.call(matchedOption.option, "returnValue")
    ) {
      onValueChange(matchedOption.option.returnValue ?? null);
    } else {
      const newValue = !Number.isNaN(Number(selectedValue))
        ? (Number(selectedValue) as T)
        : (selectedValue as T);
      onValueChange(newValue);
    }

    if (onErrorChange) {
      onErrorChange((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const isDisabled = disabled || loading;
  const resolvedErrorText =
    typeof error === "string"
      ? error
      : error?.message ??
        (error?.i18n?.ns ? `${error.i18n.ns}:${error.i18n.key}` : error?.i18n?.key);

  return (
    <Field className="gap-1 relative">
      {label && (
        <FieldLabel htmlFor={name}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </FieldLabel>
      )}

      <Select
        value={selectedValue}
        onValueChange={handleChange}
        disabled={isDisabled}
      >
        <SelectTrigger
          id={name}
          aria-invalid={!!error}
          className={`w-full border-muted bg-background hover:bg-accent font-normal text-muted-foreground ${
            error ? "border-red-500" : ""
          }`}
        >
          <SelectValue
            className="capitalize"
            placeholder={loading ? "Yükleniyor..." : placeholder}
          >
            {selectedOption?.option.label}
          </SelectValue>
        </SelectTrigger>

        <SelectContent align="start" alignItemWithTrigger={false}>
          {normalizedOptions.length > 0 ? (
            normalizedOptions.map(({ option, value: optionValue, key }) => (
              <SelectItem key={key} value={optionValue}>
                <span className="truncate">{option.label}</span>
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-muted-foreground text-sm">
              Kayıt bulunamadı
            </div>
          )}
        </SelectContent>
      </Select>

      {resolvedErrorText && (
        <FieldError className="text-xs absolute -bottom-4.5">
          {resolvedErrorText}
        </FieldError>
      )}
    </Field>
  );
}
