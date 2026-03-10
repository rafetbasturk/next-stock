import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./constants";

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}
