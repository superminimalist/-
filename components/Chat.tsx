"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

type Props = {
  majlisId: string;
  open: boolean;           // majlis is live
  userId: string | null;
  muted: boolean;
  staff: boolean;
};

export function Chat({ majlisId, open, userId, muted, staff }: Props) {
  const t = useTranslations("chat");
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const names = useRef(new Map<string, string>());
  const bottom = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function nameFor(uid: string) {
      const cached = names.current.get(uid);
      if (cached) return cached;
      const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).single();
      const n = data?.display_name ?? "—";
      names.current.set(uid, n);
      return n;
    }

    supabase
      .from("chat_messages")
      .select("*, profiles(display_name)")
      .eq("majlis_id", majlisId)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<ChatMessage[]>()
      .then(({ data }) => {
        if (cancelled || !data) return;
        data.forEach((m) => m.profiles && names.current.set(m.user_id, m.profiles.display_name));
        setMessages(data.reverse());
      });

    const channel = supabase
      .channel(`chat:${majlisId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `majlis_id=eq.${majlisId}` },
        async (payload) => {
          const m = payload.new as ChatMessage;
          const display_name = await nameFor(m.user_id);
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, profiles: { display_name } }]));
        },
      )
      // RLS hides deleted rows from members, so they never get the UPDATE —
      // moderators broadcast the deletion instead
      .on("broadcast", { event: "delete" }, ({ payload }) => {
        const id = (payload as { id: number }).id;
        setMessages((prev) => (staff ? prev.map((x) => (x.id === id ? { ...x, deleted: true } : x)) : prev.filter((x) => x.id !== id)));
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [majlisId, supabase, staff]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !userId) return;
    setSending(true);
    setError(false);
    const { error } = await supabase.from("chat_messages").insert({ majlis_id: majlisId, user_id: userId, body: text });
    setSending(false);
    if (error) setError(true);
    else setBody("");
  }

  async function remove(id: number) {
    const { error } = await supabase.from("chat_messages").update({ deleted: true }).eq("id", id);
    if (error) return;
    setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, deleted: true } : x)));
    channelRef.current?.send({ type: "broadcast", event: "delete", payload: { id } });
  }

  async function mute(uid: string) {
    await supabase.from("profiles").update({ muted: true }).eq("id", uid);
  }

  return (
    <aside className="flex h-[32rem] flex-col rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-2 text-sm font-medium">{t("title")}</div>

      <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((m) => (
          <li key={m.id} className={`group ${m.deleted ? "opacity-40 line-through" : ""}`}>
            <span className="me-2 font-medium text-gold">{m.profiles?.display_name ?? "—"}</span>
            <span className="break-words" dir="auto">{m.body}</span>
            {staff && !m.deleted && (
              <span className="ms-2 hidden gap-2 text-xs text-mute group-hover:inline-flex">
                <button onClick={() => remove(m.id)} className="hover:text-live">{t("delete")}</button>
                {m.user_id !== userId && (
                  <button onClick={() => mute(m.user_id)} className="hover:text-live">{t("mute")}</button>
                )}
              </span>
            )}
          </li>
        ))}
        <div ref={bottom} />
      </ul>

      <div className="border-t border-line p-3">
        {!open ? (
          <p className="text-xs text-mute">{t("closed")}</p>
        ) : !userId ? (
          <Link href="/login" className="text-sm text-accent hover:underline">{t("loginToChat")}</Link>
        ) : muted ? (
          <p className="text-xs text-live">{t("muted")}</p>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("placeholder")}
              maxLength={500}
              dir="auto"
              className="input"
            />
            <button className="btn" disabled={sending || !body.trim()}>{t("send")}</button>
          </form>
        )}
        {error && <p className="mt-2 text-xs text-live">{t("error")}</p>}
      </div>
    </aside>
  );
}
