import { defineRouting } from "next-intl/routing";

export const locales = ["ko", "en", "ur", "ar", "fa"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: readonly Locale[] = ["ur", "ar", "fa"];
export const isRtl = (l: string) => (rtlLocales as readonly string[]).includes(l);

export const localeNames: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ur: "اردو",
  ar: "العربية",
  fa: "فارسی",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "ko",
});
