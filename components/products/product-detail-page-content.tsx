"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BoxesIcon,
  CalendarIcon,
  CoinsIcon,
  type LucideIcon,
} from "lucide-react";

import { useAppSettings } from "@/components/app-settings-provider";
import { ProductDetailHeaderActions } from "@/components/products/product-detail-header-actions";
import { RouteHeaderConfig } from "@/components/route-header-config";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { convertToCurrencyFormat } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import { buildMovementsHref } from "@/lib/movements-search";
import {
  movementsPaginatedQueryOptions,
  type PaginatedStockMovementsResult,
} from "@/lib/queries/movements-paginated";
import {
  productDetailQueryOptions,
  type ProductDetail,
} from "@/lib/queries/product-detail";
import { getClientTimeZone } from "@/lib/timezone-client";
import { toCurrencyOrDefault, toUnitOrDefault } from "@/lib/types/domain";
import type { ProductTableRow } from "@/lib/types/products";
import { cn } from "@/lib/utils";

type ProductDetailPageContentProps = {
  productId: number;
  initialProduct: ProductDetail;
  initialRecentMovements: PaginatedStockMovementsResult;
};

const outlineSmButtonClassName =
  "focus-visible:border-ring focus-visible:ring-ring/50 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap outline-none transition-all hover:bg-muted hover:text-foreground focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 inline-flex h-7 items-center justify-center gap-1";

function subscribeToTimeZoneChange(): () => void {
  return () => {};
}

function toProductTableRow(product: ProductDetail): ProductTableRow {
  return {
    id: product.id,
    customerId: product.customerId,
    code: product.code,
    name: product.name,
    customerName: product.customerName,
    material: product.material,
    price: product.price,
    currency: toCurrencyOrDefault(product.currency),
    stockQuantity: product.stockQuantity,
    minStockLevel: product.minStockLevel,
    unit: toUnitOrDefault(product.unit),
    specs: product.specs ?? "",
    specsNet: product.specsNet ?? "",
    postProcess: product.postProcess ?? "",
    coating: product.coating ?? "",
    notes: product.notes ?? "",
    otherCodes: product.otherCodes ?? "",
  };
}

function displayText(
  value: string | null | undefined,
  emptyValue: string,
): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : emptyValue;
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function SummaryMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-600/20 bg-emerald-500/8"
      : tone === "warning"
        ? "border-amber-600/20 bg-amber-500/8"
        : "border-border/70 bg-background/80";

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", toneClassName)}>
      <dt className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{label}</p>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
        <span className="bg-background/80 text-muted-foreground rounded-full border p-2">
          <Icon className="size-4" />
        </span>
      </dt>
      <dd className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
        {value}
      </dd>
    </div>
  );
}

function movementBadgeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (type === "OUT" || type === "DELIVERY") return "destructive";
  if (type === "ADJUSTMENT" || type === "TRANSFER") return "outline";
  if (type === "RETURN") return "secondary";
  return "default";
}

function buildMovementReferenceHref(
  referenceType: string | null,
  referenceId: number | null,
): string | null {
  if (!referenceType || !referenceId) {
    return null;
  }

  if (referenceType === "order") {
    return `/orders?q=${referenceId}`;
  }

  if (referenceType === "delivery") {
    return `/deliveries?q=${referenceId}`;
  }

  return null;
}

export function ProductDetailPageContent({
  productId,
  initialProduct,
  initialRecentMovements,
}: ProductDetailPageContentProps) {
  const locale = useLocale();
  const tApp = useTranslations("App");
  const tDetail = useTranslations("ProductsDetail");
  const tMovements = useTranslations("MovementsTable");
  const tProductsTable = useTranslations("ProductsTable");
  const { initialTimeZone } = useAppSettings();
  const timeZone = useSyncExternalStore(
    subscribeToTimeZoneChange,
    getClientTimeZone,
    () => initialTimeZone,
  );
  const movementsSearch = useMemo(
    () => ({
      pageIndex: 0,
      pageSize: 10,
      productId,
    }),
    [productId],
  );

  const { data: product, isError: isProductError } = useQuery({
    ...productDetailQueryOptions(productId),
    initialData: initialProduct,
  });

  const { data: recentMovements, isError: isMovementsError } = useQuery({
    ...movementsPaginatedQueryOptions(movementsSearch),
    initialData: initialRecentMovements,
  });

  if (isProductError || !product) {
    return (
      <>
        <RouteHeaderConfig title={tApp("pageTitles.products")} />
        <section
          aria-labelledby="page-title"
          className="text-muted-foreground flex h-[calc(100dvh-56px-2rem)] min-h-0 items-center justify-center rounded-md border md:h-[calc(100dvh-56px-3rem)]"
        >
          <p>{tProductsTable("errors.loadFailed")}</p>
        </section>
      </>
    );
  }

  const productRow = toProductTableRow(product);
  const emptyValue = tDetail("emptyValue");
  const formattedPrice = convertToCurrencyFormat({
    cents: productRow.price ?? 0,
    currency: productRow.currency,
    locale,
    style: "currency",
  });

  const formattedUpdatedAt = formatDateTime(product.updatedAt, {
    locale,
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lowStock = productRow.stockQuantity <= (productRow.minStockLevel || 0);
  const movementsHref = buildMovementsHref({
    pageIndex: 0,
    pageSize: 20,
    productId,
  });
  const formatMovementTypeLabel = (movementType: string): string => {
    switch (movementType) {
      case "IN":
        return tMovements("movementTypes.IN");
      case "OUT":
        return tMovements("movementTypes.OUT");
      case "DELIVERY":
        return tMovements("movementTypes.DELIVERY");
      case "RETURN":
        return tMovements("movementTypes.RETURN");
      case "ADJUSTMENT":
        return tMovements("movementTypes.ADJUSTMENT");
      case "INITIAL":
        return tMovements("movementTypes.INITIAL");
      case "TRANSFER":
        return tMovements("movementTypes.TRANSFER");
      default:
        return movementType;
    }
  };
  const customerText = displayText(productRow.customerName, emptyValue);
  const otherCodesText = displayText(productRow.otherCodes, emptyValue);
  const notesText = displayText(productRow.notes, emptyValue);
  const technicalHighlights = [
    {
      label: tDetail("fields.material"),
      value: optionalText(productRow.material),
    },
    {
      label: tDetail("fields.coating"),
      value: optionalText(productRow.coating),
    },
    {
      label: tDetail("fields.postProcess"),
      value: optionalText(productRow.postProcess),
    },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );

  return (
    <>
      <RouteHeaderConfig title={tApp("pageTitles.productDetail")}>
        <ProductDetailHeaderActions product={productRow} />
      </RouteHeaderConfig>

      <section
        aria-labelledby="page-title"
        className="h-[calc(100dvh-56px-2rem)] min-h-0 min-w-0 overflow-auto md:h-[calc(100dvh-56px-3rem)]"
      >
        <div className="space-y-4">
          <Card className="overflow-hidden border border-primary/15 bg-primary/5 via-background to-background ring-0">
            <CardContent className="relative px-5 py-5 md:px-7 md:py-6">
              <div className="bg-primary/7 absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl" />
              <div className="relative space-y-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-sm">
                        {tDetail("fields.customer")}: {customerText}
                      </p>
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
                          {productRow.name}
                        </h2>
                        <Badge variant={lowStock ? "destructive" : "secondary"}>
                          {lowStock
                            ? tDetail("badges.lowStock")
                            : tDetail("badges.inStock")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{productRow.code}</Badge>
                      <Badge variant="outline">
                        {tDetail("fields.unit")}: {productRow.unit}
                      </Badge>
                    </div>

                    {technicalHighlights.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {technicalHighlights.map((item) => (
                          <Badge
                            key={item.label}
                            variant="outline"
                            className="bg-background/80"
                          >
                            <span className="text-muted-foreground">
                              {item.label}:
                            </span>
                            <span>{item.value}</span>
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="bg-background/85 min-w-0 rounded-2xl border border-border/70 p-4 shadow-sm lg:w-72">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {tDetail("fields.otherCodes")}
                      </p>
                      <p className="mt-1 text-sm font-medium">{otherCodesText}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {tDetail("fields.notes")}
                      </p>
                      <p className="mt-1 text-sm font-medium">{notesText}</p>
                    </div>
                  </div>
                </div>

                <dl className="grid gap-3 md:grid-cols-3">
                  <SummaryMetric
                    label={tDetail("fields.price")}
                    value={formattedPrice}
                    hint={productRow.currency}
                    icon={CoinsIcon}
                  />
                  <SummaryMetric
                    label={tDetail("fields.quantity")}
                    value={`${productRow.stockQuantity} ${productRow.unit}`}
                    hint={`${tDetail("fields.minStockLevel")}: ${productRow.minStockLevel} ${productRow.unit}`}
                    icon={BoxesIcon}
                    tone={lowStock ? "warning" : "success"}
                  />
                  <SummaryMetric
                    label={tDetail("sections.lifecycle")}
                    value={formattedUpdatedAt}
                    hint={tDetail("fields.updatedAt")}
                    icon={CalendarIcon}
                  />
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 ring-0">
            <CardHeader className="gap-2">
              <CardTitle>{tDetail("sections.movements")}</CardTitle>
              <CardDescription as="p">
                {tDetail("movements.description")}
              </CardDescription>
              <CardAction>
                <Link href={movementsHref} className={outlineSmButtonClassName}>
                  {tDetail("movements.viewAll")}
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isMovementsError ? (
                <p className="text-muted-foreground text-sm">
                  {tMovements("errors.loadFailed")}
                </p>
              ) : recentMovements.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {tDetail("movements.empty")}
                </p>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/70 hidden md:block">
                    <Table className="w-full">
                      <TableCaption className="sr-only">
                        {tDetail("sections.movements")}
                      </TableCaption>
                      <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-muted/20">
                          <TableHead>{tMovements("columns.movementType")}</TableHead>
                          <TableHead>{tMovements("columns.createdAt")}</TableHead>
                          <TableHead>{tDetail("movements.by")}</TableHead>
                          <TableHead>{tDetail("movements.reference")}</TableHead>
                          <TableHead>{tDetail("fields.notes")}</TableHead>
                          <TableHead className="text-right">
                            {tDetail("fields.quantity")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentMovements.data.map((movement) => {
                          const reference =
                            movement.referenceType && movement.referenceId
                              ? `${movement.referenceType} #${movement.referenceId}`
                              : emptyValue;
                          const referenceHref = buildMovementReferenceHref(
                            movement.referenceType,
                            movement.referenceId,
                          );

                          return (
                            <TableRow key={movement.id}>
                              <TableCell>
                                <Badge
                                  variant={movementBadgeVariant(
                                    movement.movementType,
                                  )}
                                  className="h-6 px-2.5"
                                >
                                  {formatMovementTypeLabel(
                                    movement.movementType,
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs font-medium">
                                {formatDateTime(movement.createdAt, {
                                  locale,
                                  timeZone,
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                              <TableCell className="max-w-40 truncate font-medium">
                                {displayText(
                                  movement.createdByUsername,
                                  emptyValue,
                                )}
                              </TableCell>
                              <TableCell className="max-w-40 truncate">
                                {referenceHref ? (
                                  <Link
                                    href={referenceHref}
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                  >
                                    {reference}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {reference}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                                {optionalText(movement.notes) ?? emptyValue}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right text-base font-semibold tabular-nums",
                                  movement.quantity >= 0
                                    ? "text-emerald-600"
                                    : "text-destructive",
                                )}
                              >
                                {movement.quantity > 0 ? "+" : ""}
                                {movement.quantity}
                                <span className="text-muted-foreground ml-1 text-xs font-medium">
                                  {productRow.unit}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <ul className="space-y-2 md:hidden">
                    {recentMovements.data.map((movement) => {
                      const reference =
                        movement.referenceType && movement.referenceId
                          ? `${movement.referenceType} #${movement.referenceId}`
                          : emptyValue;
                      const referenceHref = buildMovementReferenceHref(
                        movement.referenceType,
                        movement.referenceId,
                      );
                      const noteText = optionalText(movement.notes);

                      return (
                        <li
                          key={movement.id}
                          className="rounded-xl border bg-muted/10 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={movementBadgeVariant(
                                    movement.movementType,
                                  )}
                                  className="h-6 px-2.5"
                                >
                                  {formatMovementTypeLabel(
                                    movement.movementType,
                                  )}
                                </Badge>
                                <span className="text-muted-foreground text-[11px] font-medium">
                                  {formatDateTime(movement.createdAt, {
                                    locale,
                                    timeZone,
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm font-medium">
                                {displayText(
                                  movement.createdByUsername,
                                  emptyValue,
                                )}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {tDetail("movements.reference")}:{" "}
                                {referenceHref ? (
                                  <Link
                                    href={referenceHref}
                                    className="text-primary font-medium underline-offset-4 hover:underline"
                                  >
                                    {reference}
                                  </Link>
                                ) : (
                                  reference
                                )}
                              </p>
                              {noteText ? (
                                <p className="text-muted-foreground text-xs leading-5">
                                  {noteText}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className={cn(
                                "shrink-0 text-right text-lg font-semibold tabular-nums",
                                movement.quantity >= 0
                                  ? "text-emerald-600"
                                  : "text-destructive",
                              )}
                            >
                              {movement.quantity > 0 ? "+" : ""}
                              {movement.quantity}
                              <p className="text-muted-foreground text-[11px] font-medium">
                                {productRow.unit}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
