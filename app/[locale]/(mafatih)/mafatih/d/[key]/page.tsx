import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reader } from "@/components/mafatih/Reader";
import { breadcrumbs, getSlice } from "@/lib/mafatih/content";
import { minutesOf } from "@/lib/mafatih/items";
import { readerLabels } from "@/lib/mafatih/labels";
import { DAILY, ITEMS, WEEK, WEEK_ORDER, isItemKey, type ItemKey } from "@/lib/mafatih/plan";

type Params = Promise<{ locale: string; key: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, key } = await params;
  if (!isItemKey(key)) return {};
  const t = await getTranslations({ locale, namespace: "mafatih.items" });
  return { title: t(`${key}.t`) };
}

/** curated reading order so "next" flows naturally: the week, then the daily set */
const FLOW: ItemKey[] = [
  ...WEEK_ORDER.flatMap((d) => [WEEK[d].dua, ...WEEK[d].ziyarah, ...WEEK[d].extra]),
  ...DAILY,
];

export default async function CuratedPage({ params }: { params: Params }) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  if (!isItemKey(key)) notFound();
  const item = ITEMS[key];
  const sec = await getSlice(item.slice);
  if (!sec) notFound();

  const t = await getTranslations("mafatih.items");
  const [labels, crumbs] = await Promise.all([readerLabels(), breadcrumbs(item.slice.id)]);
  const i = FLOW.indexOf(key);
  const nav = (k: ItemKey | undefined) => (k ? { href: `/mafatih/d/${k}`, title: t(`${k}.t`) } : null);
  // heading-sliced items take their English title from the sub-heading, not the parent section
  const sub = "h" in item.slice && item.slice.h ? undefined : sec.title;

  return (
    <Reader
      href={`/mafatih/d/${key}`}
      k={key}
      tone={item.tone}
      title={t(`${key}.t`)}
      subtitle={[t(`${key}.s`), sub].filter(Boolean).join(" · ")}
      eyebrow={crumbs.at(-1)?.title}
      page={sec.page}
      minutes={minutesOf(sec.blocks)}
      blocks={sec.blocks}
      prev={i > 0 ? nav(FLOW[i - 1]) : null}
      next={i >= 0 ? nav(FLOW[i + 1]) : null}
      labels={labels}
    />
  );
}
