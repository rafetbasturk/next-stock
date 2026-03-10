import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { assertAdminAccess } from "./roles";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./constants";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  timeZone: string | null;
};

type SessionRow = {
  sessionId: number;
  userId: number;
  username: string;
  role: string;
  timeZone: string | null;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

function isMissingTimeZoneColumnError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("users.time_zone") &&
    message.toLowerCase().includes("does not exist")
  );
}

function getCookieConfig(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);

  const expiresAt = createSessionExpiryDate();
  const expiresAtIso = expiresAt.toISOString();
  const nowIso = new Date().toISOString();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");

  await db.insert(sessions).values({
    userId,
    refreshToken: tokenHash,
    userAgent,
    expiresAt: expiresAtIso,
    lastActivityAt: nowIso,
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, getCookieConfig(expiresAt));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    await db.delete(sessions).where(eq(sessions.refreshToken, tokenHash));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const nowIso = new Date().toISOString();

  let session: SessionRow | undefined;

  try {
    const [row] = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        username: users.username,
        role: users.role,
        timeZone: users.timeZone,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(eq(sessions.refreshToken, tokenHash), gt(sessions.expiresAt, nowIso)),
      )
      .limit(1);

    session = row;
  } catch (error) {
    if (!isMissingTimeZoneColumnError(error)) {
      throw error;
    }

    // Backward compatibility during rolling deploys before `users.time_zone` migration.
    const [legacyRow] = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        username: users.username,
        role: users.role,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(eq(sessions.refreshToken, tokenHash), gt(sessions.expiresAt, nowIso)),
      )
      .limit(1);

    session = legacyRow
      ? {
          ...legacyRow,
          timeZone: null,
        }
      : undefined;
  }

  if (!session) {
    // Do not mutate cookies here: this function is also called from Server Components
    // (e.g. RootLayout), where cookie writes/deletes are not allowed.
    return null;
  }

  await db
    .update(sessions)
    .set({ lastActivityAt: nowIso })
    .where(eq(sessions.id, session.sessionId));

  return {
    id: session.userId,
    username: session.username,
    role: session.role,
    timeZone: session.timeZone,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  assertAdminAccess(user);
  return user;
}
