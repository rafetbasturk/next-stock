"use client";

import { type ComponentProps, useEffect } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  OrderFormBasicInfo,
  OrderFormFooter,
  OrderFormHeader,
  OrderFormItems,
  useOrderForm,
} from "@/components/order-form";
import { normalizeFieldPath } from "@/components/order-form/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { convertToBaseCurrency, type Rate } from "@/lib/currency";
import { toClientError } from "@/lib/errors/client-error";
import {
  getNextOrderNumber,
  useOrderLastNumber,
} from "@/lib/queries/order-last-number";
import { useOrderProductOptions } from "@/lib/queries/order-product-options";
import type { OrderDetail } from "@/lib/queries/order-detail";
import {
  type CreateOrderInput,
  type UpsertOrderInput,
  useCreateOrderMutation,
  useUpdateOrderMutation,
} from "@/lib/queries/orders-mutations";
import type { Currency } from "@/lib/types/domain";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

type OrderUpsertDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  order?: OrderDetail | null;
  onSaved?: () => void;
};

function convertUnitPrice(
  unitPrice: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Array<Rate>,
) {
  if (fromCurrency === toCurrency) {
    return Math.max(0, Math.round(unitPrice));
  }

  try {
    return Math.max(
      0,
      Math.round(convertToBaseCurrency(unitPrice, fromCurrency, toCurrency, rates)),
    );
  } catch {
    return Math.max(0, Math.round(unitPrice));
  }
}

export function OrderUpsertDialog({
  mode,
  open,
  onOpenChange,
  order,
  onSaved,
}: OrderUpsertDialogProps) {
  const isEdit = mode === "edit";
  const tValidation = useTranslations("validation");
  const tCreate = useTranslations("OrdersTable.create");
  const tEdit = useTranslations("OrdersTable.edit");
  const rates = useExchangeRatesStore((state) => state.rates);

  const productOptionsQuery = useOrderProductOptions();
  const lastOrderNumberQuery = useOrderLastNumber(mode === "create" && open);
  const createOrderMutation = useCreateOrderMutation();
  const updateOrderMutation = useUpdateOrderMutation();
  const isPending = createOrderMutation.isPending || updateOrderMutation.isPending;

  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    errorHelpers,
    handleChange,
    addItem,
    removeItem,
    addCustomItem,
    removeCustomItem,
    validateForm,
    toggleCustomMode,
  } = useOrderForm({
    order: order ?? undefined,
    requiredErrorMessage: tValidation("required"),
    invalidErrorMessage: tValidation("invalid"),
  });

  const clearFieldError = (path: string) => {
    errorHelpers.clear(path);
  };

  const onItemChange = (
    index: number,
    field: keyof (typeof form.items)[number],
    value: unknown,
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    errorHelpers.clear(`items.${index}.${String(field)}`);
  };

  const onCustomItemChange = (
    index: number,
    field: keyof (typeof form.customItems)[number],
    value: unknown,
  ) => {
    setForm((prev) => ({
      ...prev,
      customItems: prev.customItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    errorHelpers.clear(`customItems.${index}.${String(field)}`);
  };

  const onCurrencyChange = (nextCurrency: Currency) => {
    setForm((prev) => {
      const currentCurrency = prev.currency;
      if (nextCurrency === currentCurrency) return prev;

      return {
        ...prev,
        currency: nextCurrency,
        items: prev.items.map((item) => {
          const sourceCurrency = (item.currency || currentCurrency) as Currency;
          const convertedUnitPrice = convertUnitPrice(
            Number(item.unitPrice ?? 0),
            sourceCurrency,
            nextCurrency,
            rates,
          );

          return {
            ...item,
            unitPrice: convertedUnitPrice,
            unitPriceRaw: undefined,
            currency: nextCurrency,
          };
        }),
        customItems: prev.customItems.map((item) => {
          const sourceCurrency = (item.currency || currentCurrency) as Currency;
          const convertedUnitPrice = convertUnitPrice(
            Number(item.unitPrice ?? 0),
            sourceCurrency,
            nextCurrency,
            rates,
          );

          return {
            ...item,
            unitPrice: convertedUnitPrice,
            unitPriceRaw: undefined,
            currency: nextCurrency,
          };
        }),
      };
    });
  };

  useEffect(() => {
    if (!open || isEdit) return;
    if (!lastOrderNumberQuery.isSuccess) return;
    if (form.orderNumber.trim().length > 0) return;

    setForm((prev) => {
      if (prev.orderNumber.trim().length > 0) return prev;

      return {
        ...prev,
        orderNumber: getNextOrderNumber(lastOrderNumberQuery.data),
      };
    });
  }, [
    open,
    isEdit,
    form.orderNumber,
    lastOrderNumberQuery.data,
    lastOrderNumberQuery.isSuccess,
    setForm,
  ]);

  const parseValidationErrors = (error: unknown): Record<string, string> => {
    const clientError = toClientError(error);
    if (clientError.code !== "VALIDATION_ERROR") return {};
    if (!clientError.details || typeof clientError.details !== "object") {
      return {};
    }

    const details = clientError.details as Record<string, unknown>;
    const next: Record<string, string> = {};

    for (const [path, value] of Object.entries(details)) {
      if (!value || typeof value !== "object") continue;
      const candidate = value as { i18n?: { key?: string } };
      const key = candidate.i18n?.key;
      if (key === "required" || key === "invalid") {
        next[normalizeFieldPath(path)] = tValidation(key);
      }
    }

    return next;
  };

  const buildPayload = (): UpsertOrderInput => {
    const payload: CreateOrderInput = {
      isCustomOrder: form.isCustomOrder,
      orderNumber: form.orderNumber.trim(),
      orderDate: form.orderDate.toISOString(),
      customerId: form.customerId,
      status: form.status,
      currency: form.currency,
      deliveryAddress: form.deliveryAddress.trim() || undefined,
      notes: form.notes.trim() || undefined,
      items: form.isCustomOrder
        ? []
        : form.items
            .filter((item) => item.productId > 0)
            .map((item) => ({
              productId: item.productId,
              quantity: Math.max(1, Math.trunc(Number(item.quantity || 0))),
              unitPrice: Math.max(0, Math.trunc(Number(item.unitPrice || 0))),
              currency: item.currency || form.currency,
            })),
      customItems: form.isCustomOrder
        ? form.customItems
            .filter((item) => item.name.trim().length > 0)
            .map((item) => ({
              name: item.name.trim(),
              unit: item.unit || "adet",
              quantity: Math.max(1, Math.trunc(Number(item.quantity || 0))),
              unitPrice: Math.max(0, Math.trunc(Number(item.unitPrice || 0))),
              currency: item.currency || form.currency,
              notes: item.notes.trim() || undefined,
            }))
        : [],
    };

    return payload;
  };

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = buildPayload();

    try {
      if (isEdit) {
        if (!order?.id) return;
        await updateOrderMutation.mutateAsync({
          id: order.id,
          data: payload,
        });
        toast.success(tEdit("toasts.updateSuccess"));
      } else {
        await createOrderMutation.mutateAsync(payload);
        toast.success(tCreate("toasts.createSuccess"));
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      const clientError = toClientError(error);
      if (clientError.code === "ORDER_NOT_FOUND") {
        toast.error(tEdit("toasts.orderNotFound"));
        onOpenChange(false);
        return;
      }

      if (clientError.code === "ORDER_HAS_DELIVERIES") {
        toast.error(tEdit("toasts.orderHasDeliveries"));
        return;
      }

      toast.error(
        isEdit
          ? tEdit("toasts.updateFailed")
          : tCreate("toasts.createFailed"),
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-6xl">
        <OrderFormHeader orderId={isEdit ? (order?.id ?? undefined) : undefined} />

        <form className="grid min-w-0 gap-4" onSubmit={handleSubmit}>
          <OrderFormBasicInfo
            order={isEdit ? (order as unknown as object) : null}
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            clearFieldError={clearFieldError}
            onChange={handleChange}
            onCurrencyChange={onCurrencyChange}
          />

          <OrderFormItems
            form={form}
            errorHelpers={errorHelpers}
            products={productOptionsQuery.data}
            isLoading={productOptionsQuery.isPending}
            toggleCustomMode={toggleCustomMode}
            onItemChange={onItemChange}
            removeItem={removeItem}
            addItem={addItem}
            onCustomItemChange={onCustomItemChange}
            removeCustomItem={removeCustomItem}
            addCustomItem={addCustomItem}
          />

          <OrderFormFooter
            orderId={isEdit ? (order?.id ?? undefined) : undefined}
            isSubmitting={isPending}
            onClose={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrderDialogLoading({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
