"use client";

import { type ComponentProps, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  FormInputField,
  type FormInputFieldController,
} from "@/components/form/form-input-field";
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
import { Textarea } from "@/components/ui/textarea";
import { toClientError } from "@/lib/errors/client-error";
import {
  type CustomerMutationPayload,
  useCreateCustomerMutation,
} from "@/lib/queries/customers-mutations";

type CreateCustomerFormState = {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type CreateCustomerFieldErrors = Partial<Record<"code" | "name", string>>;

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const INITIAL_FORM_STATE: CreateCustomerFormState = {
  code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
};

export function CreateCustomerButton() {
  const tApp = useTranslations("App");
  const t = useTranslations("CustomersTable.create");
  const tValidation = useTranslations("validation");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCustomerFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<CreateCustomerFieldErrors>({});

  const createCustomerMutation = useCreateCustomerMutation();
  const isPending = createCustomerMutation.isPending;

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE);
    setFieldErrors({});
  };

  const clearFieldError = (field: keyof CreateCustomerFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formController: FormInputFieldController<CreateCustomerFormState> = {
    values: form,
    fieldErrors,
    setValue: (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (field === "code" || field === "name") {
        clearFieldError(field);
      }
    },
  };

  const parseValidationErrors = (error: unknown): CreateCustomerFieldErrors => {
    const clientError = toClientError(error);
    if (clientError.code !== "VALIDATION_ERROR") return {};
    if (!clientError.details || typeof clientError.details !== "object")
      return {};

    const details = clientError.details as Record<string, unknown>;
    const next: CreateCustomerFieldErrors = {};

    const fields: Array<keyof CreateCustomerFieldErrors> = ["code", "name"];

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

    const nextFieldErrors: CreateCustomerFieldErrors = {};
    if (!form.code.trim()) {
      nextFieldErrors.code = tValidation("required");
    }
    if (!form.name.trim()) {
      nextFieldErrors.name = tValidation("required");
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const payload: CustomerMutationPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    try {
      await createCustomerMutation.mutateAsync(payload);
      toast.success(t("toasts.createSuccess"));
      setOpen(false);
      resetForm();
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
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
        onClick={() => setOpen(true)}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormInputField
                form={formController}
                name="email"
                label={t("fields.email")}
                placeholder={t("placeholders.email")}
                disabled={isPending}
              />
              <FormInputField
                form={formController}
                name="phone"
                label={t("fields.phone")}
                placeholder={t("placeholders.phone")}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="create-customer-address">{t("fields.address")}</Label>
              <Textarea
                id="create-customer-address"
                value={form.address}
                onChange={(event) =>
                  formController.setValue("address", event.target.value)
                }
                placeholder={t("placeholders.address")}
                disabled={isPending}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
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
