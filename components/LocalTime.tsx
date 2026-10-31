"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { formatGregorian, formatHijri } from "@/lib/hijri";

/** Renders in UTC on the server, re-renders in the viewer's time zone after hydration. */
export function LocalTime({ iso, showHijri = true }: { iso: string; showHijri?: boolean }) {
  const locale = useLocale();
  const [tz, setTz] = useState<string>("UTC");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  return (
    <span className="inline-flex flex-col">
      <time dateTime={iso} suppressHydrationWarning>{formatGregorian(iso, locale, tz)}</time>
      {showHijri && (
        <span className="text-xs text-gold" suppressHydrationWarning>{formatHijri(iso, locale, tz)}</span>
      )}
    </span>
  );
}

export function TimezoneName() {
  const [tz, setTz] = useState("");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return <>{tz}</>;
}
