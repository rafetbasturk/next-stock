"use client";

import { useTranslations } from "next-intl";
import OrderFormCustomItemInfo from "@/components/order-form/order-form-custom-item-info";
import OrderFormProductInfo from "@/components/order-form/order-form-product-info";
import type {
  FormErrors,
  OrderFormState,
  SelectProduct,
} from "@/components/order-form/types";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

type Props = {
  form: OrderFormState;
  errorHelpers: FormErrors;
  products?: Array<SelectProduct>;
  isLoading: boolean;
  toggleCustomMode: (checked: boolean) => void;
  onItemChange: (
    index: number,
    field: keyof OrderFormState["items"][number],
    value: unknown,
  ) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
  onCustomItemChange: (
    index: number,
    field: keyof OrderFormState["customItems"][number],
    value: unknown,
  ) => void;
  removeCustomItem: (index: number) => void;
  addCustomItem: () => void;
};

export default function OrderFormItems({
  form,
  errorHelpers,
  products,
  isLoading,
  toggleCustomMode,
  onItemChange,
  removeItem,
  addItem,
  onCustomItemChange,
  removeCustomItem,
  addCustomItem,
}: Props) {
  const tCreate = useTranslations("OrdersTable.create");

  const customOrderStateLabel = form.isCustomOrder
    ? tCreate("toggleCustom.on")
    : tCreate("toggleCustom.off");

  return (
    <FieldSet className="min-w-0">
      <div className="flex items-center justify-between">
        <FieldLegend className="m-0">{tCreate("items.title")}</FieldLegend>
        <div className="flex items-center space-x-2">
          <Label htmlFor="custom-order">{tCreate("toggleCustom.label")}</Label>
          <Button
            id="custom-order"
            type="button"
            variant={form.isCustomOrder ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCustomMode(!form.isCustomOrder)}
          >
            {customOrderStateLabel}
          </Button>
        </div>
      </div>

      <FieldSeparator />

      {form.isCustomOrder ? (
        <OrderFormCustomItemInfo
          form={form}
          errorHelpers={errorHelpers}
          onCustomItemChange={onCustomItemChange}
          removeCustomItem={removeCustomItem}
          addCustomItem={addCustomItem}
        />
      ) : (
        <OrderFormProductInfo
          form={form}
          errorHelpers={errorHelpers}
          products={products}
          isLoading={isLoading}
          onItemChange={onItemChange}
          removeItem={removeItem}
          addItem={addItem}
        />
      )}
    </FieldSet>
  );
}
