"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type Props = {
  deliveryId?: number;
  isSubmitting: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
};

export default function DeliveryFormFooter({
  deliveryId,
  isSubmitting,
  onClose,
  isReadOnly = false,
}: Props) {
  const t = useTranslations("DeliveriesTable.form");

  return (
    <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onClose}>
        {t("buttons.cancel")}
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || isReadOnly}
        className="disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting
          ? deliveryId
            ? t("buttons.updating")
            : t("buttons.creating")
          : deliveryId
            ? t("buttons.update")
            : t("buttons.create")}
      </Button>
    </DialogFooter>
  );
}
