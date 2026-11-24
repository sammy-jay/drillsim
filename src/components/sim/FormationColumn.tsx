"use client";

import { fmt } from "@/lib/format";
import { LITH_FILL, type Scenario } from "@/lib/sim/scenarios";
import { useElementWidth } from "@/lib/hooks";

export function FormationColumn({
  scenario,
  depth,
  bitDepth,
  height = 470,
}: {
  scenario: Scenario;
  depth: number;
  bitDepth: number;
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const z0 = Math.max(0, Math.floor((scenario.shoe - 800) / 500) * 500);
  const z1 = scenario.td;
  const top = 8;
  const bottom = height - 8;
  const y = (z: number) => top + ((z - z0) / (z1 - z0)) * (bottom - top);
  const colX = 46;
  const colW = Math.max(60, width - colX - 4);
  const holeX = colX + 14;
  const holeW = 12;
  const ticks: number[] = [];
  for (let t = Math.ceil(z0 / 500) * 500; t <= z1; t += 500) ticks.push(t);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Formation prognosis with bit at ${Math.round(bitDepth)} ft`}>
          {scenario.layers
            .filter((l) => l.base > z0 && l.top < z1)
            .map((l) => {
              const y0 = y(Math.max(z0, l.top));
              const y1 = y(Math.min(z1, l.base));
              const h = y1 - y0;
              return (
                <g key={l.name}>
                  <rect x={colX} y={y0} width={colW} height={h} style={{ fill: LITH_FILL[l.lith] }} opacity={0.75} />
                  <line x1={colX} x2={colX + colW} y1={y0} y2={y0} style={{ stroke: "var(--panel)" }} strokeWidth={1} />
                  {h > 13 && (
                    <text
                      x={holeX + holeW + 10}
                      y={y0 + Math.min(h / 2, 14)}
                      dy="0.32em"
                      className="fill-[var(--ink)] text-[10.5px] font-medium"
                      style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 2.5, strokeOpacity: 0.6 }}
                    >
                      {l.name}
                    </text>
                  )}
                </g>
              );
            })}
          {/* depth ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={colX - 5} x2={colX} y1={y(t)} y2={y(t)} style={{ stroke: "var(--ink-3)" }} />
              <text x={colX - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[10px]">
                {fmt(t, 0)}
              </text>
            </g>
          ))}
          {/* casing to shoe */}
          <rect x={holeX - 3} y={y(z0)} width={holeW + 6} height={y(scenario.shoe) - y(z0)} style={{ fill: "var(--panel-3)" }} />
          <line x1={holeX - 3} x2={holeX - 3} y1={y(z0)} y2={y(scenario.shoe)} style={{ stroke: "var(--ink)" }} strokeWidth={2} />
          <line x1={holeX + holeW + 3} x2={holeX + holeW + 3} y1={y(z0)} y2={y(scenario.shoe)} style={{ stroke: "var(--ink)" }} strokeWidth={2} />
          <path d={`M${holeX - 3} ${y(scenario.shoe)} l-5 0 l5 -6 Z M${holeX + holeW + 3} ${y(scenario.shoe)} l5 0 l-5 -6 Z`} style={{ fill: "var(--ink)" }} />
          {/* open hole drilled */}
          <rect x={holeX} y={y(scenario.shoe)} width={holeW} height={Math.max(0, y(depth) - y(scenario.shoe))} style={{ fill: "var(--panel)" }} opacity={0.9} />
          {/* drill string */}
          <line x1={holeX + holeW / 2} x2={holeX + holeW / 2} y1={y(z0)} y2={y(bitDepth)} style={{ stroke: "var(--ink-2)" }} strokeWidth={2.5} />
          <path
            d={`M${holeX - 1} ${y(bitDepth) - 3} H${holeX + holeW + 1} L${holeX + holeW / 2} ${y(bitDepth) + 6} Z`}
            style={{ fill: "var(--accent)" }}
          />
          {/* depth flag */}
          <g>
            <line x1={holeX + holeW + 2} x2={colX + colW} y1={y(depth)} y2={y(depth)} style={{ stroke: "var(--accent)" }} strokeDasharray="3 3" />
            <rect x={colX + colW - 62} y={y(depth) - 9} width={60} height={18} rx={4} style={{ fill: "var(--accent)" }} />
            <text x={colX + colW - 32} y={y(depth)} dy="0.34em" textAnchor="middle" className="num fill-[var(--accent-ink)] text-[10.5px] font-semibold">
              {fmt(depth, 0)}
            </text>
          </g>
          <text x={holeX + holeW + 10} y={y(scenario.shoe) + 12} className="fill-[var(--ink-2)] text-[10px]">
            Shoe · LOT {scenario.lot.toFixed(1)} ppg
          </text>
        </svg>
      )}
    </div>
  );
}
