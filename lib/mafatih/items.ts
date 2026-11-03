import "server-only";
import { getTranslations } from "next-intl/server";
import { getSlice } from "./content";
import { ITEMS, type ItemKey } from "./plan";
import type { Block, ItemView } from "./types";

export type { ItemView };

/** recitation pace ≈ 90 Arabic words / min */
export function minutesOf(blocks: Block[]) {
  const words = blocks.reduce((n, b) => n + (b.t === "ar" ? b.x.split(" ").length : 0), 0);
  return Math.max(1, Math.round(words / 90));
}

export async function itemViews(keys: ItemKey[]): Promise<Record<string, ItemView>> {
  const t = await getTranslations("mafatih.items");
  const out: Record<string, ItemView> = {};
  await Promise.all(
    [...new Set(keys)].map(async (key) => {
      const it = ITEMS[key];
      const sec = await getSlice(it.slice);
      out[key] = {
        key,
        href: `/mafatih/d/${key}`,
        title: t(`${key}.t`),
        sub: t(`${key}.s`),
        tone: it.tone,
        minutes: sec ? minutesOf(sec.blocks) : 1,
      };
    }),
  );
  return out;
}
