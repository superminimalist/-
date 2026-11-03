import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LibraryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const scriptClass: Record<string, string> = { ar: "text-script-ar", ur: "text-script-ur", fa: "text-script-fa" };
const rtl = new Set(["ar", "ur", "fa"]);

export default async function LibraryItemPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("library");
  const tt = await getTranslations("libraryTypes");
  const tm = await getTranslations("majlis");

  const supabase = await createClient();
  const { data: it } = await supabase.from("library_items").select("*").eq("id", id).maybeSingle<LibraryItem>();
  if (!it) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/library" className="text-sm text-mute hover:text-text">← {tm("back")}</Link>

      <header className="space-y-1">
        <div className="text-sm text-gold">{tt(it.type)}</div>
        <h1 className="text-3xl font-semibold" dir="auto">{it.title}</h1>
        {it.reciter && <div className="text-mute">{t("reciter")}: <span dir="auto">{it.reciter}</span></div>}
      </header>

      {it.audio_url && <audio src={it.audio_url} controls preload="metadata" className="w-full" />}

      {it.text_original && (
        <section className="card">
          <h2 className="label">{t("original")}</h2>
          <div
            lang={it.language}
            dir={rtl.has(it.language) ? "rtl" : "ltr"}
            className={`whitespace-pre-line ${scriptClass[it.language] ?? ""}`}
          >
            {it.text_original}
          </div>
        </section>
      )}

      {it.text_translation && (
        <section className="card">
          <h2 className="label">{t("translation")}</h2>
          <div dir="auto" className="whitespace-pre-line leading-relaxed">{it.text_translation}</div>
        </section>
      )}
    </article>
  );
}
