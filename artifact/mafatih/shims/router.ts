// Hash router standing in for next-intl's navigation inside the artifact.
// "/mafatih/d/kumayl" ⇄ "#d-kumayl" (plain #name only: the artifact host passes nothing else)
import { useSyncExternalStore } from "react";

export function toHash(path: string) {
  const p = path.replace(/^\/(ko|en|ar|fa|ur)(?=\/|$)/, "").replace(/\/+$/, "");
  if (p === "" || p === "/mafatih") return "";
  const m = p.match(/^\/mafatih\/(contents|tasbih|saved)$/);
  if (m) return m[1];
  const d = p.match(/^\/mafatih\/d\/([A-Za-z0-9]+)$/);
  if (d) return `d-${d[1]}`;
  const r = p.match(/^\/mafatih\/read\/([a-z0-9-]+)$/);
  if (r) return `read-${r[1]}`;
  return "";
}

export function fromHash(h: string) {
  h = h.replace(/^#/, "");
  if (!h) return "/mafatih";
  if (["contents", "tasbih", "saved"].includes(h)) return `/mafatih/${h}`;
  if (h.startsWith("d-")) return `/mafatih/d/${h.slice(2)}`;
  if (h.startsWith("read-")) return `/mafatih/read/${h.slice(5)}`;
  return "/mafatih";
}

let path = typeof location !== "undefined" ? fromHash(location.hash) : "/mafatih";
const stack: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setPath(next: string, push: boolean) {
  if (next === path) return;
  if (push) stack.push(path);
  path = next;
  const h = toHash(next);
  try {
    history.replaceState(null, "", h ? `#${h}` : location.pathname + location.search);
  } catch {
    /* sandboxed */
  }
  window.scrollTo(0, 0);
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => setPath(fromHash(location.hash), true));
}

export function navigate(href: string) {
  setPath(fromHash(toHash(href)), true);
}

export function back() {
  setPath(stack.pop() ?? "/mafatih", false);
}

export function usePath() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => path,
    () => path,
  );
}
