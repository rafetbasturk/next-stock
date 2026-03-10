"use client";

import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { enUS, tr } from "react-day-picker/locale";
import type {
  DeliveryFormFieldErrors,
  DeliveryFormState,
} from "@/components/deliveries/delivery-form/types";
import CustomerInput from "@/components/form/customer-input";
import InputField from "@/components/form/input-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface Props {
  form: DeliveryFormState;
  onChange: <K extends keyof DeliveryFormState>(
    field: K,
    value: DeliveryFormState[K],
  ) => void;
  customerIds: Array<number>;
  errors: DeliveryFormFieldErrors;
  disableKindEdit?: boolean;
}

export default function DeliveryFormBasicInfo({
  form,
  onChange,
  customerIds,
  errors,
  disableKindEdit = false,
}: Props) {
  const t = useTranslations("DeliveriesTable.form");
  const locale = useLocale();
  const calendarLocale = locale === "tr" ? tr : enUS;
  const selectedKindLabel =
    form.kind === "RETURN" ? t("kind.return") : t("kind.delivery");
  const deliveryDateLabel = useMemo(
    () =>
      formatDateTime(form.deliveryDate, {
        locale,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [form.deliveryDate, locale],
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 md:p-6">
      <div className="flex gap-6 flex-col md:flex-row">
        <FieldGroup className="md:basis-2/3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="w-full">
              <InputField
                name="deliveryNumber"
                label={t("fields.deliveryNumber")}
                value={form.deliveryNumber}
                onChange={(event) =>
                  onChange("deliveryNumber", event.target.value)
                }
                required
                placeholder={t("placeholders.deliveryNumber")}
                error={errors.deliveryNumber}
              />
            </div>

            <Field className="w-full gap-1">
              <FieldLabel htmlFor="deliveryDate">
                {t("fields.deliveryDate")}
              </FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      id="deliveryDate"
                      type="button"
                      variant="outline"
                      className="w-full justify-start bg-background font-normal"
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDateLabel}
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--anchor-width) p-3"
                  align="start"
                >
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={form.deliveryDate}
                      onSelect={(date) => {
                        if (!date) return;
                        onChange("deliveryDate", date);
                      }}
                      locale={calendarLocale}
                      captionLayout="label"
                      className="mx-auto w-fit"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </Field>

            <Field className="w-full gap-1">
              <FieldLabel htmlFor="kind">{t("fields.kind")}</FieldLabel>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  onChange("kind", value as DeliveryFormState["kind"])
                }
                disabled={disableKindEdit}
              >
                <SelectTrigger
                  id="kind"
                  className="w-full border-muted bg-background font-normal text-muted-foreground hover:bg-accent"
                >
                  <SelectValue
                    className="capitalize"
                    placeholder={t("fields.kind")}
                  >
                    {selectedKindLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectItem value="DELIVERY">{t("kind.delivery")}</SelectItem>
                  <SelectItem value="RETURN">{t("kind.return")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="w-full">
              <CustomerInput
                value={form.customerId}
                onValueChange={(value) => onChange("customerId", value)}
                required
                label={t("fields.customer")}
                filterIds={customerIds}
                error={errors.customerId}
                autoSelectFirst
              />
            </div>
          </div>
        </FieldGroup>

        <Field className="gap-1 md:basis-1/3">
          <FieldLabel htmlFor="notes">{t("fields.notes")}</FieldLabel>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            rows={7}
            placeholder={t("placeholders.notes")}
            className={cn("h-full min-h-20 resize-y bg-background")}
          />
        </Field>
      </div>
    </div>
  );
}
