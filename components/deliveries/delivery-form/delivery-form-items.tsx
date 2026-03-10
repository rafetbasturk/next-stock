"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import EmptyDeliveryTable from "@/components/deliveries/delivery-form/delivery-form-empty-table";
import type {
  DeliveryFormFieldErrors,
  DeliveryFormItem,
  DeliveryFormKind,
  DeliveryFormOrderOption,
} from "@/components/deliveries/delivery-form/types";
import Combobox from "@/components/form/combobox";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

interface Props {
  orders: Array<DeliveryFormOrderOption>;
  items: Array<DeliveryFormItem>;
  kind: DeliveryFormKind;
  onItemChange: <K extends keyof DeliveryFormItem>(
    index: number,
    field: K,
    value: DeliveryFormItem[K],
  ) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
  errors: DeliveryFormFieldErrors;
  setErrors: React.Dispatch<React.SetStateAction<DeliveryFormFieldErrors>>;
}

type ProductOptionData = {
  productId?: number | null;
  code: string;
  name: string;
  quantity: number;
  netDelivered: number;
  remaining: number;
  stockQuantity?: number | null;
  unit: DeliveryFormItem["unit"];
  price: number;
  currency: DeliveryFormItem["currency"];
  source: "standard" | "custom";
};

function looksLikeCode(value?: string | null) {
  return Boolean(value && /^[A-Z0-9._/-]+$/i.test(value) && /\d/.test(value));
}

function getCustomCode(
  customItem: DeliveryFormOrderOption["customItems"][number],
) {
  return (
    customItem.customCode || customItem.name || customItem.customName || ""
  );
}

function getCustomName(
  customItem: DeliveryFormOrderOption["customItems"][number],
) {
  const explicit = customItem.customName?.trim();
  if (explicit) return explicit;

  const notes = customItem.notes?.trim();
  const name = customItem.name?.trim();
  if (notes && looksLikeCode(name)) return notes;

  return name || notes || customItem.customCode || "Custom item";
}

function getNetDelivered(
  deliveries: DeliveryFormOrderOption["items"][number]["deliveries"],
) {
  return (
    deliveries?.reduce((sum, movement) => {
      const sign = movement.delivery.kind === "RETURN" ? -1 : 1;
      return sum + sign * movement.deliveredQuantity;
    }, 0) ?? 0
  );
}

export default function DeliveryFormItems({
  orders,
  items,
  kind,
  onItemChange,
  removeItem,
  addItem,
  errors,
  setErrors,
}: Props) {
  const t = useTranslations("DeliveriesTable.form");
  const tValidation = useTranslations("validation");

  const getItemError = (index: number, field: keyof DeliveryFormItem) =>
    errors[`items.${index}.${field}`];

  const clearItemError = (index: number, field: keyof DeliveryFormItem) => {
    setErrors((prev) => {
      const key = `items.${index}.${field}`;
      if (!prev[key]) return prev;

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.deliveredQuantity,
    0,
  );

  const orderOptions = orders.map((row) => ({
    value: row.id,
    label: row.orderNumber,
  }));

  const getAvailableStockForProduct = (
    productId: number,
    stockQuantity: number,
    currentIndex: number,
  ) =>
    Math.max(
      stockQuantity -
        items.reduce((sum, candidate, candidateIndex) => {
          if (candidateIndex === currentIndex) return sum;
          if (candidate.productId !== productId) return sum;
          return sum + Number(candidate.deliveredQuantity ?? 0);
        }, 0),
      0,
    );

  const getProductOptions = (
    order: DeliveryFormOrderOption | undefined,
    currentIndex: number,
  ) => [
    ...(order?.items ?? []).map((orderItem) => {
      const netDelivered = getNetDelivered(orderItem.deliveries);
      const remaining =
        kind === "RETURN"
          ? Math.max(netDelivered, 0)
          : Math.max(orderItem.quantity - netDelivered, 0);
      const availableStock = getAvailableStockForProduct(
        orderItem.productId,
        orderItem.stockQuantity ?? 0,
        currentIndex,
      );

      return {
        value: `standard:${orderItem.id}`,
        label: orderItem.product.code,
        searchText: `${orderItem.product.code} ${orderItem.product.name}`,
        disabled:
          remaining <= 0 || (kind === "DELIVERY" && availableStock <= 0),
        data: {
          productId: orderItem.productId,
          code: orderItem.product.code,
          name: orderItem.product.name,
          quantity: orderItem.quantity,
          netDelivered,
          remaining,
          stockQuantity: availableStock,
          unit: orderItem.unit,
          price: orderItem.unitPrice,
          currency: orderItem.currency,
          source: "standard",
        } satisfies ProductOptionData,
      };
    }),
    ...(order?.customItems ?? []).map((customItem) => {
      const netDelivered = getNetDelivered(customItem.deliveries);
      const remaining =
        kind === "RETURN"
          ? Math.max(netDelivered, 0)
          : Math.max(customItem.quantity - netDelivered, 0);

      const customCode = getCustomCode(customItem);
      const customName = getCustomName(customItem);

      return {
        value: `custom:${customItem.id}`,
        label: customCode || customName,
        searchText: `${customCode} ${customName} ${customItem.name}`,
        disabled: remaining <= 0,
        data: {
          productId: null,
          code: customCode || customName,
          name: customName,
          quantity: customItem.quantity,
          netDelivered,
          remaining,
          stockQuantity: null,
          unit: customItem.unit,
          price: customItem.unitPrice,
          currency: customItem.currency,
          source: "custom",
        } satisfies ProductOptionData,
      };
    }),
  ];

  const handleOrderSelection = (index: number, value: string | number) => {
    clearItemError(index, "orderId");
    onItemChange(index, "orderId", Number(value));
    onItemChange(index, "orderItemId", null);
    onItemChange(index, "customOrderItemId", null);
    onItemChange(index, "productId", null);
    onItemChange(index, "productCode", "");
    onItemChange(index, "productName", "");
    onItemChange(index, "stockQuantity", null);
    onItemChange(index, "remainingQuantity", 0);
    onItemChange(index, "deliveredQuantity", 1);
  };

  const handleProductSelection = (
    index: number,
    value: string | number,
    productOptions: Array<{
      value: string;
      label: string;
      data: ProductOptionData;
      disabled?: boolean;
      searchText?: string;
    }>,
    currentQuantity: number,
  ) => {
    const selected = productOptions.find(
      (option) => option.value === String(value),
    );
    const data = selected?.data;
    if (!selected || !data) return;

    const stockLimit =
      kind === "DELIVERY" && data.source === "standard"
        ? Math.max(Number(data.stockQuantity ?? 0), 0)
        : Number.POSITIVE_INFINITY;
    const targetQty = Math.min(
      Math.max(currentQuantity, 1),
      Math.max(data.remaining, 1),
      Math.max(stockLimit, 1),
    );

    onItemChange(index, "orderItemId", null);
    onItemChange(index, "customOrderItemId", null);
    onItemChange(index, "productId", data.productId ?? null);

    if (data.source === "standard") {
      onItemChange(
        index,
        "orderItemId",
        Number(String(selected.value).split(":")[1]),
      );
    } else {
      onItemChange(
        index,
        "customOrderItemId",
        Number(String(selected.value).split(":")[1]),
      );
    }

    onItemChange(index, "productCode", data.code);
    onItemChange(index, "productName", data.name);
    onItemChange(index, "unit", data.unit);
    onItemChange(index, "price", data.price);
    onItemChange(index, "currency", data.currency);
    onItemChange(index, "stockQuantity", data.stockQuantity ?? null);
    onItemChange(index, "remainingQuantity", data.remaining);
    onItemChange(index, "deliveredQuantity", targetQty);
  };

  const handleDeliveredQuantityChange = (index: number, value: string) => {
    clearItemError(index, "deliveredQuantity");
    const item = items[index];
    const requestedValue = Number(value);
    const stockLimit =
      kind === "DELIVERY" && item?.productId
        ? getAvailableStockForProduct(
            item.productId,
            Number(item.stockQuantity ?? 0),
            index,
          )
        : Number.POSITIVE_INFINITY;
    if (
      kind === "DELIVERY" &&
      item?.productId &&
      Number.isFinite(requestedValue) &&
      requestedValue > stockLimit
    ) {
      setErrors((prev) => ({
        ...prev,
        [`items.${index}.deliveredQuantity`]: tValidation("insufficientStock"),
      }));
    }
    const nextValue =
      Number.isFinite(requestedValue) && requestedValue > 0
        ? Math.min(
            requestedValue,
            Math.max(item?.remainingQuantity ?? 1, 1),
            Math.max(stockLimit, 1),
          )
        : 1;
    onItemChange(index, "deliveredQuantity", nextValue);
  };

  const getSelectedProductData = (
    item: DeliveryFormItem,
    productOptions: Array<{
      value: string;
      label: string;
      data: ProductOptionData;
      disabled?: boolean;
      searchText?: string;
    }>,
  ) => {
    const selectedValue = item.orderItemId
      ? `standard:${item.orderItemId}`
      : item.customOrderItemId
        ? `custom:${item.customOrderItemId}`
        : null;
    if (!selectedValue) return undefined;
    return productOptions.find((option) => option.value === selectedValue)
      ?.data;
  };

  return (
    <FieldSet className="min-w-0">
      <FieldLegend className="m-0">{t("sections.items")}</FieldLegend>

      <FieldSeparator />

      <div className="hidden max-w-full min-w-0 overflow-hidden rounded-2xl border lg:block">
        <div className="max-w-full overflow-x-auto">
          <Table className="table-fixed w-full text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-40">
                  {t("fields.orderNumber")}
                </TableHead>
                <TableHead className="w-65">
                  {t("fields.productCode")}
                </TableHead>
                <TableHead className="w-40 truncate">
                  {t("fields.productName")}
                </TableHead>
                <TableHead className="w-16 text-center">
                  {t("fields.unit")}
                </TableHead>
                <TableHead className="w-20 text-right">
                  {t("fields.price")}
                </TableHead>
                <TableHead className="w-20">
                  {t("fields.deliveredQuantity")}
                </TableHead>
                <TableHead className="w-30 text-right">
                  {t("fields.total")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center">
                    <EmptyDeliveryTable />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const order = orders.find((row) => row.id === item.orderId);
                  const productOptions = getProductOptions(order, index);
                  const deliveredQuantityError = getItemError(
                    index,
                    "deliveredQuantity",
                  );

                  return (
                    <TableRow key={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>

                      <TableCell>
                        <Combobox
                          placeholder={t("placeholders.selectOrder")}
                          items={orderOptions}
                          value={item.orderId}
                          onChange={(value) =>
                            handleOrderSelection(index, value)
                          }
                          error={getItemError(index, "orderId")}
                        />
                      </TableCell>

                      <TableCell>
                        <Combobox
                          placeholder={t("placeholders.selectProduct")}
                          items={productOptions}
                          value={
                            item.orderItemId
                              ? `standard:${item.orderItemId}`
                              : item.customOrderItemId
                                ? `custom:${item.customOrderItemId}`
                                : null
                          }
                          onChange={(value) => {
                            handleProductSelection(
                              index,
                              value,
                              productOptions,
                              item.deliveredQuantity,
                            );
                          }}
                          error={
                            getItemError(index, "orderItemId") ??
                            getItemError(index, "customOrderItemId")
                          }
                          renderTriggerLabel={(selected) => {
                            if (!selected) return undefined;
                            return selected.label;
                          }}
                          renderItem={(option) => {
                            const data = option.data as
                              | ProductOptionData
                              | undefined;
                            return (
                              <div className="flex w-full min-w-0 flex-col">
                                <div className="truncate text-sm font-medium">
                                  {option.label}
                                </div>
                                {data?.name && data.name !== option.label ? (
                                  <div className="text-muted-foreground truncate text-[11px]">
                                    {data.name}
                                  </div>
                                ) : null}

                                {data ? (
                                  <div className="text-muted-foreground mt-1 flex flex-wrap gap-1.5 text-[10px]">
                                    <div className="flex flex-col items-center gap-1 rounded bg-gray-200 px-1.5 py-0.5">
                                      <span className="capitalize">
                                        {t("badges.ordered")}
                                      </span>
                                      <span>{data.quantity}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 rounded bg-blue-200 px-1.5 py-0.5">
                                      <span className="capitalize">
                                        {t("badges.sent")}
                                      </span>
                                      <span>{data.netDelivered}</span>
                                    </div>
                                    {data.stockQuantity !== null &&
                                    typeof data.stockQuantity !==
                                      "undefined" ? (
                                      <div className="flex flex-col items-center gap-1 rounded bg-violet-200 px-1.5 py-0.5 text-violet-800">
                                        <span className="capitalize">
                                          {t("fields.stock")}
                                        </span>
                                        <span>{data.stockQuantity}</span>
                                      </div>
                                    ) : null}
                                    <div
                                      className={cn(
                                        "flex flex-col items-center gap-1 rounded px-1.5 py-0.5 font-semibold",
                                        data.remaining === 0
                                          ? "bg-red-200 text-red-700"
                                          : "bg-green-200 text-green-700",
                                      )}
                                    >
                                      <span className="capitalize">
                                        {t("badges.remaining")}
                                      </span>
                                      <span>{data.remaining}</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="truncate text-sm">
                          {item.productName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>

                      <TableCell className="text-right">
                        {convertToCurrencyFormat({
                          cents: item.price ?? 0,
                          currency: item.currency,
                        })}
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={Math.max(
                            kind === "DELIVERY" && item.productId
                              ? Math.min(
                                  item.remainingQuantity,
                                  getAvailableStockForProduct(
                                    item.productId,
                                    Number(item.stockQuantity ?? 0),
                                    index,
                                  ),
                                )
                              : item.remainingQuantity,
                            1,
                          )}
                          value={item.deliveredQuantity}
                          onChange={(event) =>
                            handleDeliveredQuantityChange(
                              index,
                              event.target.value,
                            )
                          }
                          className={cn(
                            deliveredQuantityError && "border-red-500",
                            "w-20",
                          )}
                        />
                        {deliveredQuantityError ? (
                          <FieldError>{deliveredQuantityError}</FieldError>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {convertToCurrencyFormat({
                          cents: (item.price ?? 0) * item.deliveredQuantity,
                          currency: item.currency,
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={7} className="text-right font-medium">
                  {t("labels.subtotal")}
                </TableCell>
                <TableCell colSpan={1} className="text-right text-lg font-bold">
                  {convertToCurrencyFormat({
                    cents: subtotal,
                    currency: items[0]?.currency ?? "TRY",
                  })}
                </TableCell>
                <TableCell colSpan={1}>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {items.length === 0 ? (
          <EmptyDeliveryTable />
        ) : (
          items.map((item, index) => {
            const order = orders.find((row) => row.id === item.orderId);
            const productOptions = getProductOptions(order, index);
            const selectedProductData = getSelectedProductData(
              item,
              productOptions,
            );
            const deliveredQuantityError = getItemError(
              index,
              "deliveredQuantity",
            );

            return (
              <div
                key={index}
                className="relative space-y-4 rounded-2xl border bg-background p-4 shadow-sm"
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
                    <Trash2 size={15} />
                  </Button>
                </div>

                <Combobox
                  placeholder={t("placeholders.selectOrder")}
                  items={orderOptions}
                  value={item.orderId}
                  onChange={(value) => handleOrderSelection(index, value)}
                  error={getItemError(index, "orderId")}
                />

                <Combobox
                  placeholder={t("placeholders.selectProduct")}
                  items={productOptions}
                  value={
                    item.orderItemId
                      ? `standard:${item.orderItemId}`
                      : item.customOrderItemId
                        ? `custom:${item.customOrderItemId}`
                        : null
                  }
                  onChange={(value) =>
                    handleProductSelection(
                      index,
                      value,
                      productOptions,
                      item.deliveredQuantity,
                    )
                  }
                  error={
                    getItemError(index, "orderItemId") ??
                    getItemError(index, "customOrderItemId")
                  }
                  renderTriggerLabel={(selected) => {
                    if (!selected) return undefined;
                    return selected.label;
                  }}
                  renderItem={(option) => {
                    const data = option.data as ProductOptionData | undefined;
                    return (
                      <div className="flex w-full min-w-0 flex-col">
                        <div className="truncate text-sm font-medium">
                          {option.label}
                        </div>
                        {data?.name && data.name !== option.label ? (
                          <div className="text-muted-foreground truncate text-[11px]">
                            {data.name}
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("fields.productCode")}
                    </div>
                    <div className="truncate text-sm font-medium">
                      {item.productCode || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("fields.productName")}
                    </div>
                    <div className="truncate text-sm font-medium">
                      {item.productName || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("fields.unit")}
                    </div>
                    <div className="text-sm font-medium">{item.unit}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("fields.price")}
                    </div>
                    <div className="text-sm font-medium">
                      {convertToCurrencyFormat({
                        cents: item.price ?? 0,
                        currency: item.currency,
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("badges.remaining")}
                    </div>
                    <div className="text-sm font-medium">
                      {item.remainingQuantity}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-[0.04em]">
                      {t("fields.stock")}
                    </div>
                    <div className="text-sm font-medium">
                      {selectedProductData?.stockQuantity ?? "-"}
                    </div>
                  </div>
                </div>

                <Field className="gap-1">
                  <FieldLabel htmlFor={`delivered-quantity-${index}`}>
                    {t("fields.deliveredQuantity")}
                  </FieldLabel>
                  <Input
                    id={`delivered-quantity-${index}`}
                    type="number"
                    min={1}
                    max={Math.max(
                      kind === "DELIVERY" && item.productId
                        ? Math.min(
                            item.remainingQuantity,
                            getAvailableStockForProduct(
                              item.productId,
                              Number(item.stockQuantity ?? 0),
                              index,
                            ),
                          )
                        : item.remainingQuantity,
                      1,
                    )}
                    value={item.deliveredQuantity}
                    onChange={(event) =>
                      handleDeliveredQuantityChange(index, event.target.value)
                    }
                    className={cn(deliveredQuantityError && "border-red-500")}
                  />
                  {deliveredQuantityError ? (
                    <FieldError>{deliveredQuantityError}</FieldError>
                  ) : null}
                </Field>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">
                    {t("fields.total")}
                  </span>
                  <span className="text-lg font-semibold">
                    {convertToCurrencyFormat({
                      cents: (item.price ?? 0) * item.deliveredQuantity,
                      currency: item.currency,
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div className="flex justify-end rounded-2xl border bg-muted/20 px-4 py-3">
          <strong className="text-lg">
            {t("labels.subtotal")}:{" "}
            {convertToCurrencyFormat({
              cents: subtotal,
              currency: items[0]?.currency ?? "TRY",
            })}
          </strong>
        </div>
      </div>

      {errors.items ? <FieldError>{errors.items}</FieldError> : null}

      <Button
        type="button"
        onClick={addItem}
        variant="outline"
        className="flex gap-2 self-start"
      >
        <Plus size={15} />
        {t("buttons.addItem")}
      </Button>
    </FieldSet>
  );
}
