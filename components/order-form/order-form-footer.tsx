"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type Props = {
  orderId?: number;
  isSubmitting: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
};

export default function OrderFormFooter({
  orderId,
  isSubmitting,
  onClose,
  isReadOnly = false,
}: Props) {
  const tCreate = useTranslations("OrdersTable.create");
  const tEdit = useTranslations("OrdersTable.edit");

  return (
    <DialogFooter className="flex justify-end gap-2 border-t pt-4">
      <Button type="button" variant="outline" onClick={onClose}>
        {tCreate("buttons.cancel")}
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || isReadOnly}
        className="disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting
          ? tCreate("buttons.saving")
          : orderId
            ? tEdit("buttons.save")
            : tCreate("buttons.create")}
      </Button>
    </DialogFooter>
  );
}
