"use client";

import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { currencyArray } from "@/lib/currency";
import { toCurrencyOrDefault, type Currency } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import type { InputFieldError } from "./input-field";

type Props = {
  name: string;
  label?: string;
  required?: boolean;
  price: number | string;
  currency: Currency;
  onPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPriceValueChange?: (value: string) => void;
  onCurrencyChange?: (value: Currency) => void;
  error?: InputFieldError;
  showCurrencySymbol?: boolean;
  showCurrencySelect?: boolean;
  currencySelectWidth?: string;
};

function getErrorText(error?: InputFieldError): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error.i18n?.key === "string" && error.i18n.key.trim().length > 0) {
    return error.i18n.key;
  }
  return undefined;
}

const currencyLabels: Record<Currency, string> = {
  TRY: "Turkish Lira",
  EUR: "Euro",
  USD: "US Dollar",
};

function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "TRY":
      return "₺";
    default:
      return currency;
  }
}

function isZeroLikeInput(value: number | string): boolean {
  if (typeof value === "number") return value === 0;

  const normalized = value.trim();
  if (!normalized) return false;

  return /^0+([.,]0+)?$/.test(normalized);
}

export default function PriceInput({
  name,
  label,
  required = false,
  price,
  currency,
  onPriceChange,
  onPriceValueChange,
  onCurrencyChange = () => {},
  error,
  showCurrencySymbol = true,
  showCurrencySelect = true,
  currencySelectWidth = "",
}: Props) {
  const errorText = getErrorText(error);
  const selectedCurrencyText = showCurrencySymbol
    ? getCurrencySymbol(currency)
    : currency;

  return (
    <Field className="gap-1 relative">
      {label && (
        <FieldLabel htmlFor={name}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </FieldLabel>
      )}

      <ButtonGroup
        className={cn(
          "w-full rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          errorText &&
            "border-destructive ring-3 ring-destructive/20 dark:ring-destructive/40",
        )}
      >
        {showCurrencySelect ? (
          <Select
            value={currency}
            onValueChange={(value) => {
              if (!value) return;
              onCurrencyChange(toCurrencyOrDefault(value));
            }}
          >
            <SelectTrigger
              id={`${name}-currency`}
              className={cn(
                "h-8 min-w-16 rounded-r-none border-0 border-r border-input bg-transparent font-mono shadow-none focus-visible:ring-0",
                currencySelectWidth,
              )}
              aria-invalid={Boolean(errorText)}
            >
              {selectedCurrencyText}
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectGroup>
                {currencyArray.map((item) => (
                  <SelectItem key={item} value={item}>
                    {getCurrencySymbol(item)}{" "}
                    <span className="text-muted-foreground">
                      {currencyLabels[item]}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : showCurrencySymbol ? (
          <ButtonGroupText className="h-8 rounded-r-none border-0 border-r border-input bg-transparent font-mono">
            {selectedCurrencyText}
          </ButtonGroupText>
        ) : null}

        <Input
          name={name}
          id={name}
          type="text"
          inputMode="decimal"
          value={price}
          onChange={onPriceChange}
          onFocus={() => {
            if (!onPriceValueChange) return;
            if (!isZeroLikeInput(price)) return;
            onPriceValueChange("");
          }}
          placeholder="0,00"
          aria-invalid={Boolean(errorText)}
          className="h-8 rounded-l-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </ButtonGroup>

      {errorText ? (
        <FieldError className="text-xs absolute -bottom-4.5">
          {errorText}
        </FieldError>
      ) : null}
    </Field>
  );
}
