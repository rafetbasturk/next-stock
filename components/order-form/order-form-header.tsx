"use client";

import { useTranslations } from "next-intl";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  orderId?: number;
};

export default function OrderFormHeader({ orderId }: Props) {
  const tCreate = useTranslations("OrdersTable.create");
  const tEdit = useTranslations("OrdersTable.edit");

  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {orderId ? tEdit("dialogTitle") : tCreate("dialogTitle")}
      </DialogTitle>
      <DialogDescription>
        {orderId ? tEdit("dialogDescription") : tCreate("dialogDescription")}
      </DialogDescription>
    </DialogHeader>
  );
}
