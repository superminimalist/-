"use client";

import { useCallback, useSyncExternalStore } from "react";

// Tiny localStorage-backed stores. Everything here is a per-device convenience, so a
// blocked/empty storage just means defaults.

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const cacheRaw = new Map<string, string | null>();
const cacheVal = new Map<string, unknown>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => e.key && emit(e.key));
}

function useStored<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (l: Listener) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(l);
      return () => listeners.get(key)!.delete(l);
    },
    [key],
  );
  const get = useCallback(() => {
    const raw = read(key);
    if (cacheRaw.get(key) !== raw || !cacheVal.has(key)) {
      cacheRaw.set(key, raw);
      let v: unknown = fallback;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(fallback)) v = Array.isArray(parsed) ? parsed : fallback;
          else if (parsed && typeof parsed === "object") v = { ...fallback, ...parsed };
        } catch {
          v = fallback;
        }
      }
      cacheVal.set(key, v);
    }
    return cacheVal.get(key) as T;
  }, [key, fallback]);
  const value = useSyncExternalStore(subscribe, get, () => fallback);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(get()) : next;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        cacheRaw.delete(key);
        cacheVal.set(key, v);
      }
      emit(key);
    },
    [key, get],
  );
  return [value, set];
}

// ───────────────────────── settings
export type ArFont = "amiri" | "naskh" | "scheherazade";
export type Theme = "system" | "light" | "dark";
export type Settings = {
  scale: number; font: ArFont; guide: boolean; awake: boolean; theme: Theme; haptics: boolean;
  roman: boolean; trEn: boolean; trKo: boolean;
};
const SETTINGS: Settings = {
  scale: 1, font: "amiri", guide: true, awake: true, theme: "system", haptics: true, roman: true, trEn: true, trKo: true,
};
export const useSettings = () => useStored<Settings>("mf:settings", SETTINGS);

// ───────────────────────── bookmarks & recents
export type Entry = { href: string; title: string; sub?: string; tone?: string; at: number; progress?: number };
const EMPTY: Entry[] = [];
export const useBookmarks = () => useStored<Entry[]>("mf:bookmarks", EMPTY);
export const useRecents = () => useStored<Entry[]>("mf:recents", EMPTY);

// ───────────────────────── tasbih
export type TasbihState = { i: number; stage: number; total: number };
const TASBIH: TasbihState = { i: 0, stage: 0, total: 0 };
export const useTasbih = () => useStored<TasbihState>("mf:tasbih", TASBIH);
