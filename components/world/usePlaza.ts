"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type PeerState = { x: number; y: number; z: number; ry: number; moving: boolean; airborne: boolean };
export type Peer = { name: string; color: string };
export type ChatLine = { id: string; name: string; text: string; ts: number };

const BUBBLE_MS = 7000;

/**
 * Presence (who's here, name, colour) + broadcast (position ~8 Hz, chat).
 * Nothing is persisted — the plaza is ephemeral by design.
 */
export function usePlaza(me: { id: string; name: string; color: string }, room = "main") {
  const supabase = useMemo(() => createClient(), []);
  const channel = useRef<RealtimeChannel | null>(null);
  const [ready, setReady] = useState(false);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const targets = useRef(new Map<string, PeerState>());
  const [bubbles, setBubbles] = useState<Record<string, { text: string; until: number }>>({});
  const [log, setLog] = useState<ChatLine[]>([]);
  const meRef = useRef(me);
  meRef.current = me;

  const pushChat = useCallback((id: string, name: string, text: string) => {
    const ts = Date.now();
    setLog((l) => [...l.slice(-49), { id, name, text, ts }]);
    setBubbles((b) => ({ ...b, [id]: { text, until: ts + BUBBLE_MS } }));
  }, []);

  useEffect(() => {
    const ch = supabase.channel(`plaza:${room}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Peer>();
      const next: Record<string, Peer> = {};
      for (const [key, metas] of Object.entries(state)) {
        if (key === meRef.current.id || !metas[0]) continue;
        next[key] = { name: metas[0].name, color: metas[0].color };
      }
      for (const id of targets.current.keys()) if (!next[id]) targets.current.delete(id);
      setPeers(next);
    })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const { id, ...s } = payload as PeerState & { id: string };
        targets.current.set(id, s);
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const p = payload as { id: string; name: string; text: string };
        pushChat(p.id, p.name, String(p.text).slice(0, 200));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ name: meRef.current.name, color: meRef.current.color });
          setReady(true);
        }
      });
    channel.current = ch;
    return () => {
      channel.current = null;
      setReady(false);
      supabase.removeChannel(ch);
    };
  }, [supabase, room, me.id, pushChat]);

  // re-announce when name/colour changes
  useEffect(() => {
    if (ready) channel.current?.track({ name: me.name, color: me.color });
  }, [ready, me.name, me.color]);

  // expire bubbles
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setBubbles((b) => {
        const live = Object.entries(b).filter(([, v]) => v.until > now);
        return live.length === Object.keys(b).length ? b : Object.fromEntries(live);
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const sendPos = useCallback((s: PeerState) => {
    channel.current?.send({ type: "broadcast", event: "pos", payload: { id: meRef.current.id, ...s } });
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const clean = text.trim().slice(0, 200);
      if (!clean) return;
      channel.current?.send({ type: "broadcast", event: "chat", payload: { id: meRef.current.id, name: meRef.current.name, text: clean } });
      pushChat(meRef.current.id, meRef.current.name, clean);
    },
    [pushChat],
  );

  return { ready, peers, targets, bubbles, log, sendPos, sendChat };
}
