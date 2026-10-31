"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function LiveStage({ majlisId, host = false }: { majlisId: string; host?: boolean }) {
  const t = useTranslations("majlis");
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/livekit/token?majlisId=${majlisId}${host ? "&role=host" : ""}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        if (alive) setConn(j);
      })
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, [majlisId, host]);

  if (error) return <div className="card text-live">{error}</div>;
  if (!conn) return <div className="card text-mute">{t("connecting")}</div>;

  return (
    <LiveKitRoom
      data-lk-theme="default"
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio={host}
      video={host}
      className="overflow-hidden rounded-xl border border-line bg-black"
    >
      <Stage host={host} />
      <RoomAudioRenderer />
      {!host && <StartAudio label="▶ Audio" className="btn m-3" />}
    </LiveKitRoom>
  );
}

function Stage({ host }: { host: boolean }) {
  const t = useTranslations("majlis");
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: !host },
  );
  const listeners = participants.filter((p) => !p.identity.startsWith("host-")).length;
  const speaking = participants.some((p) => p.identity.startsWith("host-") && p.isMicrophoneEnabled);

  return (
    <div>
      <div className="relative aspect-video w-full">
        {tracks.length > 0 ? (
          <div className={`grid h-full gap-1 ${tracks.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {tracks.map((tr) => (
              <ParticipantTile key={`${tr.participant.identity}-${tr.source}`} trackRef={tr} />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-mute">
            <span className={`h-16 w-16 rounded-full border-2 ${speaking ? "animate-pulse border-accent" : "border-line"}`} />
            {!speaking && <span className="text-sm">{t("waitingHost")}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-panel px-4 py-2 text-sm">
        <span className="text-mute">{t("viewers", { count: listeners })}</span>
        {host && (
          <div className="flex gap-2">
            <TrackToggle source={Track.Source.Microphone} />
            <TrackToggle source={Track.Source.Camera} />
            <TrackToggle source={Track.Source.ScreenShare} />
          </div>
        )}
      </div>
    </div>
  );
}
