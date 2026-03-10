"use client";

import { type ComponentProps, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
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
  type CreateProductInput,
  useCreateProductMutation,
} from "@/lib/queries/products-create";
import type { Currency, Unit } from "@/lib/types/domain";

type CreateProductFormState = {
  code: string;
  name: string;
  customerId: number | null;
  unit: Unit;
  price: string;
  currency: Currency;
  stockQuantity: number;
  minStockLevel: number;
  material: string;
  coating: string;
  postProcess: string;
  specs: string;
  specsNet: string;
  notes: string;
};

type CreateProductFieldErrors = Partial<
  Record<"code" | "name" | "customerId", string>
>;

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const INITIAL_FORM_STATE: CreateProductFormState = {
  code: "",
  name: "",
  customerId: null,
  unit: "adet",
  price: "",
  currency: "TRY",
  stockQuantity: 0,
  minStockLevel: 0,
  material: "",
  coating: "",
  postProcess: "",
  specs: "",
  specsNet: "",
  notes: "",
};
const tabPanelClassName = "space-y-3 px-1 pb-1 md:h-[360px] md:overflow-y-auto";

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

  // Common pasted format: 1.234 or 1,234 (thousands grouping, no decimals)
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

export function CreateProductButton() {
  const tApp = useTranslations("App");
  const t = useTranslations("ProductsTable.create");
  const tValidation = useTranslations("validation");

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "technical">("basic");
  const [form, setForm] = useState<CreateProductFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<CreateProductFieldErrors>({});

  const createProductMutation = useCreateProductMutation();
  const isPending = createProductMutation.isPending;

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE);
    setFieldErrors({});
  };

  const clearFieldError = (field: keyof CreateProductFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formController: FormInputFieldController<CreateProductFormState> = {
    values: form,
    fieldErrors,
    setValue: (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (field === "code" || field === "name" || field === "customerId") {
        clearFieldError(field);
      }
    },
  };

  const parseValidationErrors = (error: unknown): CreateProductFieldErrors => {
    const clientError = toClientError(error);
    if (clientError.code !== "VALIDATION_ERROR") return {};
    if (!clientError.details || typeof clientError.details !== "object")
      return {};

    const details = clientError.details as Record<string, unknown>;
    const next: CreateProductFieldErrors = {};

    const fields: Array<keyof CreateProductFieldErrors> = [
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

    const nextFieldErrors: CreateProductFieldErrors = {};
    if (!form.code.trim()) {
      nextFieldErrors.code = tValidation("required");
    }
    if (!form.name.trim()) {
      nextFieldErrors.name = tValidation("required");
    }
    if (!form.customerId || form.customerId <= 0) {
      nextFieldErrors.customerId = tValidation("invalid");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setActiveTab("basic");
      return;
    }

    const payload: CreateProductInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      customerId: form.customerId!,
      unit: form.unit,
      price: parsePriceInputToCents(form.price),
      currency: form.currency,
      stockQuantity: toSafeNonNegativeInt(form.stockQuantity, 0),
      minStockLevel: toSafeNonNegativeInt(form.minStockLevel, 0),
      material: form.material.trim() || undefined,
      coating: form.coating.trim() || undefined,
      postProcess: form.postProcess.trim() || undefined,
      specs: form.specs.trim() || undefined,
      specsNet: form.specsNet.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      await createProductMutation.mutateAsync(payload);
      toast.success(t("toasts.createSuccess"));
      setOpen(false);
      resetForm();
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        setActiveTab("basic");
        return;
      }

      toast.error(t("toasts.createFailed"));
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setActiveTab("basic");
          setOpen(true);
        }}
        disabled={isPending}
      >
        {isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        <span className="hidden sm:inline">{tApp("actions.add")}</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending) return;
          setOpen(nextOpen);
          if (!nextOpen) {
            setActiveTab("basic");
            resetForm();
          }
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
                <TabsTrigger value="basic">{t("tabs.basicInfo")}</TabsTrigger>
                <TabsTrigger value="technical">
                  {t("tabs.technicalInfo")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className={tabPanelClassName}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormInputField
                    form={formController}
                    name="code"
                    label={t("fields.code")}
                    placeholder={t("placeholders.code")}
                    disabled={isPending}
                    required
                  />
                  <FormInputField
                    form={formController}
                    name="name"
                    label={t("fields.name")}
                    placeholder={t("placeholders.name")}
                    disabled={isPending}
                    required
                  />
                </div>

                <CustomerInput
                  value={form.customerId}
                  onValueChange={(customerId) => {
                    formController.setValue("customerId", customerId);
                  }}
                  error={fieldErrors.customerId}
                  required
                  label={t("fields.customer")}
                  placeholder={t("placeholders.customer")}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <UnitInput
                    id="create-product-unit"
                    value={form.unit}
                    onChange={(value) => formController.setValue("unit", value)}
                    disabled={isPending}
                    labelText={t("fields.unit")}
                  />

                  <PriceInput
                    name="create-product-price"
                    label={t("fields.price")}
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
                    name="stockQuantity"
                    label={t("fields.initialStock")}
                    type="number"
                    min={0}
                    step={1}
                    disabled={isPending}
                  />
                  <FormInputField
                    form={formController}
                    name="minStockLevel"
                    label={t("fields.minStockLevel")}
                    type="number"
                    min={0}
                    step={1}
                    disabled={isPending}
                  />
                </div>

                <FormInputField
                  form={formController}
                  name="material"
                  label={t("fields.material")}
                  placeholder={t("placeholders.material")}
                  disabled={isPending}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormInputField
                    form={formController}
                    name="coating"
                    label={t("fields.coating")}
                    placeholder={t("placeholders.coating")}
                    disabled={isPending}
                  />
                  <FormInputField
                    form={formController}
                    name="postProcess"
                    label={t("fields.postProcess")}
                    placeholder={t("placeholders.postProcess")}
                    disabled={isPending}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormInputField
                    form={formController}
                    name="specs"
                    label={t("fields.specs")}
                    placeholder={t("placeholders.specs")}
                    disabled={isPending}
                  />
                  <FormInputField
                    form={formController}
                    name="specsNet"
                    label={t("fields.specsNet")}
                    placeholder={t("placeholders.specsNet")}
                    disabled={isPending}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="create-product-notes">
                    {t("fields.notes")}
                  </Label>
                  <Textarea
                    id="create-product-notes"
                    value={form.notes}
                    onChange={(event) =>
                      formController.setValue("notes", event.target.value)
                    }
                    placeholder={t("placeholders.notes")}
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
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={isPending}
              >
                {t("buttons.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Icon className="animate-spin" /> : null}
                {t("buttons.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
