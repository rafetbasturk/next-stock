"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveTheme(theme));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initialTheme = isTheme(stored) ? stored : "system";
    setThemeState(initialTheme);
    setResolvedTheme(resolveTheme(initialTheme));
    applyThemeClass(initialTheme);
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (theme !== "system") return;
      setResolvedTheme(resolveTheme("system"));
      applyThemeClass("system");
    };

    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(resolveTheme(nextTheme));
    applyThemeClass(nextTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
