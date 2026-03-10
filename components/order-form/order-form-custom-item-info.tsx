"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOrderCalculations } from "@/components/order-form/hooks/use-order-calculations";
import EmptyOrderProducts from "@/components/order-form/empty-order-products";
import type { FormErrors, OrderFormState } from "@/components/order-form/types";
import {
  formatNumberForDisplay,
  parseLocaleNumber,
} from "@/components/order-form/utils";
import InputField from "@/components/form/input-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { convertToCurrencyFormat } from "@/lib/currency";

const toCentsFromInput = (value: string) =>
  Math.round(parseLocaleNumber(value) * 100);

const getItemKey = (
  item: OrderFormState["customItems"][number],
  index: number,
) => `custom-item-${item.id ?? index}`;

const getUnitPriceInputValue = (
  item: OrderFormState["customItems"][number],
) => {
  if (typeof item.unitPriceRaw === "string") {
    return item.unitPriceRaw;
  }

  const unitPrice = Number(item.unitPrice ?? 0);
  return unitPrice > 0 ? formatNumberForDisplay(unitPrice / 100) : "";
};

type Props = {
  form: OrderFormState;
  errorHelpers: FormErrors;
  addCustomItem: () => void;
  removeCustomItem: (index: number) => void;
  onCustomItemChange: (
    index: number,
    field: keyof OrderFormState["customItems"][number],
    value: unknown,
  ) => void;
};

export default function OrderFormCustomItemInfo({
  form,
  errorHelpers,
  addCustomItem,
  removeCustomItem,
  onCustomItemChange,
}: Props) {
  const tCreate = useTranslations("OrdersTable.create");
  const { formattedTotal } = useOrderCalculations(
    form.customItems,
    form.currency,
  );
  const customItemsError = errorHelpers.get("customItems");

  const customProductPlaceholder = tCreate("placeholders.customItemName");
  const customUnitPlaceholder = tCreate("placeholders.customItemUnit");

  return (
    <>
      <div className="hidden w-full max-w-full min-w-0 overflow-hidden rounded-2xl border md:block">
        <Table className="w-full min-w-260 table-fixed text-sm">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-52.5">
                {tCreate("fields.product")}
              </TableHead>
              <TableHead className="w-55">
                {tCreate("table.description")}
              </TableHead>
              <TableHead className="w-25">{tCreate("table.unit")}</TableHead>
              <TableHead className="w-27.5">
                {tCreate("fields.quantity")}
              </TableHead>
              <TableHead className="w-33.75 text-right">
                {tCreate("fields.unitPrice")}
              </TableHead>
              <TableHead className="w-36.25 text-right">
                {tCreate("fields.lineTotal")}
              </TableHead>
              <TableHead className="w-17.5 text-right">
                {tCreate("table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {form.customItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground"
                >
                  <EmptyOrderProducts />
                </TableCell>
              </TableRow>
            ) : (
              form.customItems.map((item, index) => (
                <TableRow key={getItemKey(item, index)}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <InputField
                      name={`customItems.${index}.name`}
                      value={item.name}
                      onChange={(event) =>
                        onCustomItemChange(index, "name", event.target.value)
                      }
                      placeholder={customProductPlaceholder}
                      error={errorHelpers.get(`customItems.${index}.name`)}
                    />
                  </TableCell>
                  <TableCell>
                    <InputField
                      name={`customItems.${index}.notes`}
                      value={item.notes}
                      onChange={(event) =>
                        onCustomItemChange(index, "notes", event.target.value)
                      }
                      placeholder={tCreate("placeholders.notes")}
                    />
                  </TableCell>
                  <TableCell>
                    <InputField
                      name={`customItems.${index}.unit`}
                      value={item.unit}
                      onChange={(event) =>
                        onCustomItemChange(index, "unit", event.target.value)
                      }
                      placeholder={customUnitPlaceholder}
                    />
                  </TableCell>
                  <TableCell>
                    <InputField
                      name={`customItems.${index}.quantity`}
                      type="number"
                      min={1}
                      value={item.quantity || 1}
                      onChange={(event) =>
                        onCustomItemChange(
                          index,
                          "quantity",
                          Number(event.target.value || 0),
                        )
                      }
                      error={errorHelpers.get(`customItems.${index}.quantity`)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <InputField
                      name={`customItems.${index}.unitPrice`}
                      type="text"
                      inputMode="decimal"
                      value={getUnitPriceInputValue(item)}
                      onChange={(event) => {
                        onCustomItemChange(
                          index,
                          "unitPriceRaw",
                          event.target.value,
                        );
                        onCustomItemChange(
                          index,
                          "unitPrice",
                          toCentsFromInput(event.target.value),
                        );
                      }}
                      error={errorHelpers.get(`customItems.${index}.unitPrice`)}
                      placeholder={tCreate("placeholders.unitPrice")}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {convertToCurrencyFormat({
                      cents:
                        Number(item.quantity ?? 0) *
                        Number(item.unitPrice ?? 0),
                      currency: form.currency,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCustomItem(index)}
                      className="ml-auto flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                    >
                      <Trash2 className="size-3 sm:size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>

          {form.customItems.length > 0 ? (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-medium">
                  {tCreate("fields.total")}
                </TableCell>
                <TableCell className="text-right text-lg font-bold">
                  {formattedTotal}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      <div className="mt-4 block min-w-0 space-y-4 md:hidden">
        {form.customItems.length === 0 ? (
          <EmptyOrderProducts />
        ) : (
          form.customItems.map((item, index) => (
            <div
              key={getItemKey(item, index)}
              className="relative space-y-3 rounded-2xl border bg-background p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeCustomItem(index)}
                  className="h-8 w-8"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <InputField
                  name={`customItems.${index}.name-mobile`}
                  value={item.name}
                  onChange={(event) =>
                    onCustomItemChange(index, "name", event.target.value)
                  }
                  placeholder={customProductPlaceholder}
                  error={errorHelpers.get(`customItems.${index}.name`)}
                />
                <InputField
                  name={`customItems.${index}.notes-mobile`}
                  value={item.notes}
                  onChange={(event) =>
                    onCustomItemChange(index, "notes", event.target.value)
                  }
                  placeholder={tCreate("table.description")}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <InputField
                  name={`customItems.${index}.unit-mobile`}
                  value={item.unit}
                  onChange={(event) =>
                    onCustomItemChange(index, "unit", event.target.value)
                  }
                  placeholder={customUnitPlaceholder}
                />
                <InputField
                  name={`customItems.${index}.quantity-mobile`}
                  type="number"
                  min={1}
                  label={tCreate("fields.quantity")}
                  value={item.quantity || 1}
                  onChange={(event) =>
                    onCustomItemChange(
                      index,
                      "quantity",
                      Number(event.target.value || 0),
                    )
                  }
                  error={errorHelpers.get(`customItems.${index}.quantity`)}
                />
                <InputField
                  name={`customItems.${index}.unitPrice-mobile`}
                  type="text"
                  inputMode="decimal"
                  label={tCreate("fields.unitPrice")}
                  value={getUnitPriceInputValue(item)}
                  onChange={(event) => {
                    onCustomItemChange(
                      index,
                      "unitPriceRaw",
                      event.target.value,
                    );
                    onCustomItemChange(
                      index,
                      "unitPrice",
                      toCentsFromInput(event.target.value),
                    );
                  }}
                  error={errorHelpers.get(`customItems.${index}.unitPrice`)}
                  placeholder={tCreate("placeholders.unitPrice")}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">
                  {tCreate("fields.lineTotal")}
                </span>
                <span className="text-lg font-semibold">
                  {convertToCurrencyFormat({
                    cents:
                      Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0),
                    currency: form.currency,
                  })}
                </span>
              </div>
            </div>
          ))
        )}

        {form.customItems.length > 0 ? (
          <div className="border-t pt-4 text-right">
            <span className="mr-2 text-sm font-medium">
              {tCreate("fields.total")}:
            </span>
            <span className="text-lg font-bold">{formattedTotal}</span>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={addCustomItem}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          {tCreate("buttons.addRow")}
        </Button>
        {customItemsError ? (
          <FieldError className="absolute -bottom-4 text-xs">
            {customItemsError}
          </FieldError>
        ) : null}
      </div>
    </>
  );
}
