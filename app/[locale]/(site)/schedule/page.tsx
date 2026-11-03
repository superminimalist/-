import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { MajlisCard } from "@/components/MajlisCard";
import { TimezoneName } from "@/components/LocalTime";
import type { Majlis, MajlisSeries } from "@/lib/types";
import { MARK, splitAround } from "@/lib/interpolate";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("schedule");
  const supabase = await createClient();

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [{ data: series }, { data: majalis }] = await Promise.all([
    supabase.from("majlis_series").select("*").order("created_at", { ascending: false }).returns<MajlisSeries[]>(),
    supabase
      .from("majlis")
      .select("*")
      .or(`starts_at.gte.${since},status.eq.live`)
      .order("starts_at")
      .returns<Majlis[]>(),
  ]);

  const list = majalis ?? [];
  const groups = (series ?? [])
    .map((s) => ({ s, items: list.filter((m) => m.series_id === s.id) }))
    .filter((g) => g.items.length > 0);
  const loose = list.filter((m) => !m.series_id || !series?.some((s) => s.id === m.series_id));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-mute">{splitAround(t("timezoneNote", { tz: MARK }), <TimezoneName />)}</p>
      </header>

      {list.length === 0 && <p className="text-mute">{t("empty")}</p>}

      {groups.map(({ s, items }) => (
        <section key={s.id}>
          <h2 className="mb-4 border-s-4 border-accent ps-3 text-lg font-semibold">
            {s.title}
            {s.hijri_year && <span className="ms-2 text-sm font-normal text-gold">{s.hijri_year} AH</span>}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((m) => <MajlisCard key={m.id} m={m} />)}
          </div>
        </section>
      ))}

      {loose.length > 0 && (
        <section>
          <h2 className="mb-4 border-s-4 border-line ps-3 text-lg font-semibold">{t("standalone")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {loose.map((m) => <MajlisCard key={m.id} m={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
