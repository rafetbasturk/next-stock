import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.8.196"],
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
