"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  deliveryId?: number;
  isSubmitting: boolean;
};

export default function DeliveryFormHeader({ deliveryId, isSubmitting }: Props) {
  const t = useTranslations("DeliveriesTable.form");

  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {deliveryId ? t("titleEdit") : t("titleCreate")}
        {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
      </DialogTitle>
      <DialogDescription>{t("description")}</DialogDescription>
    </DialogHeader>
  );
}
