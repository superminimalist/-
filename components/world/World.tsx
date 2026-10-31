"use client";

import * as THREE from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveStage } from "@/components/LiveStage";
import { LocalTime } from "@/components/LocalTime";
import type { Majlis } from "@/lib/types";
import { Buildings } from "./Buildings";
import { LocalPlayer, RemotePlayers, type Input } from "./Players";
import { KURTA_COLORS } from "./Avatar";
import { usePlaza } from "./usePlaza";
import { TouchControls } from "./Joystick";

const LS_KEY = "vi.world.profile";

function useMe(defaultName: string | null, muted: boolean) {
  const [me, setMe] = useState<{ id: string; name: string; color: string } | null>(null);
  useEffect(() => {
    let saved: { name?: string; color?: string } = {};
    try {
      saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    } catch {}
    setMe({
      id: crypto.randomUUID(), // per tab — same account in two tabs = two avatars
      name: (defaultName || saved.name || `guest-${Math.floor(Math.random() * 9000 + 1000)}`).slice(0, 24),
      color: saved.color && (KURTA_COLORS as readonly string[]).includes(saved.color) ? saved.color : KURTA_COLORS[0],
    });
  }, [defaultName]);
  const update = useCallback((patch: Partial<{ name: string; color: string }>) => {
    setMe((m) => {
      if (!m) return m;
      const next = { ...m, ...patch, name: (patch.name ?? m.name).slice(0, 24) };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ name: next.name, color: next.color }));
      } catch {}
      return next;
    });
  }, []);
  return { me, update, muted };
}

export default function World({
  displayName, muted, initialLive, initialNext,
}: {
  displayName: string | null;
  muted: boolean;
  initialLive: Majlis | null;
  initialNext: Majlis | null;
}) {
  const { me, update } = useMe(displayName, muted);
  if (!me) return <div className="flex h-full items-center justify-center text-mute">…</div>;
  return <Plaza me={me} update={update} canRename={!displayName} muted={muted} initialLive={initialLive} initialNext={initialNext} />;
}

function Plaza({
  me, update, canRename, muted, initialLive, initialNext,
}: {
  me: { id: string; name: string; color: string };
  update: (p: Partial<{ name: string; color: string }>) => void;
  canRename: boolean;
  muted: boolean;
  initialLive: Majlis | null;
  initialNext: Majlis | null;
}) {
  const t = useTranslations("world");
  const { peers, targets, bubbles, log, sendPos, sendChat } = usePlaza(me);
  const input = useRef<Input>({ x: 0, y: 0, jump: false });
  const chatInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [inHall, setInHall] = useState(false);
  const [live, setLive] = useState(initialLive);
  const [next, setNext] = useState(initialNext);
  const [joined, setJoined] = useState(false);
  const [touch, setTouch] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);

  // Enter → focus chat, Esc → back to walking
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement !== chatInput.current) {
        e.preventDefault();
        chatInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // refresh majlis state when stepping into the hall
  useEffect(() => {
    if (!inHall) {
      setJoined(false);
      return;
    }
    const supabase = createClient();
    Promise.all([
      supabase.from("majlis").select("*").eq("status", "live").order("starts_at").limit(1).maybeSingle<Majlis>(),
      supabase.from("majlis").select("*").eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle<Majlis>(),
    ]).then(([l, n]) => {
      setLive(l.data ?? null);
      setNext(n.data ?? null);
    });
  }, [inHall]);

  const labels = useMemo(
    () => ({ rumi: t("b.rumi"), naubat: t("b.naubat"), hall: t("b.hall"), mosque: t("b.mosque"), baoli: t("b.baoli") }),
    [t],
  );
  const online = Object.keys(peers).length + 1;

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#a9b6cf]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 60, near: 0.1, far: 900, position: [0, 30, 160] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#a9b6cf");
          scene.fog = new THREE.Fog("#b9bfcc", 120, 420);
        }}
      >
        <hemisphereLight args={["#dfe6f2", "#9a7a5e", 0.9]} />
        <directionalLight
          position={[-60, 90, 50]}
          intensity={2.4}
          color="#fff1dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
          shadow-camera-far={300}
          shadow-bias={-0.0004}
        />
        <Suspense fallback={null}>
          <Buildings labels={labels} indoors={inHall} />
          <LocalPlayer name={me.name} color={me.color} bubble={bubbles[me.id]?.text} input={input} onSend={sendPos} onHall={setInHall} />
          <RemotePlayers peers={peers} targets={targets} bubbles={bubbles} />
        </Suspense>
      </Canvas>

      {/* ── HUD ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
          <Link href="/" className="btn-ghost bg-black/40 text-white">← {t("back")}</Link>
          <span className="rounded-md bg-black/40 px-3 py-1.5 text-sm text-white">{t("online", { count: online })}</span>
          <button className="btn-ghost bg-black/40 text-white" onClick={() => setSettings((s) => !s)}>⚙</button>
        </div>

        {settings && (
          <div className="pointer-events-auto absolute left-3 top-16 w-64 space-y-3 rounded-xl bg-black/70 p-4 text-sm text-white backdrop-blur">
            <div>
              <div className="label">{t("name")}</div>
              <input
                className="input"
                defaultValue={me.name}
                disabled={!canRename}
                maxLength={24}
                onBlur={(e) => e.target.value.trim() && update({ name: e.target.value.trim() })}
              />
            </div>
            <div>
              <div className="label">{t("color")}</div>
              <div className="flex gap-2">
                {KURTA_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ color: c })}
                    className={`h-8 w-8 rounded-full border-2 ${me.color === c ? "border-[#c9a24a]" : "border-white/20"}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* majlis panel when inside the hall */}
        {inHall && (
          <div className="pointer-events-auto absolute right-3 top-3 w-[22rem] max-w-[calc(100%-1.5rem)] space-y-3 rounded-xl bg-black/75 p-4 text-white backdrop-blur">
            {live ? (
              <>
                <div className="flex items-center gap-2 text-sm text-[#e57368]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#c0392b]" />
                  {t("hallLive")}
                </div>
                <div className="font-medium">{live.title}</div>
                {live.speaker && <div className="text-sm text-white/60">{live.speaker}</div>}
                {joined ? (
                  <>
                    <LiveStage majlisId={live.id} />
                    <button className="btn-ghost w-full" onClick={() => setJoined(false)}>{t("leave")}</button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button className="btn flex-1" onClick={() => setJoined(true)}>{t("join")}</button>
                    <Link href={`/majlis/${live.id}`} className="btn-ghost">{t("fullPage")}</Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-sm text-white/70">{t("hallNone")}</div>
                {next && (
                  <Link href={`/majlis/${next.id}`} className="block rounded-lg border border-white/10 p-3 hover:border-[#2f8f5b]">
                    <div className="mb-1 text-xs text-[#c9a24a]">{t("nextMajlis")}</div>
                    <div className="font-medium">{next.title}</div>
                    <div className="text-sm text-white/70"><LocalTime iso={next.starts_at} /></div>
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* chat */}
        <div className="pointer-events-auto absolute bottom-3 left-3 w-[24rem] max-w-[calc(100%-1.5rem)]">
          <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto text-sm">
            {log.slice(-8).map((l) => (
              <li key={`${l.id}${l.ts}`} className="w-fit max-w-full rounded bg-black/45 px-2 py-0.5 text-white">
                <span className="me-1.5 font-medium text-[#c9a24a]">{l.name}</span>
                <span dir="auto" className="break-words">{l.text}</span>
              </li>
            ))}
          </ul>
          {muted ? (
            <p className="rounded bg-black/45 px-2 py-1 text-xs text-[#e57368]">{t("muted")}</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat(draft);
                setDraft("");
                chatInput.current?.blur();
              }}
            >
              <input
                ref={chatInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && chatInput.current?.blur()}
                placeholder={t("chatPlaceholder")}
                maxLength={200}
                dir="auto"
                className="w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-[#2f8f5b]"
              />
            </form>
          )}
        </div>

        {!touch && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/40 px-3 py-1.5 text-xs text-white/80">{t("controls")}</div>
        )}
        {touch && <TouchControls input={input} />}
      </div>
    </div>
  );
}
