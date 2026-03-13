"use client";

import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { buildMaterialPlanningExportSearchParams } from "@/lib/material-planning-search";
import type { MaterialPlanningSearch } from "@/lib/types/search";

type MaterialPlanningExportButtonProps = {
  search: MaterialPlanningSearch;
};

export function MaterialPlanningExportButton({
  search,
}: MaterialPlanningExportButtonProps) {
  const t = useTranslations("MaterialPlanningTable");
  const href = `/api/orders/material-planning/export?${buildMaterialPlanningExportSearchParams(
    search,
  ).toString()}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className:
          "border-muted bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      })}
    >
      <DownloadIcon />
      <span className="hidden sm:inline">{t("actions.export")}</span>
    </Link>
  );
}
