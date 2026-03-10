"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getClientIP } from "@/lib/auth/client-info";
import { checkGlobalRateLimit } from "@/lib/auth/rate-limit";
import {
  checkLoginAllowed,
  clearLoginAttempts,
  recordFailedAttempt,
} from "@/lib/auth/login-attempts";
import { isAuthError } from "@/lib/auth/errors";
import { logError } from "@/lib/errors/log";
import { getErrorMessage } from "@/lib/errors/mapping";

export type LoginActionState = {
  error: string | null;
};

const INITIAL_LOGIN_STATE: LoginActionState = {
  error: null,
};

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formatRetryMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return "Please try again later.";
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Please try again in about ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

function mapLoginErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code === "ACCOUNT_LOCKED") {
      return `${getErrorMessage("ACCOUNT_LOCKED")} ${formatRetryMessage(error.retryAfterSeconds)}`;
    }

    if (error.code === "RATE_LIMITED") {
      return `${getErrorMessage("RATE_LIMITED")} ${formatRetryMessage(error.retryAfterSeconds)}`;
    }

    return getErrorMessage(error.code);
  }

  return getErrorMessage("AUTH_SYSTEM_ERROR");
}

export async function loginAction(
  prevState: LoginActionState = INITIAL_LOGIN_STATE,
  formData: FormData,
): Promise<LoginActionState> {
  void prevState;

  const username = readFormValue(formData, "username");
  const password = readFormValue(formData, "password");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const ip = await getClientIP();
  let authenticatedUserId: number | null = null;

  try {
    await checkGlobalRateLimit(ip);
    await checkLoginAllowed(username, ip);

    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      await recordFailedAttempt(username, ip);
      return { error: getErrorMessage("INVALID_CREDENTIALS") };
    }

    const verified = await verifyPassword(password, user.passwordHash);

    if (!verified) {
      await recordFailedAttempt(username, ip);
      return { error: getErrorMessage("INVALID_CREDENTIALS") };
    }

    await clearLoginAttempts(username, ip);
    authenticatedUserId = user.id;
  } catch (error) {
    if (!isAuthError(error)) {
      logError("loginAction unexpected error", error, { username, ip });
    }

    return {
      error: mapLoginErrorMessage(error),
    };
  }

  if (!authenticatedUserId) {
    return { error: getErrorMessage("AUTH_SYSTEM_ERROR") };
  }

  await createSession(authenticatedUserId);
  redirect("/");
}

export async function logoutAction(): Promise<{ success: true }> {
  await destroySession();
  return { success: true };
}
