import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

const currencyCodeSchema = z.enum(["TRY", "EUR", "USD"]);

const optionalIntFromString = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().positive().optional());

const optionalYearFromString = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().min(2000).max(2100).optional());

const optionalMonthCountFromString = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().min(1).max(24).optional());

export const metricsFiltersSchema = z
  .object({
    customerId: optionalIntFromString,
    year: optionalYearFromString,
  })
  .strict();

export const metricsSearchParamsSchema = z
  .object({
    customerId: optionalIntFromString,
    year: optionalYearFromString,
    monthCount: optionalMonthCountFromString,
    preferredCurrency: currencyCodeSchema.optional(),
  })
  .strict();

export const metricsRequestBodySchema = z
  .object({
    rates: z
      .array(
        z.object({
          currency: currencyCodeSchema,
          targetCurrency: currencyCodeSchema,
          rate: z.number(),
        }),
      )
      .default([]),
    filters: metricsFiltersSchema.optional(),
    monthCount: optionalMonthCountFromString,
    preferredCurrency: currencyCodeSchema.optional(),
  })
  .strict();

export function requestSearchParamsToObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export function treeifyZodError(error: z.ZodError) {
  return z.treeifyError(error);
}

export type IdRouteContext = {
  params: Promise<{ id: string }>;
};

export async function parsePositiveIntRouteParam(
  context: IdRouteContext,
  label: string,
): Promise<number> {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION_ERROR", `Invalid ${label} id.`);
  }

  return id;
}
