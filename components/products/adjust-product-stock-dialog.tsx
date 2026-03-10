"use client";

import { type ComponentProps, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import EntityCombobox from "@/components/form/entity-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toClientError } from "@/lib/errors/client-error";
import { cn } from "@/lib/utils";
import { useOrderProductOptions } from "@/lib/queries/order-product-options";
import { useProductRemovableMovements } from "@/lib/queries/product-removable-movements";
import { useAdjustProductStockMutation } from "@/lib/queries/products-mutations";
import type { ProductTableRow } from "@/lib/types/products";
import {
  useRemoveMovementMutation,
  useUpdateMovementMutation,
} from "@/lib/queries/movements-mutations";

type AdjustProductStockDialogProps = {
  product?: ProductTableRow | null;
  movement?: {
    id: number;
    movementType: string;
    quantity: number;
    notes: string | null;
    productCode: string | null;
  } | null;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

type StockActionType = "IN" | "TRANSFER" | "OUT" | "REMOVE";
type EditableMovementType = "IN" | "OUT" | "ADJUSTMENT";

type AdjustProductStockDialogContentProps = {
  target:
    | {
        mode: "product";
        product: ProductTableRow;
      }
    | {
        mode: "movement";
        movement: {
          id: number;
          movementType: "IN" | "OUT" | "ADJUSTMENT";
          quantity: number;
          notes: string | null;
          productCode: string | null;
        };
      };
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

function isEditableMovementType(type: string): type is EditableMovementType {
  return type === "IN" || type === "OUT" || type === "ADJUSTMENT";
}

function getUpdatedMovementType(
  currentMovementType: EditableMovementType,
  actionType: StockActionType,
): EditableMovementType {
  if (currentMovementType === "ADJUSTMENT") {
    return "ADJUSTMENT";
  }

  return actionType === "OUT" ? "OUT" : "IN";
}

export function AdjustProductStockDialog({
  product,
  movement,
  open,
  onOpenChange,
}: AdjustProductStockDialogProps) {
  if (!product && !movement) {
    return null;
  }

  const target =
    movement && isEditableMovementType(movement.movementType)
      ? {
          mode: "movement" as const,
          movement: {
            ...movement,
            movementType: movement.movementType,
          },
        }
      : product
        ? {
            mode: "product" as const,
            product,
          }
        : null;

  if (!target) {
    return null;
  }

  const dialogKey =
    target.mode === "product"
      ? `product-${target.product.id}`
      : `movement-${target.movement.id}-${target.movement.quantity}-${target.movement.notes ?? ""}`;

  return (
    <AdjustProductStockDialogContent
      key={dialogKey}
      target={target}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

function AdjustProductStockDialogContent({
  target,
  open,
  onOpenChange,
}: AdjustProductStockDialogContentProps) {
  const t = useTranslations("ProductsTable.adjustStock");
  const tMovements = useTranslations("MovementsTable");

  const initialActionType: StockActionType =
    target.mode === "movement" &&
    (target.movement.movementType === "OUT" || target.movement.quantity < 0)
      ? "OUT"
      : "IN";
  const initialQuantity =
    target.mode === "movement"
      ? String(Math.max(1, Math.abs(target.movement.quantity)))
      : "1";
  const initialNotes =
    target.mode === "movement" ? (target.movement.notes ?? "") : "";

  const [actionType, setActionType] = useState<StockActionType>(initialActionType);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);
  const [targetProductId, setTargetProductId] = useState<number | null>(null);
  const [removeMovementId, setRemoveMovementId] = useState<number | null>(null);

  const adjustStockMutation = useAdjustProductStockMutation();
  const updateMovementMutation = useUpdateMovementMutation();
  const removeMovementMutation = useRemoveMovementMutation();
  const { data: transferProductOptions, isLoading: isTransferProductsLoading } =
    useOrderProductOptions();
  const removableSourceProductId = target.mode === "product" ? target.product.id : 0;
  const isRemoveAction = target.mode === "product" && actionType === "REMOVE";
  const {
    data: removableMovements,
    isLoading: isRemovableMovementsLoading,
  } = useProductRemovableMovements(
    removableSourceProductId,
    target.mode === "product" && isRemoveAction && open,
  );
  const isPending =
    adjustStockMutation.isPending ||
    updateMovementMutation.isPending ||
    removeMovementMutation.isPending;

  const canChangeActionType = true;
  const showTransferOption = target.mode === "product";
  const showRemoveOption = target.mode === "product";
  const isTransferAction = target.mode === "product" && actionType === "TRANSFER";
  const transferTargetOptions = useMemo(() => {
    if (target.mode !== "product") return [];
    return (transferProductOptions ?? []).filter((option) => option.id !== target.product.id);
  }, [target, transferProductOptions]);
  const removableMovementOptions = useMemo(() => {
    if (!removableMovements) return [];
    return removableMovements.map((movement) => ({
      id: movement.id,
      code: `#${movement.id}`,
      name: `${tMovements(`movementTypes.${movement.movementType}`)} ${
        movement.quantity > 0 ? "+" : ""
      }${movement.quantity}`,
    }));
  }, [removableMovements, tMovements]);

  const code = target.mode === "product"
    ? target.product.code
    : target.movement.productCode || "-";
  const dialogTitle =
    target.mode === "product"
      ? t("dialogTitle", { code })
      : t("dialogTitleEdit", { code });
  const dialogDescription =
    target.mode === "product"
      ? t("dialogDescription")
      : t("dialogDescriptionEdit");

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();

    try {
      if (target.mode === "product") {
        if (actionType === "REMOVE") {
          if (!removeMovementId || removeMovementId <= 0) {
            toast.error(t("toasts.invalidMovement"));
            return;
          }

          await removeMovementMutation.mutateAsync({ id: removeMovementId });
          toast.success(t("toasts.removed"));
          onOpenChange(false);
          return;
        }

        const parsedQuantity = Math.trunc(Number(quantity));
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          toast.error(t("toasts.invalidQuantity"));
          return;
        }

        if (actionType === "TRANSFER") {
          if (
            !targetProductId ||
            targetProductId <= 0 ||
            targetProductId === target.product.id
          ) {
            toast.error(t("toasts.invalidTargetProduct"));
            return;
          }
        }

        await adjustStockMutation.mutateAsync({
          id: target.product.id,
          data: {
            quantity: parsedQuantity,
            notes: notes.trim() || undefined,
            actionType,
            targetProductId:
              actionType === "TRANSFER"
                ? (targetProductId ?? undefined)
                : undefined,
          },
        });
      } else {
        const parsedQuantity = Math.trunc(Number(quantity));
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          toast.error(t("toasts.invalidQuantity"));
          return;
        }

        const signedQuantity = actionType === "OUT" ? -parsedQuantity : parsedQuantity;
        const movementType = getUpdatedMovementType(
          target.movement.movementType,
          actionType,
        );
        await updateMovementMutation.mutateAsync({
          id: target.movement.id,
          data: {
            quantity: signedQuantity,
            notes: notes.trim() || undefined,
            movementType,
          },
        });
      }

      toast.success(t("toasts.success"));
      onOpenChange(false);
    } catch (error) {
      const clientError = toClientError(error);
      if (clientError.code === "INSUFFICIENT_STOCK") {
        toast.error(t("toasts.insufficientStock"));
        return;
      }
      if (clientError.code === "PRODUCT_NOT_FOUND") {
        toast.error(t("toasts.productNotFound"));
        onOpenChange(false);
        return;
      }
      if (clientError.code === "MOVEMENT_NOT_FOUND") {
        toast.error(t("toasts.movementNotFound"));
        onOpenChange(false);
        return;
      }
      if (clientError.code === "MOVEMENT_NOT_EDITABLE") {
        toast.error(t("toasts.notEditable"));
        onOpenChange(false);
        return;
      }
      if (clientError.code === "MOVEMENT_NOT_REMOVABLE") {
        toast.error(t("toasts.notRemovable"));
        return;
      }

      toast.error(t("toasts.failed"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form className="space-y-3 px-1" onSubmit={handleSubmit}>
          <div className="rounded-lg">
            <ToggleGroup
              multiple={false}
              value={[actionType]}
              onValueChange={(values) => {
                if (!canChangeActionType) return;
                const nextAction = values[0];
                if (nextAction === "IN" || nextAction === "OUT") {
                  setActionType(nextAction);
                  return;
                }
                if (nextAction === "TRANSFER" && target.mode === "product") {
                  setActionType("TRANSFER");
                  return;
                }
                if (nextAction === "REMOVE" && target.mode === "product") {
                  setActionType("REMOVE");
                }
              }}
              disabled={isPending || !canChangeActionType}
              className={cn(
                "grid w-full",
                showRemoveOption ? "grid-cols-4" : showTransferOption ? "grid-cols-3" : "grid-cols-2",
              )}
              aria-label={dialogDescription}
            >
              <StockActionToggle
                disabled={isPending}
                isTransferAction={false}
                isRemoveAction={false}
                isOutAction={false}
                value="IN"
              >
                {t("actions.in")}
              </StockActionToggle>

              {showTransferOption ? (
                <StockActionToggle
                  disabled={isPending}
                  isTransferAction
                  isRemoveAction={false}
                  isOutAction={false}
                  value="TRANSFER"
                >
                  {t("actions.transfer")}
                </StockActionToggle>
              ) : null}

              {showRemoveOption ? (
                <StockActionToggle
                  disabled={isPending}
                  isTransferAction={false}
                  isRemoveAction
                  isOutAction={false}
                  value="REMOVE"
                >
                  {t("actions.remove")}
                </StockActionToggle>
              ) : null}

              <StockActionToggle
                disabled={isPending}
                isTransferAction={false}
                isRemoveAction={false}
                isOutAction
                value="OUT"
              >
                {t("actions.out")}
              </StockActionToggle>
            </ToggleGroup>
          </div>

          {target.mode === "product" ? (
            <div className="grid gap-1">
              <Label>{t("fields.currentStock")}</Label>
              <div className="inline-flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                {target.product.stockQuantity} {target.product.unit}
              </div>
            </div>
          ) : null}

          {isRemoveAction ? (
            <div className="grid gap-1">
              <EntityCombobox
                id="adjust-stock-remove-movement"
                label={t("fields.removeMovement")}
                placeholder={t("placeholders.removeMovement")}
                entities={removableMovementOptions}
                value={removeMovementId}
                onChange={(id) => setRemoveMovementId(id)}
                isLoading={isRemovableMovementsLoading}
                required
              />
            </div>
          ) : null}

          {isTransferAction ? (
            <div className="grid gap-1">
              <EntityCombobox
                id="adjust-stock-target-product"
                label={t("fields.targetProduct")}
                placeholder={t("placeholders.targetProduct")}
                entities={transferTargetOptions}
                value={targetProductId}
                onChange={(id) => setTargetProductId(id)}
                isLoading={isTransferProductsLoading}
                required
              />
            </div>
          ) : null}

          {!isRemoveAction ? (
            <>
              <div className="grid gap-1">
                <Label htmlFor="adjust-stock-quantity">
                  {t("fields.quantity")}
                </Label>
                <Input
                  id="adjust-stock-quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="adjust-stock-notes">{t("fields.notes")}</Label>
                <Textarea
                  id="adjust-stock-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("placeholders.notes")}
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              type="submit"
              variant={actionType === "OUT" || actionType === "REMOVE" ? "destructive" : "default"}
              disabled={isPending}
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {t("buttons.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type StockActionButtonProps = {
  children: string;
  disabled: boolean;
  isTransferAction: boolean;
  isRemoveAction: boolean;
  isOutAction: boolean;
  value: StockActionType;
};

function StockActionToggle({
  children,
  disabled,
  isTransferAction,
  isRemoveAction,
  isOutAction,
  value,
}: StockActionButtonProps) {
  return (
    <ToggleGroupItem
      value={value}
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-9 w-full rounded-md border text-sm font-medium transition-colors",
        "data-pressed:text-white",
        isRemoveAction
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 data-pressed:border-amber-600 data-pressed:bg-amber-600 data-pressed:hover:bg-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60 dark:data-pressed:border-amber-600 dark:data-pressed:bg-amber-600"
          : isTransferAction
          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 data-pressed:border-sky-600 data-pressed:bg-sky-600 data-pressed:hover:bg-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60 dark:data-pressed:border-sky-600 dark:data-pressed:bg-sky-600"
          : isOutAction
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 data-pressed:border-red-600 data-pressed:bg-red-600 data-pressed:hover:bg-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 dark:data-pressed:border-red-600 dark:data-pressed:bg-red-600"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 data-pressed:border-emerald-600 data-pressed:bg-emerald-600 data-pressed:hover:bg-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 dark:data-pressed:border-emerald-600 dark:data-pressed:bg-emerald-600",
      )}
    >
      {children}
    </ToggleGroupItem>
  );
}
