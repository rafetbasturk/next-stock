import fs from "node:fs";
import path from "node:path";

import JSZip from "jszip";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errors/log";
import { createRequestId } from "@/lib/errors/request-id";
import { getDeliveryLabelExport } from "@/lib/server/deliveries";
import {
  parsePositiveIntRouteParam,
  type IdRouteContext,
} from "@/lib/validators/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELIVERY_TEMPLATE_PATH = path.join(
  process.cwd(),
  "lib",
  "templates",
  "IrsaliyeKalemleriSablon.xlsx",
);

function buildExportFilename(deliveryNumber: string) {
  const safeDeliveryNumber = deliveryNumber.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `irsaliye-kalemleri-${safeDeliveryNumber}.xlsx`;
}

function mapTemplateUnit(unit: string) {
  if (unit === "adet") {
    return "Adet (C62)";
  }

  return unit;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildInlineStringCell(cellRef: string, value: string) {
  return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function buildNumberCell(cellRef: string, value: number) {
  return `<c r="${cellRef}"><v>${value}</v></c>`;
}

function buildTemplateSheetXml(
  originalSheetXml: string,
  rows: Array<{
    productName: string;
    deliveryQuantity: number;
    unit: string;
    orderNumber: string;
    productCode: string;
  }>,
) {
  const rowXml = rows
    .map((row, index) => {
      const rowNumber = index + 2;

      return [
        `<row r="${rowNumber}">`,
        buildInlineStringCell(`A${rowNumber}`, row.productName),
        buildNumberCell(`B${rowNumber}`, row.deliveryQuantity),
        buildInlineStringCell(`C${rowNumber}`, mapTemplateUnit(row.unit)),
        buildInlineStringCell(`F${rowNumber}`, row.orderNumber),
        buildInlineStringCell(`H${rowNumber}`, row.productCode),
        "</row>",
      ].join("");
    })
    .join("");

  const lastRowNumber = Math.max(rows.length + 1, 1);
  const nextDimension = `A1:J${lastRowNumber}`;

  return originalSheetXml
    .replace(/<dimension ref="[^"]*"/, `<dimension ref="${nextDimension}"`)
    .replace("</sheetData>", `${rowXml}</sheetData>`);
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

    const templateBuffer = fs.readFileSync(DELIVERY_TEMPLATE_PATH);
    const zip = await JSZip.loadAsync(templateBuffer);
    const sheetEntry = zip.file("xl/worksheets/sheet1.xml");

    if (!sheetEntry) {
      return new Response("Template sheet missing", { status: 500 });
    }

    const originalSheetXml = await sheetEntry.async("string");
    const updatedSheetXml = buildTemplateSheetXml(
      originalSheetXml,
      exportPayload.rows.map((row) => ({
        productName: row.productName,
        deliveryQuantity: row.deliveryQuantity,
        unit: row.unit,
        orderNumber: row.orderNumber,
        productCode: row.productCode,
      })),
    );

    zip.file("xl/worksheets/sheet1.xml", updatedSheetXml);

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildExportFilename(exportPayload.deliveryNumber)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("GET /api/deliveries/[id]/template failed", error, { requestId });
    return new Response("Export failed", { status: 500 });
  }
}
