"use client";

import { useMemo, useState } from "react";
import { useElementWidth, useThemeMode } from "@/lib/hooks";
import { fmt, fmtTick } from "@/lib/format";
import { niceStep } from "./scale";
import { LabelWithUnit } from "@/components/ui/Unit";

/* Sequential blue ramp (reference palette, steps 100 -> 700). */
const RAMP = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
  "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const RAMP_RGB = RAMP.map(hexToRgb);

function rampColor(t: number, dark: boolean) {
  const u = Math.min(1, Math.max(0, dark ? 1 - t : t)) * (RAMP_RGB.length - 1);
  const i = Math.min(RAMP_RGB.length - 2, Math.floor(u));
  const f = u - i;
  const a = RAMP_RGB[i];
  const b = RAMP_RGB[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

export type HeatMarker = { x: number; y: number; label: string };

export function Heatmap({
  xs,
  ys,
  values,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  valueLabel,
  valueUnit,
  digits = 1,
  markers = [],
  height = 320,
  clampMax,
}: {
  xs: number[];
  ys: number[];
  values: number[][];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  valueLabel: string;
  valueUnit?: string;
  digits?: number;
  markers?: HeatMarker[];
  height?: number;
  clampMax?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const mode = useThemeMode();
  const dark = mode === "dark";
  const [hover, setHover] = useState<{ xi: number; yi: number } | null>(null);

  const { vmin, vmax } = useMemo(() => {
    let lo = Infinity,
      hi = -Infinity;
    values.forEach((row) =>
      row.forEach((v) => {
        if (Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, clampMax !== undefined ? Math.min(v, clampMax) : v);
        }
      }),
    );
    return { vmin: lo, vmax: hi };
  }, [values, clampMax]);

  const mLeft = 48;
  const mBottom = 36;
  const mTop = 22;
  const mRight = 12;
  const plotW = Math.max(10, width - mLeft - mRight);
  const plotH = height - mTop - mBottom;
  const cw = plotW / xs.length;
  const ch = plotH / ys.length;
  const xStep = niceStep(xs[xs.length - 1] - xs[0], Math.max(2, Math.round(plotW / 80)));
  const yStep = niceStep(ys[ys.length - 1] - ys[0], Math.max(2, Math.round(plotH / 50)));
  const xPos = (v: number) => mLeft + ((v - xs[0]) / (xs[xs.length - 1] - xs[0] || 1)) * (plotW - cw) + cw / 2;
  const yPos = (v: number) => mTop + plotH - (((v - ys[0]) / (ys[ys.length - 1] - ys[0] || 1)) * (plotH - ch) + ch / 2);

  const xTicks: number[] = [];
  for (let t = Math.ceil(xs[0] / xStep) * xStep; t <= xs[xs.length - 1] + 1e-9; t += xStep) xTicks.push(t);
  const yTicks: number[] = [];
  for (let t = Math.ceil(ys[0] / yStep) * yStep; t <= ys[ys.length - 1] + 1e-9; t += yStep) yTicks.push(t);

  const norm = (v: number) => (vmax === vmin ? 0.5 : (Math.min(v, clampMax ?? Infinity) - vmin) / (vmax - vmin));
  const hv = hover ? values[hover.yi]?.[hover.xi] : undefined;

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-2">
        <span><LabelWithUnit label={valueLabel} unit={valueUnit} /></span>
        <div className="flex items-center gap-2">
          <span className="num text-[11px] text-ink-3">{fmt(vmin, digits)}</span>
          <span
            className="h-2.5 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => rampColor(i / 8, dark)).join(",")})`,
            }}
          />
          <span className="num text-[11px] text-ink-3">
            {clampMax !== undefined && vmax >= clampMax ? "≥" : ""}
            {fmt(vmax, digits)}
          </span>
        </div>
      </div>
      <div ref={ref} className="relative w-full select-none" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${valueLabel} heatmap by ${xLabel} and ${yLabel}`}>
            {values.map((row, yi) =>
              row.map((v, xi) => (
                <rect
                  key={`${xi}-${yi}`}
                  x={mLeft + xi * cw}
                  y={mTop + plotH - (yi + 1) * ch}
                  width={cw + 0.5}
                  height={ch + 0.5}
                  fill={Number.isFinite(v) ? rampColor(norm(v), dark) : "transparent"}
                />
              )),
            )}
            {hover && (
              <rect
                x={mLeft + hover.xi * cw}
                y={mTop + plotH - (hover.yi + 1) * ch}
                width={cw}
                height={ch}
                fill="none"
                style={{ stroke: "var(--ink)" }}
                strokeWidth={1.5}
                pointerEvents="none"
              />
            )}
            {xTicks.map((t) => (
              <text key={`x${t}`} x={xPos(t)} y={mTop + plotH + 15} textAnchor="middle" className="num fill-[var(--ink-3)] text-[10.5px]">
                {fmtTick(t, xStep)}
              </text>
            ))}
            {yTicks.map((t) => (
              <text key={`y${t}`} x={mLeft - 7} y={yPos(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[10.5px]">
                {fmtTick(t, yStep)}
              </text>
            ))}
            {markers.map((m, i) => (
              <g key={i} pointerEvents="none">
                <circle cx={xPos(m.x)} cy={yPos(m.y)} r={7} fill="none" style={{ stroke: "var(--panel)" }} strokeWidth={4} />
                <circle cx={xPos(m.x)} cy={yPos(m.y)} r={7} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={2.5} />
                <text
                  x={xPos(m.x) + (xPos(m.x) > mLeft + plotW - 90 ? -12 : 12)}
                  y={yPos(m.y) + (yPos(m.y) < mTop + 20 ? 16 : -10)}
                  textAnchor={xPos(m.x) > mLeft + plotW - 90 ? "end" : "start"}
                  className="fill-[var(--ink)] text-[11px] font-semibold"
                  style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3.5 }}
                >
                  {m.label}
                </text>
              </g>
            ))}
            <rect
              x={mLeft}
              y={mTop}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const xi = Math.floor((e.clientX - r.left - mLeft) / cw);
                const yi = Math.floor((mTop + plotH - (e.clientY - r.top)) / ch);
                if (xi >= 0 && xi < xs.length && yi >= 0 && yi < ys.length) setHover({ xi, yi });
              }}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {width > 0 && (
          <>
            <div className="absolute whitespace-nowrap text-[11px] font-medium leading-[14px] text-ink-2" style={{ right: mRight, top: height - 14 }}>
              <LabelWithUnit label={xLabel} unit={xUnit} />
            </div>
            <div className="absolute whitespace-nowrap text-[11px] font-medium leading-[14px] text-ink-2" style={{ left: 4, top: 1 }}>
              <LabelWithUnit label={yLabel} unit={yUnit} />
            </div>
          </>
        )}
        {hover && hv !== undefined && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 w-[180px] rounded-lg border border-line-strong bg-panel/95 px-2.5 py-2 text-[12px] shadow-xl backdrop-blur"
            style={{
              left: Math.min(width - 184, mLeft + (hover.xi + 1) * cw + 8),
              top: Math.max(0, mTop + plotH - (hover.yi + 1) * ch - 70),
            }}
          >
            <div className="flex justify-between text-ink-3">
              <span>{xLabel}</span>
              <span className="num text-ink">
                {fmt(xs[hover.xi], 0)} {xUnit}
              </span>
            </div>
            <div className="flex justify-between text-ink-3">
              <span>{yLabel}</span>
              <span className="num text-ink">
                {fmt(ys[hover.yi], 0)} {yUnit}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 text-ink-2">
              <span>{valueLabel}</span>
              <span className="num font-semibold text-ink">
                {fmt(hv, digits)} {valueUnit}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
