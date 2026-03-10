"use client";

import { PropsWithChildren, useEffect, useMemo } from "react";

import { usePageHeaderConfig } from "@/components/page-header-config-provider";

type RouteHeaderConfigProps = PropsWithChildren & {
  title: string;
  enableBackButton?: boolean;
};

export function RouteHeaderConfig({
  children,
  title,
  enableBackButton = true,
}: RouteHeaderConfigProps) {
  const { setHeaderConfig } = usePageHeaderConfig();

  const actions = useMemo(
    () => <>{children}</>,
    [children],
  );

  useEffect(() => {
    setHeaderConfig({
      title,
      actions,
      enableBackButton,
    });
  }, [actions, enableBackButton, setHeaderConfig, title]);

  return null;
}
