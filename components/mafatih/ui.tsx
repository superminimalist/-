import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { ItemView } from "@/lib/mafatih/types";
import {
  IconBeads, IconBook, IconChevron, IconDome, IconHands, IconMoon, IconSparkle, IconSun, IconSunrise, IconSunset,
} from "./icons";

const ICONS: Record<string, (p: { size?: number }) => ReactNode> = {
  fajr: IconSunrise, sabah: IconSunrise, zuhr: IconSun, asr: IconSun, maghrib: IconSunset, sunrise: IconSunset,
  fridayAsr: IconSunset, isha: IconMoon, nightPrayer: IconMoon, kumayl: IconMoon, fridayNight: IconMoon, munajat: IconMoon,
  taqibat: IconHands, shukr: IconHands, tasbih: IconBeads, ahd: IconSparkle, friday: IconSparkle, faraj: IconSparkle,
  yasin: IconBook,
};

export function iconFor(key: string) {
  if (ICONS[key]) return ICONS[key];
  if (key.startsWith("dua")) return IconHands;
  if (key.startsWith("z") || ["ashura", "warith", "jamia"].includes(key)) return IconDome;
  return IconBook;
}

/** app-icon style squircle */
export function ToneIcon({ k, tone, size = 40 }: { k: string; tone: string; size?: number }) {
  const I = iconFor(k);
  return (
    <span
      className={`mf-tone-${tone} inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.25)]`}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <I size={size * 0.55} />
    </span>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-end justify-between gap-3 px-1">
      <h2 className="text-[1.3rem] font-bold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

/** inset-grouped list row */
export function ItemRow({ it, last }: { it: ItemView; last?: boolean }) {
  return (
    <Link href={it.href} className="mf-row flex items-center gap-3.5 px-4 transition-colors">
      <ToneIcon k={it.key} tone={it.tone} size={40} />
      <div className={`flex min-w-0 flex-1 items-center gap-3 py-3.5 ${last ? "" : "border-b border-mf-line"}`}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[1.02rem] font-semibold">{it.title}</div>
          <div className="truncate text-[0.85rem] text-mf-mute">{it.sub}</div>
        </div>
        <span className="shrink-0 text-[0.8rem] tabular-nums text-mf-mute">{it.minutes}′</span>
        <IconChevron size={16} className="shrink-0 text-mf-mute/70" />
      </div>
    </Link>
  );
}

export function ItemList({ items }: { items: ItemView[] }) {
  return (
    <div className="mf-card overflow-hidden">
      {items.map((it, i) => (
        <ItemRow key={it.key} it={it} last={i === items.length - 1} />
      ))}
    </div>
  );
}

/** square tile for grids */
export function ItemTile({ it }: { it: ItemView }) {
  return (
    <Link href={it.href} className="mf-card mf-press flex min-h-[8.5rem] flex-col justify-between p-4">
      <ToneIcon k={it.key} tone={it.tone} size={38} />
      <div className="mt-3">
        <div className="text-[0.98rem] font-semibold leading-snug">{it.title}</div>
        <div className="mt-0.5 line-clamp-1 text-[0.8rem] text-mf-mute">{it.sub}</div>
      </div>
    </Link>
  );
}

/** wide card for horizontal carousels */
export function ItemPoster({ it }: { it: ItemView }) {
  return (
    <Link
      href={it.href}
      className={`mf-tone-${it.tone} mf-press relative flex h-44 w-40 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] p-4 text-white`}
    >
      <span className="pointer-events-none absolute -end-6 -top-6 opacity-20">
        {(() => {
          const I = iconFor(it.key);
          return <I size={110} />;
        })()}
      </span>
      <span className="self-start rounded-full bg-white/20 px-2 py-0.5 text-[0.72rem] font-medium backdrop-blur-sm">
        {it.minutes}′
      </span>
      <div>
        <div className="text-[1.05rem] font-bold leading-tight">{it.title}</div>
        <div className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-white/80">{it.sub}</div>
      </div>
    </Link>
  );
}
