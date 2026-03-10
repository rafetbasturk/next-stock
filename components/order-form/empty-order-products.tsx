"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EmptyOrderProducts() {
  const tCreate = useTranslations("OrdersTable.create");

  return (
    <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
      <ShoppingCart className="mx-auto mb-2 h-10 w-10" />
      <p className="font-medium">{tCreate("items.title")}</p>
      <p className="text-sm">{tCreate("emptyDescription")}</p>
    </div>
  );
}
