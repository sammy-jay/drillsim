"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/Logo";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = Boolean(window.sessionStorage.getItem("drillsim-splash-seen-v1"));
      if (!alreadySeen) {
        window.sessionStorage.setItem("drillsim-splash-seen-v1", "true");
      }
    } catch {
      /* storage unavailable: show the splash for this visit */
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = alreadySeen ? 0 : reducedMotion ? 120 : 760;
    const fadeDuration = alreadySeen || reducedMotion ? 0 : 220;
    const closeTimer = setTimeout(() => setClosing(true), duration);
    const removeTimer = setTimeout(() => setVisible(false), duration + fadeDuration);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading DrillSim"
      aria-live="polite"
      className={`fixed inset-0 z-[100] grid place-items-center bg-canvas transition-opacity duration-200 ${closing ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <div className="flex items-center gap-2.5 text-[12px] text-ink-3">
          <LoaderCircle size={15} className="animate-spin text-accent motion-reduce:animate-none" />
          <span>Preparing your workspace</span>
        </div>
      </div>
    </div>
  );
}