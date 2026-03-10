"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
  WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DataTableMobileField } from "@/components/datatable/data-table-mobile-field";
import { DataTableMobileSkeletonList } from "@/components/datatable/data-table-mobile-skeleton-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toClientError } from "@/lib/errors/client-error";
import {
  useReconcileStockIntegrityMutation,
  useStockIntegrityReport,
} from "@/lib/queries/stock-integrity";

type StockIntegrityCardProps = {
  isAdmin: boolean;
};

export function StockIntegrityCard({ isAdmin }: StockIntegrityCardProps) {
  const t = useTranslations("ReportPage.stockIntegrity");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reportQuery = useStockIntegrityReport(isAdmin);
  const reconcileMutation = useReconcileStockIntegrityMutation();

  const mismatches = reportQuery.data ?? [];

  function renderDiff(diff: number) {
    return (
      <span className={diff > 0 ? "text-emerald-600" : "text-destructive"}>
        {diff > 0 ? `+${diff}` : diff}
      </span>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlertIcon className="size-4" />
            {t("accessDenied.title")}
          </CardTitle>
          <CardDescription>{t("accessDenied.description")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleRefresh() {
    try {
      await reportQuery.refetch();
    } catch (error) {
      const clientError = toClientError(error);
      toast.error(clientError.message);
    }
  }

  async function handleReconcile() {
    try {
      const result = await reconcileMutation.mutateAsync();
      toast.success(t("toasts.reconcileSuccess", { count: result.fixedCount }));
      setConfirmOpen(false);
    } catch (error) {
      const clientError = toClientError(error);
      toast.error(clientError.message);
    }
  }

  const isRefreshing = reportQuery.isFetching && !reportQuery.isLoading;

  return (
    <>
      <Card>
        <CardHeader className="md:flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex gap-2 ">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={reportQuery.isLoading || reconcileMutation.isPending}
            >
              {isRefreshing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              <span>{t("actions.refresh")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={
                reportQuery.isLoading ||
                reconcileMutation.isPending ||
                mismatches.length === 0
              }
            >
              {reconcileMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <WrenchIcon />
              )}
              <span>{t("actions.reconcile")}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {reportQuery.isLoading ? (
            <>
              <div className="space-y-3 lg:hidden">
                <DataTableMobileSkeletonList
                  count={1}
                  renderItem={(index) => (
                    <Card
                      key={`stock-integrity-mobile-skeleton-${index}`}
                      size="sm"
                    >
                      <CardHeader className="gap-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-20" />
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, fieldIndex) => (
                          <Skeleton
                            key={`stock-integrity-mobile-skeleton-field-${fieldIndex}`}
                            className="h-8 w-full"
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                />
              </div>
              <div className="hidden space-y-3 lg:block">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </>
          ) : reportQuery.error ? (
            <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangleIcon className="text-destructive size-4" />
                <span>{t("error.title")}</span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                {toClientError(reportQuery.error).message}
              </p>
            </div>
          ) : mismatches.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
              {t("empty")}
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {mismatches.map((item) => (
                  <Card key={item.id} size="sm" className="gap-3">
                    <CardHeader className="gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-sm">{item.code}</CardTitle>
                          <CardDescription className="truncate">
                            {item.name}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={item.diff > 0 ? "secondary" : "destructive"}
                        >
                          {renderDiff(item.diff)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <DataTableMobileField
                        label={t("table.shelf")}
                        value={item.shelf}
                      />
                      <DataTableMobileField
                        label={t("table.ledger")}
                        value={item.ledger}
                      />
                      <DataTableMobileField
                        label={t("table.name")}
                        value={item.name}
                      />
                      <DataTableMobileField
                        label={t("table.diff")}
                        value={renderDiff(item.diff)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.code")}</TableHead>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead className="text-right">
                        {t("table.shelf")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("table.ledger")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("table.diff")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mismatches.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.code}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          {item.shelf}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.ledger}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderDiff(item.diff)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.description", { count: mismatches.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reconcileMutation.isPending}>
              {t("dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleReconcile();
              }}
              disabled={reconcileMutation.isPending}
            >
              {reconcileMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              <span>{t("dialog.confirm")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
