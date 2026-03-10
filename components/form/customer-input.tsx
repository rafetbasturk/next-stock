"use client";

import { useEffect, useMemo } from "react";

import EntitySelect, {
  type EntitySelectError,
  type EntitySelectFieldErrors,
} from "./entity-select";
import { useCustomerFilterOptions } from "@/lib/queries/customer-filter-options";

type CustomerOption = {
  id: number;
  code: string;
  name: string;
};

type Props = {
  value: number | null;
  onValueChange: (id: number | null) => void;
  error?: EntitySelectError;
  onErrorChange?: React.Dispatch<React.SetStateAction<EntitySelectFieldErrors>>;
  required?: boolean;
  label?: string;
  includeAllOption?: boolean;
  filterIds?: Array<number>;
  distinct?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  autoSelectFirst?: boolean;
};

export default function CustomerInput({
  value,
  onValueChange,
  error,
  onErrorChange,
  required = false,
  label,
  includeAllOption = false,
  filterIds,
  distinct = false,
  allOptionLabel = "Tüm müşteriler",
  placeholder = "Tüm müşteriler",
  autoSelectFirst = false,
}: Props) {
  const { data: customers, isPending } = useCustomerFilterOptions({ distinct });

  const filtered = useMemo(() => {
    if (!customers) return [];
    if (!filterIds?.length) return customers;
    return customers.filter((customer) => filterIds.includes(customer.id));
  }, [customers, filterIds]);

  const customerOptions = useMemo(
    () =>
      filtered.map((customer: CustomerOption) => ({
        id: customer.id,
        value: String(customer.id),
        returnValue: customer.id,
        label: `${customer.code} - ${customer.name}`,
      })),
    [filtered],
  );

  useEffect(() => {
    if (filtered.length === 1 && value === null) {
      onValueChange(filtered[0].id);
    }
  }, [filtered, value, onValueChange]);

  useEffect(() => {
    if (!autoSelectFirst || includeAllOption || value !== null) return;
    if (filtered.length === 0) return;
    onValueChange(filtered[0].id);
  }, [autoSelectFirst, filtered, includeAllOption, onValueChange, value]);

  const options = useMemo(
    () =>
      includeAllOption
        ? [
            {
              id: "all",
              label: allOptionLabel,
              value: "all",
              returnValue: null,
            },
            ...customerOptions,
          ]
        : customerOptions,
    [allOptionLabel, customerOptions, includeAllOption],
  );

  return (
    <EntitySelect
      name="customer_id"
      label={label}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
      error={error}
      onErrorChange={onErrorChange}
      required={required}
      loading={isPending}
      options={options}
    />
  );
}
