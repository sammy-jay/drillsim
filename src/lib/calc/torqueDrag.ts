import { buoyancyFactor, rad } from "./common";
import { interpolateAt, type Station } from "./trajectory";

export type TDComponent = {
  name: string;
  od: number;
  id_: number;
  tjOd: number; // tool-joint OD for torque radius / clearance
  weight: number; // lb/ft in air
  length: number;
};

export type TDInput = {
  stations: Station[];
  string: TDComponent[]; // top to bottom; top component length auto-fills
  bitDepth: number;
  mw: number;
  ffCased: number;
  ffOpen: number;
  shoe: number;
  holeSize: number;
  casingId: number;
  wob: number; // klbf
  bitTorque: number; // kft-lbf
  blockWeight: number; // klbf
};

export type TDMode = "pu" | "so" | "rob" | "drill" | "slide";

export type TDNode = {
  md: number;
  tvd: number;
  inc: number;
  force: number; // klbf, + tension
  torque: number; // kft-lbf
  normal: number; // lbf/ft side force
  sinusoidal: number; // klbf (critical compression, positive number)
  helical: number;
  component: string;
};

const E = 30e6;

function layout(inp: TDInput) {
  const below = inp.string.slice(1).reduce((s, c) => s + c.length, 0);
  const comps = inp.string.map((c, i) => ({ ...c, length: i === 0 ? Math.max(0, inp.bitDepth - below) : c.length }));
  // from bit upward
  const segs: { from: number; to: number; c: TDComponent }[] = [];
  let bottom = inp.bitDepth;
  for (let i = comps.length - 1; i >= 0 && bottom > 0; i--) {
    const top = Math.max(0, bottom - comps[i].length);
    if (bottom > top) segs.push({ from: bottom, to: top, c: comps[i] });
    bottom = top;
  }
  return segs;
}

export function runTD(inp: TDInput, mode: TDMode, step = 30): TDNode[] {
  const bf = buoyancyFactor(inp.mw);
  const segs = layout(inp);
  const nodes: TDNode[] = [];
  let F = mode === "drill" || mode === "slide" ? -inp.wob * 1000 : 0;
  let T = mode === "drill" ? inp.bitTorque * 1000 : 0;
  const rotating = mode === "rob" || mode === "drill";

  const first = interpolateAt(inp.stations, inp.bitDepth);
  nodes.push({
    md: inp.bitDepth,
    tvd: first.tvd,
    inc: first.inc,
    force: F / 1000,
    torque: T / 1000,
    normal: 0,
    sinusoidal: 0,
    helical: 0,
    component: segs[0]?.c.name ?? "",
  });

  for (const s of segs) {
    const c = s.c;
    const w = c.weight * bf; // lb/ft
    const r = c.tjOd / 2 / 12; // ft
    let md = s.from;
    while (md > s.to + 1e-6) {
      const up = Math.max(s.to, md - step);
      const dL = md - up;
      const lo = interpolateAt(inp.stations, md);
      const hi = interpolateAt(inp.stations, up);
      const iAvg = rad((lo.inc + hi.inc) / 2);
      const dI = rad(hi.inc - lo.inc);
      let dAz = hi.azi - lo.azi;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;
      const dA = rad(dAz);
      const W = w * dL;
      const N = Math.sqrt(Math.pow(F * dA * Math.sin(iAvg), 2) + Math.pow(F * dI + W * Math.sin(iAvg), 2));
      const mu = (md + up) / 2 <= inp.shoe ? inp.ffCased : inp.ffOpen;
      const axial = W * Math.cos(iAvg);
      if (mode === "pu") F = F + axial + mu * N;
      else if (mode === "so" || mode === "slide") F = F + axial - mu * N;
      else F = F + axial;
      if (rotating) T = T + mu * N * r;

      const hole = (md + up) / 2 <= inp.shoe ? inp.casingId : inp.holeSize;
      const rc = Math.max(0.05, (hole - c.tjOd) / 2); // in
      const I = (Math.PI / 64) * (Math.pow(c.od, 4) - Math.pow(c.id_, 4));
      const wIn = w / 12;
      const sinI = Math.max(0.0175, Math.sin(iAvg));
      const fsin = 2 * Math.sqrt((E * I * wIn * sinI) / rc);
      nodes.push({
        md: up,
        tvd: hi.tvd,
        inc: hi.inc,
        force: F / 1000,
        torque: T / 1000,
        normal: N / Math.max(1, dL),
        sinusoidal: fsin / 1000,
        helical: (Math.SQRT2 * fsin) / 1000,
        component: c.name,
      });
      md = up;
    }
  }
  return nodes;
}

export function surfaceLoads(inp: TDInput) {
  const pick = (m: TDMode) => {
    const n = runTD(inp, m);
    const top = n[n.length - 1];
    return { hookload: (top?.force ?? 0) + inp.blockWeight, torque: top?.torque ?? 0, nodes: n };
  };
  return { pu: pick("pu"), so: pick("so"), rob: pick("rob"), drill: pick("drill"), slide: pick("slide") };
}

export function broomstick(inp: TDInput, ffs: number[], points = 28) {
  const start = Math.max(500, Math.min(inp.bitDepth, 1000));
  const depths = Array.from({ length: points + 1 }, (_, i) => start + ((inp.bitDepth - start) * i) / points);
  const rob = depths.map((d) => {
    const n = runTD({ ...inp, bitDepth: d }, "rob", 60);
    return { x: n[n.length - 1].force + inp.blockWeight, y: d };
  });
  const lines = ffs.map((ff) => ({
    ff,
    pu: depths.map((d) => {
      const n = runTD({ ...inp, bitDepth: d, ffOpen: ff }, "pu", 60);
      return { x: n[n.length - 1].force + inp.blockWeight, y: d };
    }),
    so: depths.map((d) => {
      const n = runTD({ ...inp, bitDepth: d, ffOpen: ff }, "so", 60);
      return { x: n[n.length - 1].force + inp.blockWeight, y: d };
    }),
  }));
  return { rob, lines };
}
