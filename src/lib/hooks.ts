"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ---------------------------------------------------------------- */
/* Theme mode - mirrors the data-theme attribute on <html>           */
/* ---------------------------------------------------------------- */
function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
function getTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
export function useThemeMode() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "dark" as const);
}

/* ---------------------------------------------------------------- */
/* Element size via ResizeObserver                                   */
/* ---------------------------------------------------------------- */
export function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.floor(w));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return [ref, width] as const;
}

/* ---------------------------------------------------------------- */
/* Animation-frame loop with real elapsed ms                         */
/* ---------------------------------------------------------------- */
export function useAnimationLoop(callback: (dtMs: number) => void, running: boolean) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(250, t - last);
      last = t;
      cbRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
