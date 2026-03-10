import * as React from "react";
import InputField from "./input-field";

export type FormInputFieldController<T> = {
  values: T;
  fieldErrors: Record<string, string | undefined>;
  setValue: <TKey extends keyof T>(key: TKey, value: T[TKey]) => void;
};

interface FormInputFieldProps<T> extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "onChange" | "form"
> {
  form: FormInputFieldController<T>;
  name: keyof T;
  label: string;
}

export function FormInputField<T>({
  form,
  name,
  label,
  ...inputProps
}: FormInputFieldProps<T>) {
  const value = form.values[name];
  const error = form.fieldErrors[String(name)];
  const { onFocus, type, ...restInputProps } = inputProps;

  return (
    <InputField
      name={String(name)}
      label={label}
      value={value as string | number | undefined}
      error={error}
      onChange={(e) => {
        const raw = e.target.value;

        let nextValue: unknown = raw;

        if (typeof value === "number") {
          if (raw === "") {
            nextValue = "";
          } else {
            const parsed = Number(raw);
            nextValue = Number.isNaN(parsed) ? raw : parsed;
          }
        }

        form.setValue(name, nextValue as T[typeof name]);
      }}
      onFocus={(event) => {
        if (type === "number" && value === 0) {
          form.setValue(name, "" as T[typeof name]);
        }

        onFocus?.(event);
      }}
      type={type}
      {...restInputProps}
    />
  );
}
