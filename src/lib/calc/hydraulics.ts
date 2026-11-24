/*
 * Drilling hydraulics - API RP 13D power-law model (field units).
 * Pipe: n, K from R600/R300. Annulus: n, K from R100/R3.
 */

export type Rheology = { r600: number; r300: number; r200: number; r100: number; r6: number; r3: number };

export type FlowSection = {
  name: string;
  kind: "pipe" | "annulus";
  length: number; // ft
  d: number; // pipe ID (in) or hole/casing ID (in)
  od?: number; // pipe OD (in) for annulus
};

export type SectionLoss = {
  name: string;
  kind: "pipe" | "annulus";
  length: number;
  velocity: number; // ft/min
  reynolds: number;
  regime: "Laminar" | "Transitional" | "Turbulent";
  dp: number; // psi
  gradient: number; // psi/ft
};

export const SURFACE_CASES = [
  { value: "1", label: "Case 1 · short standpipe / small hose", E: 2.5e-4 },
  { value: "2", label: "Case 2 · typical land rig", E: 9.6e-5 },
  { value: "3", label: "Case 3 · large rig", E: 5.3e-5 },
  { value: "4", label: "Case 4 · large top-drive rig", E: 4.2e-5 },
] as const;

export function pv(r: Rheology) {
  return r.r600 - r.r300;
}
export function yp(r: Rheology) {
  return r.r300 - pv(r);
}

function friction(re: number, n: number, laminarConst: number) {
  const a = (Math.log10(n) + 3.93) / 50;
  const b = (1.75 - Math.log10(n)) / 7;
  const fl = laminarConst / re;
  const ft = a / Math.pow(re, b);
  const reL = 3470 - 1370 * n;
  const reT = 4270 - 1370 * n;
  if (re <= reL) return { f: fl, regime: "Laminar" as const };
  if (re >= reT) return { f: ft, regime: "Turbulent" as const };
  // transitional: interpolate between laminar at ReL and turbulent at ReT
  const flL = laminarConst / reL;
  const ftT = a / Math.pow(reT, b);
  const t = (re - reL) / (reT - reL);
  return { f: flL + (ftT - flL) * t, regime: "Transitional" as const };
}

export function pipeLoss(q: number, mw: number, rh: Rheology, sec: FlowSection): SectionLoss {
  const n = 3.32 * Math.log10(rh.r600 / rh.r300);
  const K = (5.11 * rh.r600) / Math.pow(1022, n);
  const D = sec.d;
  const V = (0.408 * q) / (D * D); // ft/s
  const mu = 100 * K * Math.pow((96 * V) / D, n - 1) * Math.pow((3 * n + 1) / (4 * n), n);
  const re = (928 * D * V * mw) / mu;
  const { f, regime } = friction(re, n, 16);
  const grad = (f * V * V * mw) / (25.81 * D);
  return {
    name: sec.name,
    kind: "pipe",
    length: sec.length,
    velocity: V * 60,
    reynolds: re,
    regime,
    dp: grad * sec.length,
    gradient: grad,
  };
}

export function annulusLoss(q: number, mw: number, rh: Rheology, sec: FlowSection): SectionLoss {
  const n = 0.657 * Math.log10(rh.r100 / Math.max(0.1, rh.r3));
  const K = (5.11 * rh.r100) / Math.pow(170.2, n);
  const D2 = sec.d;
  const D1 = sec.od ?? 0;
  const dh = D2 - D1;
  const V = (0.408 * q) / (D2 * D2 - D1 * D1);
  const mu = 100 * K * Math.pow((144 * V) / dh, n - 1) * Math.pow((2 * n + 1) / (3 * n), n);
  const re = (928 * dh * V * mw) / mu;
  const { f, regime } = friction(re, n, 24);
  const grad = (f * V * V * mw) / (25.81 * dh);
  return {
    name: sec.name,
    kind: "annulus",
    length: sec.length,
    velocity: V * 60,
    reynolds: re,
    regime,
    dp: grad * sec.length,
    gradient: grad,
  };
}

export function surfaceLoss(q: number, mw: number, pvCp: number, E: number) {
  return E * Math.pow(mw, 0.8) * Math.pow(q, 1.8) * Math.pow(Math.max(1, pvCp), 0.2);
}

export function tfa(nozzles32: number[]) {
  return nozzles32.reduce((s, n) => s + (Math.PI / 4) * Math.pow(n / 32, 2), 0);
}

export function bitHydraulics(q: number, mw: number, area: number, bitSize: number) {
  const dp = (q * q * mw) / (12031 * area * area);
  const vn = (0.3208 * q) / area; // ft/s
  const hhp = (dp * q) / 1714;
  const hsi = hhp / ((Math.PI / 4) * bitSize * bitSize);
  const impact = (mw * vn * q) / 1932; // lbf
  return { dp, vn, hhp, hsi, impact };
}

export type HydraulicsInput = {
  q: number;
  mw: number;
  rheology: Rheology;
  surfaceE: number;
  depth: number; // MD
  tvd: number;
  casingShoe: number;
  casingId: number;
  holeSize: number;
  string: { name: string; od: number; id_: number; length: number }[]; // top to bottom
  nozzles: number[];
  motorDp?: number;
};

/** Build the flow path from the string and hole geometry (string listed top to bottom). */
export function buildSections(inp: Pick<HydraulicsInput, "depth" | "casingShoe" | "casingId" | "holeSize" | "string">) {
  const pipes: FlowSection[] = [];
  const ann: FlowSection[] = [];
  let top = 0;
  // fit string to depth: top component (DP) absorbs length difference
  const bottomLen = inp.string.slice(1).reduce((s, c) => s + c.length, 0);
  const comps = inp.string.map((c, i) => ({ ...c, length: i === 0 ? Math.max(0, inp.depth - bottomLen) : c.length }));
  for (const c of comps) {
    if (c.length <= 0) continue;
    const bottom = Math.min(inp.depth, top + c.length);
    const L = bottom - top;
    if (L <= 0) break;
    pipes.push({ name: c.name, kind: "pipe", length: L, d: c.id_ });
    const cased = Math.max(0, Math.min(bottom, inp.casingShoe) - top);
    const open = L - cased;
    if (cased > 0) ann.push({ name: `${c.name} × casing`, kind: "annulus", length: cased, d: inp.casingId, od: c.od });
    if (open > 0) ann.push({ name: `${c.name} × open hole`, kind: "annulus", length: open, d: inp.holeSize, od: c.od });
    top = bottom;
  }
  return { pipes, ann };
}

export function computeHydraulics(inp: HydraulicsInput) {
  const { pipes, ann } = buildSections(inp);
  const pvCp = pv(inp.rheology);
  const surf = surfaceLoss(inp.q, inp.mw, pvCp, inp.surfaceE);
  const pipeLosses = pipes.map((s) => pipeLoss(inp.q, inp.mw, inp.rheology, s));
  const annLosses = ann.map((s) => annulusLoss(inp.q, inp.mw, inp.rheology, s));
  const area = tfa(inp.nozzles);
  const bit = bitHydraulics(inp.q, inp.mw, area, inp.holeSize);
  const sumPipe = pipeLosses.reduce((s, l) => s + l.dp, 0);
  const sumAnn = annLosses.reduce((s, l) => s + l.dp, 0);
  const motor = inp.motorDp ?? 0;
  const total = surf + sumPipe + sumAnn + bit.dp + motor;
  const ecd = inp.mw + sumAnn / (0.052 * Math.max(1, inp.tvd));
  return {
    surface: surf,
    pipeLosses,
    annLosses,
    sumPipe,
    sumAnn,
    motor,
    bit,
    tfa: area,
    total,
    parasitic: total - bit.dp,
    ecd,
    bitPct: (bit.dp / total) * 100,
  };
}

/** Sweep flow rate with fixed nozzles to build the optimization curves. */
export function sweepFlow(inp: HydraulicsInput, qMin: number, qMax: number, steps = 40) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const q = qMin + ((qMax - qMin) * i) / steps;
    const r = computeHydraulics({ ...inp, q });
    out.push({ q, total: r.total, parasitic: r.parasitic, bit: r.bit.dp, hhp: r.bit.hhp, impact: r.bit.impact, ecd: r.ecd });
  }
  return out;
}

/**
 * Optimum nozzle area at a given flow rate for a pump pressure limit.
 * Criterion: max bit HHP -> Pd = Pmax/(m+1); max impact -> Pd = 2 Pmax/(m+2).
 * m is the parasitic-loss flow exponent fitted from two flow rates.
 */
export type NozzlePlan = {
  q: number;
  limited: boolean;
  parasitic: number;
  bitDp: number;
  area: number;
  hhp: number;
  hsi: number;
  impact: number;
  nozzle32: number;
};

export function optimizeNozzles(inp: HydraulicsInput, pMax: number, qMin: number, qMax: number) {
  const q1 = inp.q * 0.8;
  const q2 = inp.q * 1.2;
  const p1 = computeHydraulics({ ...inp, q: q1 }).parasitic;
  const p2 = computeHydraulics({ ...inp, q: q2 }).parasitic;
  const m = Math.log(p2 / p1) / Math.log(q2 / q1);
  const pdNow = computeHydraulics(inp).parasitic;

  const plan = (pdTarget: number): NozzlePlan | null => {
    const qRaw = inp.q * Math.pow(pdTarget / pdNow, 1 / m);
    const q = Math.min(qMax, Math.max(qMin, qRaw));
    const pd = computeHydraulics({ ...inp, q }).parasitic;
    const bitDp = pMax - pd;
    if (!(bitDp > 0)) return null;
    const area = Math.sqrt((q * q * inp.mw) / (12031 * bitDp));
    const b = bitHydraulics(q, inp.mw, area, inp.holeSize);
    const nozzle32 = Math.sqrt(area / 3 / (Math.PI / 4)) * 32; // three equal jets
    return { q, limited: Math.abs(q - qRaw) > 0.5, parasitic: pd, bitDp, area, hhp: b.hhp, hsi: b.hsi, impact: b.impact, nozzle32 };
  };

  return {
    m,
    parasiticNow: pdNow,
    hhp: plan(pMax / (m + 1)),
    impact: plan((2 * pMax) / (m + 2)),
  };
}

export const DEFAULT_RHEOLOGY: Rheology = { r600: 58, r300: 38, r200: 30, r100: 21, r6: 8, r3: 6 };
