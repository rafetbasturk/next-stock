import * as React from "react";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

export type InputFieldError =
  | string
  | {
      message?: string;
      i18n?: {
        key?: string;
        ns?: string;
      };
      params?: Record<string, unknown>;
    };

interface InputFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "name"
> {
  name: string;
  label?: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: InputFieldError;
}

function getErrorText(error?: InputFieldError): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error.i18n?.key === "string" && error.i18n.key.trim().length > 0) {
    return error.i18n.key;
  }
  return undefined;
}

export default function InputField({
  name,
  label,
  value,
  onChange,
  required = false,
  error,
  className,
  ...inputProps
}: InputFieldProps) {
  const errorText = getErrorText(error);

  return (
    <Field className="gap-1 relative">
      {label && (
        <FieldLabel
          htmlFor={name}
          className={cn("capitalize", error && "text-red-500")}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </FieldLabel>
      )}

      <Input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={!!error}
        {...inputProps}
        className={cn(error && "border-red-500", className)}
      />

      {errorText ? (
        <FieldError className="text-xs absolute -bottom-4.5">{errorText}</FieldError>
      ) : null}
    </Field>
  );
}
