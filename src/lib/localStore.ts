"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Tiny localStorage-backed store for per-browser conveniences (saved reports, plotter data).
 * Server render and hydration use the fallback; the stored value arrives right after
 * hydration via useSyncExternalStore, so there is no hydration mismatch.
 * Pass a module-level constant as `fallback` so its identity is stable.
 */

const cache = new Map<string, { value: unknown }>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function read<T>(key: string, fallback: T): T {
  const hit = cache.get(key);
  if (hit) return hit.value as T;
  let value: T = fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    /* storage unavailable or corrupt: fall back */
  }
  cache.set(key, { value });
  return value;
}

function write<T>(key: string, value: T) {
  cache.set(key, { value });
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode: keep in memory for this visit */
  }
  emit(key);
}

export function useLocalStore<T>(key: string, fallback: T) {
  const subscribe = useCallback(
    (cb: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache.delete(key);
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set!.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      write(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    [key, fallback],
  );

  return [value, setValue] as const;
}
