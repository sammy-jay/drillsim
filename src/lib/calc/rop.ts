/* Bourgoyne & Young (1974) penetration-rate model with simplified bit-wear economics. */

export type Formation = {
  id: string;
  name: string;
  a1: number;
  a5: number;
  a6: number;
  abrasiveness: number; // tooth life at reference conditions, hours
  bitMu: number; // bit-specific friction coefficient (torque)
};

export const FORMATIONS: Formation[] = [
  { id: "soft-shale", name: "Soft shale", a1: 4.0, a5: 1.1, a6: 0.75, abrasiveness: 55, bitMu: 0.28 },
  { id: "sandstone", name: "Medium sandstone", a1: 3.5, a5: 1.0, a6: 0.6, abrasiveness: 32, bitMu: 0.24 },
  { id: "limestone", name: "Hard limestone", a1: 2.8, a5: 0.85, a6: 0.5, abrasiveness: 45, bitMu: 0.2 },
  { id: "dolomite", name: "Abrasive dolomite", a1: 2.4, a5: 0.8, a6: 0.45, abrasiveness: 18, bitMu: 0.18 },
];

export type RopInput = {
  depth: number;
  pp: number; // pore pressure, ppg
  ecd: number; // ppg
  wob: number; // klbf
  rpm: number;
  bitSize: number;
  wear: number; // 0..1 fractional tooth wear
  q: number; // gpm
  mw: number;
  tfa: number; // in2
  formation: Formation;
  a2: number;
  a3: number;
  a4: number;
  a7: number;
  a8: number;
  threshold: number; // W/d threshold, klbf/in
};

export function jetImpact(q: number, mw: number, tfa: number) {
  const vn = (0.3208 * q) / Math.max(0.01, tfa);
  return (mw * vn * q) / 1932;
}

export function byTerms(i: RopInput) {
  const D = i.depth;
  const wd = i.wob / i.bitSize;
  const fj = jetImpact(i.q, i.mw, i.tfa);
  const x = {
    x2: 10000 - D,
    x3: Math.pow(D, 0.69) * (i.pp - 9),
    x4: D * (i.pp - i.ecd),
    x5: Math.log(Math.max(1e-3, (wd - i.threshold) / (4 - i.threshold))),
    x6: Math.log(Math.max(1e-3, i.rpm / 60)),
    x7: -i.wear,
    x8: Math.log(Math.max(1e-3, fj / 1000)),
  };
  const f = i.formation;
  const contrib = {
    formation: f.a1,
    compaction: i.a2 * x.x2,
    porePressure: i.a3 * x.x3,
    differential: i.a4 * x.x4,
    wob: f.a5 * x.x5,
    rpm: f.a6 * x.x6,
    wear: i.a7 * x.x7,
    hydraulics: i.a8 * x.x8,
  };
  return { x, contrib, fj, wd };
}

export function byRop(i: RopInput) {
  if (i.wob / i.bitSize <= i.threshold || i.rpm <= 0) return 0;
  const { contrib } = byTerms(i);
  const s = Object.values(contrib).reduce((a, b) => a + b, 0);
  return Math.exp(s);
}

export type Economics = {
  bitCost: number;
  rigRate: number; // $/hr
  tripRate: number; // hours per 1000 ft (round trip)
  wdMax: number; // klbf/in at which teeth fail instantly
  h1: number; // rpm wear exponent
  bearingLife: number; // hours at 100 rpm & 4 klbf/in
};

export function bitRun(i: RopInput, e: Economics) {
  const wd = i.wob / i.bitSize;
  const rop0 = byRop({ ...i, wear: 0 });
  if (rop0 <= 0 || wd >= e.wdMax) return { rop0, toothLife: 0, bearingLife: 0, hours: 0, footage: 0, costPerFt: Infinity, limitedBy: "—" as const, finalWear: 0 };
  const toothLife = i.formation.abrasiveness * Math.pow(60 / i.rpm, e.h1) * ((e.wdMax - wd) / (e.wdMax - 4));
  const bearingLife = e.bearingLife * (100 / i.rpm) * Math.pow(4 / wd, 1.5);
  const hours = Math.min(toothLife, bearingLife);
  const a7 = Math.max(1e-6, i.a7);
  const footage = ((rop0 * toothLife) / a7) * (1 - Math.exp((-a7 * hours) / toothLife));
  const trip = (i.depth / 1000) * e.tripRate;
  const costPerFt = (e.bitCost + e.rigRate * (hours + trip)) / Math.max(1e-6, footage);
  return {
    rop0,
    toothLife,
    bearingLife,
    hours,
    footage,
    costPerFt,
    limitedBy: toothLife <= bearingLife ? ("Teeth" as const) : ("Bearings" as const),
    finalWear: hours / toothLife,
  };
}

/** Mechanical specific energy (Teale), psi. */
export function mse(wobKlbf: number, rpm: number, torqueFtLbf: number, rop: number, bitSize: number) {
  const A = (Math.PI / 4) * bitSize * bitSize;
  const W = wobKlbf * 1000;
  if (rop <= 0) return Infinity;
  return W / A + (120 * Math.PI * rpm * torqueFtLbf) / (A * rop);
}

export function bitTorque(wobKlbf: number, bitSize: number, mu: number) {
  return (mu * wobKlbf * 1000 * bitSize) / 36; // ft-lbf
}
