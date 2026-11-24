"use client";

import { useMemo, useState } from "react";
import { useElementWidth } from "@/lib/hooks";
import { fmt, fmtTick } from "@/lib/format";
import { LabelWithUnit } from "@/components/ui/Unit";
import type { PlotStation } from "@/lib/calc/surveyData";
import { niceStep } from "./scale";

export type DiagramCasing = { label: string; shoe: number; od: number; hole: number };
export type DiagramTop = { name: string; tvd: number };
export type DiagramTarget = { name: string; vs: number; tvd: number; radius: number };

const LITH = ["var(--lith-shale)", "var(--lith-sand)", "var(--lith-lime)", "var(--lith-clay)", "var(--lith-dolo)"];
const PX_PER_IN = 0.95;

type Pt = { md: number; vs: number; tvd: number };

export function WellDiagram({
  stations,
  casing,
  openHole,
  tops,
  targets,
  trueScale,
  height = 620,
  vsAz,
}: {
  stations: PlotStation[];
  casing: DiagramCasing[];
  openHole: number;
  tops: DiagramTop[];
  targets: DiagramTarget[];
  trueScale: boolean;
  height?: number;
  vsAz: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ x: number; y: number; p: PlotStation } | null>(null);

  const pts: Pt[] = useMemo(() => {
    const v = stations.filter((s) => Number.isFinite(s.vs) && Number.isFinite(s.tvd));
    if (v.length === 0) return [];
    const out = v.map((s) => ({ md: s.md, vs: s.vs, tvd: s.tvd }));
    if (out[0].md > 0) out.unshift({ md: 0, vs: 0, tvd: 0 });
    return out;
  }, [stations]);

  const td = pts.length ? pts[pts.length - 1].md : 0;
  const mL = 58;
  const mR = 18;
  const mT = 34;
  const mB = 14;
  const plotW = Math.max(50, width - mL - mR);
  const plotH = height - mT - mB;

  const dom = useMemo(() => {
    let x0 = 0,
      x1 = 0,
      y1 = 100;
    pts.forEach((p) => {
      x0 = Math.min(x0, p.vs);
      x1 = Math.max(x1, p.vs);
      y1 = Math.max(y1, p.tvd);
    });
    targets.forEach((t) => {
      x0 = Math.min(x0, t.vs - t.radius);
      x1 = Math.max(x1, t.vs + t.radius);
      y1 = Math.max(y1, t.tvd);
    });
    tops.forEach((t) => (y1 = Math.max(y1, t.tvd)));
    const spanX = Math.max(200, x1 - x0);
    x0 -= spanX * 0.12;
    x1 += spanX * 0.12;
    y1 *= 1.04;
    if (trueScale) {
      const s = Math.min(plotW / (x1 - x0), plotH / y1);
      const cx = (x0 + x1) / 2;
      const halfX = plotW / s / 2;
      return { x0: cx - halfX, x1: cx + halfX, y0: 0, y1: plotH / s };
    }
    return { x0, x1, y0: 0, y1 };
  }, [pts, targets, tops, trueScale, plotW, plotH]);

  const X = (vs: number) => mL + ((vs - dom.x0) / (dom.x1 - dom.x0)) * plotW;
  const Y = (tvd: number) => mT + ((tvd - dom.y0) / (dom.y1 - dom.y0)) * plotH;

  const segment = (a: number, b: number) => {
    const out: Pt[] = [];
    const lerp = (p: Pt, q: Pt, m: number) => {
      const t = (m - p.md) / Math.max(1e-6, q.md - p.md);
      return { md: m, vs: p.vs + (q.vs - p.vs) * t, tvd: p.tvd + (q.tvd - p.tvd) * t };
    };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.md >= a && p.md <= b) out.push(p);
      const q = pts[i + 1];
      if (!q) break;
      if (p.md < a && q.md > a) out.push(lerp(p, q, a));
      if (p.md < b && q.md > b) out.push(lerp(p, q, b));
    }
    return out
      .sort((m, n) => m.md - n.md)
      .map((p, i) => `${i ? "L" : "M"}${X(p.vs).toFixed(1)},${Y(p.tvd).toFixed(1)}`)
      .join("");
  };

  const pointAt = (md: number) => {
    for (let i = 1; i < pts.length; i++) {
      if (md <= pts[i].md) {
        const p = pts[i - 1];
        const q = pts[i];
        const t = (md - p.md) / Math.max(1e-6, q.md - p.md);
        return { vs: p.vs + (q.vs - p.vs) * t, tvd: p.tvd + (q.tvd - p.tvd) * t };
      }
    }
    const l = pts[pts.length - 1];
    return l ? { vs: l.vs, tvd: l.tvd } : { vs: 0, tvd: 0 };
  };

  const strings = [...casing].filter((c) => c.shoe > 0 && c.od > 0).sort((a, b) => a.shoe - b.shoe);
  const holes = strings.map((c, i) => ({ from: i ? strings[i - 1].shoe : 0, to: Math.min(td, c.shoe + 30), size: c.hole }));
  const lastShoe = strings.length ? strings[strings.length - 1].shoe : 0;
  if (td > lastShoe) holes.push({ from: lastShoe, to: td, size: openHole });

  const xStep = niceStep(dom.x1 - dom.x0, Math.max(2, Math.round(plotW / 90)));
  const yStep = niceStep(dom.y1 - dom.y0, Math.max(3, Math.round(plotH / 60)));
  const xTicks: number[] = [];
  for (let t = Math.ceil(dom.x0 / xStep) * xStep; t <= dom.x1; t += xStep) xTicks.push(t);
  const yTicks: number[] = [];
  for (let t = 0; t <= dom.y1; t += yStep) yTicks.push(t);

  const sortedTops = [...tops].filter((t) => Number.isFinite(t.tvd)).sort((a, b) => a.tvd - b.tvd);
  const kop = stations.find((s) => s.inc >= 3);
  const tdSt = stations[stations.length - 1];

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && pts.length > 1 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Well diagram: vertical section with casing, formation tops and targets"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            let best: { d: number; s: PlotStation } | null = null;
            for (const s of stations) {
              if (!Number.isFinite(s.vs) || !Number.isFinite(s.tvd)) continue;
              const d = Math.hypot(X(s.vs) - mx, Y(s.tvd) - my);
              if (d < 18 && (!best || d < best.d)) best = { d, s };
            }
            setHover(best ? { x: X(best.s.vs), y: Y(best.s.tvd), p: best.s } : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id="wd-clip">
              <rect x={mL} y={mT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* formation bands */}
          <g clipPath="url(#wd-clip)">
            {sortedTops.map((t, i) => {
              const next = sortedTops[i + 1]?.tvd ?? dom.y1;
              return (
                <rect
                  key={`b${i}`}
                  x={mL}
                  y={Y(t.tvd)}
                  width={plotW}
                  height={Math.max(0, Y(next) - Y(t.tvd))}
                  style={{ fill: LITH[i % LITH.length] }}
                  opacity={0.22}
                />
              );
            })}
          </g>

          {/* grid */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={mL} x2={mL + plotW} y1={Y(t)} y2={Y(t)} style={{ stroke: "var(--chart-grid)" }} />
              <text x={mL - 8} y={Y(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[10.5px]">
                {fmtTick(t, yStep)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={X(t)} x2={X(t)} y1={mT} y2={mT + plotH} style={{ stroke: "var(--chart-grid)" }} />
              <text x={X(t)} y={mT - 8} textAnchor="middle" className="num fill-[var(--ink-3)] text-[10.5px]">
                {fmtTick(t, xStep)}
              </text>
            </g>
          ))}
          <line x1={mL} x2={mL + plotW} y1={mT} y2={mT} style={{ stroke: "var(--chart-axis)" }} strokeWidth={1.5} />
          <line x1={mL} x2={mL} y1={mT} y2={mT + plotH} style={{ stroke: "var(--chart-axis)" }} />

          {/* formation top lines & names */}
          {sortedTops.map((t, i) => (
            <g key={`t${i}`}>
              <line x1={mL} x2={mL + plotW} y1={Y(t.tvd)} y2={Y(t.tvd)} style={{ stroke: "var(--ink-3)" }} strokeDasharray="2 4" />
              <text
                x={mL + 6}
                y={Y(t.tvd) + 12}
                className="fill-[var(--ink-2)] text-[10.5px] font-medium"
                style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}
              >
                {t.name} · {fmt(t.tvd, 0)} ft TVD
              </text>
            </g>
          ))}

          <g clipPath="url(#wd-clip)">
            {/* hole sections */}
            {holes.map((h, i) => (
              <path
                key={`h${i}`}
                d={segment(h.from, h.to)}
                fill="none"
                style={{ stroke: "var(--panel-3)" }}
                strokeWidth={Math.max(4, h.size * PX_PER_IN)}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
            ))}
            {/* cement-like halo + casing walls, largest first */}
            {[...strings]
              .sort((a, b) => b.od - a.od)
              .map((c, i) => (
                <g key={`c${i}`}>
                  <path d={segment(0, c.shoe)} fill="none" style={{ stroke: "var(--ink-2)" }} strokeWidth={Math.max(4, c.od * PX_PER_IN)} strokeLinejoin="round" />
                  <path d={segment(0, c.shoe)} fill="none" style={{ stroke: "var(--panel-3)" }} strokeWidth={Math.max(2, c.od * PX_PER_IN - 3)} strokeLinejoin="round" />
                </g>
              ))}
            {/* wellbore path */}
            <path d={segment(0, td)} fill="none" style={{ stroke: "var(--series-1)" }} strokeWidth={2} strokeLinejoin="round" />
            {stations
              .filter((s) => Number.isFinite(s.vs) && Number.isFinite(s.tvd))
              .map((s, i) => (
                <circle key={`s${i}`} cx={X(s.vs)} cy={Y(s.tvd)} r={2} style={{ fill: "var(--series-1)" }} />
              ))}
          </g>

          {/* shoes */}
          {strings.map((c, i) => {
            const p = pointAt(c.shoe);
            const x = X(p.vs);
            const y = Y(p.tvd);
            const w = (c.od * PX_PER_IN) / 2 + 2;
            return (
              <g key={`sh${i}`}>
                <path d={`M${x - w - 5} ${y} L${x - w} ${y - 7} L${x - w} ${y} Z M${x + w + 5} ${y} L${x + w} ${y - 7} L${x + w} ${y} Z`} style={{ fill: "var(--ink)" }} />
                <text
                  x={x + w + 9}
                  y={y + 3}
                  className="fill-[var(--ink)] text-[10.5px] font-semibold"
                  style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}
                >
                  {c.label} @ {fmt(c.shoe, 0)} ft MD
                </text>
              </g>
            );
          })}

          {/* targets */}
          {targets.map((t, i) => {
            const x0 = X(t.vs - t.radius);
            const x1 = X(t.vs + t.radius);
            const hh = Math.max(6, Math.abs(Y(t.tvd + Math.max(20, t.radius * 0.3)) - Y(t.tvd)));
            return (
              <g key={`tg${i}`}>
                <rect x={Math.min(x0, x1)} y={Y(t.tvd) - hh} width={Math.max(6, Math.abs(x1 - x0))} height={hh * 2} rx={3} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={2} strokeDasharray="5 3" />
                <circle cx={X(t.vs)} cy={Y(t.tvd)} r={3.5} style={{ fill: "var(--accent)" }} />
                <text
                  x={Math.max(x0, x1) + 6}
                  y={Y(t.tvd) + 4}
                  className="fill-[var(--accent)] text-[11px] font-semibold"
                  style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}
                >
                  {t.name}
                </text>
              </g>
            );
          })}

          {/* KOP / TD */}
          {kop && Number.isFinite(kop.vs) && (
            <text x={X(kop.vs) + 10} y={Y(kop.tvd)} className="fill-[var(--ink)] text-[10.5px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}>
              KOP ≈ {fmt(kop.md, 0)} ft MD
            </text>
          )}
          {tdSt && Number.isFinite(tdSt.vs) && (
            <g>
              <circle cx={X(tdSt.vs)} cy={Y(tdSt.tvd)} r={5} style={{ fill: "var(--series-1)", stroke: "var(--panel)" }} strokeWidth={2} />
              <text x={X(tdSt.vs) + 9} y={Y(tdSt.tvd) + 14} className="fill-[var(--ink)] text-[10.5px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}>
                TD {fmt(tdSt.md, 0)} ft MD
              </text>
            </g>
          )}

          {hover && <circle cx={hover.x} cy={hover.y} r={6} fill="none" style={{ stroke: "var(--ink)" }} strokeWidth={2} />}
        </svg>
      )}
      {width > 0 && (
        <>
          <div className="absolute whitespace-nowrap text-[11px] font-medium text-ink-2" style={{ right: mR, top: 2 }}>
            <LabelWithUnit label={`Vertical section @ ${fmt(vsAz, 1)}°`} unit="ft" />
          </div>
          <div className="absolute whitespace-nowrap text-[11px] font-medium text-ink-2" style={{ left: 4, top: 2 }}>
            <LabelWithUnit label="TVD" unit="ft" />
          </div>
        </>
      )}
      {pts.length <= 1 && width > 0 && (
        <div className="grid h-full place-items-center text-[13px] text-ink-3">Enter at least two survey stations to draw the well.</div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-[180px] rounded-lg border border-line-strong bg-panel/95 px-2.5 py-2 text-[11.5px] shadow-xl backdrop-blur"
          style={{ left: Math.min(width - 188, hover.x + 12), top: Math.max(4, hover.y - 70) }}
        >
          {[
            ["MD", fmt(hover.p.md, 0), "ft"],
            ["TVD", fmt(hover.p.tvd, 1), "ft"],
            ["VS", fmt(hover.p.vs, 1), "ft"],
            ["Inc / Azi", `${Number.isFinite(hover.p.inc) ? hover.p.inc.toFixed(2) : "—"} / ${Number.isFinite(hover.p.azi) ? hover.p.azi.toFixed(1) : "—"}`, "°"],
            ["DLS", Number.isFinite(hover.p.dls) ? hover.p.dls.toFixed(2) : "—", "°/100ft"],
          ].map(([k, v, u]) => (
            <div key={k} className="flex justify-between gap-3 text-ink-3">
              <span>{k}</span>
              <span className="num text-ink">
                {v} {u}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
