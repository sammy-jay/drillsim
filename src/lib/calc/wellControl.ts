import { annularCapacity, capacity, roundUpTenth, type StringComponent } from "./common";

export type KillInput = {
  md: number;
  tvd: number;
  mw: number;
  sidpp: number;
  sicp: number;
  pitGain: number;
  scr: number; // slow circulating rate pressure at kill rate, psi
  killSpm: number;
  pumpOutput: number; // bbl/stk
  shoeMd: number;
  lotEmw: number; // ppg
  casingId: number;
  holeSize: number;
  string: StringComponent[]; // top to bottom
  margin: number; // safety margin held on BHP, psi
  steps: number;
};

type Seg = { top: number; bottom: number; cap: number };

function annulusSegments(inp: KillInput): Seg[] {
  const segs: Seg[] = [];
  const bottomLen = inp.string.slice(1).reduce((s, c) => s + c.length, 0);
  const comps = inp.string.map((c, i) => ({ ...c, length: i === 0 ? Math.max(0, inp.md - bottomLen) : c.length }));
  let top = 0;
  for (const c of comps) {
    const bottom = Math.min(inp.md, top + c.length);
    if (bottom <= top) continue;
    const split = Math.min(Math.max(inp.shoeMd, top), bottom);
    if (split > top) segs.push({ top, bottom: split, cap: annularCapacity(inp.casingId, c.od) });
    if (bottom > split) segs.push({ top: split, bottom, cap: annularCapacity(inp.holeSize, c.od) });
    top = bottom;
  }
  return segs;
}

function stringVolume(inp: KillInput) {
  const bottomLen = inp.string.slice(1).reduce((s, c) => s + c.length, 0);
  return inp.string.reduce(
    (s, c, i) => s + capacity(c.id_) * (i === 0 ? Math.max(0, inp.md - bottomLen) : c.length),
    0,
  );
}

function volBetween(segs: Seg[], a: number, b: number) {
  let v = 0;
  for (const s of segs) {
    const lo = Math.max(a, s.top);
    const hi = Math.min(b, s.bottom);
    if (hi > lo) v += (hi - lo) * s.cap;
  }
  return v;
}

/** Depth of the top of a column of `vol` bbl whose bottom is at `bottom`. Negative = beyond surface. */
function depthAbove(segs: Seg[], bottom: number, vol: number) {
  let remaining = vol;
  let z = bottom;
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.top >= z) continue;
    const hi = Math.min(z, s.bottom);
    const avail = (hi - s.top) * s.cap;
    if (remaining <= avail) return hi - remaining / s.cap;
    remaining -= avail;
    z = s.top;
  }
  const cap0 = segs[0]?.cap ?? 0.05;
  return -remaining / cap0;
}

export type KillPoint = {
  strokes: number;
  minutes: number;
  dp: number;
  casing: number;
  shoe: number;
  shoeEmw: number;
  pit: number;
  phase: string;
};

export function influxAnalysis(inp: KillInput) {
  const segs = annulusSegments(inp);
  const r = inp.tvd / inp.md;
  const top = depthAbove(segs, inp.md, inp.pitGain);
  const heightMd = inp.md - Math.max(0, top);
  const heightTvd = heightMd * r;
  const grad = 0.052 * inp.mw - (inp.sicp - inp.sidpp) / Math.max(1, heightTvd);
  const type =
    grad < 0.25 ? "Gas" : grad < 0.4 ? "Oil / gas-cut mix" : grad <= 0.52 ? "Salt water" : "Check readings";
  return { heightMd, heightTvd, gradient: grad, type, isGas: grad < 0.3 };
}

export function killSheet(inp: KillInput) {
  const r = inp.tvd / inp.md;
  const shoeTvd = inp.shoeMd * r;
  const segs = annulusSegments(inp);
  const strVol = stringVolume(inp);
  const annVol = volBetween(segs, 0, inp.md);
  const bitToShoeVol = volBetween(segs, inp.shoeMd, inp.md);
  const pf = inp.sidpp + 0.052 * inp.mw * inp.tvd;
  const kmwExact = inp.mw + inp.sidpp / (0.052 * inp.tvd);
  const kmw = roundUpTenth(kmwExact);
  const icp = inp.scr + inp.sidpp;
  const fcp = (inp.scr * kmw) / inp.mw;
  const po = inp.pumpOutput;
  const stk = {
    surfaceToBit: strVol / po,
    bitToShoe: bitToShoeVol / po,
    bitToSurface: annVol / po,
    total: (strVol + annVol) / po,
  };
  const maasp = (inp.lotEmw - inp.mw) * 0.052 * shoeTvd;
  const maaspKill = (inp.lotEmw - kmw) * 0.052 * shoeTvd;
  const influx = influxAnalysis(inp);
  const steps = Math.max(2, Math.round(inp.steps));
  const schedule = Array.from({ length: steps + 1 }, (_, i) => ({
    strokes: (stk.surfaceToBit * i) / steps,
    pressure: icp - ((icp - fcp) * i) / steps,
    minutes: (stk.surfaceToBit * i) / steps / inp.killSpm,
  }));

  return {
    pf,
    kmw,
    kmwExact,
    icp,
    fcp,
    strVol,
    annVol,
    bitToShoeVol,
    stk,
    minutes: {
      surfaceToBit: stk.surfaceToBit / inp.killSpm,
      bitToSurface: stk.bitToSurface / inp.killSpm,
      total: stk.total / inp.killSpm,
    },
    maasp,
    maaspKill,
    shoeTvd,
    influx,
    schedule,
    fracAtShoe: 0.052 * inp.lotEmw * shoeTvd,
  };
}

/**
 * Single-bubble kill simulation with Boyle's-law gas expansion.
 * BHP is held at formation pressure + margin by the choke; the influx rides up the annulus
 * displaced by the mud pumped behind it.
 */
export function simulateKill(inp: KillInput, method: "ww" | "drillers"): KillPoint[] {
  const ks = killSheet(inp);
  const r = inp.tvd / inp.md;
  const segs = annulusSegments(inp);
  const strVol = ks.strVol;
  const annVol = ks.annVol;
  const circ = strVol + annVol;
  const bhp = ks.pf + inp.margin;
  const gi = Math.max(0.01, ks.influx.gradient);
  const isGas = ks.influx.isGas;
  const V0 = inp.pitGain;
  const omw = inp.mw;
  const kmw = ks.kmw;
  const shoe = inp.shoeMd;

  const killStart = method === "ww" ? 0 : circ;
  const totalVol = method === "ww" ? circ : 2 * circ;
  const N = method === "ww" ? 360 : 720;
  const pts: KillPoint[] = [];

  // hydrostatic of annulus column between depths [a,b] where the bottom `kVol` bbl (above TD) is KMW
  const annHydro = (a: number, b: number, kVol: number) => {
    const kTop = kVol > 0 ? Math.max(0, depthAbove(segs, inp.md, kVol)) : inp.md;
    const kLen = Math.max(0, Math.min(b, inp.md) - Math.max(a, kTop));
    const total = Math.max(0, b - a);
    return 0.052 * (kmw * kLen + omw * (total - kLen)) * r;
  };

  for (let i = 0; i <= N; i++) {
    const v = (totalVol * i) / N;
    const kmwIntoAnn = Math.max(0, v - killStart - strVol);

    // drill pipe pressure schedule
    let dp: number;
    if (method === "ww") {
      dp = v < strVol ? ks.icp - ((ks.icp - ks.fcp) * v) / strVol : ks.fcp;
    } else if (v <= circ) {
      dp = ks.icp;
    } else {
      const u = v - circ;
      dp = u < strVol ? ks.icp - ((ks.icp - ks.fcp) * u) / strVol : ks.fcp;
    }
    dp += inp.margin;

    let casing: number;
    let shoeP: number;
    let pit: number;
    let phase: string;

    const zb = v < annVol ? depthAbove(segs, inp.md, v) : -1;
    if (zb > 0) {
      // influx still in the hole
      const below = annHydro(zb, inp.md, kmwIntoAnn);
      const pb = Math.max(14.7, bhp - below);
      const vol = isGas ? (V0 * bhp) / pb : V0;
      let zt = depthAbove(segs, zb, vol);
      let volInHole = vol;
      if (zt < 0) {
        zt = 0;
        volInHole = volBetween(segs, 0, zb);
      }
      const pt = pb - gi * (zb - zt) * r;
      casing = pt - 0.052 * omw * zt * r;
      if (shoe >= zb) shoeP = bhp - annHydro(shoe, inp.md, kmwIntoAnn);
      else if (shoe >= zt) shoeP = pt + gi * (shoe - zt) * r;
      else shoeP = casing + 0.052 * omw * shoe * r;
      pit = volInHole;
      phase = zt <= 0 ? "Influx at choke" : zb > shoe && zt > shoe ? "Influx below shoe" : "Influx passing shoe";
    } else {
      // annulus is liquid only
      const kVol = Math.min(annVol, kmwIntoAnn);
      casing = bhp - annHydro(0, inp.md, kVol);
      shoeP = casing + annHydro(0, shoe, kVol);
      pit = 0;
      phase = kmwIntoAnn > 0 ? "Kill mud up annulus" : method === "drillers" && v <= circ ? "Circulating clean" : "Kill mud down string";
    }
    if (method === "ww" && v < strVol && zb > 0) phase = phase + " · KMW down string";
    if (method === "drillers") phase = (v <= circ ? "Circ. 1 · " : "Circ. 2 · ") + phase;

    casing = Math.max(0, casing);
    pts.push({
      strokes: v / inp.pumpOutput,
      minutes: v / inp.pumpOutput / inp.killSpm,
      dp,
      casing,
      shoe: shoeP,
      shoeEmw: shoeP / (0.052 * ks.shoeTvd),
      pit,
      phase,
    });
  }
  return pts;
}
