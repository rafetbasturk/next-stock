import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const hasSessionCookie = Boolean(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );

  if (user) {
    redirect("/");
  }

  if (hasSessionCookie) {
    redirect("/auth/clear-session?redirect=/login");
  }

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      {children}
    </main>
  );
}
