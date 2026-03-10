"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EmptyDeliveryTable() {
  const t = useTranslations("DeliveriesTable.form");

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6">
      <ShoppingCart className="text-muted-foreground h-8 w-8" />
      <p className="text-sm font-medium">{t("emptyItems.title")}</p>
      <p className="text-muted-foreground text-xs">{t("emptyItems.description")}</p>
    </div>
  );
}
