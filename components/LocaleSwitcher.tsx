"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label="Language"
      className="rounded-md border border-line bg-ink px-2 py-1 text-sm"
      value={locale}
      disabled={pending}
      onChange={(e) =>
        start(() => {
          const qs = search.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: e.target.value as Locale });
        })
      }
    >
      {locales.map((l) => (
        <option key={l} value={l}>{localeNames[l]}</option>
      ))}
    </select>
  );
}
