"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { unitInfo } from "@/lib/unitGlossary";
import { cn } from "./Panel";

/**
 * A unit symbol that explains itself on hover or keyboard focus.
 * The tooltip is portalled to <body> so tables and scroll areas never clip it.
 */
export function Unit({ u, className, children }: { u: string; className?: string; children?: ReactNode }) {
  const info = unitInfo(u);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);

  if (!info) return <span className={className}>{children ?? u}</span>;

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.top < 120;
    setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setPos(null);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        aria-describedby={pos ? id : undefined}
        aria-label={`${u}: ${info.name}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={cn(
          "cursor-help rounded-[3px] decoration-dotted underline-offset-2 outline-none transition hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
          className,
        )}
      >
        {children ?? u}
      </span>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-max max-w-[260px] rounded-lg border border-line-strong bg-panel px-3 py-2 text-left shadow-xl"
            style={{
              left: Math.min(Math.max(8, pos.x - 130), (typeof window !== "undefined" ? window.innerWidth : 1200) - 268),
              top: pos.y,
              transform: pos.below ? undefined : "translateY(-100%)",
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="num rounded bg-accent-soft px-1.5 py-0.5 text-[12px] font-semibold text-accent">{u}</span>
              <span className="text-[12.5px] font-semibold text-ink">{info.name}</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-2">{info.what}</p>
            {info.convert && <p className="num mt-1 text-[11.5px] text-ink-3">{info.convert}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Renders "Label (unit)" with the unit explained on hover. */
export function LabelWithUnit({ label, unit }: { label: ReactNode; unit?: string }) {
  if (!unit) return <>{label}</>;
  return (
    <>
      {label} (<Unit u={unit} />)
    </>
  );
}
