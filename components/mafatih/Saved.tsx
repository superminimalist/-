"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IconChevron, IconStar } from "./icons";
import { useBookmarks, useRecents, type Entry } from "./store";
import { SectionTitle, ToneIcon } from "./ui";

export function SavedView({
  labels,
}: {
  labels: { title: string; bookmarks: string; recents: string; empty: string; noRecents: string; clear: string };
}) {
  const [bookmarks] = useBookmarks();
  const [recents, setRecents] = useRecents();
  // storage is client-only: render lists after mount to avoid a hydration flash of "empty"
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-36" style={{ paddingTop: "max(20px, var(--mf-sat))" }}>
      <h1 className="mt-7 text-[2.1rem] font-extrabold tracking-[-0.03em]">{labels.title}</h1>

      <SectionTitle>{labels.bookmarks}</SectionTitle>
      {!ready ? (
        <div className="h-20 rounded-[22px] mf-skeleton" />
      ) : bookmarks.length ? (
        <List entries={bookmarks} />
      ) : (
        <div className="mf-card flex flex-col items-center gap-2 px-6 py-10 text-center text-mf-mute">
          <IconStar size={30} />
          <p className="text-[0.92rem]">{labels.empty}</p>
        </div>
      )}

      <SectionTitle
        aside={
          ready && recents.length > 0 ? (
            <button onClick={() => setRecents([])} className="text-[0.85rem] font-semibold text-mf-accent-ink">
              {labels.clear}
            </button>
          ) : null
        }
      >
        {labels.recents}
      </SectionTitle>
      {!ready ? (
        <div className="h-20 rounded-[22px] mf-skeleton" />
      ) : recents.length ? (
        <List entries={recents} showProgress />
      ) : (
        <p className="px-1 text-[0.92rem] text-mf-mute">{labels.noRecents}</p>
      )}
    </div>
  );
}

function List({ entries, showProgress }: { entries: Entry[]; showProgress?: boolean }) {
  const locale = useLocale();
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const ago = (at: number) => {
    const m = Math.round((at - Date.now()) / 60_000);
    if (Math.abs(m) < 60) return rel.format(m, "minute");
    const h = Math.round(m / 60);
    if (Math.abs(h) < 24) return rel.format(h, "hour");
    return rel.format(Math.round(h / 24), "day");
  };
  return (
    <div className="mf-card overflow-hidden">
      {entries.map((e, i) => (
        <Link key={e.href} href={e.href} className="mf-row flex items-center gap-3.5 px-4">
          <ToneIcon k={e.href.split("/").pop() ?? ""} tone={e.tone ?? "green"} size={40} />
          <div className={`flex min-w-0 flex-1 items-center gap-3 py-3.5 ${i < entries.length - 1 ? "border-b border-mf-line" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{e.title}</div>
              <div className="truncate text-[0.82rem] text-mf-mute">
                {showProgress ? `${ago(e.at)} · ${Math.round((e.progress ?? 0) * 100)}%` : e.sub}
              </div>
            </div>
            <IconChevron size={16} className="shrink-0 text-mf-mute/70" />
          </div>
        </Link>
      ))}
    </div>
  );
}
