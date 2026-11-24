"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Table2 } from "lucide-react";
import { useElementWidth } from "@/lib/hooks";
import { fmt, fmtTick } from "@/lib/format";
import { LabelWithUnit } from "@/components/ui/Unit";
import { linear, niceDomain } from "./scale";

export type XY = { x: number; y: number };

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  data: XY[];
  dash?: string;
  width?: number;
  step?: boolean;
  points?: boolean;
  hideInTooltip?: boolean;
  hideInLegend?: boolean;
  fill?: boolean;
  digits?: number;
  unit?: string;
};

export type ChartArea = { id: string; label?: string; color: string; opacity?: number; polygon: XY[] };
export type RefLine = { axis: "x" | "y"; value: number; label?: string; color?: string; dash?: boolean; labelAt?: "start" | "end" };
export type Band = { axis: "x" | "y"; from: number; to: number; label?: string; color?: string };
export type Marker = { x: number; y: number; label?: string; color?: string; size?: number };

type Domain = [number | null, number | null];

export type XYChartProps = {
  series: ChartSeries[];
  areas?: ChartArea[];
  refLines?: RefLine[];
  bands?: Band[];
  markers?: Marker[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  height?: number;
  invertY?: boolean;
  xDomain?: Domain;
  yDomain?: Domain;
  independent?: "x" | "y";
  indepDigits?: number;
  valueDigits?: number;
  legend?: boolean;
  ariaLabel?: string;
  extraLegend?: ReactNode;
  tableView?: boolean;
  animate?: boolean;
};

const M_TOP = 12;
const M_RIGHT = 18;

function sortedBy(data: XY[], key: "x" | "y") {
  for (let i = 1; i < data.length; i++) if (data[i][key] < data[i - 1][key]) return false;
  return true;
}

function nearestIndex(data: XY[], key: "x" | "y", v: number, sorted: boolean) {
  if (data.length === 0) return -1;
  if (sorted) {
    let lo = 0;
    let hi = data.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (data[mid][key] < v) lo = mid;
      else hi = mid;
    }
    return Math.abs(data[lo][key] - v) <= Math.abs(data[hi][key] - v) ? lo : hi;
  }
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < data.length; i++) {
    const d = Math.abs(data[i][key] - v);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

export function XYChart(props: XYChartProps) {
  const {
    series,
    areas = [],
    refLines = [],
    bands = [],
    markers = [],
    xLabel,
    yLabel,
    xUnit,
    yUnit,
    height = 300,
    invertY = false,
    xDomain,
    yDomain,
    independent = "x",
    indepDigits,
    valueDigits = 1,
    legend,
    ariaLabel,
    extraLegend,
    tableView = true,
  } = props;

  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ px: number; py: number } | null>(null);
  const [showTable, setShowTable] = useState(false);
  const rawId = useId();
  const clipId = `clip-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const showLegend = legend ?? series.filter((s) => !s.hideInLegend).length >= 2;
  const xTop = invertY; // depth plots carry the x axis on top, like a well log

  /* ---------- domains ---------- */
  const dom = useMemo(() => {
    let xmin = Infinity,
      xmax = -Infinity,
      ymin = Infinity,
      ymax = -Infinity;
    const take = (p: XY) => {
      if (Number.isFinite(p.x)) {
        xmin = Math.min(xmin, p.x);
        xmax = Math.max(xmax, p.x);
      }
      if (Number.isFinite(p.y)) {
        ymin = Math.min(ymin, p.y);
        ymax = Math.max(ymax, p.y);
      }
    };
    series.forEach((s) => s.data.forEach(take));
    areas.forEach((a) => a.polygon.forEach(take));
    markers.forEach(take);
    refLines.forEach((r) => (r.axis === "x" ? take({ x: r.value, y: NaN }) : take({ x: NaN, y: r.value })));
    if (!Number.isFinite(xmin)) {
      xmin = 0;
      xmax = 1;
    }
    if (!Number.isFinite(ymin)) {
      ymin = 0;
      ymax = 1;
    }
    return { xmin, xmax, ymin, ymax };
  }, [series, areas, markers, refLines]);

  const plotH = height - M_TOP - 38;
  const yd = niceDomain(dom.ymin, dom.ymax, Math.max(3, Math.round(plotH / 52)), yDomain?.[0], yDomain?.[1]);
  const yTickLabels = yd.ticks.map((t) => fmtTick(t, yd.step));
  const mLeft = Math.max(38, Math.max(...yTickLabels.map((l) => l.length)) * 6.6 + 16);
  const plotW = Math.max(10, width - mLeft - M_RIGHT);
  const xd = niceDomain(dom.xmin, dom.xmax, Math.max(2, Math.round(plotW / 90)), xDomain?.[0], xDomain?.[1]);

  const top = xTop ? M_TOP + 24 : M_TOP + 12;
  const innerH = height - top - (xTop ? 12 : 38);
  const sx = linear(xd.min, xd.max, mLeft, mLeft + plotW);
  const sy = invertY ? linear(yd.min, yd.max, top, top + innerH) : linear(yd.min, yd.max, top + innerH, top);

  const sortedFlags = useMemo(
    () => series.map((s) => sortedBy(s.data, independent)),
    [series, independent],
  );

  /* ---------- paths ---------- */
  const pathFor = (s: ChartSeries) => {
    let d = "";
    let pen = false;
    for (let i = 0; i < s.data.length; i++) {
      const p = s.data[i];
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        pen = false;
        continue;
      }
      const X = sx(p.x);
      const Y = sy(p.y);
      if (!pen) {
        d += `M${X.toFixed(1)},${Y.toFixed(1)}`;
        pen = true;
      } else if (s.step) {
        const prev = s.data[i - 1];
        if (independent === "x") d += `H${X.toFixed(1)}V${Y.toFixed(1)}`;
        else d += `V${sy(p.y).toFixed(1)}H${X.toFixed(1)}`;
        void prev;
      } else {
        d += `L${X.toFixed(1)},${Y.toFixed(1)}`;
      }
    }
    return d;
  };

  const areaFor = (s: ChartSeries) => {
    const pts = s.data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 2) return "";
    const base = sy(Math.max(yd.min, Math.min(yd.max, 0)));
    let d = `M${sx(pts[0].x).toFixed(1)},${base.toFixed(1)}`;
    pts.forEach((p) => (d += `L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`));
    d += `L${sx(pts[pts.length - 1].x).toFixed(1)},${base.toFixed(1)}Z`;
    return d;
  };

  /* ---------- hover ---------- */
  const hoverInfo = (() => {
    if (!hover || width === 0) return null;
    const v = independent === "x" ? sx.invert(hover.px) : sy.invert(hover.py);
    const rows: { s: ChartSeries; p: XY }[] = [];
    let snap: number | null = null;
    let snapDist = Infinity;
    const span = independent === "x" ? xd.max - xd.min : yd.max - yd.min;
    series.forEach((s, i) => {
      if (s.hideInTooltip || s.data.length === 0) return;
      const idx = nearestIndex(s.data, independent, v, sortedFlags[i]);
      if (idx < 0) return;
      const p = s.data[idx];
      const iv = independent === "x" ? p.x : p.y;
      if (Math.abs(iv - v) > span * 0.08) return;
      rows.push({ s, p });
      if (Math.abs(iv - v) < snapDist) {
        snapDist = Math.abs(iv - v);
        snap = iv;
      }
    });
    if (snap === null) return null;
    return { snap: snap as number, rows };
  })();

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    setHover({ px: e.clientX - rect.left, py: e.clientY - rect.top });
  };

  const indLabel = independent === "x" ? xLabel : yLabel;
  const indUnit = independent === "x" ? xUnit : yUnit;
  const depLabelUnit = independent === "x" ? yUnit : xUnit;
  const indDigits = indepDigits ?? (independent === "x" ? (xd.step < 1 ? 2 : 0) : yd.step < 1 ? 2 : 0);

  /* ---------- table view ---------- */
  const tableRows = useMemo(() => {
    if (!showTable) return [];
    const base = series.find((s) => !s.hideInTooltip && s.data.length > 0);
    if (!base) return [];
    const stride = Math.max(1, Math.ceil(base.data.length / 120));
    const out: { iv: number; vals: (number | null)[] }[] = [];
    for (let i = 0; i < base.data.length; i += stride) {
      const iv = independent === "x" ? base.data[i].x : base.data[i].y;
      out.push({
        iv,
        vals: series
          .filter((s) => !s.hideInTooltip)
          .map((s, k) => {
            const idx = nearestIndex(s.data, independent, iv, sortedFlags[series.indexOf(s)] ?? false);
            if (idx < 0) return null;
            void k;
            const p = s.data[idx];
            return independent === "x" ? p.y : p.x;
          }),
      });
    }
    return out;
  }, [showTable, series, independent, sortedFlags]);

  const legendItems = series.filter((s) => !s.hideInLegend);

  return (
    <div className="min-w-0">
      {(showLegend || tableView || extraLegend) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {showLegend &&
              legendItems.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                  <svg width="18" height="8" aria-hidden>
                    <line
                      x1="1"
                      x2="17"
                      y1="4"
                      y2="4"
                      style={{ stroke: s.color }}
                      strokeWidth={2.5}
                      strokeDasharray={s.dash}
                      strokeLinecap="round"
                    />
                  </svg>
                  {s.label}
                </span>
              ))}
            {showLegend &&
              areas
                .filter((a) => a.label)
                .map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                    <span
                      className="inline-block size-3 rounded-[3px]"
                      style={{ background: a.color, opacity: Math.min(1, (a.opacity ?? 0.15) * 2.2) }}
                    />
                    {a.label}
                  </span>
                ))}
            {extraLegend}
          </div>
          {tableView && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-3 transition hover:bg-panel-2 hover:text-ink"
            >
              <Table2 size={12} />
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      )}

      {showTable ? (
        <div className="scroll-thin overflow-auto rounded-lg border border-line" style={{ height }}>
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-panel-2">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium text-ink-3">
                  <LabelWithUnit label={indLabel} unit={indUnit} />
                </th>
                {series
                  .filter((s) => !s.hideInTooltip)
                  .map((s) => (
                    <th key={s.id} className="px-3 py-1.5 text-right font-medium text-ink-3">
                      <LabelWithUnit label={s.label} unit={s.unit ?? depLabelUnit} />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="num px-3 py-1 text-ink-2">{fmt(r.iv, indDigits)}</td>
                  {r.vals.map((v, j) => (
                    <td key={j} className="num px-3 py-1 text-right text-ink">
                      {v === null ? "—" : fmt(v, series.filter((s) => !s.hideInTooltip)[j]?.digits ?? valueDigits)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative w-full select-none" style={{ height }}>
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={ariaLabel ?? `${yLabel} versus ${xLabel}`}
              className="block overflow-visible"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x={mLeft} y={top} width={plotW} height={innerH} />
                </clipPath>
              </defs>

              {/* grid */}
              {yd.ticks.map((t, i) => (
                <g key={`y${t}`}>
                  <line
                    x1={mLeft}
                    x2={mLeft + plotW}
                    y1={sy(t)}
                    y2={sy(t)}
                    style={{ stroke: "var(--chart-grid)" }}
                    strokeWidth={1}
                  />
                  <text
                    x={mLeft - 8}
                    y={sy(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className="num fill-[var(--ink-3)] text-[10.5px]"
                  >
                    {yTickLabels[i]}
                  </text>
                </g>
              ))}
              {xd.ticks.map((t) => (
                <g key={`x${t}`}>
                  <line
                    x1={sx(t)}
                    x2={sx(t)}
                    y1={top}
                    y2={top + innerH}
                    style={{ stroke: "var(--chart-grid)" }}
                    strokeWidth={1}
                  />
                  <text
                    x={sx(t)}
                    y={xTop ? top - 8 : top + innerH + 16}
                    textAnchor="middle"
                    className="num fill-[var(--ink-3)] text-[10.5px]"
                  >
                    {fmtTick(t, xd.step)}
                  </text>
                </g>
              ))}

              {/* axis baselines */}
              <line
                x1={mLeft}
                x2={mLeft}
                y1={top}
                y2={top + innerH}
                style={{ stroke: "var(--chart-axis)" }}
              />
              <line
                x1={mLeft}
                x2={mLeft + plotW}
                y1={xTop ? top : top + innerH}
                y2={xTop ? top : top + innerH}
                style={{ stroke: "var(--chart-axis)" }}
              />


              <g clipPath={`url(#${clipId})`}>
                {/* bands */}
                {bands.map((b, i) =>
                  b.axis === "x" ? (
                    <rect
                      key={`b${i}`}
                      x={Math.min(sx(b.from), sx(b.to))}
                      width={Math.abs(sx(b.to) - sx(b.from))}
                      y={top}
                      height={innerH}
                      style={{ fill: b.color ?? "var(--chart-band)" }}
                    />
                  ) : (
                    <rect
                      key={`b${i}`}
                      y={Math.min(sy(b.from), sy(b.to))}
                      height={Math.abs(sy(b.to) - sy(b.from))}
                      x={mLeft}
                      width={plotW}
                      style={{ fill: b.color ?? "var(--chart-band)" }}
                    />
                  ),
                )}
                {/* areas */}
                {areas.map((a) => (
                  <path
                    key={a.id}
                    d={
                      a.polygon
                        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
                        .map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
                        .join("") + "Z"
                    }
                    style={{ fill: a.color, opacity: a.opacity ?? 0.15 }}
                  />
                ))}
                {/* series fills */}
                {series
                  .filter((s) => s.fill && independent === "x")
                  .map((s) => (
                    <path key={`f${s.id}`} d={areaFor(s)} style={{ fill: s.color, opacity: 0.12 }} />
                  ))}
                {/* lines */}
                {series.map((s) => (
                  <path
                    key={s.id}
                    d={pathFor(s)}
                    fill="none"
                    style={{ stroke: s.color }}
                    strokeWidth={s.width ?? 2}
                    strokeDasharray={s.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
                {/* point markers */}
                {series
                  .filter((s) => s.points)
                  .map((s) =>
                    s.data.map((p, i) => (
                      <circle
                        key={`${s.id}-${i}`}
                        cx={sx(p.x)}
                        cy={sy(p.y)}
                        r={3.5}
                        style={{ fill: s.color, stroke: "var(--panel)" }}
                        strokeWidth={1.5}
                      />
                    )),
                  )}
              </g>

              {/* reference lines (outside clip so labels breathe) */}
              {refLines.map((r, i) => {
                const inRange =
                  r.axis === "x"
                    ? r.value >= Math.min(xd.min, xd.max) && r.value <= Math.max(xd.min, xd.max)
                    : r.value >= Math.min(yd.min, yd.max) && r.value <= Math.max(yd.min, yd.max);
                if (!inRange) return null;
                const color = r.color ?? "var(--ink-3)";
                return r.axis === "x" ? (
                  <g key={`r${i}`}>
                    <line
                      x1={sx(r.value)}
                      x2={sx(r.value)}
                      y1={top}
                      y2={top + innerH}
                      style={{ stroke: color }}
                      strokeWidth={1.5}
                      strokeDasharray={r.dash === false ? undefined : "5 4"}
                    />
                    {r.label && (
                      <text
                        x={sx(r.value) > mLeft + plotW - r.label.length * 6 - 8 ? sx(r.value) - 5 : sx(r.value) + 5}
                        y={(r.labelAt ?? (invertY ? "end" : "start")) === "end" ? top + innerH - 6 : top + 11}
                        textAnchor={sx(r.value) > mLeft + plotW - r.label.length * 6 - 8 ? "end" : "start"}
                        className="fill-[var(--ink-2)] text-[10.5px] font-medium"
                        style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}
                      >
                        {r.label}
                      </text>
                    )}
                  </g>
                ) : (
                  <g key={`r${i}`}>
                    <line
                      x1={mLeft}
                      x2={mLeft + plotW}
                      y1={sy(r.value)}
                      y2={sy(r.value)}
                      style={{ stroke: color }}
                      strokeWidth={1.5}
                      strokeDasharray={r.dash === false ? undefined : "5 4"}
                    />
                    {r.label && (
                      <text
                        x={mLeft + plotW - 4}
                        y={sy(r.value) - 5}
                        textAnchor="end"
                        className="fill-[var(--ink-2)] text-[10.5px] font-medium"
                      >
                        {r.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* markers */}
              {markers.map((m, i) => (
                <g key={`m${i}`}>
                  <circle
                    cx={sx(m.x)}
                    cy={sy(m.y)}
                    r={m.size ?? 5}
                    style={{ fill: m.color ?? "var(--accent)", stroke: "var(--panel)" }}
                    strokeWidth={2}
                  />
                  {m.label && (
                    <text
                      x={sx(m.x) + 9}
                      y={sy(m.y) - 8}
                      className="fill-[var(--ink)] text-[11px] font-semibold"
                      style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3 }}
                    >
                      {m.label}
                    </text>
                  )}
                </g>
              ))}

              {/* crosshair */}
              {hoverInfo && (
                <g pointerEvents="none">
                  {independent === "x" ? (
                    <line
                      x1={sx(hoverInfo.snap)}
                      x2={sx(hoverInfo.snap)}
                      y1={top}
                      y2={top + innerH}
                      style={{ stroke: "var(--chart-crosshair)" }}
                      strokeDasharray="3 3"
                    />
                  ) : (
                    <line
                      y1={sy(hoverInfo.snap)}
                      y2={sy(hoverInfo.snap)}
                      x1={mLeft}
                      x2={mLeft + plotW}
                      style={{ stroke: "var(--chart-crosshair)" }}
                      strokeDasharray="3 3"
                    />
                  )}
                  {hoverInfo.rows.map(({ s, p }) => (
                    <circle
                      key={s.id}
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={4.5}
                      style={{ fill: s.color, stroke: "var(--panel)" }}
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}

              <rect
                x={mLeft}
                y={top}
                width={plotW}
                height={innerH}
                fill="transparent"
                onPointerMove={onMove}
                onPointerDown={onMove}
                onPointerLeave={() => setHover(null)}
                style={{ touchAction: "pan-y" }}
              />
            </svg>
          )}

          {/* axis titles (HTML so the units explain themselves on hover) */}
          {width > 0 && (
            <>
              <div
                className="absolute whitespace-nowrap text-[11px] font-medium leading-[14px] text-ink-2"
                style={{ right: Math.max(0, width - (mLeft + plotW)), top: (xTop ? top - 24 : top + innerH + 33) - 11 }}
              >
                <LabelWithUnit label={xLabel} unit={xUnit} />
              </div>
              <div
                className="absolute whitespace-nowrap text-[11px] font-medium leading-[14px] text-ink-2"
                style={{ left: 4, top: (xTop ? top - 24 : top - 10) - 11 }}
              >
                <LabelWithUnit label={yLabel} unit={yUnit} />
              </div>
            </>
          )}

          {hoverInfo && hover && width > 0 && (
            <Tooltip
              x={independent === "x" ? sx(hoverInfo.snap) : hover.px}
              y={independent === "y" ? sy(hoverInfo.snap) : hover.py}
              containerW={width}
              containerH={height}
            >
              <div className="mb-1 flex items-baseline justify-between gap-4 border-b border-line pb-1 text-[11px] text-ink-3">
                <span>{indLabel}</span>
                <span className="num text-ink">
                  {fmt(hoverInfo.snap, indDigits)}
                  {indUnit ? <span className="ml-0.5 text-ink-3">{indUnit}</span> : null}
                </span>
              </div>
              {hoverInfo.rows.map(({ s, p }) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-[1px] text-[12px]">
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="num font-medium text-ink">
                    {fmt(independent === "x" ? p.y : p.x, s.digits ?? valueDigits)}
                    {(s.unit ?? depLabelUnit) && (
                      <span className="ml-0.5 font-normal text-ink-3">{s.unit ?? depLabelUnit}</span>
                    )}
                  </span>
                </div>
              ))}
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

function Tooltip({
  x,
  y,
  containerW,
  containerH,
  children,
}: {
  x: number;
  y: number;
  containerW: number;
  containerH: number;
  children: ReactNode;
}) {
  const W = 200;
  const left = x + 14 + W > containerW ? Math.max(0, x - 14 - W) : x + 14;
  const topPos = Math.min(Math.max(0, y - 30), Math.max(0, containerH - 90));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-panel/95 px-2.5 py-2 shadow-xl backdrop-blur"
      style={{ left, top: topPos, width: W }}
    >
      {children}
    </div>
  );
}
