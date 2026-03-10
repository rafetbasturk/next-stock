"use client";

import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  DeliveryFormBasicInfo,
  DeliveryFormFooter,
  DeliveryFormHeader,
  DeliveryFormItems,
  type DeliveryFormFieldErrors,
  type DeliveryFormItem,
  type DeliveryFormOrderOption,
  type DeliveryFormState,
} from "@/components/deliveries/delivery-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toClientError } from "@/lib/errors/client-error";
import { type DeliveryDetail, useDeliveryDetail } from "@/lib/queries/delivery-detail";
import {
  getNextDeliveryNumber,
  useDeliveryLastNumber,
} from "@/lib/queries/delivery-last-number";
import { useDeliveryOrderOptions } from "@/lib/queries/delivery-order-options";
import {
  type DeliveryMutationPayload,
  useCreateDeliveryMutation,
  useUpdateDeliveryMutation,
} from "@/lib/queries/deliveries-mutations";

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

type DeliveryUpsertDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  deliveryId?: number;
  onSaved?: () => void;
};

type DeliveryUpsertDialogContentProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  deliveryId?: number;
  onSaved?: () => void;
};

function defaultDeliveryItem(): DeliveryFormItem {
  return {
    orderId: null,
    orderItemId: null,
    customOrderItemId: null,
    productId: null,
    productCode: "",
    productName: "",
    unit: "adet",
    price: 0,
    currency: "TRY",
    stockQuantity: null,
    remainingQuantity: 0,
    deliveredQuantity: 1,
  };
}

function defaultDeliveryForm(): DeliveryFormState {
  return {
    customerId: null,
    deliveryNumber: "",
    deliveryDate: new Date(),
    kind: "DELIVERY",
    notes: "",
    items: [defaultDeliveryItem()],
  };
}

function normalizeValidationErrors(error: unknown, tValidation: (key: string) => string) {
  const clientError = toClientError(error);
  if (clientError.code !== "VALIDATION_ERROR") return {};
  if (!clientError.details || typeof clientError.details !== "object") return {};

  const details = clientError.details as Record<string, unknown>;
  const next: DeliveryFormFieldErrors = {};

  for (const [path, value] of Object.entries(details)) {
    if (!value || typeof value !== "object") continue;

    const candidate = value as { i18n?: { key?: string } };
    const key = candidate.i18n?.key;
    if (key === "required" || key === "invalid" || key === "insufficientStock") {
      next[path] = tValidation(key);
    }
  }

  return next;
}

function mergeOrderOptionsWithDeliveryDetail(
  baseOptions: Array<DeliveryFormOrderOption>,
  detail: DeliveryDetail | null | undefined,
): Array<DeliveryFormOrderOption> {
  if (!detail) return baseOptions;

  const byOrderId = new Map<number, DeliveryFormOrderOption>();

  for (const option of baseOptions) {
    byOrderId.set(option.id, {
      ...option,
      items: [...option.items],
      customItems: [...option.customItems],
    });
  }

  for (const item of detail.items) {
    const existing = byOrderId.get(item.orderId) ?? {
      id: item.orderId,
      orderNumber: item.orderNumber,
      customerId: detail.customerId,
      items: [],
      customItems: [],
    };

    if (item.orderItemId) {
      const hasStandardItem = existing.items.some(
        (standardItem) => standardItem.id === item.orderItemId,
      );

      if (!hasStandardItem) {
        existing.items.push({
          id: item.orderItemId,
          productId: item.productId ?? 0,
          quantity: Math.max(1, item.deliveredQuantity + item.remainingQuantity),
          unit: item.unit as DeliveryFormItem["unit"],
          unitPrice: item.price,
          currency: item.currency as DeliveryFormItem["currency"],
          stockQuantity: item.stockQuantity ?? null,
          product: {
            code: item.productCode,
            name: item.productName,
          },
          deliveries: [],
        });
      }
    } else if (item.customOrderItemId) {
      const hasCustomItem = existing.customItems.some(
        (customItem) => customItem.id === item.customOrderItemId,
      );

      if (!hasCustomItem) {
        existing.customItems.push({
          id: item.customOrderItemId,
          name: item.productCode,
          customCode: item.productCode,
          customName: item.productName,
          quantity: Math.max(1, item.deliveredQuantity + item.remainingQuantity),
          unit: item.unit as DeliveryFormItem["unit"],
          unitPrice: item.price,
          currency: item.currency as DeliveryFormItem["currency"],
          notes: item.productName,
          deliveries: [],
        });
      }
    }

    byOrderId.set(existing.id, existing);
  }

  return [...byOrderId.values()];
}

function DeliveryUpsertDialogContent({
  mode,
  open,
  onOpenChange,
  deliveryId,
  onSaved,
}: DeliveryUpsertDialogContentProps) {
  const isEdit = mode === "edit";
  const tTable = useTranslations("DeliveriesTable");
  const tCreate = useTranslations("DeliveriesTable.create");
  const tEdit = useTranslations("DeliveriesTable.edit");
  const tValidation = useTranslations("validation");

  const deliveryDetailQuery = useDeliveryDetail(
    deliveryId ?? 0,
    isEdit,
  );
  const [form, setForm] = useState<DeliveryFormState>(defaultDeliveryForm);
  const [fieldErrors, setFieldErrors] = useState<DeliveryFormFieldErrors>({});
  const [isDeliveryNumberDirty, setIsDeliveryNumberDirty] = useState(false);

  const deliveryOrderOptionsQuery = useDeliveryOrderOptions(open);
  const lastDeliveryNumberQuery = useDeliveryLastNumber(
    form.kind,
    mode === "create" && open,
  );
  const createDeliveryMutation = useCreateDeliveryMutation();
  const updateDeliveryMutation = useUpdateDeliveryMutation();
  const isPending = createDeliveryMutation.isPending || updateDeliveryMutation.isPending;

  const resetForm = () => {
    setForm(defaultDeliveryForm());
    setFieldErrors({});
    setIsDeliveryNumberDirty(false);
  };

  useEffect(() => {
    if (!isEdit) return;
    if (!deliveryDetailQuery.data) return;

    const detail = deliveryDetailQuery.data;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      customerId: detail.customerId,
      deliveryNumber: detail.deliveryNumber,
      deliveryDate: new Date(detail.deliveryDate),
      kind: detail.kind,
      notes: detail.notes ?? "",
      items:
        detail.items.length > 0
          ? detail.items.map((item) => ({
              orderId: item.orderId,
              orderItemId: item.orderItemId,
              customOrderItemId: item.customOrderItemId,
              productId: item.productId ?? null,
              productCode: item.productCode,
              productName: item.productName,
              unit: item.unit as DeliveryFormItem["unit"],
              price: item.price,
              currency: item.currency as DeliveryFormItem["currency"],
              stockQuantity: item.stockQuantity ?? null,
              remainingQuantity: Math.max(item.remainingQuantity, item.deliveredQuantity),
              deliveredQuantity: item.deliveredQuantity,
            }))
          : [defaultDeliveryItem()],
    });
    setFieldErrors({});
  }, [deliveryDetailQuery.data, isEdit, open]);

  useEffect(() => {
    if (isEdit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetForm();
  }, [isEdit, open]);

  useEffect(() => {
    if (isEdit) return;
    if (isDeliveryNumberDirty) return;
    if (!lastDeliveryNumberQuery.isSuccess) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      deliveryNumber: getNextDeliveryNumber(lastDeliveryNumberQuery.data, prev.kind),
    }));
  }, [
    open,
    isEdit,
    isDeliveryNumberDirty,
    lastDeliveryNumberQuery.data,
    lastDeliveryNumberQuery.isSuccess,
    setForm,
  ]);

  const availableOrderOptions = useMemo(
    () =>
      mergeOrderOptionsWithDeliveryDetail(
        deliveryOrderOptionsQuery.data ?? [],
        isEdit ? deliveryDetailQuery.data : null,
      ),
    [deliveryOrderOptionsQuery.data, deliveryDetailQuery.data, isEdit],
  );

  const ordersForCustomer = useMemo(() => {
    if (!form.customerId) return [];
    return availableOrderOptions.filter(
      (order) => order.customerId === form.customerId,
    );
  }, [availableOrderOptions, form.customerId]);

  const customerIds = useMemo(
    () =>
      Array.from(
        new Set(availableOrderOptions.map((order) => order.customerId)),
      ),
    [availableOrderOptions],
  );

  const onFormChange = <K extends keyof DeliveryFormState>(
    field: K,
    value: DeliveryFormState[K],
  ) => {
    if (field === "deliveryNumber") {
      const nextValue = String(value ?? "");
      setIsDeliveryNumberDirty(nextValue.trim().length > 0);
    }

    setForm((prev) => {
      if (field === "customerId" && prev.customerId !== value) {
        return {
          ...prev,
          customerId: value as DeliveryFormState["customerId"],
          items: [defaultDeliveryItem()],
        };
      }
      return { ...prev, [field]: value };
    });

    setFieldErrors((prev) => ({ ...prev, [String(field)]: undefined }));
  };

  const onItemChange = <K extends keyof DeliveryFormItem>(
    index: number,
    field: K,
    value: DeliveryFormItem[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((_, itemIndex) => itemIndex !== index)
          : [defaultDeliveryItem()],
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, defaultDeliveryItem()],
    }));
  };

  const buildPayload = (): DeliveryMutationPayload => ({
    customerId: form.customerId ?? 0,
    deliveryNumber: form.deliveryNumber.trim(),
    deliveryDate: form.deliveryDate.toISOString(),
    kind: form.kind,
    notes: form.notes.trim() || undefined,
    items: form.items
      .map((item) => ({
        orderItemId: item.orderItemId ?? undefined,
        customOrderItemId: item.customOrderItemId ?? undefined,
        deliveredQuantity: Math.max(1, Math.trunc(Number(item.deliveredQuantity || 0))),
      }))
      .filter(
        (item) =>
          item.deliveredQuantity > 0 &&
          ((item.orderItemId && !item.customOrderItemId) ||
            (!item.orderItemId && item.customOrderItemId)),
      ),
  });

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();

    const payload = buildPayload();
    const nextErrors: DeliveryFormFieldErrors = {};

    if (!payload.customerId) {
      nextErrors.customerId = tValidation("required");
    }
    if (!payload.deliveryNumber) {
      nextErrors.deliveryNumber = tValidation("required");
    }
    if (!payload.items.length) {
      nextErrors.items = tValidation("required");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      if (isEdit) {
        if (!deliveryId) return;
        await updateDeliveryMutation.mutateAsync({
          id: deliveryId,
          data: payload,
        });
        toast.success(tEdit("toasts.updateSuccess"));
      } else {
        await createDeliveryMutation.mutateAsync(payload);
        toast.success(tCreate("toasts.createSuccess"));
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      const validationErrors = normalizeValidationErrors(error, tValidation);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      const clientError = toClientError(error);
      if (clientError.code === "DELIVERY_NOT_FOUND") {
        toast.error(tEdit("toasts.deliveryNotFound"));
        onOpenChange(false);
        return;
      }
      if (clientError.code === "RETURN_QUANTITY_EXCEEDS_DELIVERED") {
        toast.error(tEdit("toasts.returnExceedsDelivered"));
        return;
      }
      if (clientError.code === "DELIVERY_KIND_CHANGE_NOT_ALLOWED") {
        toast.error(tEdit("toasts.kindChangeNotAllowed"));
        return;
      }

      toast.error(isEdit ? tEdit("toasts.updateFailed") : tCreate("toasts.createFailed"));
    }
  };

  const isLoading = isEdit && deliveryDetailQuery.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        onOpenChange(nextOpen);
        if (!nextOpen && !isEdit) {
          resetForm();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-6xl">
        <DeliveryFormHeader deliveryId={isEdit ? deliveryId : undefined} isSubmitting={isPending} />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : deliveryDetailQuery.isError ? (
          <div className="text-muted-foreground py-4 text-sm">{tTable("errors.loadFailed")}</div>
        ) : (
          <form className="grid min-w-0 gap-4" onSubmit={handleSubmit}>
            <DeliveryFormBasicInfo
              form={form}
              onChange={onFormChange}
              customerIds={customerIds}
              errors={fieldErrors}
              disableKindEdit={isEdit}
            />

            <DeliveryFormItems
              orders={ordersForCustomer}
              items={form.items}
              kind={form.kind}
              onItemChange={onItemChange}
              removeItem={removeItem}
              addItem={addItem}
              errors={fieldErrors}
              setErrors={setFieldErrors}
            />

            <DeliveryFormFooter
              deliveryId={isEdit ? deliveryId : undefined}
              isSubmitting={isPending}
              onClose={() => onOpenChange(false)}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DeliveryUpsertDialog({
  mode,
  open,
  onOpenChange,
  deliveryId,
  onSaved,
}: DeliveryUpsertDialogProps) {
  if (!open) {
    return null;
  }

  if (
    mode === "edit" &&
    (!Number.isInteger(deliveryId) || (deliveryId ?? 0) <= 0)
  ) {
    return null;
  }

  return (
    <DeliveryUpsertDialogContent
      mode={mode}
      open={open}
      onOpenChange={onOpenChange}
      deliveryId={deliveryId}
      onSaved={onSaved}
    />
  );
}
