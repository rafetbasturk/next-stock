import { lt, sql } from "drizzle-orm";
import { GLOBAL_LIMIT, GLOBAL_LOCK_MS, GLOBAL_WINDOW_MS } from "./constants";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { AuthError } from "./errors";

export async function checkGlobalRateLimit(ip: string | null) {
  if (!ip) return;

  const now = new Date();

  const result = await db
    .insert(rateLimits)
    .values({
      ip,
      count: 1,
      windowStart: now.toISOString(),
    })
    .onConflictDoUpdate({
      target: rateLimits.ip,
      set: {
        count: sql`
          CASE
            WHEN ${rateLimits.windowStart} < ${new Date(now.getTime() - GLOBAL_WINDOW_MS)}
            THEN 1
            ELSE ${rateLimits.count} + 1
          END
        `,
        windowStart: sql`
          CASE
            WHEN ${rateLimits.windowStart} < ${new Date(now.getTime() - GLOBAL_WINDOW_MS)}
            THEN ${now}
            ELSE ${rateLimits.windowStart}
          END
        `,
        lockedUntil: sql`
          CASE
            WHEN ${rateLimits.count} + 1 > ${GLOBAL_LIMIT}
            THEN ${new Date(now.getTime() + GLOBAL_LOCK_MS)}
            ELSE ${rateLimits.lockedUntil}
          END
        `,
      },
    })
    .returning();

  const record = result[0];

  if (record.lockedUntil && new Date(record.lockedUntil) > now) {
    const retryAfterSeconds = Math.ceil(
      (new Date(record.lockedUntil).getTime() - now.getTime()) / 1000,
    );
    throw new AuthError("RATE_LIMITED", "Too many requests.", {
      retryAfterSeconds,
    });
  }
}

export async function cleanupRateLimits() {
  if (Math.random() > 0.01) return;

  await db
    .delete(rateLimits)
    .where(
      lt(rateLimits.windowStart, new Date(Date.now() - 86400000).toISOString()),
    );
}
