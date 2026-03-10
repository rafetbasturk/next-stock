import { and, eq, lt, sql } from "drizzle-orm";
import { LOCK_TIME_MS, MAX_ATTEMPTS, SESSION_TTL_SECONDS } from "./constants";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { AuthError } from "./errors";

export async function checkLoginAllowed(username: string, ip: string | null) {
  if (!ip) return true;

  const now = new Date();

  const rows = await db
    .select()
    .from(loginAttempts)
    .where(and(eq(loginAttempts.username, username), eq(loginAttempts.ip, ip)))
    .limit(1);

  const record = rows.at(0);

  if (!record) return true;

  if (record.lockedUntil) {
    const lockedUntil = new Date(record.lockedUntil);

    if (lockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (lockedUntil.getTime() - now.getTime()) / 1000,
      );
      throw new AuthError(
        "ACCOUNT_LOCKED",
        "Too many failed login attempts.",
        { retryAfterSeconds },
      );
    }
  }

  return true;
}

export async function recordFailedAttempt(username: string, ip: string | null) {
  if (!ip) return;

  const now = new Date();

  await db
    .insert(loginAttempts)
    .values({
      username,
      ip,
      attempts: 1,
      lastAttemptAt: now.toISOString(),
      lockedUntil: null,
    })
    .onConflictDoUpdate({
      target: [loginAttempts.username, loginAttempts.ip],
      set: {
        attempts: sql`${loginAttempts.attempts} + 1`,
        lockedUntil: sql`
          CASE
            WHEN ${loginAttempts.attempts} + 1 >= ${MAX_ATTEMPTS}
            THEN ${new Date(now.getTime() + LOCK_TIME_MS).toISOString()}
            ELSE ${loginAttempts.lockedUntil}
          END
        `,
        lastAttemptAt: now.toISOString(),
      },
    });
}

export async function clearLoginAttempts(username: string, ip: string | null) {
  if (!ip) return;

  await db
    .delete(loginAttempts)
    .where(and(eq(loginAttempts.username, username), eq(loginAttempts.ip, ip)));
}

export async function cleanupLoginAttempts() {
  if (Math.random() > 0.01) return;

  await db
    .delete(loginAttempts)
    .where(
      lt(
        loginAttempts.lastAttemptAt,
        new Date(Date.now() - SESSION_TTL_SECONDS * 1000).toISOString(),
      ),
    );
}
