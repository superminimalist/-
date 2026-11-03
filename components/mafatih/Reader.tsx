"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import type { Block } from "@/lib/mafatih/types";
import {
  IconBack, IconCheck, IconChevron, IconClose, IconPlay, IconStar, IconTextSize,
} from "./icons";
import { useBookmarks, useRecents, useSettings, type ArFont, type Theme } from "./store";
import { ToneIcon } from "./ui";

export type ReaderLabels = {
  back: string; settings: string; fontSize: string; font: string; guide: string; awake: string; theme: string;
  themeSystem: string; themeLight: string; themeDark: string; focus: string; close: string; prev: string; next: string;
  save: string; saved: string; finish: string; finishSub: string; tapHint: string; nextLabel: string; prevLabel: string;
  page: string; minutes: string;
};

type Nav = { href: string; title: string } | null;

export type ReaderProps = {
  href: string;
  k: string;
  tone: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  page: number;
  minutes: number;
  blocks: Block[];
  prev: Nav;
  next: Nav;
  labels: ReaderLabels;
};

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[+d]);

const SMALL = new Set(["of", "the", "and", "on", "in", "for", "to", "at", "al", "a", "by", "from", "with"]);
function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i && SMALL.has(w) ? w : w.replace(/(^|[-(’'])([a-z])/g, (_, a, b) => a + b.toUpperCase())))
    .join(" ")
    .replace(/\((a|s|a\.s\.|s\.a\.w\.a\.|a\.t\.f\.s\.?)\)/gi, (m) => m.toUpperCase());
}

/** keep the screen awake while praying (Wake Lock API; silently no-op where unsupported) */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const req = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denied / not visible */
      }
    };
    const onVis = () => alive && document.visibilityState === "visible" && req();
    req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

export function Reader(p: ReaderProps) {
  const { labels: L } = p;
  const locale = useLocale();
  const rtlUi = isRtl(locale);
  const router = useRouter();
  const [s, setS] = useSettings();
  const [bookmarks, setBookmarks] = useBookmarks();
  const [, setRecents] = useRecents();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const progressRef = useRef(0);

  useWakeLock(s.awake);

  const hasArabic = p.blocks.some((b) => b.t === "ar");
  const showGuide = s.guide || !hasArabic;
  const saved = bookmarks.some((b) => b.href === p.href);

  // record visit + progress
  const remember = useCallback(
    (prog: number) =>
      setRecents((list) =>
        [
          { href: p.href, title: p.title, sub: p.subtitle, tone: p.tone, at: Date.now(), progress: prog },
          ...list.filter((e) => e.href !== p.href),
        ].slice(0, 30),
      ),
    [p.href, p.title, p.subtitle, p.tone, setRecents],
  );

  useEffect(() => {
    remember(0);
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const f = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      setScrolled(window.scrollY > 72);
      setProgress(f);
      progressRef.current = Math.max(progressRef.current, f);
      clearTimeout(t);
      t = setTimeout(() => remember(progressRef.current), 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, [remember]);

  const toggleSave = () =>
    setBookmarks((list) =>
      saved
        ? list.filter((b) => b.href !== p.href)
        : [{ href: p.href, title: p.title, sub: p.subtitle, tone: p.tone, at: Date.now() }, ...list],
    );

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/mafatih");
  };

  // focus mode walks the Arabic passages; the nearest rubric above each one rides along
  const passages = useMemo(() => {
    const out: { ar: Extract<Block, { t: "ar" }>; note?: string; idx: number }[] = [];
    let note: string | undefined;
    p.blocks.forEach((b, idx) => {
      if (b.t === "ar") {
        out.push({ ar: b, note, idx });
        note = undefined;
      } else note = b.t === "h" ? titleCase(b.x) : b.x;
    });
    return out;
  }, [p.blocks]);
  const firstPassageOf = useMemo(() => {
    const m = new Map<number, number>();
    passages.forEach((ps, i) => m.set(ps.idx, i));
    return m;
  }, [passages]);

  return (
    <div className="min-h-dvh pb-24">
      {/* top bar */}
      <div className="mf-bar sticky z-30 border-b border-transparent" style={{ top: "var(--mf-sticky-top)", paddingTop: "var(--mf-sat)" }}>
        <div className={`mx-auto flex h-12 max-w-[760px] items-center gap-1 px-2 transition-[border-color] ${scrolled ? "" : ""}`}>
          <button onClick={goBack} aria-label={L.back} className="mf-press flex h-10 items-center gap-0.5 rounded-full px-2 text-mf-accent-ink">
            <IconBack size={22} />
            <span className="text-[0.95rem] font-medium max-sm:sr-only">{L.back}</span>
          </button>
          <div
            className={`min-w-0 flex-1 truncate text-center text-[0.95rem] font-semibold transition-opacity duration-200 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          >
            {p.title}
          </div>
          <button onClick={() => setSheet(true)} aria-label={L.settings} className="mf-press flex h-10 w-10 items-center justify-center rounded-full text-mf-sub">
            <IconTextSize size={22} />
          </button>
          <button
            onClick={toggleSave}
            aria-label={saved ? L.saved : L.save}
            aria-pressed={saved}
            className={`mf-press flex h-10 w-10 items-center justify-center rounded-full ${saved ? "text-mf-gold" : "text-mf-sub"}`}
          >
            <IconStar size={22} filled={saved} className={saved ? "mf-pop" : ""} />
          </button>
        </div>
        <div className="h-[2px] bg-transparent">
          <div className="h-full bg-mf-accent transition-[width] duration-150 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <article className="mx-auto max-w-[760px] px-5">
        {/* title */}
        <header className="mf-rise pb-6 pt-6">
          {p.eyebrow && <div className="mb-2 text-[0.8rem] font-semibold text-mf-accent-ink">{p.eyebrow}</div>}
          <div className="flex items-start gap-3.5">
            <ToneIcon k={p.k} tone={p.tone} size={52} />
            <div className="min-w-0">
              <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.025em]">{p.title}</h1>
              {p.subtitle && <p className="mt-1 text-[0.92rem] text-mf-mute">{p.subtitle}</p>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.8rem] font-medium text-mf-sub">
            <span className="rounded-full bg-mf-card px-3 py-1 shadow-[var(--mf-shadow)]">{L.page.replace("{page}", String(p.page))}</span>
            {hasArabic && (
              <span className="rounded-full bg-mf-card px-3 py-1 shadow-[var(--mf-shadow)]">
                {L.minutes.replace("{n}", String(p.minutes))}
              </span>
            )}
          </div>
          {passages.length > 1 && (
            <button
              onClick={() => setFocus(0)}
              className="mf-press mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-mf-accent py-3.5 text-[1rem] font-bold text-white shadow-[0_10px_24px_-12px_var(--mf-accent)]"
            >
              <IconPlay size={16} />
              {L.focus}
            </button>
          )}
        </header>

        {/* body */}
        <div className="mf-card px-5 py-6 sm:px-8">
          {p.blocks.map((b, i) => {
            if (b.t === "h")
              return (
                <h2
                  key={i}
                  id={`h-${i}`}
                  className="mb-4 mt-8 flex items-center gap-3 text-[0.95rem] font-bold text-mf-accent-ink first:mt-0"
                >
                  <span className="h-4 w-1 shrink-0 rounded-full bg-mf-accent" />
                  {titleCase(b.x)}
                </h2>
              );
            if (b.t === "en")
              return showGuide ? (
                <p
                  key={i}
                  lang="en"
                  dir="ltr"
                  className="mf-en my-4 rounded-2xl bg-mf-fill px-4 py-3 text-mf-sub first:mt-0"
                >
                  {b.x}
                </p>
              ) : null;
            const pi = firstPassageOf.get(i) ?? 0;
            return (
              <Fragment key={i}>
                <p
                  lang="ar"
                  dir="rtl"
                  onDoubleClick={() => setFocus(pi)}
                  className="mf-ar my-3 border-b border-mf-line/70 pb-4 text-mf-text last:border-0 first:mt-0"
                >
                  {b.x}
                  {"v" in b && b.v ? <span className="mf-verse"> ﴿{toArabicDigits(b.v)}﴾</span> : null}
                </p>
              </Fragment>
            );
          })}
        </div>

        {/* end */}
        {hasArabic && (
          <div className="mt-6 flex flex-col items-center gap-1 px-4 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mf-accent-soft text-mf-accent-ink">
              <IconCheck size={26} />
            </span>
            <div className="mt-2 text-[1.05rem] font-bold">{L.finish}</div>
            <div className="text-[0.88rem] text-mf-mute">{L.finishSub}</div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {p.prev && <NavCard nav={p.prev} label={L.prevLabel} dir="prev" />}
          {p.next && <NavCard nav={p.next} label={L.nextLabel} dir="next" />}
        </div>
      </article>

      {sheet && <SettingsSheet onClose={() => setSheet(false)} labels={L} settings={s} set={setS} />}
      {focus !== null && passages.length > 0 && (
        <Focus
          passages={passages}
          start={focus}
          rtlUi={rtlUi}
          title={p.title}
          labels={L}
          onClose={(at) => {
            setFocus(null);
            requestAnimationFrame(() => {
              const el = document.querySelectorAll<HTMLElement>("[lang=ar].mf-ar")[at];
              el?.scrollIntoView({ block: "center" });
            });
          }}
          onSettings={() => setSheet(true)}
        />
      )}
    </div>
  );
}

function NavCard({ nav, label, dir }: { nav: { href: string; title: string }; label: string; dir: "prev" | "next" }) {
  return (
    <Link href={nav.href} className={`mf-card mf-press flex items-center gap-3 p-4 ${dir === "next" ? "sm:col-start-2" : ""}`}>
      {dir === "prev" && <IconBack size={18} className="shrink-0 text-mf-mute" />}
      <div className={`min-w-0 flex-1 ${dir === "next" ? "text-end" : ""}`}>
        <div className="text-[0.75rem] font-semibold text-mf-mute">{label}</div>
        <div className="truncate font-semibold">{nav.title}</div>
      </div>
      {dir === "next" && <IconChevron size={18} className="shrink-0 text-mf-mute" />}
    </Link>
  );
}

// ───────────────────────────────────────── focus mode
function Focus({
  passages, start, rtlUi, title, labels: L, onClose, onSettings,
}: {
  passages: { ar: Extract<Block, { t: "ar" }>; note?: string }[];
  start: number;
  rtlUi: boolean;
  title: string;
  labels: ReaderLabels;
  onClose: (at: number) => void;
  onSettings: () => void;
}) {
  const [i, setI] = useState(start);
  const n = passages.length;
  const go = useCallback((d: number) => setI((x) => Math.min(n - 1, Math.max(0, x + d))), [n]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fwd = rtlUi ? "ArrowLeft" : "ArrowRight";
      const back = rtlUi ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd || e.key === " " || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === back || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") onClose(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, rtlUi, onClose, i]);

  const cur = passages[i];
  const done = i === n - 1;

  return (
    <div
      className="mf-fade fixed inset-0 z-50 flex flex-col bg-mf-bg"
      role="dialog"
      aria-modal
      aria-label={title}
      onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const t0 = touch.current;
        touch.current = null;
        if (!t0) return;
        const dx = e.clientX - t0.x;
        const dy = e.clientY - t0.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go((dx < 0) !== rtlUi ? 1 : -1);
      }}
    >
      <div className="flex items-center gap-2 px-3" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <button onClick={() => onClose(i)} aria-label={L.close} className="mf-press flex h-10 w-10 items-center justify-center rounded-full bg-mf-card text-mf-sub shadow-[var(--mf-shadow)]">
          <IconClose size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[0.85rem] font-semibold text-mf-sub">{title}</div>
          <div className="text-[0.75rem] tabular-nums text-mf-mute">
            {i + 1} / {n}
          </div>
        </div>
        <button onClick={onSettings} aria-label={L.settings} className="mf-press flex h-10 w-10 items-center justify-center rounded-full bg-mf-card text-mf-sub shadow-[var(--mf-shadow)]">
          <IconTextSize size={20} />
        </button>
      </div>
      <div className="mx-4 mt-3 h-1 overflow-hidden rounded-full bg-mf-fill">
        <div className="h-full rounded-full bg-mf-accent transition-[width] duration-300" style={{ width: `${((i + 1) / n) * 100}%` }} />
      </div>

      {/* tap zones: start side = back, end side = forward */}
      <div className="relative flex min-h-0 flex-1">
        <button aria-label={L.prev} onClick={() => go(-1)} className="absolute inset-y-0 start-0 z-10 w-[22%]" />
        <button aria-label={L.next} onClick={() => go(1)} className="absolute inset-y-0 end-0 z-10 w-[22%]" />
        <div className="mx-auto flex w-full max-w-[720px] flex-col overflow-y-auto px-6 py-8">
          <div key={i} className="mf-rise my-auto">
            {cur.note && (
              <p dir="ltr" lang="en" className="mx-auto mb-6 line-clamp-4 max-w-[34rem] text-center text-[0.88rem] leading-relaxed text-mf-mute">
                {cur.note}
              </p>
            )}
            <p lang="ar" dir="rtl" className="mf-ar-focus text-center text-mf-text">
              {cur.ar.x}
              {cur.ar.v ? <span className="mf-verse"> ﴿{toArabicDigits(cur.ar.v)}﴾</span> : null}
            </p>
            {done && (
              <div className="mt-10 flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mf-accent-soft text-mf-accent-ink">
                  <IconCheck size={26} />
                </span>
                <div className="mt-2 font-bold">{L.finish}</div>
                <div className="text-[0.85rem] text-mf-mute">{L.finishSub}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 pt-2" style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="mf-press flex h-14 flex-1 items-center justify-center gap-1 rounded-2xl bg-mf-card font-semibold text-mf-sub shadow-[var(--mf-shadow)] disabled:opacity-40"
        >
          <IconBack size={18} /> {L.prev}
        </button>
        <button
          onClick={() => (done ? onClose(i) : go(1))}
          className="mf-press flex h-14 flex-[1.6] items-center justify-center gap-1 rounded-2xl bg-mf-accent font-bold text-white"
        >
          {done ? (
            <>
              <IconCheck size={18} /> {L.close}
            </>
          ) : (
            <>
              {L.next} <IconChevron size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── settings sheet
function SettingsSheet({
  onClose, labels: L, settings: s, set,
}: {
  onClose: () => void;
  labels: ReaderLabels;
  settings: ReturnType<typeof useSettings>[0];
  set: ReturnType<typeof useSettings>[1];
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fonts: { v: ArFont; label: string; family: string }[] = [
    { v: "amiri", label: "Amiri", family: '"Amiri", serif' },
    { v: "naskh", label: "Naskh", family: '"Noto Naskh Arabic", serif' },
    { v: "scheherazade", label: "Scheherazade", family: '"Scheherazade New", serif' },
  ];
  const themes: { v: Theme; label: string }[] = [
    { v: "system", label: L.themeSystem },
    { v: "light", label: L.themeLight },
    { v: "dark", label: L.themeDark },
  ];
  const step = (d: number) => set((x) => ({ ...x, scale: Math.round(Math.min(1.8, Math.max(0.8, x.scale + d)) * 100) / 100 }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal aria-label={L.settings}>
      <button aria-label={L.close} onClick={onClose} className="mf-fade absolute inset-0 bg-black/35" />
      <div
        className="mf-sheet relative w-full max-w-[560px] rounded-t-[28px] bg-mf-elev px-5 pt-2.5 shadow-2xl sm:mb-6 sm:rounded-[28px]"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-mf-line" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[1.15rem] font-bold">{L.settings}</h3>
          <button onClick={onClose} aria-label={L.close} className="mf-press flex h-8 w-8 items-center justify-center rounded-full bg-mf-fill text-mf-sub">
            <IconClose size={16} />
          </button>
        </div>

        <p lang="ar" dir="rtl" className="mf-ar mb-4 rounded-2xl bg-mf-fill px-4 py-3 text-center" style={{ textAlign: "center", textAlignLast: "center" }}>
          بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
        </p>

        <Label>{L.fontSize}</Label>
        <div className="flex items-center gap-3 rounded-2xl bg-mf-fill p-2">
          <button onClick={() => step(-0.1)} className="mf-press h-10 w-12 rounded-xl bg-mf-elev text-[0.9rem] font-bold shadow-[var(--mf-shadow)]">
            A−
          </button>
          <input
            type="range"
            min={0.8}
            max={1.8}
            step={0.05}
            value={s.scale}
            onChange={(e) => set((x) => ({ ...x, scale: Number(e.target.value) }))}
            className="flex-1 accent-[var(--mf-accent)]"
            aria-label={L.fontSize}
          />
          <button onClick={() => step(0.1)} className="mf-press h-10 w-12 rounded-xl bg-mf-elev text-[1.15rem] font-bold shadow-[var(--mf-shadow)]">
            A+
          </button>
        </div>

        <Label>{L.font}</Label>
        <Segmented
          value={s.font}
          onChange={(v) => set((x) => ({ ...x, font: v }))}
          options={fonts.map((f) => ({
            v: f.v,
            node: (
              <span className="flex flex-col items-center leading-none">
                <span style={{ fontFamily: f.family }} className="text-[1.35rem] leading-[1.6]">
                  بسم
                </span>
                <span className="text-[0.7rem] font-semibold opacity-70">{f.label}</span>
              </span>
            ),
          }))}
        />

        <Label>{L.theme}</Label>
        <Segmented value={s.theme} onChange={(v) => set((x) => ({ ...x, theme: v }))} options={themes.map((o) => ({ v: o.v, node: o.label }))} />

        <div className="mt-5 overflow-hidden rounded-2xl bg-mf-fill">
          <Toggle label={L.guide} on={s.guide} onChange={(v) => set((x) => ({ ...x, guide: v }))} />
          <div className="mx-4 h-px bg-mf-line" />
          <Toggle label={L.awake} on={s.awake} onChange={(v) => set((x) => ({ ...x, awake: v }))} />
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-5 px-1 text-[0.8rem] font-semibold text-mf-mute">{children}</div>;
}

function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; node: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-mf-fill p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`mf-press min-h-10 rounded-xl px-2 py-1.5 text-[0.9rem] font-semibold transition-colors ${
            value === o.v ? "bg-mf-elev text-mf-text shadow-[0_1px_4px_rgb(0_0_0/0.12)]" : "text-mf-mute"
          }`}
        >
          {o.node}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-[0.98rem] font-medium">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-[31px] w-[51px] rounded-full bg-mf-line transition-colors peer-checked:bg-mf-accent" />
        <span className="absolute start-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-[20px] rtl:peer-checked:-translate-x-[20px]" />
      </span>
    </label>
  );
}
