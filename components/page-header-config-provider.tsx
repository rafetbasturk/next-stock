"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

export type PageHeaderConfig = {
  title: string;
  actions?: ReactElement | null;
  enableBackButton?: boolean;
};

type PageHeaderConfigContextValue = {
  headerConfig: PageHeaderConfig;
  setHeaderConfig: (updates: Partial<PageHeaderConfig>) => void;
  resetHeaderConfig: () => void;
};

const PageHeaderConfigContext =
  createContext<PageHeaderConfigContextValue | null>(null);

type PageHeaderConfigProviderProps = {
  defaultConfig: PageHeaderConfig;
  children: ReactNode;
};

export function PageHeaderConfigProvider({
  defaultConfig,
  children,
}: PageHeaderConfigProviderProps) {
  const [headerConfig, setHeaderConfigState] = useState<PageHeaderConfig>(
    defaultConfig,
  );

  const setHeaderConfig = useCallback((updates: Partial<PageHeaderConfig>) => {
    setHeaderConfigState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetHeaderConfig = useCallback(() => {
    setHeaderConfigState(defaultConfig);
  }, [defaultConfig]);

  const value = useMemo<PageHeaderConfigContextValue>(
    () => ({
      headerConfig,
      setHeaderConfig,
      resetHeaderConfig,
    }),
    [headerConfig, resetHeaderConfig, setHeaderConfig],
  );

  return (
    <PageHeaderConfigContext.Provider value={value}>
      {children}
    </PageHeaderConfigContext.Provider>
  );
}

export function usePageHeaderConfig() {
  const context = useContext(PageHeaderConfigContext);

  if (!context) {
    throw new Error(
      "usePageHeaderConfig must be used within PageHeaderConfigProvider.",
    );
  }

  return context;
}

