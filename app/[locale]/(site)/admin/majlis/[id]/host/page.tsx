import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { recordingConfigured } from "@/lib/livekit";
import { endMajlis, goLive } from "@/app/actions/admin";
import { LiveStage } from "@/components/LiveStage";
import { Chat } from "@/components/Chat";
import { StatusBadge } from "@/components/StatusBadge";
import type { Majlis } from "@/lib/types";

export default async function HostConsole({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("host");
  const supabase = await createClient();
  const { data: m } = await supabase.from("majlis").select("*").eq("id", id).maybeSingle<Majlis>();
  if (!m) notFound();
  const { userId } = await getSessionProfile();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{t("title")} — {m.title}</h1>
          <StatusBadge status={m.status} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-mute">{recordingConfigured() ? t("recordingOn") : t("recordingOff")}</span>
          {m.status === "scheduled" && (
            <form action={goLive}>
              <input type="hidden" name="id" value={m.id} />
              <button className="btn">{t("goLive")}</button>
            </form>
          )}
          {m.status === "live" && (
            <form action={endMajlis}>
              <input type="hidden" name="id" value={m.id} />
              <button className="btn-danger">{t("end")}</button>
            </form>
          )}
        </div>
      </div>
      <p className="text-sm text-mute">{t("hint")}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {m.status !== "ended" ? <LiveStage majlisId={m.id} host /> : <div className="card" />}
        <Chat majlisId={m.id} open={m.status === "live"} userId={userId} muted={false} staff />
      </div>

      <Link href="/admin" className="text-sm text-mute hover:text-text">← {t("back")}</Link>
    </div>
  );
}
