// Single-page build of /mafatih for a claude.ai artifact: same components, data from content.json,
// hash routing via ./shims. Mirrors app/[locale]/(mafatih)/mafatih/**/page.tsx.
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Shell } from "@/components/mafatih/Shell";
import { ContinueReading, TodayHero, WeekSection } from "@/components/mafatih/Today";
import { Reader, type ReaderLabels } from "@/components/mafatih/Reader";
import { ContentsView } from "@/components/mafatih/Contents";
import { TasbihCounter } from "@/components/mafatih/Tasbih";
import { SavedView } from "@/components/mafatih/Saved";
import { ItemPoster, ItemTile, SectionTitle } from "@/components/mafatih/ui";
import { IconBack, IconChevron } from "@/components/mafatih/icons";
import { Link } from "@/i18n/navigation";
import { DAILY, FAMOUS, ITEMS, MOMENT_ITEMS, WEEK, WEEK_ORDER, isItemKey, type ItemKey } from "@/lib/mafatih/plan";
import { breadcrumbsIn, buildTree, findNode, minutesOf, neighboursIn, sliceBlocks } from "@/lib/mafatih/pure";
import type { Block, IndexEntry, ItemView, Slice } from "@/lib/mafatih/types";
import { usePath } from "./shims/router";

type Data = { index: IndexEntry[]; s: Record<string, Block[]> };

const READER_KEYS = [
  "back", "settings", "fontSize", "font", "guide", "awake", "theme", "themeSystem", "themeLight", "themeDark", "focus",
  "close", "prev", "next", "save", "saved", "finish", "finishSub", "tapHint", "nextLabel", "prevLabel", "page", "minutes",
] as const;

function blocksOf(d: Data, s: Slice) {
  const b = d.s[s.id] ?? [];
  return "h" in s ? sliceBlocks(b, s.h) : b;
}

export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("content.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setErr(true));
  }, []);
  return <Shell>{data ? <Routes d={data} /> : <Splash err={err} />}</Shell>;
}

function Splash({ err }: { err: boolean }) {
  return (
    <div className="mx-auto max-w-[680px] px-5 pt-10" aria-busy={!err}>
      <div className="text-[2.1rem] font-extrabold tracking-[-0.03em]">마파티훌 지난</div>
      {err ? (
        <p className="mt-3 text-mf-sub">본문을 불러오지 못했어요. 페이지를 새로고침해 주세요.</p>
      ) : (
        <>
          <div className="mt-3 h-5 w-64 rounded-lg mf-skeleton" />
          <div className="mt-6 h-[15.5rem] rounded-[28px] mf-skeleton" />
          <div className="mt-6 h-40 rounded-[22px] mf-skeleton" />
        </>
      )}
    </div>
  );
}

function Routes({ d }: { d: Data }) {
  const path = usePath();
  const t = useTranslations("mafatih");
  const labels = useMemo(
    () => Object.fromEntries(READER_KEYS.map((k) => [k, t.raw(`reader.${k}`) as string])) as ReaderLabels,
    [t],
  );
  const views = useMemo(() => {
    const out: Record<string, ItemView> = {};
    for (const k of Object.keys(ITEMS) as ItemKey[]) {
      out[k] = {
        key: k,
        href: `/mafatih/d/${k}`,
        title: t(`items.${k}.t`),
        sub: t(`items.${k}.s`),
        tone: ITEMS[k].tone,
        minutes: minutesOf(blocksOf(d, ITEMS[k].slice)),
      };
    }
    return out;
    // t is stable for a fixed locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  useEffect(() => {
    const title = document.querySelector("title");
    if (title) title.textContent = "마파티훌 지난";
  }, [path]);

  if (path === "/mafatih/contents") return <Contents d={d} views={views} />;
  if (path === "/mafatih/tasbih") return <TasbihCounter labels={rawGroup(t, "tasbih", ["title", "sub", "tap", "reset", "done", "again", "read", "vibrate", "total"])} />;
  if (path === "/mafatih/saved")
    return <SavedView labels={rawGroup(t, "saved", ["title", "bookmarks", "recents", "empty", "noRecents", "clear"])} />;

  const dm = path.match(/^\/mafatih\/d\/(\w+)$/);
  if (dm && isItemKey(dm[1])) return <Curated d={d} k={dm[1]} labels={labels} key={path} />;
  const rm = path.match(/^\/mafatih\/read\/([a-z0-9-]+)$/);
  if (rm && d.s[rm[1]] !== undefined) return <Read d={d} id={rm[1]} labels={labels} key={path} />;

  return <Today views={views} />;
}

function rawGroup<K extends string>(t: ReturnType<typeof useTranslations>, ns: string, keys: K[]) {
  return Object.fromEntries(keys.map((k) => [k, t.raw(`${ns}.${k}`) as string])) as Record<K, string>;
}

function Today({ views }: { views: Record<string, ItemView> }) {
  const t = useTranslations("mafatih");
  const owners = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((n) => [n, t(`owners.${n}`)]));
  const moments = Object.fromEntries(Object.keys(MOMENT_ITEMS).map((m) => [m, t(`moment.${m}`)]));
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-36" style={{ paddingTop: "max(20px, var(--mf-sat))" }}>
      <div className="pt-2 text-[0.8rem] font-semibold text-mf-mute">{t("tagline")}</div>
      <TodayHero
        views={views}
        momentItems={MOMENT_ITEMS}
        moments={moments}
        labels={{
          title: t("today.title"),
          now: t("today.now"),
          start: t("today.start"),
          fridayEve: t("today.fridayEve"),
          fridayEveSub: t("today.fridayEveSub"),
        }}
      />
      <ContinueReading label={t("today.continue")} />
      <WeekSection
        views={views}
        week={WEEK}
        owners={owners}
        labels={{
          title: t("today.week"),
          dedicated: t.raw("today.dedicated") as string,
          dua: t("today.dua"),
          ziyarah: t("today.ziyarah"),
          special: t("today.special"),
        }}
      />
      <SectionTitle>{t("today.daily")}</SectionTitle>
      <p className="-mt-2 mb-3 px-1 text-[0.9rem] text-mf-mute">{t("today.dailySub")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {DAILY.map((k) => (
          <ItemTile key={k} it={views[k]} />
        ))}
      </div>
      <SectionTitle>{t("today.famous")}</SectionTitle>
      <div className="mf-noscrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
        {FAMOUS.map((k) => (
          <ItemPoster key={k} it={views[k]} />
        ))}
      </div>
      <Link href="/mafatih/contents" className="mf-card mf-press mt-9 flex items-center justify-between px-5 py-4 font-semibold">
        {t("today.allContents")}
        <IconChevron size={18} className="text-mf-mute" />
      </Link>
      <p className="mt-8 px-1 text-center text-[0.75rem] leading-relaxed text-mf-mute">{t("source")}</p>
    </div>
  );
}

const FLOW: ItemKey[] = [...WEEK_ORDER.flatMap((n) => [WEEK[n].dua, ...WEEK[n].ziyarah, ...WEEK[n].extra]), ...DAILY];

function Curated({ d, k, labels }: { d: Data; k: ItemKey; labels: ReaderLabels }) {
  const t = useTranslations("mafatih.items");
  const item = ITEMS[k];
  const blocks = blocksOf(d, item.slice);
  const entry = d.index.find((e) => e.id === item.slice.id);
  const i = FLOW.indexOf(k);
  const nav = (x: ItemKey | undefined) => (x ? { href: `/mafatih/d/${x}`, title: t(`${x}.t`) } : null);
  const sub = "h" in item.slice && item.slice.h ? undefined : entry?.title;
  return (
    <Reader
      href={`/mafatih/d/${k}`}
      k={k}
      tone={item.tone}
      title={t(`${k}.t`)}
      subtitle={[t(`${k}.s`), sub].filter(Boolean).join(" · ")}
      eyebrow={breadcrumbsIn(d.index, item.slice.id).at(-1)?.title}
      page={entry?.page ?? 0}
      minutes={minutesOf(blocks)}
      blocks={blocks}
      prev={i > 0 ? nav(FLOW[i - 1]) : null}
      next={i >= 0 ? nav(FLOW[i + 1]) : null}
      labels={labels}
    />
  );
}

function Read({ d, id, labels }: { d: Data; id: string; labels: ReaderLabels }) {
  const t = useTranslations("mafatih");
  const entry = d.index.find((e) => e.id === id)!;
  const blocks = d.s[id];
  const eyebrow = breadcrumbsIn(d.index, id).at(-1)?.title;

  if (blocks.length === 0) {
    const node = findNode(buildTree(d.index), id);
    return (
      <div className="mx-auto max-w-[680px] px-5 pb-24" style={{ paddingTop: "max(16px, var(--mf-sat))" }}>
        <Link href="/mafatih/contents" className="mf-press inline-flex items-center gap-0.5 py-2 text-mf-accent-ink">
          <IconBack size={20} /> {t("contents.title")}
        </Link>
        {eyebrow && <div className="mt-4 text-[0.8rem] font-semibold text-mf-accent-ink">{eyebrow}</div>}
        <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight">{entry.title}</h1>
        <p className="mt-2 text-mf-mute">{t("reader.empty")}</p>
        <div className="mf-card mt-6 overflow-hidden">
          {node?.children.map((c, i, a) => (
            <Link key={c.id} href={`/mafatih/read/${c.id}`} className="mf-row flex items-center gap-3 px-4">
              <div className={`flex flex-1 items-center gap-3 py-3.5 ${i < a.length - 1 ? "border-b border-mf-line" : ""}`}>
                <span className="min-w-0 flex-1 font-medium">{c.title}</span>
                <span className="text-[0.8rem] tabular-nums text-mf-mute">{c.page}</span>
                <IconChevron size={16} className="text-mf-mute" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { prev, next } = neighboursIn(d.index, id);
  return (
    <Reader
      href={`/mafatih/read/${id}`}
      k={id}
      tone="green"
      title={entry.title}
      eyebrow={eyebrow}
      page={entry.page}
      minutes={minutesOf(blocks)}
      blocks={blocks}
      prev={prev && { href: `/mafatih/read/${prev.id}`, title: prev.title }}
      next={next && { href: `/mafatih/read/${next.id}`, title: next.title }}
      labels={labels}
    />
  );
}

function Contents({ d, views }: { d: Data; views: Record<string, ItemView> }) {
  const t = useTranslations("mafatih.contents");
  const tree = useMemo(() => buildTree(d.index), [d]);
  const quick = Object.values(views).map((v) => ({ key: v.key, tone: v.tone, href: v.href, title: v.title, sub: v.sub }));
  return <ContentsView tree={tree} quick={quick} labels={{ title: t("title"), search: t("search"), empty: t("empty") }} />;
}
