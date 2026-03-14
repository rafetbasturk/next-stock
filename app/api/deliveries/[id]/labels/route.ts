import * as XLSX from "xlsx";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getDeliveryLabelExport } from "@/lib/server/deliveries";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";

function buildExportFilename(prefix: string, deliveryNumber: string) {
  const safeDeliveryNumber = deliveryNumber.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `${prefix}-${safeDeliveryNumber}.xlsx`;
}

export async function GET(_: Request, context: IdRouteContext) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Authentication required", { status: 401 });
    }

    const id = await parsePositiveIntRouteParam(context, "delivery");
    const exportPayload = await getDeliveryLabelExport({ data: { id } });

    if (!exportPayload) {
      return new Response("Delivery not found", { status: 404 });
    }

    const t = await getTranslations("DeliveriesTable");
    const localizedFilename = buildExportFilename(
      t("export.filenamePrefix"),
      exportPayload.deliveryNumber,
    );
    const asciiFallbackFilename = buildExportFilename(
      "delivery-labels",
      exportPayload.deliveryNumber,
    );
    const worksheet = XLSX.utils.json_to_sheet(
      exportPayload.rows.map((row) => ({
        [t("export.columns.orderNumber")]: row.orderNumber,
        [t("export.columns.deliveryAddress")]: row.deliveryAddress,
        [t("export.columns.productCode")]: row.productCode,
        [t("export.columns.productName")]: row.productName,
        [t("export.columns.deliveryQuantity")]: row.deliveryQuantity,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("export.sheetName"));

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiFallbackFilename}"; filename*=UTF-8''${encodeURIComponent(localizedFilename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("GET /api/deliveries/[id]/labels failed", error, { requestId });
    return new Response("Export failed", { status: 500 });
  }
}
