import * as XLSX from "xlsx";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getMaterialPlanningRows } from "@/lib/server/orders";
import { materialPlanningSearchSchema } from "@/lib/types/search";
import { requestSearchParamsToObject } from "@/lib/validators/api";

export const dynamic = "force-dynamic";

function buildExportFilename(prefix: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.xlsx`;
}

export async function GET(request: Request) {
  const requestId = createRequestId();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Authentication required", { status: 401 });
    }

    const parsedSearch = materialPlanningSearchSchema.safeParse(
      requestSearchParamsToObject(request),
    );

    if (!parsedSearch.success) {
      return new Response("Invalid export parameters", { status: 400 });
    }

    const t = await getTranslations("MaterialPlanningTable");
    const localizedFilename = buildExportFilename(t("export.filenamePrefix"));
    const asciiFallbackFilename = buildExportFilename("material-planning");
    const rows = await getMaterialPlanningRows(parsedSearch.data);
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        [t("export.columns.productCode")]: row.productCode,
        [t("export.columns.productName")]: row.productName,
        [t("export.columns.neededQuantity")]: row.purchaseQuantity,
        [t("export.columns.material")]: row.material ?? "",
        [t("export.columns.specs")]: row.specs ?? "",
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
    logError("GET /api/orders/material-planning/export failed", error, {
      requestId,
    });
    return new Response("Export failed", { status: 500 });
  }
}
