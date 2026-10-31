import { useCallback, useEffect, useRef, useState } from "react";
import type { Peer, PeerState } from "@/components/world/usePlaza";

// claude.ai artifact `room` capability: everyone with the page open right now.
// Everything rides on presence (position, name, colour, last chat line) so
// view-only members can move and talk too — no topic permissions needed.

type RoomPeer = {
  peer: string;
  sameTab: boolean;
  presence: Readonly<Record<string, unknown>>;
};
type Room = {
  presence(patch: Record<string, unknown>): Promise<void>;
  onPeers(fn: (c: { peers: readonly RoomPeer[] }) => void, onError?: (e: { code: string }) => void): () => void;
  onConnection(fn: (c: boolean) => void, onError?: (e: { code: string }) => void): () => void;
};
declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

export type ChatLine = { id: string; name: string; text: string; ts: number };
export type RoomStatus = "connecting" | "online" | "solo";

const BUBBLE_MS = 7000;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f​-‏‪-‮]/g, "").slice(0, max) : "";
const COLORS = new Set(["#151515", "#f2efe8", "#1f5c3a", "#2b3a55", "#6b2a2a"]);

export function useRoom(me: { name: string; color: string } | null) {
  const room = useRef<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const targets = useRef(new Map<string, PeerState>());
  const [bubbles, setBubbles] = useState<Record<string, { text: string; until: number }>>({});
  const [log, setLog] = useState<ChatLine[]>([]);
  const seenSay = useRef(new Map<string, number>());
  const meRef = useRef(me);
  meRef.current = me;

  const pushChat = useCallback((id: string, name: string, text: string, ts: number) => {
    setLog((l) => [...l.slice(-49), { id, name, text, ts }]);
    setBubbles((b) => ({ ...b, [id]: { text, until: Date.now() + BUBBLE_MS } }));
  }, []);

  useEffect(() => {
    let alive = true;
    const offs: (() => void)[] = [];
    const solo = () => alive && setStatus("solo");
    const timer = setTimeout(solo, 12000);

    (window.claude?.use("room") ?? Promise.resolve(null))
      .then((r) => {
        clearTimeout(timer);
        if (!alive) return;
        if (!r) return solo();
        const rm = r as Room;
        room.current = rm;
        offs.push(
          rm.onConnection((c) => alive && setStatus(c ? "online" : "connecting"), solo),
          rm.onPeers(({ peers: list }) => {
            const next: Record<string, Peer> = {};
            for (const p of list) {
              if (p.sameTab) continue;
              const pr = p.presence ?? {};
              const pos = pr.p as number[] | undefined;
              if (!Array.isArray(pos) || pos.length < 4 || !pos.every(Number.isFinite)) continue;
              const name = clean(pr.n, 24) || "guest";
              const color = COLORS.has(pr.c as string) ? (pr.c as string) : "#151515";
              next[p.peer] = { name, color };
              targets.current.set(p.peer, { x: pos[0], y: pos[1], z: pos[2], ry: pos[3], moving: pr.m === 1, airborne: pr.a === 1 });
              const say = pr.s as { t?: unknown; ts?: unknown } | undefined;
              const ts = typeof say?.ts === "number" ? say.ts : 0;
              const prev = seenSay.current.get(p.peer);
              if (ts && prev !== undefined && ts > prev) {
                const text = clean(say?.t, 200);
                if (text) pushChat(p.peer, name, text, ts);
              }
              seenSay.current.set(p.peer, ts);
            }
            for (const id of targets.current.keys()) if (!next[id]) targets.current.delete(id);
            setPeers(next);
          }, solo),
        );
        const m = meRef.current;
        if (m) rm.presence({ n: m.name, c: m.color }).catch(() => {});
      })
      .catch(solo);

    return () => {
      alive = false;
      clearTimeout(timer);
      offs.forEach((f) => f());
    };
  }, [pushChat]);

  useEffect(() => {
    if (me) room.current?.presence({ n: me.name, c: me.color }).catch(() => {});
  }, [me]);

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
    room.current?.presence({ p: [s.x, s.y, s.z, s.ry], m: s.moving ? 1 : 0, a: s.airborne ? 1 : 0 }).catch(() => {});
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const t = clean(text.trim(), 200);
      const m = meRef.current;
      if (!t || !m) return;
      const ts = Date.now();
      room.current?.presence({ s: { t, ts } }).catch(() => {});
      pushChat("me", m.name, t, ts);
    },
    [pushChat],
  );

  return { status, peers, targets, bubbles, log, sendPos, sendChat };
}
