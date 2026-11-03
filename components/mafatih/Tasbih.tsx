"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { IconBook, IconCheck, IconReset } from "./icons";
import { useSettings, useTasbih } from "./store";

// Tasbih al-Zahra: 34 takbir, 33 tahmid, 33 tasbih
const STAGES = [
  { ar: "اَللّٰهُ اَكْبَرُ", tr: "Allāhu akbar", n: 34, tone: "mf-tone-green" },
  { ar: "اَلْحَمْدُ لِلّٰهِ", tr: "Al-ḥamdu lillāh", n: 33, tone: "mf-tone-gold" },
  { ar: "سُبْحَانَ اللّٰهِ", tr: "Subḥān Allāh", n: 33, tone: "mf-tone-indigo" },
];
const R = 118;
const C = 2 * Math.PI * R;
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function TasbihCounter({
  labels,
}: {
  labels: { title: string; sub: string; tap: string; reset: string; done: string; again: string; read: string; vibrate: string; total: string };
}) {
  const [st, setSt] = useTasbih();
  const [settings, setSettings] = useSettings();
  const [bump, setBump] = useState(0);
  const finished = st.stage >= STAGES.length;
  const stage = STAGES[Math.min(st.stage, STAGES.length - 1)];
  const frac = finished ? 1 : st.i / stage.n;
  const area = useRef<HTMLButtonElement>(null);

  const buzz = (ms: number | number[]) => {
    if (settings.haptics && "vibrate" in navigator) navigator.vibrate(ms);
  };

  const tap = () => {
    if (finished) return;
    setBump((b) => b + 1);
    setSt((s) => {
      const cur = STAGES[s.stage];
      const i = s.i + 1;
      if (i >= cur.n) {
        buzz(s.stage === STAGES.length - 1 ? [30, 60, 30, 60, 60] : [25, 50, 25]);
        return { i: 0, stage: s.stage + 1, total: s.total + 1 };
      }
      buzz(8);
      return { ...s, i, total: s.total + 1 };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        area.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-5 pb-36" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
      <h1 className="mt-5 text-[2.1rem] font-extrabold tracking-[-0.03em]">{labels.title}</h1>
      <p className="mt-1 text-[0.95rem] text-mf-mute">{labels.sub}</p>

      {/* stage pills */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {STAGES.map((sg, k) => {
          const doneHere = st.stage > k;
          const active = st.stage === k;
          return (
            <div
              key={k}
              className={`rounded-2xl px-3 py-2.5 text-center transition-colors ${
                active ? "bg-mf-text text-mf-bg" : doneHere ? "bg-mf-accent-soft text-mf-accent-ink" : "bg-mf-card text-mf-mute"
              }`}
            >
              <div className="text-[0.72rem] font-semibold opacity-80">{sg.tr}</div>
              <div className="flex items-center justify-center gap-1 text-[1.05rem] font-bold tabular-nums">
                {doneHere ? <IconCheck size={16} /> : null}
                {active ? `${st.i}/${sg.n}` : sg.n}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setSt((s) => ({ ...s, i: 0, stage: 0 }))}
          className={`mf-press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl font-bold ${
            finished ? "bg-mf-accent text-white" : "bg-mf-card text-mf-sub shadow-[var(--mf-shadow)]"
          }`}
        >
          <IconReset size={18} /> {finished ? labels.again : labels.reset}
        </button>
        <Link href="/mafatih/d/tasbih" className="mf-press flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-mf-card px-4 font-semibold text-mf-sub shadow-[var(--mf-shadow)]">
          <IconBook size={18} /> {labels.read}
        </Link>
      </div>
      {/* the counter */}
      <button
        ref={area}
        onClick={tap}
        className="relative mt-3 flex select-none flex-col items-center justify-center rounded-[32px] bg-mf-card py-7 shadow-[var(--mf-shadow)] outline-none"
        style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
        aria-label={labels.tap}
      >
        <div className="relative h-[14rem] w-[14rem]">
          <svg viewBox="0 0 260 260" className="absolute inset-0 -rotate-90">
            <circle cx="130" cy="130" r={R} fill="none" stroke="var(--mf-fill)" strokeWidth="14" />
            <circle
              cx="130"
              cy="130"
              r={R}
              fill="none"
              stroke={finished ? "var(--mf-accent)" : "url(#mf-tasbih-grad)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ transition: "stroke-dashoffset 220ms cubic-bezier(.2,.8,.2,1)" }}
            />
            <defs>
              <linearGradient id="mf-tasbih-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="#0a9a68" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {finished ? (
              <div className="mf-rise flex flex-col items-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mf-accent text-white">
                  <IconCheck size={34} />
                </span>
                <div className="mt-3 text-[1.2rem] font-bold">{labels.done}</div>
              </div>
            ) : (
              <>
                <div key={bump} className="mf-pop text-[4.2rem] font-extrabold leading-none tabular-nums tracking-tight">
                  {st.i}
                </div>
                <div lang="ar" dir="rtl" className="mt-3 font-[family-name:var(--mf-ar-font)] text-[1.9rem] leading-[1.6]">
                  {stage.ar}
                </div>
                <div className="text-[0.8rem] font-medium text-mf-mute">
                  {stage.tr} · <span lang="ar">{String(stage.n).replace(/\d/g, (d) => AR_DIGITS[+d])}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {!finished && <div className="mt-4 text-[0.85rem] font-medium text-mf-mute">{labels.tap}</div>}
      </button>

      <div className="mt-3 flex items-center justify-between px-1 text-[0.8rem] text-mf-mute">
        <span className="tabular-nums">{labels.total.replace("{n}", st.total.toLocaleString())}</span>
        <label className="flex items-center gap-2">
          {labels.vibrate}
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => setSettings((x) => ({ ...x, haptics: e.target.checked }))}
            className="h-4 w-4 accent-[var(--mf-accent)]"
          />
        </label>
      </div>
    </div>
  );
}
