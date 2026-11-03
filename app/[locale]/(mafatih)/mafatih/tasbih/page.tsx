import { getTranslations, setRequestLocale } from "next-intl/server";
import { TasbihCounter } from "@/components/mafatih/Tasbih";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mafatih.tasbih" });
  return { title: t("title") };
}

export default async function TasbihPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mafatih.tasbih");
  const keys = ["title", "sub", "tap", "reset", "done", "again", "read", "vibrate", "total"] as const;
  const labels = Object.fromEntries(keys.map((k) => [k, t.raw(k) as string])) as Record<(typeof keys)[number], string>;
  return <TasbihCounter labels={labels} />;
}
