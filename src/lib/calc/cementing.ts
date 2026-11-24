import { annularCapacity, capacity } from "./common";

export type CementInput = {
  shoe: number; // ft
  casingOd: number;
  casingId: number;
  holeSize: number;
  excess: number; // fraction, open hole
  prevShoe: number;
  prevId: number;
  leadTop: number; // ft
  tailLength: number; // ft above shoe
  shoeTrack: number; // ft
  ratHole: number; // ft
  mudWeight: number;
  spacerVol: number;
  spacerWeight: number;
  leadWeight: number;
  leadYield: number; // ft3/sk
  leadWater: number; // gal/sk
  tailWeight: number;
  tailYield: number;
  tailWater: number;
  dispWeight: number;
  lineVol: number; // bbl
  rate: number; // bpm
  pumpOutput: number; // bbl/stk
  thickening: number; // min
  bumpMargin: number; // psi
};

export const FT3_PER_BBL = 5.6146;

export type Fluid = "mud" | "spacer" | "lead" | "tail" | "disp";

export function cementVolumes(c: CementInput) {
  const ohCap = annularCapacity(c.holeSize, c.casingOd) * (1 + c.excess);
  const csgAnnCap = annularCapacity(c.prevId, c.casingOd);
  const insideCap = capacity(c.casingId);

  const annVol = (top: number, bottom: number) => {
    let v = 0;
    const csgHi = Math.min(bottom, c.prevShoe);
    if (csgHi > top) v += (csgHi - top) * csgAnnCap;
    const ohLo = Math.max(top, c.prevShoe);
    if (bottom > ohLo) v += (bottom - ohLo) * ohCap;
    return v;
  };

  const tailTop = Math.max(0, c.shoe - c.tailLength);
  const leadTop = Math.min(c.leadTop, tailTop);
  const ratHoleVol = capacity(c.holeSize) * c.ratHole * (1 + c.excess);
  const shoeTrackVol = insideCap * c.shoeTrack;
  const tailAnn = annVol(tailTop, c.shoe);
  const leadVol = annVol(leadTop, tailTop);
  const tailVol = tailAnn + shoeTrackVol + ratHoleVol;
  const leadSacks = (leadVol * FT3_PER_BBL) / c.leadYield;
  const tailSacks = (tailVol * FT3_PER_BBL) / c.tailYield;
  const leadWater = (leadSacks * c.leadWater) / 42;
  const tailWater = (tailSacks * c.tailWater) / 42;
  const dispVol = insideCap * (c.shoe - c.shoeTrack) + c.lineVol;
  const dispStrokes = dispVol / c.pumpOutput;

  // hydrostatics at plug bump (static)
  const spacerTop = Math.max(0, depthAboveAnn(c, leadTop, c.spacerVol, csgAnnCap, ohCap));
  const annHydro =
    0.052 *
    (c.mudWeight * spacerTop +
      c.spacerWeight * (leadTop - spacerTop) +
      c.leadWeight * (tailTop - leadTop) +
      c.tailWeight * (c.shoe - tailTop));
  const insideHydro = 0.052 * (c.dispWeight * (c.shoe - c.shoeTrack) + c.tailWeight * c.shoeTrack);
  const differential = annHydro - insideHydro;
  const bumpPressure = Math.max(0, differential) + c.bumpMargin;

  const pumpMinutes = (c.spacerVol + leadVol + tailVol + dispVol) / c.rate;
  const jobMinutes = pumpMinutes + 10; // plug drop & line-up
  const cementOnBottomMinutes = (leadVol + tailVol + dispVol) / c.rate + 10;

  return {
    ohCap,
    csgAnnCap,
    insideCap,
    tailTop,
    leadTop,
    leadVol,
    tailVol,
    tailAnn,
    ratHoleVol,
    shoeTrackVol,
    leadSacks,
    tailSacks,
    leadWater,
    tailWater,
    dispVol,
    dispStrokes,
    annHydro,
    insideHydro,
    differential,
    bumpPressure,
    pumpMinutes,
    jobMinutes,
    cementOnBottomMinutes,
    spacerTop,
    annVol,
  };
}

function depthAboveAnn(c: CementInput, bottom: number, vol: number, csgCap: number, ohCap: number) {
  let remaining = vol;
  let z = bottom;
  if (z > c.prevShoe) {
    const avail = (z - c.prevShoe) * ohCap;
    if (remaining <= avail) return z - remaining / ohCap;
    remaining -= avail;
    z = c.prevShoe;
  }
  return z - remaining / csgCap;
}

export type CementCell = { top: number; bottom: number; fluid: Fluid; side: "in" | "ann" };

/**
 * Track the fluid train through the casing and up the annulus.
 * Path coordinate s (bbl) runs down the casing then up the annulus.
 */
export function cementTrain(c: CementInput) {
  const v = cementVolumes(c);
  const NC = 160;
  const inside: { top: number; bottom: number; s0: number; s1: number }[] = [];
  const ann: { top: number; bottom: number; s0: number; s1: number }[] = [];
  let s = 0;
  for (let i = 0; i < NC; i++) {
    const top = (c.shoe * i) / NC;
    const bottom = (c.shoe * (i + 1)) / NC;
    const vol = (bottom - top) * v.insideCap;
    inside.push({ top, bottom, s0: s, s1: s + vol });
    s += vol;
  }
  for (let i = NC - 1; i >= 0; i--) {
    const top = (c.shoe * i) / NC;
    const bottom = (c.shoe * (i + 1)) / NC;
    const vol = v.annVol(top, bottom);
    ann.push({ top, bottom, s0: s, s1: s + vol });
    s += vol;
  }
  const sched = [
    { fluid: "spacer" as Fluid, vol: c.spacerVol },
    { fluid: "lead" as Fluid, vol: v.leadVol },
    { fluid: "tail" as Fluid, vol: v.tailVol - v.ratHoleVol },
    { fluid: "disp" as Fluid, vol: v.dispVol - c.lineVol },
  ];
  const total = sched.reduce((a, b) => a + b.vol, 0);
  const fluidAt = (cum: number): Fluid => {
    if (cum < 0) return "mud";
    let acc = 0;
    for (const f of sched) {
      acc += f.vol;
      if (cum < acc) return f.fluid;
    }
    return "disp";
  };
  const density: Record<Fluid, number> = {
    mud: c.mudWeight,
    spacer: c.spacerWeight,
    lead: c.leadWeight,
    tail: c.tailWeight,
    disp: c.dispWeight,
  };

  const stateAt = (pumped: number) => {
    let hin = 0,
      hann = 0;
    const cells: CementCell[] = [];
    for (const cell of inside) {
      const f = fluidAt(pumped - (cell.s0 + cell.s1) / 2);
      hin += 0.052 * density[f] * (cell.bottom - cell.top);
      cells.push({ top: cell.top, bottom: cell.bottom, fluid: f, side: "in" });
    }
    for (const cell of ann) {
      const f = fluidAt(pumped - (cell.s0 + cell.s1) / 2);
      hann += 0.052 * density[f] * (cell.bottom - cell.top);
      cells.push({ top: cell.top, bottom: cell.bottom, fluid: f, side: "ann" });
    }
    return { hin, hann, diff: hann - hin, cells };
  };

  const curve = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const p = (total * i) / N;
    const st = stateAt(p);
    curve.push({ vol: p, pressure: Math.max(0, st.diff), diff: st.diff, hin: st.hin, hann: st.hann });
  }

  const stages = sched.reduce<{ fluid: Fluid; start: number; end: number }[]>((acc, f) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    acc.push({ fluid: f.fluid, start, end: start + f.vol });
    return acc;
  }, []);

  return { total, curve, stateAt, stages };
}
