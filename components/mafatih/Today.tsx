"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatHijri } from "@/lib/hijri";
import { isFridayEve, momentOf, type Moment, type Weekday } from "@/lib/mafatih/plan";
import type { ItemView } from "@/lib/mafatih/types";
import { IconChevron, IconDome, IconMoon, IconPlay } from "./icons";
import { useRecents } from "./store";
import { ItemList, SectionTitle, ToneIcon } from "./ui";

type Views = Record<string, ItemView>;

/** current time, refreshed each minute; null until mounted (the server can't know the user's clock) */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const MOMENT_TONE: Record<Moment, string> = {
  dawn: "dawn", morning: "day", noon: "day", afternoon: "gold", evening: "dusk", night: "night",
};

export function TodayHero({
  views, momentItems, moments, labels,
}: {
  views: Views;
  momentItems: Record<Moment, string[]>;
  moments: Record<string, string>;
  labels: { title: string; now: string; start: string; fridayEve: string; fridayEveSub: string };
}) {
  const locale = useLocale();
  const now = useNow();

  if (!now) {
    return (
      <div aria-hidden>
        <div className="mt-6 h-10 w-28 rounded-xl mf-skeleton" />
        <div className="mt-3 h-5 w-64 rounded-lg mf-skeleton" />
        <div className="mt-6 h-[15.5rem] rounded-[28px] mf-skeleton" />
      </div>
    );
  }

  const h = now.getHours();
  const day = now.getDay() as Weekday;
  const m = momentOf(h);
  const [main, ...rest] = momentItems[m].map((k) => views[k]);
  const greg = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(now);
  const hijri = formatHijri(now, locale);
  const kumayl = views.kumayl;

  return (
    <div className="mf-rise">
      <h1 className="mt-5 text-[2.1rem] font-extrabold leading-tight tracking-[-0.03em]">{labels.title}</h1>
      <p className="mt-1 text-[0.95rem] font-medium text-mf-sub">
        {greg}
        <span className="mx-1.5 text-mf-mute">·</span>
        <span className="text-mf-accent-ink">{hijri}</span>
      </p>

      {isFridayEve(day, h) && kumayl && (
        <Link
          href={kumayl.href}
          className="mf-tone-night mf-press mt-5 flex items-center gap-4 rounded-[22px] p-4 text-white"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <IconMoon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{labels.fridayEve}</div>
            <div className="text-[0.85rem] text-white/75">{labels.fridayEveSub}</div>
          </div>
          <IconChevron size={18} className="text-white/70" />
        </Link>
      )}

      <section className={`mf-tone-${MOMENT_TONE[m]} relative mt-5 overflow-hidden rounded-[28px] p-5 text-white shadow-[0_18px_40px_-20px_rgb(0_0_0/0.45)]`}>
        <div className="pointer-events-none absolute -end-10 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[0.75rem] font-semibold backdrop-blur-sm">
            {moments[m]} · {labels.now}
          </span>
          <h2 className="mt-4 text-[1.65rem] font-extrabold leading-tight tracking-tight">{main.title}</h2>
          <p className="mt-1 text-[0.95rem] text-white/80">{main.sub}</p>
          <Link
            href={main.href}
            className="mf-press mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[0.95rem] font-bold text-[#191f28] shadow-sm"
          >
            <IconPlay size={16} />
            {labels.start}
            <span className="font-medium text-[#8b95a1]">· {main.minutes}′</span>
          </Link>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          {rest.map((it) => (
            <Link key={it.key} href={it.href} className="mf-press flex items-center gap-2.5 rounded-2xl bg-white/15 p-2.5 backdrop-blur-sm">
              <ToneIcon k={it.key} tone={it.tone} size={30} />
              <span className="line-clamp-2 text-[0.82rem] font-semibold leading-tight">{it.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const SUNDAY_FIRST: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const SATURDAY_FIRST: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

export function WeekSection({
  views, week, owners, labels,
}: {
  views: Views;
  week: Record<Weekday, { dua: string; ziyarah: string[]; extra: string[] }>;
  owners: Record<string, string>;
  labels: { title: string; dedicated: string; dua: string; ziyarah: string; special: string };
}) {
  const locale = useLocale();
  const now = useNow();
  const today = now ? (now.getDay() as Weekday) : null;
  const [picked, setPicked] = useState<Weekday | null>(null);
  const day = picked ?? today ?? 0;
  const order = ["ko", "en"].includes(locale) ? SUNDAY_FIRST : SATURDAY_FIRST;
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2024-01-07 was a Sunday
  const nameOf = (d: Weekday) => short.format(new Date(Date.UTC(2024, 0, 7 + d)));
  const plan = week[day];

  return (
    <section>
      <SectionTitle>{labels.title}</SectionTitle>
      <div className="mf-card grid grid-cols-7 gap-1 p-1.5" role="tablist">
        {order.map((d) => {
          const on = d === day;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(d)}
              className={`mf-press relative flex min-w-0 flex-col items-center rounded-[16px] px-0.5 py-2.5 text-[0.85rem] font-semibold transition-colors ${
                on ? "bg-mf-text text-mf-bg" : d === 5 ? "text-mf-accent-ink" : "text-mf-sub"
              }`}
            >
              <span className={`w-full truncate text-center ${order === SATURDAY_FIRST ? "text-[0.68rem]" : ""}`}>{nameOf(d)}</span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${d === today ? (on ? "bg-mf-bg" : "bg-mf-accent") : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      <div key={day} className="mf-fade">
        <div className="mt-4 flex items-center gap-2 px-1 text-[0.95rem] font-semibold text-mf-sub">
          <IconDome size={18} className="text-mf-gold" />
          {labels.dedicated.replace("{names}", owners[day])}
        </div>
        <div className="mt-3 space-y-3">
          <ItemList items={[views[plan.dua], ...plan.ziyarah.map((k) => views[k])]} />
          {plan.extra.length > 0 && (
            <>
              <div className="px-1 pt-2 text-[0.8rem] font-semibold uppercase tracking-wide text-mf-mute">{labels.special}</div>
              <ItemList items={plan.extra.map((k) => views[k])} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function ContinueReading({ label }: { label: string }) {
  const [recents] = useRecents();
  const cutoff = Date.now() - 7 * 86_400_000;
  const r = recents.find((e) => (e.progress ?? 0) > 0.03 && (e.progress ?? 0) < 0.97 && e.at > cutoff);
  if (!r) return null;
  return (
    <Link href={r.href} className="mf-card mf-press mf-rise mt-4 flex items-center gap-3.5 p-4">
      <ToneIcon k={r.href.split("/").pop() ?? ""} tone={r.tone ?? "green"} size={42} />
      <div className="min-w-0 flex-1">
        <div className="text-[0.78rem] font-semibold text-mf-accent-ink">{label}</div>
        <div className="truncate font-semibold">{r.title}</div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-mf-fill">
          <div className="h-full rounded-full bg-mf-accent" style={{ width: `${Math.round((r.progress ?? 0) * 100)}%` }} />
        </div>
      </div>
      <IconChevron size={18} className="text-mf-mute" />
    </Link>
  );
}
