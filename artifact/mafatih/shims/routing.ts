// alias target for "@/i18n/routing" (the real one pulls in next-intl/routing)
export const locales = ["ko"] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<string, string> = { ko: "한국어" };
export const isRtl = (l: string) => ["ur", "ar", "fa"].includes(l);
