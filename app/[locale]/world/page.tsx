import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import type { Majlis } from "@/lib/types";
import { WorldLoader } from "./WorldLoader";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "world" });
  return { title: t("title") };
}

export default async function WorldPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  const [{ data: live }, { data: next }] = await Promise.all([
    supabase.from("majlis").select("*").eq("status", "live").order("starts_at").limit(1).maybeSingle<Majlis>(),
    supabase.from("majlis").select("*").eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle<Majlis>(),
  ]);

  return (
    // full-bleed under the site header
    <div className="fixed inset-x-0 bottom-0 top-[57px] z-10">
      <WorldLoader
        displayName={profile?.display_name ?? null}
        muted={profile?.muted ?? false}
        initialLive={live ?? null}
        initialNext={next ?? null}
      />
    </div>
  );
}
