"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  FormErrors,
  OrderFormFieldErrors,
  OrderFormSource,
  OrderFormState,
  UseOrderFormArgs,
} from "@/components/order-form/types";
import { normalizeFieldPath } from "@/components/order-form/utils";
import {
  toOrderStatusOrDefault,
  toUnitOrDefault,
  type Currency,
  type Unit,
} from "@/lib/types/domain";

function defaultItem(currency: Currency) {
  return {
    productId: 0,
    quantity: 1,
    unitPrice: 0,
    currency,
  };
}

function defaultCustomItem(currency: Currency) {
  return {
    name: "",
    unit: "adet" as Unit,
    quantity: 1,
    unitPrice: 0,
    currency,
    notes: "",
  };
}

function toSafeDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function hasVisibleUnitPriceInput(unitPrice: number, unitPriceRaw?: string): boolean {
  if (typeof unitPriceRaw === "string") {
    return unitPriceRaw.trim().length > 0 && /\d/.test(unitPriceRaw);
  }

  return Number.isFinite(unitPrice) && unitPrice > 0;
}

function toInitialForm(order?: OrderFormSource): OrderFormState {
  const currency = order?.currency ?? "TRY";
  const isCustomOrder = Boolean(order?.isCustomOrder ?? order?.is_custom_order);

  const items =
    order?.items?.map((item) => ({
      id: item.id,
      productId: Number(item.productId ?? item.product_id ?? 0),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      currency: item.currency ?? currency,
    })) ?? [];

  const customItems =
    order?.customItems?.map((item) => ({
      id: item.id,
      name: item.name ?? "",
      unit: toUnitOrDefault(item.unit),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      currency: item.currency ?? currency,
      notes: item.notes ?? "",
    })) ?? [];

  return {
    isCustomOrder,
    orderNumber: order?.orderNumber ?? order?.order_number ?? "",
    orderDate: toSafeDate(order?.orderDate ?? order?.order_date ?? undefined),
    customerId: Number(order?.customerId ?? order?.customer_id ?? 0),
    status: toOrderStatusOrDefault(order?.status),
    currency,
    deliveryAddress: order?.deliveryAddress ?? order?.delivery_address ?? "",
    notes: order?.notes ?? "",
    items: isCustomOrder ? [] : items.length > 0 ? items : [defaultItem(currency)],
    customItems: isCustomOrder
      ? customItems.length > 0
        ? customItems
        : [defaultCustomItem(currency)]
      : customItems,
  };
}

export function useOrderForm({
  order,
  requiredErrorMessage = "Required",
  invalidErrorMessage = "Invalid",
}: UseOrderFormArgs = {}) {
  const [form, setForm] = useState<OrderFormState>(() => toInitialForm(order));
  const [fieldErrors, setFieldErrors] = useState<OrderFormFieldErrors>({});
  const [prevCurrency, setPrevCurrency] = useState<Currency>(
    order?.currency ?? "TRY",
  );

  const errorHelpers: FormErrors = useMemo(
    () => ({
      get: (path) => fieldErrors[normalizeFieldPath(path)],
      set: (path, message) => {
        const normalizedPath = normalizeFieldPath(path);
        setFieldErrors((prev) => ({ ...prev, [normalizedPath]: message }));
      },
      clear: (path) => {
        const normalizedPath = normalizeFieldPath(path);
        setFieldErrors((prev) => {
          if (!prev[normalizedPath]) return prev;
          const next = { ...prev };
          delete next[normalizedPath];
          return next;
        });
      },
      has: (path) => Boolean(fieldErrors[normalizeFieldPath(path)]),
    }),
    [fieldErrors],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;

      setForm((prev) => {
        if (name === "orderNumber") return { ...prev, orderNumber: value };
        if (name === "deliveryAddress") return { ...prev, deliveryAddress: value };
        if (name === "notes") return { ...prev, notes: value };
        return prev;
      });

      errorHelpers.clear(name);
    },
    [errorHelpers],
  );

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, defaultItem(prev.currency)],
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const addCustomItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      customItems: [...prev.customItems, defaultCustomItem(prev.currency)],
    }));
  }, []);

  const removeCustomItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      customItems: prev.customItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const handleCustomerChange = useCallback((id: number | null) => {
    setForm((prev) => ({
      ...prev,
      customerId: id ?? 0,
    }));
    errorHelpers.clear("customerId");
  }, [errorHelpers]);

  const toggleCustomMode = useCallback((checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isCustomOrder: checked,
      items: checked
        ? []
        : prev.items.length > 0
          ? prev.items
          : [defaultItem(prev.currency)],
      customItems: checked
        ? prev.customItems.length > 0
          ? prev.customItems
          : [defaultCustomItem(prev.currency)]
        : prev.customItems,
    }));
    setFieldErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors: OrderFormFieldErrors = {};

    if (!form.orderNumber.trim()) {
      nextErrors.orderNumber = requiredErrorMessage;
    }

    if (!form.customerId || form.customerId <= 0) {
      nextErrors.customerId = requiredErrorMessage;
    }

    if (!(form.orderDate instanceof Date) || Number.isNaN(form.orderDate.getTime())) {
      nextErrors.orderDate = requiredErrorMessage;
    }

    if (form.isCustomOrder) {
      if (!form.customItems.length) {
        nextErrors.customItems = invalidErrorMessage;
      }
      form.customItems.forEach((item, index) => {
        if (!item.name.trim()) {
          nextErrors[`customItems.${index}.name`] = requiredErrorMessage;
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          nextErrors[`customItems.${index}.quantity`] = invalidErrorMessage;
        }
        if (!hasVisibleUnitPriceInput(item.unitPrice, item.unitPriceRaw)) {
          nextErrors[`customItems.${index}.unitPrice`] = requiredErrorMessage;
        }
      });
    } else {
      if (!form.items.length) {
        nextErrors.items = invalidErrorMessage;
      }
      form.items.forEach((item, index) => {
        if (!item.productId || item.productId <= 0) {
          nextErrors[`items.${index}.productId`] = requiredErrorMessage;
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          nextErrors[`items.${index}.quantity`] = invalidErrorMessage;
        }
        if (!hasVisibleUnitPriceInput(item.unitPrice, item.unitPriceRaw)) {
          nextErrors[`items.${index}.unitPrice`] = requiredErrorMessage;
        }
      });
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form, invalidErrorMessage, requiredErrorMessage]);

  return {
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
    handleCustomerChange,
    prevCurrency,
    setPrevCurrency,
    validateForm,
    toggleCustomMode,
  };
}
