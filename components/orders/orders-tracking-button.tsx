"use client";

import Link from "next/link";
import { ListChecksIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";

export function OrdersTrackingButton() {
  const t = useTranslations("OrderTrackingTable");

  return (
    <Link
      href="/orders/tracking"
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "border-muted bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      })}
    >
      <ListChecksIcon />
      <span className="hidden sm:inline">{t("actions.openRoute")}</span>
    </Link>
  );
}
