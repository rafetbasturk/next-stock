"use client";

import { useMemo, useTransition, type ReactElement } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BoxesIcon,
  CoinsIcon,
  HomeIcon,
  LanguagesIcon,
  LogOutIcon,
  MoonIcon,
  MonitorIcon,
  PackageIcon,
  ShoppingCartIcon,
  SunIcon,
  TruckIcon,
  UsersIcon,
  ArrowDownUp,
  ListChecksIcon,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { currencyArray, currencyFlags } from "@/lib/currency";
import {
  locales,
  localeFlags,
  localeLabels,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useExchangeRatesStore } from "@/stores/exchange-rates-store";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import {
  PageHeaderConfigProvider,
  usePageHeaderConfig,
  type PageHeaderConfig,
} from "@/components/page-header-config-provider";
import { DashboardFilters } from "./dashboard/dashboard-filters";
import { useLocale, useTranslations } from "next-intl";
import { isAdminRole } from "@/lib/auth/roles";

type AppSidebarShellProps = {
  children: React.ReactNode;
  username: string;
  userRole: string;
  initialOpen?: boolean;
  hideBackButton?: boolean;
};

type CurrencyOption = (typeof currencyArray)[number];

const navItems = [
  {
    key: "overview",
    icon: HomeIcon,
    href: "/",
  },
  {
    key: "orders",
    icon: ShoppingCartIcon,
    href: "/orders",
  },
  {
    key: "orderTracking",
    icon: ListChecksIcon,
    href: "/orders/tracking",
  },
  {
    key: "products",
    icon: PackageIcon,
    href: "/products",
  },
  {
    key: "movements",
    icon: ArrowDownUp,
    href: "/movements",
  },
  {
    key: "customers",
    icon: UsersIcon,
    href: "/customers",
  },
  {
    key: "maintenance",
    icon: BoxesIcon,
    href: "/maintenance",
    adminOnly: true,
  },
  {
    key: "deliveries",
    icon: TruckIcon,
    href: "/deliveries",
  },
] as const;

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/orders") {
    return pathname === "/orders";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRouteTitle(pathname: string, t: (key: string) => string): string {
  if (pathname === "/") return t("pageTitles.overview");
  if (pathname.startsWith("/orders/tracking")) return t("pageTitles.orderTracking");
  if (pathname.startsWith("/orders")) return t("pageTitles.orders");
  if (pathname.startsWith("/products")) return t("pageTitles.products");
  if (pathname.startsWith("/movements")) return t("pageTitles.movements");
  if (pathname.startsWith("/customers")) return t("pageTitles.customers");
  if (pathname.startsWith("/maintenance")) return t("pageTitles.maintenance");
  if (pathname.startsWith("/report")) return t("pageTitles.maintenance");
  if (pathname.startsWith("/deliveries")) return t("pageTitles.deliveries");

  return t("pageTitles.overview");
}

function routeActions(pathname: string): ReactElement | null {
  if (pathname === "/") {
    return <DashboardFilters />;
  }

  return null;
}

function AppHeaderMain({
  children,
  hideBackButton,
}: {
  children: React.ReactNode;
  hideBackButton: boolean;
}) {
  const { headerConfig } = usePageHeaderConfig();

  return (
    <>
      <PageHeader
        enableBackButton={headerConfig.enableBackButton}
        hideBackButton={hideBackButton}
        title={headerConfig.title}
        leading={<SidebarTrigger className="md:hidden" />}
        actions={headerConfig.actions ?? null}
      />
      <main className="flex-1 min-h-0 min-w-0 overflow-hidden p-2 md:p-6">
        {children}
      </main>
    </>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const activeThemeLabel =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";
  const ActiveThemeIcon =
    theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <>
      <div className="space-y-2 group-data-[collapsible=icon]:hidden">
        <p className="text-sidebar-foreground/70 px-1 text-xs font-medium">
          Theme
        </p>
        <Select
          value={theme}
          onValueChange={(value) =>
            setTheme(value as "light" | "dark" | "system")
          }
        >
          <SelectTrigger className="bg-sidebar w-full">
            <SelectValue>
              <ActiveThemeIcon />
              {activeThemeLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <SunIcon />
              Light
            </SelectItem>
            <SelectItem value="dark">
              <MoonIcon />
              Dark
            </SelectItem>
            <SelectItem value="system">
              <MonitorIcon />
              System
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon-sm" />}
            aria-label="Change theme"
            title={`Theme: ${activeThemeLabel}`}
          >
            <ActiveThemeIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-40"
          >
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <MonitorIcon />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function CurrencySwitcher() {
  const preferredCurrency = useExchangeRatesStore(
    (state) => state.preferredCurrency,
  );
  const isRatesLoading = useExchangeRatesStore((state) => state.isLoading);
  const setPreferredCurrency = useExchangeRatesStore(
    (state) => state.setPreferredCurrency,
  );

  const handleCurrencyChange = (value: CurrencyOption) => {
    void setPreferredCurrency(value);
  };

  return (
    <>
      <div className="space-y-2 group-data-[collapsible=icon]:hidden">
        <p className="text-sidebar-foreground/70 px-1 text-xs font-medium">
          Currency
        </p>
        <Select
          value={preferredCurrency}
          onValueChange={(value) =>
            handleCurrencyChange(value as CurrencyOption)
          }
        >
          <SelectTrigger
            className="bg-sidebar w-full"
            disabled={isRatesLoading}
          >
            <SelectValue>
              <span className="mr-2">{currencyFlags[preferredCurrency]}</span>
              {preferredCurrency}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {currencyArray.map((currency) => (
              <SelectItem key={currency} value={currency}>
                <span className="mr-2">{currencyFlags[currency]}</span>
                {currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon-sm" />}
            aria-label="Change currency"
            title={`Currency: ${preferredCurrency}`}
          >
            <CoinsIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-32"
          >
            {currencyArray.map((currency) => (
              <DropdownMenuItem
                key={currency}
                onClick={() => handleCurrencyChange(currency)}
                disabled={isRatesLoading}
              >
                <span className="mr-2">{currencyFlags[currency]}</span>
                {currency}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  const activeLocale: Locale = locales.includes(currentLocale as Locale)
    ? (currentLocale as Locale)
    : "en";

  function handleLocaleChange(locale: Locale) {
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  }

  return (
    <>
      <div className="space-y-2 group-data-[collapsible=icon]:hidden">
        <p className="text-sidebar-foreground/70 px-1 text-xs font-medium">
          Language
        </p>
        <Select
          value={activeLocale}
          onValueChange={(value) => handleLocaleChange(value as Locale)}
        >
          <SelectTrigger className="bg-sidebar w-full">
            <SelectValue>
              <span className="mr-2">{localeFlags[activeLocale]}</span>
              {localeLabels[activeLocale]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {locales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                <span className="mr-2">{localeFlags[locale]}</span>
                {localeLabels[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon-sm" />}
            aria-label="Change language"
            title={`Language: ${localeLabels[activeLocale]}`}
          >
            <LanguagesIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-36"
          >
            {locales.map((locale) => (
              <DropdownMenuItem
                key={locale}
                onClick={() => handleLocaleChange(locale)}
              >
                <span className="mr-2">{localeFlags[locale]}</span>
                {localeLabels[locale]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function AppSidebarShell({
  children,
  username,
  userRole,
  initialOpen = false,
  hideBackButton = false,
}: AppSidebarShellProps) {
  return (
    <SidebarProvider defaultOpen={initialOpen}>
      <AppSidebarLayout
        username={username}
        userRole={userRole}
        hideBackButton={hideBackButton}
      >
        {children}
      </AppSidebarLayout>
    </SidebarProvider>
  );
}

function AppSidebarLayout({
  children,
  username,
  userRole,
  hideBackButton = false,
}: AppSidebarShellProps) {
  const t = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const { toggleSidebar, isMobile, open, setOpenMobile } = useSidebar();
  const title = getRouteTitle(pathname, t);
  const primaryNavigationLabel =
    locale === "tr" ? "Birincil gezinme" : "Primary navigation";
  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (!("adminOnly" in item) || !item.adminOnly) {
          return true;
        }

        return isAdminRole(userRole);
      }),
    [userRole],
  );
  const defaultHeaderConfig = useMemo<PageHeaderConfig>(
    () => ({
      title,
      actions: routeActions(pathname),
      enableBackButton: pathname !== "/",
    }),
    [pathname, title],
  );

  const interactiveSelector = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "form",
    "[role='menuitem']",
    "[data-slot='dropdown-menu-trigger']",
    "[data-slot='select-trigger']",
  ].join(",");

  function handleSidebarClick(event: React.MouseEvent<HTMLDivElement>) {
    if (isMobile) return;
    const target = event.target as HTMLElement;
    if (target.closest(interactiveSelector)) return;
    toggleSidebar();
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      try {
        await logoutAction();

        router.replace("/login");
        router.refresh();
      } catch (error) {
        console.error("Logout failed", error);
      }
    });
  }

  function handleNavigation() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        onClick={handleSidebarClick}
      >
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md text-left p-2",
              !open && "md:justify-center",
            )}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <div
              className={cn(
                "text-sidebar-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md",
                !open && "items-center",
              )}
            >
              <Image
                src={"/favicon-256.png"}
                alt="Company logo"
                width={32}
                height={32}
              />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold leading-tight">Next Stock</p>
              <p className="text-sidebar-foreground/70 truncate text-xs">
                @{username}
              </p>
            </div>
          </button>
        </SidebarHeader>

        <nav aria-label={primaryNavigationLabel} className="min-h-0 flex-1">
          <SidebarContent className="h-full">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {visibleNavItems.map((item) => {
                    const isActive = isNavItemActive(pathname, item.href);

                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          aria-current={isActive ? "page" : undefined}
                          onClick={handleNavigation}
                          title={!open ? t(`navigation.${item.key}`) : undefined}
                        >
                          <item.icon />
                          <span>{t(`navigation.${item.key}`)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </nav>

        <SidebarSeparator />

        <SidebarFooter>
          <LanguageSwitcher />
          <CurrencySwitcher />
          <ThemeSwitcher />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start group-data-[collapsible=icon]:hidden"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOutIcon />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </Button>
          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Logout"
              title="Logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOutIcon />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <PageHeaderConfigProvider
          key={`${pathname}:${locale}`}
          defaultConfig={defaultHeaderConfig}
        >
          <AppHeaderMain hideBackButton={hideBackButton}>
            {children}
          </AppHeaderMain>
        </PageHeaderConfigProvider>
      </SidebarInset>
    </>
  );
}
