import { getTranslations, setRequestLocale } from "next-intl/server";
import { SavedView } from "@/components/mafatih/Saved";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mafatih.saved" });
  return { title: t("title") };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mafatih.saved");
  return (
    <SavedView
      labels={{
        title: t("title"),
        bookmarks: t("bookmarks"),
        recents: t("recents"),
        empty: t("empty"),
        noRecents: t("noRecents"),
        clear: t("clear"),
      }}
    />
  );
}
