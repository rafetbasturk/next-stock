"use client";

import { type ComponentProps, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import CustomerInput from "@/components/form/customer-input";
import {
  FormInputField,
  type FormInputFieldController,
} from "@/components/form/form-input-field";
import PriceInput from "@/components/form/price-input";
import UnitInput from "@/components/form/unit-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toClientError } from "@/lib/errors/client-error";
import {
  type UpdateProductPayload,
  useUpdateProductMutation,
} from "@/lib/queries/products-mutations";
import type { Currency, Unit } from "@/lib/types/domain";
import type { ProductTableRow } from "@/lib/types/products";

type EditProductFormState = {
  code: string;
  name: string;
  customerId: number | null;
  unit: Unit;
  price: string;
  currency: Currency;
  minStockLevel: number;
  material: string;
  coating: string;
  postProcess: string;
  specs: string;
  specsNet: string;
  notes: string;
};

type EditProductFieldErrors = Partial<
  Record<"code" | "name" | "customerId", string>
>;

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

type EditProductDialogProps = {
  product: ProductTableRow | null;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSaved?: () => void;
};
type EditProductDialogContentProps = {
  product: ProductTableRow;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSaved?: () => void;
};

function formatCentsToInput(cents: number | null | undefined): string {
  if (typeof cents !== "number" || cents <= 0) return "";
  return (cents / 100).toString().replace(".", ",");
}

function toSafeNonNegativeInt(
  value: number | string,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function normalizePriceInput(value: string): string {
  return value
    .replace(/\s|\u00A0/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/(?!^)-/g, "");
}

function parsePriceInputToCents(value: string): number {
  const normalized = normalizePriceInput(value).trim();
  if (!normalized || normalized === "-") return 0;
  if (normalized.startsWith("-")) return 0;

  const separators = normalized.match(/[.,]/g) ?? [];
  if (separators.length === 0) {
    const units = Number(normalized);
    if (!Number.isFinite(units)) return 0;
    return Math.max(0, Math.round(units * 100));
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const digitsAfterDecimal = normalized.length - decimalIndex - 1;

  if (digitsAfterDecimal > 2) {
    const integerDigits = normalized.replace(/[^\d]/g, "");
    if (!integerDigits) return 0;
    return Math.max(0, Number(integerDigits) * 100);
  }

  const integerPart = normalized.slice(0, decimalIndex).replace(/[^\d]/g, "");
  const fractionalPart = normalized
    .slice(decimalIndex + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2)
    .padEnd(2, "0");

  const integer = integerPart ? Number(integerPart) : 0;
  const fraction = fractionalPart ? Number(fractionalPart) : 0;

  if (!Number.isFinite(integer) || !Number.isFinite(fraction)) return 0;
  return Math.max(0, integer * 100 + fraction);
}

function toInitialState(product: ProductTableRow): EditProductFormState {
  return {
    code: product.code,
    name: product.name,
    customerId: product.customerId,
    unit: product.unit,
    price: formatCentsToInput(product.price),
    currency: product.currency,
    minStockLevel: product.minStockLevel,
    material: product.material ?? "",
    coating: product.coating ?? "",
    postProcess: product.postProcess ?? "",
    specs: product.specs ?? "",
    specsNet: product.specsNet ?? "",
    notes: product.notes ?? "",
  };
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditProductDialogProps) {
  if (!product) {
    return null;
  }

  return (
    <EditProductDialogContent
      key={product.id}
      product={product}
      open={open}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  );
}

function EditProductDialogContent({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditProductDialogContentProps) {
  const t = useTranslations("ProductsTable.edit");
  const tCreate = useTranslations("ProductsTable.create");
  const tValidation = useTranslations("validation");

  const updateProductMutation = useUpdateProductMutation();
  const isPending = updateProductMutation.isPending;

  const [activeTab, setActiveTab] = useState<"basic" | "technical">("basic");
  const [form, setForm] = useState<EditProductFormState>(() =>
    toInitialState(product),
  );
  const [fieldErrors, setFieldErrors] = useState<EditProductFieldErrors>({});
  const tabPanelClassName =
    "space-y-3 px-1 pb-1 md:h-[360px] md:overflow-y-auto";

  const clearFieldError = (field: keyof EditProductFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formController = useMemo<
    FormInputFieldController<EditProductFormState>
  >(() => {
    return {
      values: form,
      fieldErrors,
      setValue: (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === "code" || field === "name" || field === "customerId") {
          clearFieldError(field);
        }
      },
    };
  }, [fieldErrors, form]);

  const parseValidationErrors = (error: unknown): EditProductFieldErrors => {
    const clientError = toClientError(error);
    if (clientError.code !== "VALIDATION_ERROR") return {};
    if (!clientError.details || typeof clientError.details !== "object")
      return {};

    const details = clientError.details as Record<string, unknown>;
    const next: EditProductFieldErrors = {};

    const fields: Array<keyof EditProductFieldErrors> = [
      "code",
      "name",
      "customerId",
    ];

    for (const field of fields) {
      const raw = details[field];
      if (!raw || typeof raw !== "object") continue;

      const candidate = raw as { i18n?: { key?: string } };
      const key = candidate.i18n?.key;
      if (key === "required" || key === "invalid") {
        next[field] = tValidation(key);
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();

    const nextFieldErrors: EditProductFieldErrors = {};
    if (!form.code.trim()) {
      nextFieldErrors.code = tValidation("required");
    }
    if (!form.name.trim()) {
      nextFieldErrors.name = tValidation("required");
    }

    // Keep current customer when not changed from this dialog.
    const customerId = form.customerId ?? 0;
    if (!customerId || customerId <= 0) {
      nextFieldErrors.customerId = tValidation("invalid");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setActiveTab("basic");
      return;
    }

    const payload: UpdateProductPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      customerId,
      unit: form.unit,
      price: parsePriceInputToCents(form.price),
      currency: form.currency,
      minStockLevel: toSafeNonNegativeInt(form.minStockLevel, 0),
      material: form.material.trim() || undefined,
      coating: form.coating.trim() || undefined,
      postProcess: form.postProcess.trim() || undefined,
      specs: form.specs.trim() || undefined,
      specsNet: form.specsNet.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        data: payload,
      });

      toast.success(t("toasts.updateSuccess"));
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        setActiveTab("basic");
        return;
      }

      const clientError = toClientError(error);
      if (clientError.code === "PRODUCT_NOT_FOUND") {
        toast.error(t("toasts.productNotFound"));
        onOpenChange(false);
        return;
      }

      toast.error(t("toasts.updateFailed"));
    }
  };

  const customerIdValue = form.customerId ?? product.customerId;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab((value as "basic" | "technical") ?? "basic")
            }
            className="gap-3"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">
                {tCreate("tabs.basicInfo")}
              </TabsTrigger>
              <TabsTrigger value="technical">
                {tCreate("tabs.technicalInfo")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className={tabPanelClassName}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInputField
                  form={formController}
                  name="code"
                  label={tCreate("fields.code")}
                  placeholder={tCreate("placeholders.code")}
                  disabled={isPending}
                  required
                />
                <FormInputField
                  form={formController}
                  name="name"
                  label={tCreate("fields.name")}
                  placeholder={tCreate("placeholders.name")}
                  disabled={isPending}
                  required
                />
              </div>

              <CustomerInput
                value={customerIdValue}
                onValueChange={(customerId) =>
                  formController.setValue("customerId", customerId)
                }
                error={fieldErrors.customerId}
                required
                label={tCreate("fields.customer")}
                placeholder={tCreate("placeholders.customer")}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <UnitInput
                  id="edit-product-unit"
                  value={form.unit}
                  onChange={(value) => formController.setValue("unit", value)}
                  disabled={isPending}
                  labelText={tCreate("fields.unit")}
                />

                <PriceInput
                  name="edit-product-price"
                  label={tCreate("fields.price")}
                  price={form.price}
                  currency={form.currency}
                  onPriceValueChange={(value) =>
                    formController.setValue("price", value)
                  }
                  onPriceChange={(event) =>
                    formController.setValue(
                      "price",
                      normalizePriceInput(event.target.value),
                    )
                  }
                  onCurrencyChange={(value) =>
                    formController.setValue("currency", value)
                  }
                  showCurrencySymbol
                  showCurrencySelect
                />
              </div>
            </TabsContent>

            <TabsContent value="technical" className={tabPanelClassName}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInputField
                  form={formController}
                  name="minStockLevel"
                  label={tCreate("fields.minStockLevel")}
                  type="number"
                  min={0}
                  step={1}
                  disabled={isPending}
                />
                <div className="grid gap-1">
                  <Label>{t("fields.currentStock")}</Label>
                  <div className="h-8 rounded-lg border bg-muted px-2.5 text-sm inline-flex items-center">
                    {product.stockQuantity} {product.unit}
                  </div>
                </div>
              </div>

              <FormInputField
                form={formController}
                name="material"
                label={tCreate("fields.material")}
                placeholder={tCreate("placeholders.material")}
                disabled={isPending}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInputField
                  form={formController}
                  name="coating"
                  label={tCreate("fields.coating")}
                  placeholder={tCreate("placeholders.coating")}
                  disabled={isPending}
                />
                <FormInputField
                  form={formController}
                  name="postProcess"
                  label={tCreate("fields.postProcess")}
                  placeholder={tCreate("placeholders.postProcess")}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormInputField
                  form={formController}
                  name="specs"
                  label={tCreate("fields.specs")}
                  placeholder={tCreate("placeholders.specs")}
                  disabled={isPending}
                />
                <FormInputField
                  form={formController}
                  name="specsNet"
                  label={tCreate("fields.specsNet")}
                  placeholder={tCreate("placeholders.specsNet")}
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-product-notes">
                  {tCreate("fields.notes")}
                </Label>
                <Textarea
                  id="edit-product-notes"
                  value={form.notes}
                  onChange={(event) =>
                    formController.setValue("notes", event.target.value)
                  }
                  placeholder={tCreate("placeholders.notes")}
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {t("buttons.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
