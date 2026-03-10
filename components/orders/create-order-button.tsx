"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { OrderUpsertDialog } from "@/components/orders/order-upsert-dialog";
import { Button } from "@/components/ui/button";

export function CreateOrderButton() {
  const tApp = useTranslations("App");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        <span className="hidden sm:inline">{tApp("actions.add")}</span>
      </Button>

      {open ? (
        <OrderUpsertDialog
          key="create-order-dialog"
          mode="create"
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

