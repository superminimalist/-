import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_LANGUAGES, LIBRARY_TYPES, type LibraryItem, type LibraryType } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = Promise<{ type?: string; lang?: string; q?: string }>;

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Search;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, lang, q } = await searchParams;
  const t = await getTranslations("library");
  const tt = await getTranslations("libraryTypes");
  const tl = await getTranslations("languages");

  const supabase = await createClient();
  let query = supabase.from("library_items").select("*").order("title").limit(200);
  if (type && LIBRARY_TYPES.includes(type as LibraryType)) query = query.eq("type", type);
  if (lang) query = query.eq("language", lang);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,reciter.ilike.%${safe}%`);
  }
  const { data: items } = await query.returns<LibraryItem[]>();

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { type, lang, q, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/library?${s}` : "/library";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <div className="flex flex-wrap gap-2">
        <Link href={href({ type: undefined })} className={!type ? "btn" : "btn-ghost"}>{t("all")}</Link>
        {LIBRARY_TYPES.map((ty) => (
          <Link key={ty} href={href({ type: ty })} className={type === ty ? "btn" : "btn-ghost"}>{tt(ty)}</Link>
        ))}
      </div>

      <form className="flex flex-wrap gap-2" action="">
        {type && <input type="hidden" name="type" value={type} />}
        <input name="q" defaultValue={q} placeholder={t("search")} className="input max-w-xs" />
        <select name="lang" defaultValue={lang ?? ""} className="input max-w-[12rem]">
          <option value="">{t("allLanguages")}</option>
          {CONTENT_LANGUAGES.map((l) => <option key={l} value={l}>{tl(l)}</option>)}
        </select>
        <button className="btn-ghost">↵</button>
      </form>

      {items && items.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-panel">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={`/library/${it.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-ink/40">
                <div className="min-w-0">
                  <div className="font-medium" dir="auto">{it.title}</div>
                  {it.reciter && <div className="text-sm text-mute" dir="auto">{it.reciter}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {it.audio_url && <span aria-hidden className="text-accent">♪</span>}
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">{tt(it.type)}</span>
                  <span className="rounded-full bg-line px-2 py-0.5 text-mute">{tl.has(it.language) ? tl(it.language) : it.language}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-mute">{t("empty")}</p>
      )}
    </div>
  );
}
