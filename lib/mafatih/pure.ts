// Runtime-agnostic helpers over the extracted book (used by the server pages and the artifact build).
import type { Block, IndexEntry } from "./types";

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Blocks of one sub-part of a section: from heading `h` (prefix match) up to the next heading.
 *  Without `h`: everything before the first heading. */
export function sliceBlocks(blocks: Block[], h?: string): Block[] {
  if (!h) {
    const end = blocks.findIndex((b) => b.t === "h");
    return end < 0 ? blocks : blocks.slice(0, end);
  }
  const key = norm(h);
  const start = blocks.findIndex((b) => b.t === "h" && norm(b.x).startsWith(key));
  if (start < 0) return blocks;
  const rel = blocks.slice(start + 1).findIndex((b) => b.t === "h");
  return blocks.slice(start + 1, rel < 0 ? undefined : start + 1 + rel);
}

/** recitation pace ≈ 90 Arabic words / min */
export function minutesOf(blocks: Block[]) {
  const words = blocks.reduce((n, b) => n + (b.t === "ar" ? b.x.split(" ").length : 0), 0);
  return Math.max(1, Math.round(words / 90));
}

export type TocNode = IndexEntry & { children: TocNode[] };

/** index → 3-level tree (section / chapter / item). Items without a chapter hang off the section. */
export function buildTree(index: IndexEntry[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const e of index) {
    const node: TocNode = { ...e, children: [] };
    while (stack.length && stack[stack.length - 1].level >= e.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

export function findNode(nodes: TocNode[], id: string): TocNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** previous / next readable entry (skips empty chapter headers) */
export function neighboursIn(index: IndexEntry[], id: string) {
  const all = index.filter((e) => e.words > 0);
  const i = all.findIndex((e) => e.id === id);
  return { prev: i > 0 ? all[i - 1] : null, next: i >= 0 && i < all.length - 1 ? all[i + 1] : null };
}

/** chapter / section titles above an entry */
export function breadcrumbsIn(index: IndexEntry[], id: string) {
  const i = index.findIndex((e) => e.id === id);
  if (i < 0) return [];
  const out: IndexEntry[] = [];
  let lvl = index[i].level;
  for (let j = i - 1; j >= 0 && lvl > 0; j--) {
    if (index[j].level < lvl) {
      out.unshift(index[j]);
      lvl = index[j].level;
    }
  }
  return out;
}
