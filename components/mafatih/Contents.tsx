"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { IconChevron, IconSearch, IconClose } from "./icons";
import { ToneIcon } from "./ui";

type N = { id: string; title: string; page: number; words: number; children: N[] };
type Quick = { key: string; tone: string; href: string; title: string; sub: string };

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ'’`\-]/g, "").replace(/\s+/g, " ");

function flatten(nodes: N[], path: string[] = [], out: { n: N; path: string[] }[] = []) {
  for (const n of nodes) {
    out.push({ n, path });
    flatten(n.children, [...path, n.title], out);
  }
  return out;
}

const shortTitle = (t: string) => t.replace(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventhn?|twelfth) (section|chapter):\s*/i, "");
const ordinal = (t: string) => t.match(/^(\w+) (section|chapter)/i)?.[0];

export function ContentsView({ tree, quick, labels }: { tree: N[]; quick: Quick[]; labels: { title: string; search: string; empty: string } }) {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [open, setOpen] = useState<string | null>(null);
  const flat = useMemo(() => flatten(tree), [tree]);

  const results = useMemo(() => {
    const f = fold(dq.trim());
    if (!f) return null;
    return {
      quick: quick.filter((x) => fold(`${x.title} ${x.sub}`).includes(f)).slice(0, 6),
      entries: flat.filter(({ n }) => n.words > 0 && fold(n.title).includes(f)).slice(0, 80),
    };
  }, [dq, flat, quick]);

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-36" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
      <h1 className="mt-7 text-[2.1rem] font-extrabold tracking-[-0.03em]">{labels.title}</h1>

      <div className="sticky top-0 z-20 -mx-5 px-5 pb-3 pt-3" style={{ background: "linear-gradient(var(--mf-bg) 75%, transparent)" }}>
        <label className="flex items-center gap-2 rounded-2xl bg-mf-card px-4 py-3 shadow-[var(--mf-shadow)]">
          <IconSearch size={18} className="text-mf-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.search}
            className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-mf-mute"
            type="search"
            enterKeyHint="search"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="clear" className="rounded-full bg-mf-fill p-1 text-mf-mute">
              <IconClose size={14} />
            </button>
          )}
        </label>
      </div>

      {results ? (
        <div className="mf-fade space-y-4">
          {results.quick.length > 0 && (
            <div className="mf-card overflow-hidden">
              {results.quick.map((x, i) => (
                <Link key={x.key} href={x.href} className="mf-row flex items-center gap-3.5 px-4">
                  <ToneIcon k={x.key} tone={x.tone} size={36} />
                  <div className={`flex min-w-0 flex-1 items-center gap-2 py-3 ${i < results.quick.length - 1 ? "border-b border-mf-line" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{x.title}</div>
                      <div className="truncate text-[0.82rem] text-mf-mute">{x.sub}</div>
                    </div>
                    <IconChevron size={16} className="text-mf-mute" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.entries.length > 0 ? (
            <div className="mf-card overflow-hidden">
              {results.entries.map(({ n, path }, i) => (
                <Row key={n.id} n={n} hint={path.at(-1) && shortTitle(path.at(-1)!)} last={i === results.entries.length - 1} />
              ))}
            </div>
          ) : (
            results.quick.length === 0 && <p className="py-16 text-center text-mf-mute">{labels.empty}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((sec) => {
            const isOpen = open === sec.id;
            const count = flatten(sec.children).filter(({ n }) => n.words > 0).length || (sec.words > 0 ? 1 : 0);
            return (
              <div key={sec.id} className="mf-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : sec.id)}
                  aria-expanded={isOpen}
                  className="mf-row flex w-full items-center gap-3 px-5 py-4 text-start"
                >
                  <div className="min-w-0 flex-1">
                    {ordinal(sec.title) && <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-mf-accent-ink">{ordinal(sec.title)}</div>}
                    <div className="text-[1.05rem] font-bold leading-snug">{shortTitle(sec.title)}</div>
                  </div>
                  <span className="rounded-full bg-mf-fill px-2.5 py-0.5 text-[0.78rem] font-semibold tabular-nums text-mf-mute">{count}</span>
                  <IconChevron size={18} className={`text-mf-mute transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mf-fade border-t border-mf-line pb-2">
                    {sec.children.map((ch) =>
                      ch.children.length > 0 ? (
                        <div key={ch.id}>
                          <Link href={`/mafatih/read/${ch.id}`} className="block px-5 pb-1 pt-4 text-[0.8rem] font-bold uppercase tracking-wide text-mf-mute">
                            {shortTitle(ch.title)}
                          </Link>
                          {ch.children.map((it, i) => (
                            <Row key={it.id} n={it} last={i === ch.children.length - 1} />
                          ))}
                        </div>
                      ) : (
                        <Row key={ch.id} n={ch} />
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ n, hint, last }: { n: N; hint?: string; last?: boolean }) {
  return (
    <Link href={`/mafatih/read/${n.id}`} className="mf-row flex items-center gap-3 ps-5 pe-4">
      <div className={`flex min-w-0 flex-1 items-center gap-3 py-3 ${last ? "" : "border-b border-mf-line/70"}`}>
        <div className="min-w-0 flex-1">
          <div className="text-[0.97rem] font-medium leading-snug">{n.title}</div>
          {hint && <div className="truncate text-[0.78rem] text-mf-mute">{hint}</div>}
        </div>
        <span className="shrink-0 text-[0.78rem] tabular-nums text-mf-mute">{n.page}</span>
        <IconChevron size={15} className="shrink-0 text-mf-mute/70" />
      </div>
    </Link>
  );
}
