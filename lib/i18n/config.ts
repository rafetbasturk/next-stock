export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export const localeFlags: Record<Locale, string> = {
  tr: "🇹🇷",
  en: "🇺🇸",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
