"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";

type AppSettingsContextValue = {
  initialTimeZone: string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({
  children,
  initialTimeZone,
}: PropsWithChildren<AppSettingsContextValue>) {
  return (
    <AppSettingsContext.Provider value={{ initialTimeZone }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const value = useContext(AppSettingsContext);

  if (!value) {
    throw new Error("useAppSettings must be used within AppSettingsProvider.");
  }

  return value;
}
