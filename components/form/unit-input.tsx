"use client";

import { Field, FieldLabel } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { unitArray } from "@/lib/constants";
import { toUnitOrDefault, type Unit } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  value: Unit;
  onChange: (value: Unit) => void;
  label?: boolean;
  labelText?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

export default function UnitInput({
  value,
  onChange,
  labelText = "Birim",
  placeholder = "Birim seçin",
  id = "unit",
  name = "unit",
  disabled = false,
  className,
  triggerClassName,
}: Props) {
  return (
    <Field className={cn("gap-1", className)}>
      {labelText ? <FieldLabel htmlFor={id}>{labelText}</FieldLabel> : null}
      <Select
        name={name}
        value={value}
        onValueChange={(nextValue) => onChange(toUnitOrDefault(nextValue))}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn("w-full capitalize", triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {unitArray.map((unitValue) => (
            <SelectItem
              key={unitValue}
              value={String(unitValue)}
              className="capitalize"
            >
              {unitValue}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
