import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { MajlisCard } from "@/components/MajlisCard";
import type { Majlis } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const ts = await getTranslations("site");
  const tn = await getTranslations("nav");
  const supabase = await createClient();

  const [{ data: live }, { data: upcoming }] = await Promise.all([
    supabase.from("majlis").select("*").eq("status", "live").order("starts_at").returns<Majlis[]>(),
    supabase
      .from("majlis")
      .select("*")
      .eq("status", "scheduled")
      .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .order("starts_at")
      .limit(6)
      .returns<Majlis[]>(),
  ]);

  return (
    <div className="space-y-10">
      <section className="py-6">
        <h1 className="mb-2 text-3xl font-semibold">{ts("name")}</h1>
        <p className="mb-6 text-mute">{ts("tagline")}</p>
        <Link href="/world" className="btn px-6 py-3 text-base">{tn("world")} →</Link>
      </section>

      {live && live.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-live" />
            {t("liveNow")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((m) => <MajlisCard key={m.id} m={m} />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("upcoming")}</h2>
          <Link href="/schedule" className="text-sm text-accent hover:underline">{t("viewSchedule")}</Link>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => <MajlisCard key={m.id} m={m} />)}
          </div>
        ) : (
          <p className="text-mute">{t("noUpcoming")}</p>
        )}
      </section>
    </div>
  );
}
