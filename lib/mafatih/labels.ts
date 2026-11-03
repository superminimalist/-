import "server-only";
import { getTranslations } from "next-intl/server";
import type { ReaderLabels } from "@/components/mafatih/Reader";

const KEYS = [
  "back", "settings", "fontSize", "font", "guide", "awake", "theme", "themeSystem", "themeLight", "themeDark", "focus",
  "close", "prev", "next", "save", "saved", "finish", "finishSub", "tapHint", "nextLabel", "prevLabel", "page", "minutes",
] as const satisfies readonly (keyof ReaderLabels)[];

export async function readerLabels(): Promise<ReaderLabels> {
  const t = await getTranslations("mafatih.reader");
  // raw: page / minutes carry {placeholders} filled on the client
  return Object.fromEntries(KEYS.map((k) => [k, t.raw(k) as string])) as ReaderLabels;
}
