import { notFound } from "next/navigation";

import { ProductDetailPageContent } from "@/components/products/product-detail-page-content";
import { getProductById } from "@/lib/server/products";
import { getPaginatedStockMovements } from "@/lib/server/stock";

type Params = Promise<{ id: string }>;

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [product, recentMovements] = await Promise.all([
    getProductById({ data: { id } }),
    getPaginatedStockMovements({
      data: {
        pageIndex: 0,
        pageSize: 10,
        productId: id,
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailPageContent
      productId={id}
      initialProduct={product}
      initialRecentMovements={recentMovements}
    />
  );
}
