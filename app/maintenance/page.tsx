import { StockIntegrityCard } from "@/components/report/stock-integrity-card";
import { RouteHeaderConfig } from "@/components/route-header-config";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/roles";
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("App");
  const user = await getCurrentUser();
  const isAdmin = isAdminRole(user?.role);

  return (
    <>
      <RouteHeaderConfig title={t("pageTitles.maintenance")} />
      <StockIntegrityCard isAdmin={isAdmin} />
    </>
  );
}
