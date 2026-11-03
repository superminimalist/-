import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reader } from "@/components/mafatih/Reader";
import { IconBack, IconChevron } from "@/components/mafatih/icons";
import { breadcrumbs, getIndex, getSection, getTree, neighbours, type TocNode } from "@/lib/mafatih/content";
import { minutesOf } from "@/lib/mafatih/items";
import { readerLabels } from "@/lib/mafatih/labels";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const entry = (await getIndex()).find((e) => e.id === id);
  return { title: entry?.title };
}

function findNode(nodes: TocNode[], id: string): TocNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export default async function ReadPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sec = await getSection(id);
  if (!sec) notFound();

  const crumbs = await breadcrumbs(id);
  const eyebrow = crumbs.at(-1)?.title;

  // chapter headers with no body of their own → list what's under them
  if (sec.blocks.length === 0) {
    const node = findNode(await getTree(), id);
    const t = await getTranslations("mafatih");
    return (
      <div className="mx-auto max-w-[680px] px-5 pb-24" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
        <Link href="/mafatih/contents" className="mf-press inline-flex items-center gap-0.5 py-2 text-mf-accent-ink">
          <IconBack size={20} /> {t("contents.title")}
        </Link>
        {eyebrow && <div className="mt-4 text-[0.8rem] font-semibold text-mf-accent-ink">{eyebrow}</div>}
        <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight">{sec.title}</h1>
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

  const [{ prev, next }, labels] = await Promise.all([neighbours(id), readerLabels()]);
  return (
    <Reader
      href={`/mafatih/read/${id}`}
      k={id}
      tone="green"
      title={sec.title}
      eyebrow={eyebrow}
      page={sec.page}
      minutes={minutesOf(sec.blocks)}
      blocks={sec.blocks}
      prev={prev && { href: `/mafatih/read/${prev.id}`, title: prev.title }}
      next={next && { href: `/mafatih/read/${next.id}`, title: next.title }}
      labels={labels}
    />
  );
}
