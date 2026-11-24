import { minimumCurvature } from "./trajectory";

export type PlotRow = { md: string; inc: string; azi: string; tvd: string; vs: string; ns: string; ew: string };
export const PLOT_COLS: (keyof PlotRow)[] = ["md", "inc", "azi", "tvd", "vs", "ns", "ew"];

const n = (s: string) => {
  if (s === undefined || s === null) return NaN;
  const t = String(s).trim();
  if (t === "") return NaN;
  const v = Number(t.replace(/,/g, ""));
  return Number.isFinite(v) ? v : NaN;
};

/* ------------------------------------------------------------------ */
/* Paste / CSV import                                                  */
/* ------------------------------------------------------------------ */
function headerKey(h: string): keyof PlotRow | null {
  const s = h.toLowerCase().replace(/[^a-z/+\-]/g, "");
  if (/tvdss|subsea/.test(s)) return null;
  if (/tvd|truevert/.test(s)) return "tvd";
  if (/^(vs|vsec|vertsec|verticalsection|section|v\.?s)/.test(s) || s.includes("vsec") || s.includes("verticalsection")) return "vs";
  if (/^(md|measured|depth|mdepth)/.test(s) || s === "md") return "md";
  if (/^inc|incl|incli|angle/.test(s)) return "inc";
  if (/^az|azi|azim|direction|bearing/.test(s)) return "azi";
  if (/^(ns|n\/s|\+n\/-s|north|northing|n-s|lat)/.test(s) || s === "n") return "ns";
  if (/^(ew|e\/w|\+e\/-w|east|easting|e-w|dep)/.test(s) || s === "e") return "ew";
  return null;
}

export function parseSurveyText(text: string): { rows: PlotRow[]; mapped: (keyof PlotRow | null)[]; skipped: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], mapped: [], skipped: 0 };
  const delim = lines.some((l) => l.includes("\t")) ? /\t/ : lines.some((l) => /;/.test(l)) ? /;/ : lines.some((l) => /,\s*\S/.test(l) && !/\d,\d{3}\b/.test(l)) ? /,/ : /\s+/;
  const split = (l: string) => l.split(delim).map((c) => c.trim());

  let mapped: (keyof PlotRow | null)[] = PLOT_COLS;
  let start = 0;
  const first = split(lines[0]);
  if (first.some((c) => /[a-z]/i.test(c) && !Number.isFinite(n(c)))) {
    mapped = first.map(headerKey);
    start = 1;
    // skip a units row such as "ft  deg  deg"
    if (lines[1] && split(lines[1]).every((c) => !Number.isFinite(n(c)))) start = 2;
  }
  const rows: PlotRow[] = [];
  let skipped = 0;
  for (let i = start; i < lines.length; i++) {
    const cells = split(lines[i]);
    const r: PlotRow = { md: "", inc: "", azi: "", tvd: "", vs: "", ns: "", ew: "" };
    cells.forEach((c, j) => {
      const k = mapped[j];
      if (k && Number.isFinite(n(c))) r[k] = String(n(c));
    });
    if (r.md === "") skipped++;
    else rows.push(r);
  }
  return { rows, mapped, skipped };
}

/* ------------------------------------------------------------------ */
/* Computation with QC against entered values                          */
/* ------------------------------------------------------------------ */
export type PlotStation = {
  md: number;
  inc: number;
  azi: number;
  tvd: number;
  ns: number;
  ew: number;
  vs: number;
  dls: number;
  build: number;
  turn: number;
  closure: number;
  closureAzi: number;
  computed: boolean;
  qc: string[];
};

export function computePlot(rows: PlotRow[], vsAz: number, useGiven: boolean): PlotStation[] {
  const parsed = rows
    .map((r) => ({ md: n(r.md), inc: n(r.inc), azi: n(r.azi), tvd: n(r.tvd), vs: n(r.vs), ns: n(r.ns), ew: n(r.ew) }))
    .filter((r) => Number.isFinite(r.md))
    .sort((a, b) => a.md - b.md);

  const mc = parsed.filter((r) => Number.isFinite(r.inc) && Number.isFinite(r.azi));
  const st = mc.length ? minimumCurvature(mc.map((r) => ({ md: r.md, inc: r.inc, azi: ((r.azi % 360) + 360) % 360 })), vsAz) : [];
  // tie-in offsets from the first station's entered values
  const t0 = mc[0];
  const off = {
    tvd: t0 && Number.isFinite(t0.tvd) && st[0] ? t0.tvd - st[0].tvd : 0,
    ns: t0 && Number.isFinite(t0.ns) && st[0] ? t0.ns - st[0].north : 0,
    ew: t0 && Number.isFinite(t0.ew) && st[0] ? t0.ew - st[0].east : 0,
  };
  const a = (vsAz * Math.PI) / 180;

  let k = 0;
  return parsed.map((r) => {
    const hasMc = Number.isFinite(r.inc) && Number.isFinite(r.azi);
    const c = hasMc ? st[k++] : undefined;
    const cTvd = c ? c.tvd + off.tvd : NaN;
    const cNs = c ? c.north + off.ns : NaN;
    const cEw = c ? c.east + off.ew : NaN;
    const pick = (given: number, comp: number) => (useGiven && Number.isFinite(given)) || !Number.isFinite(comp) ? given : comp;
    const tvd = pick(r.tvd, cTvd);
    const ns = pick(r.ns, cNs);
    const ew = pick(r.ew, cEw);
    const cVs = Number.isFinite(ns) && Number.isFinite(ew) ? ns * Math.cos(a) + ew * Math.sin(a) : NaN;
    const vs = pick(r.vs, cVs);
    const qc: string[] = [];
    const tol = (x: number) => Math.max(1, Math.abs(x) * 0.002);
    if (c) {
      if (Number.isFinite(r.tvd) && Math.abs(r.tvd - cTvd) > tol(r.md)) qc.push(`TVD differs by ${(r.tvd - cTvd).toFixed(1)} ft`);
      if (Number.isFinite(r.ns) && Math.abs(r.ns - cNs) > tol(r.md)) qc.push(`N/S differs by ${(r.ns - cNs).toFixed(1)} ft`);
      if (Number.isFinite(r.ew) && Math.abs(r.ew - cEw) > tol(r.md)) qc.push(`E/W differs by ${(r.ew - cEw).toFixed(1)} ft`);
      if (Number.isFinite(r.vs) && Number.isFinite(cVs) && Math.abs(r.vs - cVs) > tol(r.md)) qc.push(`VS differs by ${(r.vs - cVs).toFixed(1)} ft`);
    }
    let cAzi = (Math.atan2(ew, ns) * 180) / Math.PI;
    if (cAzi < 0) cAzi += 360;
    return {
      md: r.md,
      inc: Number.isFinite(r.inc) ? r.inc : NaN,
      azi: Number.isFinite(r.azi) ? r.azi : NaN,
      tvd,
      ns,
      ew,
      vs,
      dls: c ? c.dls : NaN,
      build: c ? c.build : NaN,
      turn: c ? c.turn : NaN,
      closure: Math.hypot(ns, ew),
      closureAzi: cAzi,
      computed: !!c,
      qc,
    };
  });
}

/** Interpolate (vs, tvd, ns, ew) at a measured depth along computed stations. */
export function pointAtMd(st: PlotStation[], md: number) {
  const v = st.filter((s) => Number.isFinite(s.tvd) && Number.isFinite(s.vs));
  if (v.length === 0) return null;
  if (md <= v[0].md) return { vs: v[0].vs, tvd: (v[0].tvd * md) / Math.max(1, v[0].md), ns: v[0].ns, ew: v[0].ew };
  for (let i = 1; i < v.length; i++) {
    if (md <= v[i].md) {
      const t = (md - v[i - 1].md) / Math.max(1e-6, v[i].md - v[i - 1].md);
      const L = (x: number, y: number) => x + (y - x) * t;
      return { vs: L(v[i - 1].vs, v[i].vs), tvd: L(v[i - 1].tvd, v[i].tvd), ns: L(v[i - 1].ns, v[i].ns), ew: L(v[i - 1].ew, v[i].ew) };
    }
  }
  const l = v[v.length - 1];
  return { vs: l.vs, tvd: l.tvd, ns: l.ns, ew: l.ew };
}

export function toCsv(st: PlotStation[], elevation: number) {
  const head = ["MD_ft", "Inc_deg", "Azi_deg", "TVD_ft", "TVDSS_ft", "NS_ft", "EW_ft", "VS_ft", "DLS_deg100ft", "Closure_ft", "ClosureAzi_deg"];
  const f = (x: number, d: number) => (Number.isFinite(x) ? x.toFixed(d) : "");
  const lines = st.map((s) =>
    [f(s.md, 2), f(s.inc, 2), f(s.azi, 2), f(s.tvd, 2), f(s.tvd - elevation, 2), f(s.ns, 2), f(s.ew, 2), f(s.vs, 2), f(s.dls, 2), f(s.closure, 2), f(s.closureAzi, 2)].join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
