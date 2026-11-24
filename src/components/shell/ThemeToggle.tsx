"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/lib/hooks";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useThemeMode();

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable - theme still applies for this visit */
    }
  };

  const label = mode === "dark" ? "Switch to light theme" : "Switch to dark theme";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-ink-2 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="flex w-full items-center justify-between rounded-lg border border-line bg-panel-2 px-3 py-2 text-[13px] text-ink-2 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="flex items-center gap-2">
        {mode === "dark" ? <Moon size={14} /> : <Sun size={14} />}
        {mode === "dark" ? "Dark" : "Light"} theme
      </span>
      <span className="relative h-5 w-9 rounded-full bg-panel-3">
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-accent transition-all ${
            mode === "dark" ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
