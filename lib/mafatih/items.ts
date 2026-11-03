import "server-only";
import { getTranslations } from "next-intl/server";
import { getSlice } from "./content";
import { ITEMS, type ItemKey } from "./plan";
import { minutesOf } from "./pure";
import type { ItemView } from "./types";

export { minutesOf };
export type { ItemView };

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
