import { headers } from "next/headers";

export async function getClientIP(): Promise<string | null> {
  const headerStore = await headers();

  const cf = headerStore.get("cf-connecting-ip");
  if (cf) return cf;

  const xff = headerStore.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const real = headerStore.get("x-real-ip");
  if (real) return real;

  // Avoid shared lock/rate-limit buckets when upstream IP headers are unavailable.
  return null;
}

export async function getUserAgent(): Promise<string | null> {
  const headerStore = await headers();
  const raw = headerStore.get("user-agent");
  return raw ? raw.slice(0, 500) : null;
}
