import { gauss, rng } from "../format";

export type PPInput = {
  td: number;
  step: number;
  // "true" geology used to synthesize the sonic log
  onset: number; // top of overpressure, ft
  ramp: number; // transition thickness, ft
  severity: number; // sonic excursion above trend at depth (fraction)
  noise: number; // us/ft std dev
  seed: number;
  // interpretation
  dtMatrix: number; // us/ft
  dtSurface: number; // us/ft
  compaction: number; // 1/ft
  eatonExp: number;
  normalPp: number; // ppg
  nuTop: number;
  nuBottom: number;
  tripMargin: number; // ppg
  kickMargin: number; // ppg
  minSurfaceShoe: number;
  smoothWindow: number; // ft
};

export type PPRow = {
  depth: number;
  dtObs: number;
  dtNormal: number;
  obg: number; // ppg
  pp: number; // ppg
  ppSmooth: number;
  fg: number; // ppg
  mwMin: number; // pp + trip
  mwMax: number; // fg - kick
};

const TRUE_TREND = { dtMatrix: 55, dtSurface: 160, compaction: 0.00022 };

function bulkDensity(z: number) {
  return 1.95 + (2.62 - 1.95) * (1 - Math.exp(-z / 7000));
}

export function porePressureModel(inp: PPInput) {
  const rand = rng(inp.seed);
  const rows: PPRow[] = [];
  let obP = 0;
  let prevZ = 0;
  const n = Math.floor(inp.td / inp.step);
  for (let i = 1; i <= n; i++) {
    const z = i * inp.step;
    // overburden (onshore) by integrating bulk density
    const rhoMid = bulkDensity((z + prevZ) / 2);
    obP += 0.4335 * rhoMid * (z - prevZ);
    prevZ = z;
    const obg = obP / (0.052 * z);

    // synthetic observed sonic: true trend + undercompaction excursion + noise
    const dtTrue = TRUE_TREND.dtMatrix + (TRUE_TREND.dtSurface - TRUE_TREND.dtMatrix) * Math.exp(-TRUE_TREND.compaction * z);
    const u = Math.min(1, Math.max(0, (z - inp.onset) / Math.max(1, inp.ramp)));
    const s = u * u * (3 - 2 * u);
    const dtObs = dtTrue * (1 + inp.severity * s) + gauss(rand) * inp.noise;

    // interpretation
    const dtNormal = inp.dtMatrix + (inp.dtSurface - inp.dtMatrix) * Math.exp(-inp.compaction * z);
    const ratio = Math.min(1.2, dtNormal / Math.max(1, dtObs));
    const pp = obg - (obg - inp.normalPp) * Math.pow(ratio, inp.eatonExp);
    rows.push({ depth: z, dtObs, dtNormal, obg, pp, ppSmooth: pp, fg: 0, mwMin: 0, mwMax: 0 });
  }

  // moving-average smoothing of pore pressure
  const w = Math.max(1, Math.round(inp.smoothWindow / inp.step / 2));
  for (let i = 0; i < rows.length; i++) {
    let s = 0,
      c = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(rows.length - 1, i + w); j++) {
      s += rows[j].pp;
      c++;
    }
    rows[i].ppSmooth = Math.max(inp.normalPp * 0.98, s / c);
  }
  for (const r of rows) {
    const nu = inp.nuTop + ((inp.nuBottom - inp.nuTop) * r.depth) / inp.td;
    const k = nu / (1 - nu);
    r.fg = k * (r.obg - r.ppSmooth) + r.ppSmooth;
    r.mwMin = r.ppSmooth + inp.tripMargin;
    r.mwMax = r.fg - inp.kickMargin;
  }

  return { rows, seats: casingSeats(rows, inp.minSurfaceShoe) };
}

export type CasingSeat = { name: string; size: string; bit: string; shoe: number; bottom: number; top: number; mw: number };

/** Standard casing program, deepest string first. */
const PROGRAM = [
  { size: '7"', bit: '8-1/2"' },
  { size: '9-5/8"', bit: '12-1/4"' },
  { size: '13-3/8"', bit: '17-1/2"' },
  { size: '20"', bit: '26"' },
  { size: '30"', bit: '36"' },
];

/** Classic bottom-up seat selection. */
export function casingSeats(rows: PPRow[], minSurface: number): CasingSeat[] {
  if (rows.length === 0) return [];
  const maxReq = (a: number, b: number) => {
    let m = -Infinity;
    for (let k = a; k <= b; k++) m = Math.max(m, rows[k].mwMin);
    return m;
  };
  const idxAt = (depth: number) => {
    let k = 0;
    while (k < rows.length - 1 && rows[k].depth < depth) k++;
    return k;
  };

  // deep -> shallow intervals: each is drilled with one mud weight below the shoe at its top
  const intervals: { top: number; bottom: number; mw: number }[] = [];
  let B = rows.length - 1;
  for (let guard = 0; guard < 8; guard++) {
    let mw = rows[B].mwMin;
    let S = 0;
    for (let iter = 0; iter < 12; iter++) {
      S = 0;
      for (let k = B; k >= 0; k--) {
        if (rows[k].mwMax < mw) {
          S = k + 1;
          break;
        }
      }
      const need = maxReq(Math.min(S, B), B);
      if (need <= mw + 1e-9) break;
      mw = need;
    }
    if (S >= B) S = Math.max(0, B - 1); // window closed: shortest possible interval
    const topDepth = S === 0 ? 0 : rows[S].depth;
    if (topDepth <= minSurface) {
      if (rows[B].depth > minSurface) {
        // regulatory surface string protects shallow aquifers even when the window allows more
        const sIdx = idxAt(minSurface);
        intervals.push({ top: rows[sIdx].depth, bottom: rows[B].depth, mw });
        intervals.push({ top: 0, bottom: rows[sIdx].depth, mw: maxReq(0, sIdx) });
      } else {
        intervals.push({ top: 0, bottom: rows[B].depth, mw });
      }
      break;
    }
    intervals.push({ top: topDepth, bottom: rows[B].depth, mw });
    B = S;
  }

  const shallowFirst = intervals.reverse();
  const n = shallowFirst.length;
  return shallowFirst.map((iv, i) => {
    const prog = PROGRAM[Math.min(PROGRAM.length - 1, n - 1 - i)];
    const name = n === 1 ? "Production" : i === 0 ? "Surface" : i === n - 1 ? "Production" : `Intermediate ${i}`;
    return { name, size: prog.size, bit: prog.bit, shoe: iv.bottom, bottom: iv.bottom, mw: iv.mw, top: iv.top } as CasingSeat;
  });
}
