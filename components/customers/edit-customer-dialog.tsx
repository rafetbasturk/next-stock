"use client";

import { type ComponentProps, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
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
  useUpdateCustomerMutation,
} from "@/lib/queries/customers-mutations";
import type { CustomerTableRow } from "@/lib/types/customers";

type EditCustomerFormState = {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type EditCustomerFieldErrors = Partial<Record<"code" | "name", string>>;

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

type EditCustomerDialogProps = {
  customer: CustomerTableRow | null;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSaved?: () => void;
};

type EditCustomerDialogContentProps = {
  customer: CustomerTableRow;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSaved?: () => void;
};

function toInitialState(customer: CustomerTableRow): EditCustomerFormState {
  return {
    code: customer.code,
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
  };
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onSaved,
}: EditCustomerDialogProps) {
  if (!customer) return null;

  return (
    <EditCustomerDialogContent
      key={customer.id}
      customer={customer}
      open={open}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  );
}

function EditCustomerDialogContent({
  customer,
  open,
  onOpenChange,
  onSaved,
}: EditCustomerDialogContentProps) {
  const t = useTranslations("CustomersTable.edit");
  const tCreate = useTranslations("CustomersTable.create");
  const tValidation = useTranslations("validation");

  const updateCustomerMutation = useUpdateCustomerMutation();
  const isPending = updateCustomerMutation.isPending;

  const [form, setForm] = useState<EditCustomerFormState>(() =>
    toInitialState(customer),
  );
  const [fieldErrors, setFieldErrors] = useState<EditCustomerFieldErrors>({});

  const clearFieldError = (field: keyof EditCustomerFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formController = useMemo<FormInputFieldController<EditCustomerFormState>>(
    () => ({
      values: form,
      fieldErrors,
      setValue: (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === "code" || field === "name") {
          clearFieldError(field);
        }
      },
    }),
    [fieldErrors, form],
  );

  const parseValidationErrors = (error: unknown): EditCustomerFieldErrors => {
    const clientError = toClientError(error);
    if (clientError.code !== "VALIDATION_ERROR") return {};
    if (!clientError.details || typeof clientError.details !== "object")
      return {};

    const details = clientError.details as Record<string, unknown>;
    const next: EditCustomerFieldErrors = {};

    const fields: Array<keyof EditCustomerFieldErrors> = ["code", "name"];
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

    const nextFieldErrors: EditCustomerFieldErrors = {};
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
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        data: payload,
      });

      toast.success(t("toasts.updateSuccess"));
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      const validationErrors = parseValidationErrors(error);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      const clientError = toClientError(error);
      if (clientError.code === "CUSTOMER_NOT_FOUND") {
        toast.error(t("toasts.customerNotFound"));
        onOpenChange(false);
        return;
      }

      toast.error(t("toasts.updateFailed"));
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInputField
              form={formController}
              name="email"
              label={tCreate("fields.email")}
              placeholder={tCreate("placeholders.email")}
              disabled={isPending}
            />
            <FormInputField
              form={formController}
              name="phone"
              label={tCreate("fields.phone")}
              placeholder={tCreate("placeholders.phone")}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="edit-customer-address">{tCreate("fields.address")}</Label>
            <Textarea
              id="edit-customer-address"
              value={form.address}
              onChange={(event) =>
                formController.setValue("address", event.target.value)
              }
              placeholder={tCreate("placeholders.address")}
              disabled={isPending}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
