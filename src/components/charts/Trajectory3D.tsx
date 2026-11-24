"use client";

import { useMemo, useRef, useState } from "react";
import { useElementWidth } from "@/lib/hooks";
import { fmt } from "@/lib/format";
import { niceStep } from "./scale";

export type P3 = { n: number; e: number; tvd: number; md?: number; inc?: number; azi?: number };
export type Path3 = { id: string; label: string; color: string; points: P3[]; dash?: string; width?: number };
export type Marker3 = P3 & { label: string; color?: string };

const VIEWS = {
  "3D": { yaw: -38, pitch: 22 },
  Plan: { yaw: 0, pitch: 90 },
  "N–S": { yaw: 90, pitch: 0 },
  "E–W": { yaw: 0, pitch: 0 },
} as const;

export function Trajectory3D({
  paths,
  markers = [],
  height = 460,
}: {
  paths: Path3[];
  markers?: Marker3[];
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [view, setView] = useState({ yaw: -38, pitch: 22 });
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ x: number; y: number; p: P3; label: string } | null>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const bounds = useMemo(() => {
    let h = 100,
      d = 100;
    paths.forEach((p) =>
      p.points.forEach((q) => {
        h = Math.max(h, Math.abs(q.n), Math.abs(q.e));
        d = Math.max(d, q.tvd);
      }),
    );
    markers.forEach((q) => {
      h = Math.max(h, Math.abs(q.n), Math.abs(q.e));
      d = Math.max(d, q.tvd);
    });
    const gridStep = niceStep(h * 2, 4);
    const half = Math.ceil(h / gridStep) * gridStep;
    return { h: half, d, gridStep, depthStep: niceStep(d, 5) };
  }, [paths, markers]);

  const proj = useMemo(() => {
    const yaw = (view.yaw * Math.PI) / 180;
    const pitch = (view.pitch * Math.PI) / 180;
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const radius = Math.sqrt(2 * bounds.h * bounds.h + (bounds.d / 2) * (bounds.d / 2));
    const k = ((Math.min(width || 600, height) / 2) * 0.92 * zoom) / radius;
    const cx = (width || 600) / 2;
    const cyy = height / 2;
    return (q: { n: number; e: number; tvd: number }) => {
      const x = q.e;
      const y = q.n;
      const z = -q.tvd + bounds.d / 2;
      const x1 = x * cy - y * sy;
      const y1 = x * sy + y * cy;
      const z2 = y1 * sp + z * cp;
      return { x: cx + k * x1, y: cyy - k * z2 };
    };
  }, [view, bounds, width, height, zoom]);

  const grid = useMemo(() => {
    const lines: { a: P3; b: P3; major: boolean }[] = [];
    const H = bounds.h;
    for (let v = -H; v <= H + 1e-6; v += bounds.gridStep) {
      lines.push({ a: { n: v, e: -H, tvd: 0 }, b: { n: v, e: H, tvd: 0 }, major: Math.abs(v) < 1e-6 });
      lines.push({ a: { n: -H, e: v, tvd: 0 }, b: { n: H, e: v, tvd: 0 }, major: Math.abs(v) < 1e-6 });
    }
    return lines;
  }, [bounds]);

  const depthTicks = useMemo(() => {
    const t: number[] = [];
    for (let d = bounds.depthStep; d <= bounds.d + 1e-6; d += bounds.depthStep) t.push(d);
    return t;
  }, [bounds]);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
    setHover(null);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      setView({
        yaw: drag.current.yaw - dx * 0.45,
        pitch: Math.max(-5, Math.min(90, drag.current.pitch + dy * 0.35)),
      });
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let best: { d: number; p: P3; label: string; x: number; y: number } | null = null;
    for (const path of paths) {
      for (const p of path.points) {
        if (p.md === undefined) continue;
        const s = proj(p);
        const d = Math.hypot(s.x - mx, s.y - my);
        if (d < 14 && (!best || d < best.d)) best = { d, p, label: path.label, x: s.x, y: s.y };
      }
    }
    setHover(best ? { x: best.x, y: best.y, p: best.p, label: best.label } : null);
  };
  const onUp = () => {
    drag.current = null;
  };

  const toPath = (pts: P3[]) =>
    pts.map((p, i) => {
      const s = proj(p);
      return `${i ? "L" : "M"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    }).join("");

  const origin = proj({ n: 0, e: 0, tvd: 0 });
  const bottom = proj({ n: 0, e: 0, tvd: bounds.d });
  const nLabel = proj({ n: bounds.h * 1.12, e: 0, tvd: 0 });
  const eLabel = proj({ n: 0, e: bounds.h * 1.12, tvd: 0 });

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {paths.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <svg width="18" height="8" aria-hidden>
                <line x1="1" x2="17" y1="4" y2="4" style={{ stroke: p.color }} strokeWidth={2.5} strokeDasharray={p.dash} strokeLinecap="round" />
              </svg>
              {p.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setView({ ...VIEWS[k] })}
              className="rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-3 transition hover:bg-panel-2 hover:text-ink"
            >
              {k}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">−</button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.2))} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">+</button>
        </div>
      </div>
      <div
        ref={ref}
        className="relative w-full cursor-grab overflow-hidden rounded-lg border border-line bg-panel-2 active:cursor-grabbing"
        style={{ height }}
        tabIndex={0}
        role="img"
        aria-label="3D wellbore trajectory. Drag or use arrow keys to rotate."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setView((v) => ({ ...v, yaw: v.yaw + 8 }));
          if (e.key === "ArrowRight") setView((v) => ({ ...v, yaw: v.yaw - 8 }));
          if (e.key === "ArrowUp") setView((v) => ({ ...v, pitch: Math.min(90, v.pitch + 6) }));
          if (e.key === "ArrowDown") setView((v) => ({ ...v, pitch: Math.max(-5, v.pitch - 6) }));
        }}
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => {
              onUp();
              setHover(null);
            }}
            style={{ touchAction: "none" }}
          >
            {/* surface grid */}
            {grid.map((g, i) => {
              const a = proj(g.a);
              const b = proj(g.b);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  style={{ stroke: g.major ? "var(--chart-axis)" : "var(--chart-grid)" }}
                  strokeWidth={g.major ? 1.2 : 1}
                />
              );
            })}
            <text x={nLabel.x} y={nLabel.y} textAnchor="middle" dy="0.32em" className="fill-[var(--ink-2)] text-[11px] font-semibold">N</text>
            <text x={eLabel.x} y={eLabel.y} textAnchor="middle" dy="0.32em" className="fill-[var(--ink-2)] text-[11px] font-semibold">E</text>
            {/* depth axis */}
            <line x1={origin.x} y1={origin.y} x2={bottom.x} y2={bottom.y} style={{ stroke: "var(--chart-axis)" }} strokeDasharray="4 4" />
            {depthTicks.map((d) => {
              const p = proj({ n: 0, e: 0, tvd: d });
              return (
                <g key={d}>
                  <circle cx={p.x} cy={p.y} r={2} style={{ fill: "var(--chart-axis)" }} />
                  <text x={p.x - 6} y={p.y} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[10px]">
                    {fmt(d, 0)}
                  </text>
                </g>
              );
            })}
            {/* drop lines (shadow on surface) */}
            {paths.slice(0, 1).map((p) => (
              <path
                key={`sh-${p.id}`}
                d={toPath(p.points.map((q) => ({ ...q, tvd: 0 })))}
                fill="none"
                style={{ stroke: p.color }}
                strokeWidth={1.2}
                opacity={0.3}
              />
            ))}
            {paths.map((p) => (
              <path
                key={p.id}
                d={toPath(p.points)}
                fill="none"
                style={{ stroke: p.color }}
                strokeWidth={p.width ?? 2.5}
                strokeDasharray={p.dash}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {markers.map((m, i) => {
              const s = proj(m);
              return (
                <g key={i}>
                  <circle cx={s.x} cy={s.y} r={5.5} style={{ fill: m.color ?? "var(--accent)", stroke: "var(--panel-2)" }} strokeWidth={2} />
                  <text
                    x={s.x + 9}
                    y={s.y}
                    dy="0.32em"
                    className="fill-[var(--ink)] text-[11px] font-semibold"
                    style={{ paintOrder: "stroke", stroke: "var(--panel-2)", strokeWidth: 3 }}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
            {hover && <circle cx={hover.x} cy={hover.y} r={5} style={{ fill: "none", stroke: "var(--ink)" }} strokeWidth={2} />}
          </svg>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-[170px] rounded-lg border border-line-strong bg-panel/95 px-2.5 py-2 text-[11.5px] shadow-xl backdrop-blur"
            style={{ left: Math.min(width - 178, hover.x + 12), top: Math.max(4, hover.y - 60) }}
          >
            <div className="mb-1 font-medium text-ink">{hover.label}</div>
            {[
              ["MD", hover.p.md, "ft"],
              ["TVD", hover.p.tvd, "ft"],
              ["Inc", hover.p.inc, "°"],
              ["N / E", null, ""],
            ].map(([k, v, u]) =>
              k === "N / E" ? (
                <div key={k as string} className="flex justify-between text-ink-3">
                  <span>N / E</span>
                  <span className="num text-ink">
                    {fmt(hover.p.n, 0)} / {fmt(hover.p.e, 0)}
                  </span>
                </div>
              ) : (
                <div key={k as string} className="flex justify-between text-ink-3">
                  <span>{k as string}</span>
                  <span className="num text-ink">
                    {fmt(v as number, k === "Inc" ? 1 : 0)} {u as string}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-ink-3">
          Drag to orbit · yaw {fmt(((view.yaw % 360) + 360) % 360, 0)}° · tilt {fmt(view.pitch, 0)}°
        </div>
      </div>
    </div>
  );
}
