"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { Button } from "@/components/ui/button";
import type { ProductTableRow } from "@/lib/types/products";

type ProductDetailHeaderActionsProps = {
  product: ProductTableRow;
};

export function ProductDetailHeaderActions({
  product,
}: ProductDetailHeaderActionsProps) {
  const t = useTranslations("ProductsTable");
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
        <PencilIcon />
        <span className="hidden sm:inline">{t("actions.edit")}</span>
      </Button>

      <EditProductDialog
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
