"use client";

import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { enUS, tr } from "react-day-picker/locale";
import type {
  OrderFormFieldErrors,
  OrderFormState,
} from "@/components/order-form/types";
import { currencyArray } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import { statusArray } from "@/lib/constants";
import CustomerInput from "@/components/form/customer-input";
import EntitySelect from "@/components/form/entity-select";
import InputField from "@/components/form/input-field";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  order?: unknown | null;
  form: OrderFormState;
  setForm: React.Dispatch<React.SetStateAction<OrderFormState>>;
  fieldErrors: OrderFormFieldErrors;
  clearFieldError: (path: string) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCurrencyChange?: (currency: OrderFormState["currency"]) => void;
};

function getStatusLabel(
  value: string,
  tStatus: (key: string) => string,
): string {
  switch (value) {
    case "KAYIT":
      return tStatus("KAYIT");
    case "ÜRETİM":
      return tStatus("ÜRETİM");
    case "KISMEN HAZIR":
      return tStatus("KISMEN_HAZIR");
    case "HAZIR":
      return tStatus("HAZIR");
    case "BİTTİ":
      return tStatus("BİTTİ");
    case "İPTAL":
      return tStatus("İPTAL");
    default:
      return value;
  }
}

function getErrorText(error?: string): string | undefined {
  if (!error) return undefined;
  const normalized = error.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export default function OrderFormBasicInfo({
  order,
  form,
  setForm,
  fieldErrors,
  clearFieldError,
  onChange,
  onCurrencyChange,
}: Props) {
  const tCreate = useTranslations("OrdersTable.create");
  const tColumns = useTranslations("OrdersTable.columns");
  const tStatus = useTranslations("OrdersTable.status");
  const localeCode = useLocale();
  const calendarLocale = localeCode === "tr" ? tr : enUS;
  const orderDateError = getErrorText(fieldErrors.orderDate);
  const orderDateLabel = useMemo(
    () =>
      formatDateTime(form.orderDate, {
        locale: localeCode,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [form.orderDate, localeCode],
  );

  const currencyOptions = useMemo(
    () =>
      currencyArray.map((currency) => ({
        id: currency,
        label: currency,
      })),
    [],
  );

  const statusOptions = useMemo(() => {
    const values = new Set<string>(statusArray);
    if (form.status?.trim()) {
      values.add(form.status.trim());
    }

    return Array.from(values).map((status) => ({
      id: status,
      label: getStatusLabel(status, tStatus),
    }));
  }, [form.status, tStatus]);

  return (
    <FieldSet className="rounded-2xl border border-border/60 bg-muted/20 p-5 md:p-6">
      <FieldLegend className="mb-0">{tCreate("sections.basic")}</FieldLegend>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
        <FieldGroup>
          <div className={"grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
            <div className="w-full">
              <InputField
                name="orderNumber"
                label={tCreate("fields.orderNumber")}
                value={form.orderNumber}
                onChange={onChange}
                required
                error={fieldErrors.orderNumber}
                placeholder={tCreate("placeholders.orderNumber")}
              />
            </div>

            <Field className="relative w-full gap-1">
              <FieldLabel
                htmlFor="orderDate"
                className={cn("capitalize", orderDateError && "text-red-500")}
              >
                {tCreate("fields.orderDate")}
                <span className="text-red-500">*</span>
              </FieldLabel>

              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      id="orderDate"
                      type="button"
                      variant="outline"
                      aria-invalid={Boolean(orderDateError)}
                      className={cn(
                        "w-full justify-start bg-background font-normal",
                        orderDateError && "border-red-500",
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {orderDateLabel}
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--anchor-width) p-3"
                  align="start"
                >
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={form.orderDate}
                      onSelect={(date) => {
                        if (!date) return;
                        setForm((prev) => ({ ...prev, orderDate: date }));
                        clearFieldError("orderDate");
                      }}
                      locale={calendarLocale}
                      className="mx-auto w-fit"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {orderDateError ? (
                <FieldError className="text-xs absolute -bottom-4.5">
                  {orderDateError}
                </FieldError>
              ) : null}
            </Field>

            <CustomerInput
              label={tCreate("fields.customer")}
              placeholder={tCreate("placeholders.customer")}
              value={form.customerId > 0 ? form.customerId : null}
              autoSelectFirst={!order}
              required
              error={fieldErrors.customerId}
              onValueChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  customerId: value ?? 0,
                }));
                clearFieldError("customerId");
              }}
            />
          </div>

          <div
            className={cn(
              "grid gap-4",
              order
                ? "md:grid-cols-2 xl:grid-cols-3"
                : "md:grid-cols-2",
            )}
          >
            <EntitySelect
              name="currency"
              label={tCreate("fields.currency")}
              value={form.currency}
              onValueChange={(value) => {
                const nextCurrency =
                  (value as OrderFormState["currency"]) ?? "TRY";
                if (onCurrencyChange) {
                  onCurrencyChange(nextCurrency);
                  return;
                }
                setForm((prev) => ({
                  ...prev,
                  currency: nextCurrency,
                }));
              }}
              options={currencyOptions}
              placeholder={tCreate("fields.currency")}
            />

            <InputField
              name="deliveryAddress"
              label={tCreate("fields.deliveryAddress")}
              value={form.deliveryAddress}
              onChange={onChange}
              placeholder={tCreate("placeholders.deliveryAddress")}
            />

            {order ? (
              <div className="w-full">
                <EntitySelect
                  name="status"
                  label={tColumns("status")}
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: (value as OrderFormState["status"]) ?? "KAYIT",
                    }))
                  }
                  options={statusOptions}
                  placeholder={tColumns("status")}
                />
              </div>
            ) : null}
          </div>
        </FieldGroup>

        <Field className="gap-1">
          <FieldLabel htmlFor="notes">{tCreate("fields.notes")}</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                notes: event.target.value,
              }));
              clearFieldError("notes");
            }}
            placeholder={tCreate("placeholders.notes")}
            rows={7}
            className="min-h-26 resize-y bg-background"
          />
        </Field>
      </div>
    </FieldSet>
  );
}
