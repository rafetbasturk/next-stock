"use client";

import { useState } from "react";
import { DownloadIcon, FileWarningIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toClientError } from "@/lib/errors/client-error";
import {
  buildMaterialPlanningExportSearchParams,
  buildMaterialPlanningSearchParams,
} from "@/lib/material-planning-search";
import type { ApiResponse } from "@/lib/errors/api-response";
import type { MaterialPlanningSearch } from "@/lib/types/search";

type MaterialPlanningExportWarnings = {
  hasWarnings: boolean;
  missingMaterialCount: number;
  missingSpecsCount: number;
  rowsWithMissingValuesCount: number;
};

type MaterialPlanningExportButtonProps = {
  search: MaterialPlanningSearch;
};

function downloadExport(url: string) {
  window.location.assign(url);
}

export function MaterialPlanningExportButton({
  search,
}: MaterialPlanningExportButtonProps) {
  const t = useTranslations("MaterialPlanningTable");
  const [isChecking, setIsChecking] = useState(false);
  const [warnings, setWarnings] = useState<MaterialPlanningExportWarnings | null>(
    null,
  );

  const exportParams = buildMaterialPlanningExportSearchParams(search).toString();
  const exportHref = `/api/orders/material-planning/export?${exportParams}`;
  const warningHref = `/api/orders/material-planning/export-check?${buildMaterialPlanningSearchParams(
    search,
  ).toString()}`;

  const handleExportClick = async () => {
    if (isChecking) {
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch(warningHref, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      let payload: ApiResponse<MaterialPlanningExportWarnings>;
      try {
        payload = (await response.json()) as ApiResponse<MaterialPlanningExportWarnings>;
      } catch (error) {
        throw toClientError(error);
      }

      if (!response.ok || !payload.ok) {
        throw toClientError(payload);
      }

      if (payload.data.hasWarnings) {
        setWarnings(payload.data);
        return;
      }

      downloadExport(exportHref);
    } catch (error) {
      toast.error(toClientError(error).message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-muted bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        disabled={isChecking}
        onClick={() => {
          void handleExportClick();
        }}
      >
        <DownloadIcon />
        <span className="hidden sm:inline">
          {isChecking ? t("actions.exportChecking") : t("actions.export")}
        </span>
      </Button>

      <AlertDialog
        open={warnings !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setWarnings(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <FileWarningIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("export.warningTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("export.warningDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {warnings ? (
            <div className="space-y-4 px-1">
              <div className="rounded-lg border bg-amber-50/60 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
                  >
                    {t("export.warningBadge")}
                  </Badge>
                  <span className="font-medium">
                    {t("export.warningSummary", {
                      count: warnings.rowsWithMissingValuesCount,
                    })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">
                    {t("export.missingMaterialLabel")}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {warnings.missingMaterialCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">
                    {t("export.missingSpecsLabel")}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {warnings.missingSpecsCount}
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                {t("export.warningContinue")}
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChecking}>
              {t("export.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isChecking}
              onClick={() => {
                setWarnings(null);
                downloadExport(exportHref);
              }}
            >
              {t("export.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
