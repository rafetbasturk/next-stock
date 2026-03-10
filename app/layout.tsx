import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import localFont from "next/font/local";
import { AppSettingsProvider } from "@/components/app-settings-provider";
import { AppSidebarShell } from "@/components/app-sidebar-shell";
import { ExchangeRatesBootstrap } from "@/components/exchange-rates-bootstrap";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TimezoneBootstrap } from "@/components/timezone-bootstrap";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { isValidIanaTimeZone } from "@/lib/timezone";
import { getServerTimeZone } from "@/lib/server/timezone";

const notoSans = localFont({
  src: [
    {
      path: "../public/fonts/noto-sans/NotoSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans/NotoSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans/NotoSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans/NotoSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sipariş Stok Takip",
  description: "Sipariş ve stok takibi için basit bir uygulama.",
};

const themeInitializerScript = `
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const theme = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
    const isDark = theme === "dark" || (
      theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(isDark ? "dark" : "light");
  } catch (_) {}
})();
`;

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const resolvedLocale = await getLocale();
  const locale = isLocale(resolvedLocale) ? resolvedLocale : defaultLocale;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/";
  const isLoginRoute = pathname === "/login";
  const isPublicRoute = isLoginRoute;
  const user = await getCurrentUser();
  const serverTimeZone = await getServerTimeZone({
    userTimeZone: user?.timeZone ?? null,
    requestHeaders: headerStore,
  });
  const hasSessionCookie = Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const savedSidebarState = cookieStore.get("sidebar_state")?.value;
  const initialSidebarOpen = savedSidebarState === "true";
  const referer = headerStore.get("referer");
  let previousRouteIsLogin = false;

  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      previousRouteIsLogin = parsedReferer.pathname === "/login";
    } catch {
      previousRouteIsLogin = false;
    }
  }

  if (!user && !isPublicRoute) {
    if (hasSessionCookie) {
      redirect("/auth/clear-session?redirect=/login");
    }

    redirect("/login");
  }

  if (user && isLoginRoute) {
    redirect("/");
  }

  const hasProfileTimeZone = Boolean(
    user?.timeZone && isValidIanaTimeZone(user.timeZone),
  );

  const appSettingsScript = `window.__APP_SETTINGS__=${serializeForInlineScript({
    lang: locale,
    theme: "system",
    timeZone: serverTimeZone,
    timeZoneSource: hasProfileTimeZone ? "profile" : "request",
  })};`;

  return (
    <html lang={locale} suppressHydrationWarning className={notoSans.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
        <script dangerouslySetInnerHTML={{ __html: appSettingsScript }} />
      </head>
      <body className={`${notoSans.variable} antialiased`}>
        <NextIntlClientProvider locale={locale}>
          <AppSettingsProvider initialTimeZone={serverTimeZone}>
            <QueryProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <TimezoneBootstrap />
                  {user && !isLoginRoute ? (
                    <>
                      <ExchangeRatesBootstrap />
                      <AppSidebarShell
                        username={user.username}
                        userRole={user.role}
                        initialOpen={initialSidebarOpen}
                        hideBackButton={previousRouteIsLogin}
                      >
                        {children}
                      </AppSidebarShell>
                    </>
                  ) : (
                    children
                  )}
                </TooltipProvider>
                <Toaster position="bottom-right" closeButton />
              </ThemeProvider>
            </QueryProvider>
          </AppSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
