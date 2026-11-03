import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentsView } from "@/components/mafatih/Contents";
import { getTree } from "@/lib/mafatih/content";
import { ITEMS, type ItemKey } from "@/lib/mafatih/plan";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mafatih.contents" });
  return { title: t("title") };
}

export default async function ContentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mafatih");
  const tree = await getTree();

  // strip to what the client needs
  type N = { id: string; title: string; page: number; words: number; children: N[] };
  const slim = (n: { id: string; title: string; page: number; words: number; children: N[] }): N => ({
    id: n.id, title: n.title, page: n.page, words: n.words, children: n.children.map(slim),
  });
  const quick = (Object.keys(ITEMS) as ItemKey[]).map((k) => ({
    key: k,
    tone: ITEMS[k].tone,
    href: `/mafatih/d/${k}`,
    title: t(`items.${k}.t`),
    sub: t(`items.${k}.s`),
  }));

  return (
    <ContentsView
      tree={tree.map(slim)}
      quick={quick}
      labels={{
        title: t("contents.title"),
        search: t("contents.search"),
        empty: t("contents.empty"),
      }}
    />
  );
}
