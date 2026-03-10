import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { normalizeParams, notDeleted } from "@/lib/server/normalize";
import {
  customersSearchSchema,
  type CustomersSearch,
} from "@/lib/types/search";
import {
  parseCustomerInput,
  type CustomerInput,
} from "@/lib/validators/mutations";

type ServerFnPayload<TData> = { data: TData };
const customerIdSchema = z.object({ id: z.number().int().positive() });
type ValidationFieldError = {
  i18n: {
    ns: "validation";
    key: "required" | "invalid";
  };
};

function failValidation(details: Record<string, ValidationFieldError>): never {
  throw new AppError("VALIDATION_ERROR", "Invalid request data.", { details });
}

function ensureAuthError(): never {
  throw new AppError("AUTH_REQUIRED");
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) ensureAuthError();
  return user;
}

function ensureCustomerNotFound(): never {
  throw new AppError("CUSTOMER_NOT_FOUND");
}

function ensureCustomerHasActiveOrders(): never {
  throw new AppError("CUSTOMER_HAS_ACTIVE_ORDERS");
}

export function validateCustomerInput(customer: CustomerInput) {
  const fieldErrors: Record<string, ValidationFieldError> = {};

  if (!customer.code?.trim()) {
    fieldErrors.code = { i18n: { ns: "validation", key: "required" } };
  }
  if (!customer.name?.trim()) {
    fieldErrors.name = { i18n: { ns: "validation", key: "required" } };
  }

  if (Object.keys(fieldErrors).length > 0) {
    failValidation(fieldErrors);
  }
}

function toCustomerWriteSet(customer: CustomerInput) {
  return {
    code: customer.code!.trim(),
    name: customer.name!.trim(),
    email: customer.email ? customer.email.trim() : null,
    phone: customer.phone ? customer.phone.trim() : null,
    address: customer.address ? customer.address.trim() : null,
  };
}

export async function getAllCustomers() {
  return db
    .select({
      id: customers.id,
      code: customers.code,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      address: customers.address,
    })
    .from(customers)
    .where(notDeleted(customers))
    .orderBy(asc(customers.code), asc(customers.id));
}

export async function getDistinctCustomers() {
  return db
    .selectDistinct({
      id: customers.id,
      code: customers.code,
      name: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(notDeleted(orders), notDeleted(customers)))
    .orderBy(asc(customers.code), asc(customers.id));
}

export async function getCustomerById({
  data,
}: ServerFnPayload<{ id: number }>) {
  const { id } = customerIdSchema.parse(data);

  const rows = await db
    .select({
      id: customers.id,
      code: customers.code,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      address: customers.address,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      deletedAt: customers.deletedAt,
    })
    .from(customers)
    .where(and(eq(customers.id, id), notDeleted(customers)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getPaginatedCustomers({
  data,
}: ServerFnPayload<CustomersSearch>) {
  const parsed = customersSearchSchema.parse(data);
  const { pageIndex, pageSize, q, sortBy = "code", sortDir = "asc" } = parsed;

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.min(Math.max(10, pageSize), 100);
  const normalizedQ = normalizeParams(q);

  const conditions: Array<SQL> = [notDeleted(customers)];

  if (normalizedQ) {
    const search = `%${normalizedQ}%`;

    conditions.push(
      or(
        ilike(customers.name, search),
        ilike(customers.code, search),
        ilike(customers.email, search),
        ilike(customers.address, search),
        ilike(customers.phone, search),
      )!,
    );
  }

  const whereExpr: SQL =
    conditions.length === 1 ? conditions[0] : and(...conditions)!;

  const dir = sortDir === "desc" ? desc : asc;
  const orderByExpr =
    sortBy === "name"
      ? [dir(customers.name), asc(customers.id)]
      : [dir(customers.code), asc(customers.id)];

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(whereExpr),
    db
      .select({
        id: customers.id,
        code: customers.code,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        deletedAt: customers.deletedAt,
      })
      .from(customers)
      .where(whereExpr)
      .orderBy(...orderByExpr)
      .limit(safePageSize)
      .offset(safePageIndex * safePageSize),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    data: rows,
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    total,
    pageCount: Math.ceil(total / safePageSize),
  };
}

export async function createCustomer({ data }: ServerFnPayload<unknown>) {
  await requireAuth();

  const customer = parseCustomerInput(data);
  validateCustomerInput(customer);

  const [newCustomer] = await db
    .insert(customers)
    .values(toCustomerWriteSet(customer))
    .returning();

  return newCustomer;
}

export async function updateCustomer({
  data,
}: ServerFnPayload<{ id: number; data: unknown }>) {
  await requireAuth();

  const { id } = customerIdSchema.parse({ id: data.id });
  const customer = parseCustomerInput(data.data);
  validateCustomerInput(customer);

  const updatedCustomers = await db
    .update(customers)
    .set({
      ...toCustomerWriteSet(customer),
      updatedAt: sql`now()`,
    })
    .where(and(eq(customers.id, id), notDeleted(customers)))
    .returning();

  if (updatedCustomers.length === 0) {
    ensureCustomerNotFound();
  }

  return updatedCustomers[0];
}

export async function removeCustomer({
  data,
}: ServerFnPayload<{ id: number }>) {
  await requireAuth();

  const { id } = customerIdSchema.parse(data);

  const customerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, id), notDeleted(customers)))
    .limit(1);

  if (!customerRows[0]) {
    ensureCustomerNotFound();
  }

  const activeOrderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.customerId, id), notDeleted(orders)))
    .limit(1);

  if (activeOrderRows[0]) {
    ensureCustomerHasActiveOrders();
  }

  await db
    .update(customers)
    .set({
      deletedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(customers.id, id), notDeleted(customers)));

  return { success: true };
}
