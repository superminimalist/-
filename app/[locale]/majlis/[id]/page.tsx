import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient, getSessionProfile, isStaff } from "@/lib/supabase/server";
import { LiveStage } from "@/components/LiveStage";
import { Chat } from "@/components/Chat";
import { StatusWatcher } from "@/components/StatusWatcher";
import { StatusBadge } from "@/components/StatusBadge";
import { LocalTime } from "@/components/LocalTime";
import type { Majlis, MajlisSeries } from "@/lib/types";
import { MARK, splitAround } from "@/lib/interpolate";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("majlis").select("title").eq("id", id).maybeSingle();
  return { title: data?.title };
}

export default async function MajlisPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("majlis");

  const supabase = await createClient();
  const { data: m } = await supabase.from("majlis").select("*").eq("id", id).maybeSingle<Majlis>();
  if (!m) notFound();

  const { data: series } = m.series_id
    ? await supabase.from("majlis_series").select("*").eq("id", m.series_id).maybeSingle<MajlisSeries>()
    : { data: null };
  const { userId, profile } = await getSessionProfile();

  return (
    <div className="space-y-6">
      <StatusWatcher majlisId={m.id} status={m.status} />

      <header className="space-y-2">
        {series && <div className="text-sm text-gold">{series.title}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{m.title}</h1>
          <StatusBadge status={m.status} />
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-mute">
          {m.speaker && <span>{t("speaker")}: <span className="text-text">{m.speaker}</span></span>}
          <LocalTime iso={m.starts_at} />
        </div>
        {m.description && <p className="max-w-3xl whitespace-pre-line text-sm text-mute">{m.description}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          {m.status === "live" && <LiveStage majlisId={m.id} />}

          {m.status === "scheduled" && (
            <div className="card flex aspect-video flex-col items-center justify-center gap-2 text-center">
              <p>{t("notStarted")}</p>
              <p className="text-sm text-mute">{splitAround(t("startsIn", { time: MARK }), <LocalTime iso={m.starts_at} showHijri={false} />)}</p>
            </div>
          )}

          {m.status === "ended" &&
            (m.recording_url ? (
              <div className="space-y-2">
                <div className="text-sm text-mute">{t("recording")}</div>
                <video src={m.recording_url} controls preload="metadata" className="w-full rounded-xl border border-line bg-black" />
              </div>
            ) : (
              <div className="card flex aspect-video flex-col items-center justify-center gap-2 text-center">
                <p>{t("ended")}</p>
                <p className="text-sm text-mute">{t("noRecording")}</p>
              </div>
            ))}
        </div>

        <Chat
          majlisId={m.id}
          open={m.status === "live"}
          userId={userId}
          muted={profile?.muted ?? false}
          staff={isStaff(profile)}
        />
      </div>
    </div>
  );
}
