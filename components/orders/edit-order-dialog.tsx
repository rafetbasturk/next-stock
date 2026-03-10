"use client";

import { OrderDialogLoading, OrderUpsertDialog } from "@/components/orders/order-upsert-dialog";
import { useOrderDetail } from "@/lib/queries/order-detail";

type EditOrderDialogProps = {
  orderId: number | null;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

type EditOrderDialogContentProps = {
  orderId: number;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

function EditOrderDialogContent({
  orderId,
  open,
  onOpenChange,
}: EditOrderDialogContentProps) {
  const orderDetailQuery = useOrderDetail(orderId, open);

  if (orderDetailQuery.isPending && !orderDetailQuery.data) {
    return <OrderDialogLoading open={open} onOpenChange={onOpenChange} />;
  }

  if (orderDetailQuery.isError || !orderDetailQuery.data) {
    return (
      <OrderDialogLoading
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onOpenChange(false);
        }}
      />
    );
  }

  return (
    <OrderUpsertDialog
      key={`edit-order-${orderId}`}
      mode="edit"
      order={orderDetailQuery.data}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

export function EditOrderDialog({
  orderId,
  open,
  onOpenChange,
}: EditOrderDialogProps) {
  if (!open || orderId == null) {
    return null;
  }

  return (
    <EditOrderDialogContent
      orderId={orderId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
