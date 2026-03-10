"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useOrderCalculations } from "@/components/order-form/hooks/use-order-calculations";
import EmptyOrderProducts from "@/components/order-form/empty-order-products";
import type {
  FormErrors,
  OrderFormState,
  SelectProduct,
} from "@/components/order-form/types";
import {
  formatNumberForDisplay,
  parseLocaleNumber,
} from "@/components/order-form/utils";
import EntityCombobox from "@/components/form/entity-combobox";
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
import {
  convertToBaseCurrency,
  convertToCurrencyFormat,
} from "@/lib/currency";
import { toCurrencyOrDefault } from "@/lib/types/domain";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";

const toCentsFromInput = (value: string) =>
  Math.round(parseLocaleNumber(value) * 100);

const getItemKey = (item: OrderFormState["items"][number], index: number) =>
  `item-${item.id ?? index}`;

const calculateItemTotal = (item: OrderFormState["items"][number]) =>
  Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0);

const getUnitPriceInputValue = (item: OrderFormState["items"][number]) => {
  if (typeof item.unitPriceRaw === "string") {
    return item.unitPriceRaw;
  }

  const unitPrice = Number(item.unitPrice ?? 0);
  return unitPrice > 0 ? formatNumberForDisplay(unitPrice / 100) : "";
};

type Props = {
  form: OrderFormState;
  errorHelpers: FormErrors;
  products?: Array<SelectProduct>;
  isLoading: boolean;
  onItemChange: (
    index: number,
    field: keyof OrderFormState["items"][number],
    value: unknown,
  ) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
};

export default function OrderFormProductInfo({
  form,
  errorHelpers,
  products,
  isLoading,
  onItemChange,
  removeItem,
  addItem,
}: Props) {
  const tCreate = useTranslations("OrdersTable.create");
  const { formattedTotal } = useOrderCalculations(form.items, form.currency);
  const itemsError = errorHelpers.get("items");
  const rates = useExchangeRatesStore((state) => state.rates);

  const productMap = useMemo(() => {
    return new Map((products ?? []).map((product) => [product.id, product]));
  }, [products]);

  const applyProductSelection = (index: number, productId: number) => {
    onItemChange(index, "productId", productId);

    const selectedProduct = productMap.get(productId);
    if (!selectedProduct) return;

    const fromCurrency = toCurrencyOrDefault(selectedProduct.currency);
    const toCurrency = form.currency;

    let nextUnitPrice = Number(selectedProduct.price ?? 0);

    if (fromCurrency !== toCurrency) {
      try {
        nextUnitPrice = Math.round(
          convertToBaseCurrency(nextUnitPrice, fromCurrency, toCurrency, rates),
        );
      } catch {
        // Keep source price if rates are unavailable.
      }
    }

    onItemChange(index, "unitPriceRaw", undefined);
    onItemChange(index, "unitPrice", Math.max(0, nextUnitPrice));
    onItemChange(index, "currency", toCurrency);
  };

  return (
    <>
      <div className="hidden max-w-full min-w-0 overflow-hidden rounded-2xl border md:block">
        <Table className="w-full min-w-245 table-fixed text-sm">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-110">
                {tCreate("fields.product")}
              </TableHead>
              <TableHead className="w-35">
                {tCreate("fields.quantity")}
              </TableHead>
              <TableHead className="w-37.5 text-right">
                {tCreate("fields.unitPrice")}
              </TableHead>
              <TableHead className="w-37.5 text-right">
                {tCreate("fields.lineTotal")}
              </TableHead>
              <TableHead className="w-20 text-right">
                {tCreate("table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {form.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  <EmptyOrderProducts />
                </TableCell>
              </TableRow>
            ) : (
              form.items.map((item, index) => (
                <TableRow key={getItemKey(item, index)}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="relative">
                    <EntityCombobox
                      placeholder={tCreate("placeholders.product")}
                      entities={products ?? []}
                      value={item.productId > 0 ? item.productId : null}
                      onChange={(id) => applyProductSelection(index, id)}
                      isLoading={isLoading}
                      error={errorHelpers.get(`items.${index}.productId`)}
                    />
                  </TableCell>
                  <TableCell>
                    <InputField
                      name={`items.${index}.quantity`}
                      value={item.quantity || 1}
                      type="number"
                      min={1}
                      onChange={(event) =>
                        onItemChange(
                          index,
                          "quantity",
                          Number(event.target.value || 0),
                        )
                      }
                      error={errorHelpers.get(`items.${index}.quantity`)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <InputField
                      name={`items.${index}.unitPrice`}
                      type="text"
                      inputMode="decimal"
                      value={getUnitPriceInputValue(item)}
                      onChange={(event) => {
                        onItemChange(index, "unitPriceRaw", event.target.value);
                        onItemChange(
                          index,
                          "unitPrice",
                          toCentsFromInput(event.target.value),
                        );
                      }}
                      error={errorHelpers.get(`items.${index}.unitPrice`)}
                      placeholder={tCreate("placeholders.unitPrice")}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {convertToCurrencyFormat({
                      cents: calculateItemTotal(item),
                      currency: form.currency,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="ml-auto flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                    >
                      <Trash2 className="size-3 sm:size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>

          {form.items.length > 0 ? (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">
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

      <div className="min-w-0 space-y-4">
        <div className="block space-y-4 md:hidden">
          {form.items.length === 0 ? (
            <EmptyOrderProducts />
          ) : (
            form.items.map((item, index) => (
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
                    onClick={() => removeItem(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div>
                  <EntityCombobox
                    placeholder={tCreate("placeholders.product")}
                    entities={products ?? []}
                    value={item.productId > 0 ? item.productId : null}
                    onChange={(id) => applyProductSelection(index, id)}
                    isLoading={isLoading}
                    error={errorHelpers.get(`items.${index}.productId`)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    name={`items.${index}.quantity-mobile`}
                    label={tCreate("fields.quantity")}
                    type="number"
                    value={item.quantity || 1}
                    min={1}
                    onChange={(event) =>
                      onItemChange(
                        index,
                        "quantity",
                        Number(event.target.value || 0),
                      )
                    }
                    error={errorHelpers.get(`items.${index}.quantity`)}
                  />

                  <InputField
                    name={`items.${index}.unitPrice-mobile`}
                    label={tCreate("fields.unitPrice")}
                    type="text"
                    inputMode="decimal"
                    value={getUnitPriceInputValue(item)}
                    onChange={(event) => {
                      onItemChange(index, "unitPriceRaw", event.target.value);
                      onItemChange(
                        index,
                        "unitPrice",
                        toCentsFromInput(event.target.value),
                      );
                    }}
                    error={errorHelpers.get(`items.${index}.unitPrice`)}
                    placeholder={tCreate("placeholders.unitPrice")}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">
                    {tCreate("fields.lineTotal")}
                  </span>
                  <span className="text-lg font-semibold">
                    {convertToCurrencyFormat({
                      cents: calculateItemTotal(item),
                      currency: form.currency,
                    })}
                  </span>
                </div>
              </div>
            ))
          )}

          {form.items.length > 0 ? (
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
            onClick={() => {
              addItem();
              errorHelpers.clear("items");
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {tCreate("buttons.addRow")}
          </Button>
          {itemsError ? (
            <FieldError className="absolute -bottom-4 text-xs">
              {itemsError}
            </FieldError>
          ) : null}
        </div>
      </div>
    </>
  );
}
