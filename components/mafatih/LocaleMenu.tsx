"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { IconGlobe } from "./icons";

function Menu() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <label className="mf-press relative inline-flex items-center gap-1.5 rounded-full bg-mf-card px-3 py-1.5 text-[0.8rem] font-semibold text-mf-sub shadow-[var(--mf-shadow)]">
      <IconGlobe size={15} />
      {localeNames[locale as Locale]}
      <select
        aria-label="Language"
        className="absolute inset-0 cursor-pointer opacity-0"
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
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MfLocaleMenu() {
  return (
    <Suspense fallback={null}>
      <Menu />
    </Suspense>
  );
}
