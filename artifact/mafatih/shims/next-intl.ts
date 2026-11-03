// alias target for "next-intl": Korean only, {placeholder} interpolation
import messages from "../../../messages/ko.json";

type Dict = { [k: string]: string | Dict };

function lookup(path: string): string | Dict | undefined {
  return path.split(".").reduce<string | Dict | undefined>((o, k) => (o && typeof o === "object" ? o[k] : undefined), messages as Dict);
}

export function useLocale() {
  return "ko";
}

export function useTranslations(ns?: string) {
  const full = (k: string) => (ns ? `${ns}.${k}` : k);
  const t = (k: string, vals?: Record<string, string | number>) => {
    const v = lookup(full(k));
    if (typeof v !== "string") return full(k);
    return vals ? v.replace(/\{(\w+)\}/g, (_, n) => String(vals[n] ?? `{${n}}`)) : v;
  };
  t.raw = (k: string) => lookup(full(k));
  t.has = (k: string) => lookup(full(k)) !== undefined;
  return t;
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return children;
}
