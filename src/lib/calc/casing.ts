import { buoyancyFactor } from "./common";

export type CasingGrade = {
  size: string;
  od: number;
  weight: number; // lb/ft
  grade: string;
  id: number;
  collapse: number; // psi
  burst: number; // psi
  bodyYield: number; // kips
  yieldPsi: number;
  costIndex: number; // relative $/ft
};

const Y: Record<string, number> = { "J-55": 55000, "K-55": 55000, "N-80": 80000, "L-80": 80000, "C-95": 95000, "P-110": 110000 };
const COST: Record<string, number> = { "J-55": 1.0, "K-55": 1.02, "N-80": 1.25, "L-80": 1.3, "C-95": 1.45, "P-110": 1.6 };

function g(size: string, od: number, weight: number, grade: string, id: number, collapse: number, burst: number, bodyYield: number): CasingGrade {
  return { size, od, weight, grade, id, collapse, burst, bodyYield, yieldPsi: Y[grade], costIndex: weight * COST[grade] };
}

/** Representative API 5CT ratings (minimum performance). */
export const CASING_CATALOG: CasingGrade[] = [
  g('13-3/8"', 13.375, 54.5, "J-55", 12.615, 1130, 2730, 853),
  g('13-3/8"', 13.375, 61, "J-55", 12.515, 1540, 3090, 962),
  g('13-3/8"', 13.375, 68, "J-55", 12.415, 1950, 3450, 1069),
  g('13-3/8"', 13.375, 68, "N-80", 12.415, 2260, 5020, 1556),
  g('13-3/8"', 13.375, 72, "N-80", 12.347, 2670, 5380, 1661),
  g('13-3/8"', 13.375, 72, "P-110", 12.347, 2890, 7400, 2284),
  g('9-5/8"', 9.625, 36, "J-55", 8.921, 2020, 3520, 564),
  g('9-5/8"', 9.625, 40, "J-55", 8.835, 2570, 3950, 630),
  g('9-5/8"', 9.625, 40, "N-80", 8.835, 3090, 5750, 916),
  g('9-5/8"', 9.625, 43.5, "N-80", 8.755, 3810, 6330, 1005),
  g('9-5/8"', 9.625, 47, "N-80", 8.681, 4750, 6870, 1086),
  g('9-5/8"', 9.625, 47, "L-80", 8.681, 4750, 6870, 1086),
  g('9-5/8"', 9.625, 53.5, "N-80", 8.535, 6620, 7930, 1244),
  g('9-5/8"', 9.625, 47, "P-110", 8.681, 5300, 9440, 1493),
  g('9-5/8"', 9.625, 53.5, "P-110", 8.535, 7950, 10900, 1710),
  g('7"', 7, 23, "J-55", 6.366, 3270, 4360, 366),
  g('7"', 7, 23, "N-80", 6.366, 3830, 6340, 532),
  g('7"', 7, 26, "N-80", 6.276, 5410, 7240, 604),
  g('7"', 7, 26, "L-80", 6.276, 5410, 7240, 604),
  g('7"', 7, 29, "N-80", 6.184, 7020, 8160, 676),
  g('7"', 7, 29, "P-110", 6.184, 8530, 11220, 929),
  g('7"', 7, 32, "P-110", 6.094, 10780, 12460, 1025),
  g('7"', 7, 35, "P-110", 6.004, 13020, 13700, 1119),
  g('5-1/2"', 5.5, 17, "J-55", 4.892, 4910, 5320, 273),
  g('5-1/2"', 5.5, 17, "N-80", 4.892, 6290, 7740, 397),
  g('5-1/2"', 5.5, 20, "N-80", 4.778, 8830, 9190, 466),
  g('5-1/2"', 5.5, 23, "N-80", 4.67, 11160, 10560, 530),
  g('5-1/2"', 5.5, 20, "P-110", 4.778, 11100, 12630, 641),
  g('5-1/2"', 5.5, 23, "P-110", 4.67, 14540, 14520, 729),
];

export const CASING_SIZES = ['13-3/8"', '9-5/8"', '7"', '5-1/2"'];

export type CasingInput = {
  size: string;
  depth: number; // setting depth TVD (vertical)
  mwSet: number; // mud the casing is run in, ppg
  nextTd: number; // next section TD
  nextPp: number; // pore pressure at next TD, ppg EMW
  nextMw: number; // max mud weight next section, ppg
  fracShoe: number; // ppg EMW at shoe
  gasGrad: number; // psi/ft
  backupGrad: number; // psi/ft external backup for burst
  evacuation: "full" | "partial";
  fluidLevel: number; // ft below surface (partial)
  dfBurst: number;
  dfCollapse: number;
  dfTension: number;
  overpull: number; // kips
  biaxial: boolean;
};

export type LoadPoint = { depth: number; burstLoad: number; burstDesign: number; collapseLoad: number; collapseDesign: number; tension: number; tensionDesign: number };

export function casingLoads(inp: CasingInput, weight: number): LoadPoint[] {
  const n = 60;
  const D = inp.depth;
  const bf = buoyancyFactor(inp.mwSet);
  const fracP = 0.052 * inp.fracShoe * D;
  const resP = 0.052 * inp.nextPp * inp.nextTd;
  const out: LoadPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const z = (D * i) / n;
    // burst: gas-filled casing from the next-section reservoir, capped by fracture at the shoe
    const piRes = resP - inp.gasGrad * (inp.nextTd - z);
    const piFrac = fracP - inp.gasGrad * (D - z);
    const pi = Math.max(0, Math.min(piRes, piFrac));
    const pe = inp.backupGrad * z;
    const burst = Math.max(0, pi - pe);
    // collapse: mud outside, evacuated inside
    const peC = 0.052 * inp.mwSet * z;
    const piC = inp.evacuation === "full" ? 0 : 0.052 * inp.nextMw * Math.max(0, z - inp.fluidLevel);
    const collapse = Math.max(0, peC - piC);
    // tension: buoyed weight hanging below z (kips)
    const t = (weight * bf * (D - z)) / 1000;
    out.push({
      depth: z,
      burstLoad: burst,
      burstDesign: burst * inp.dfBurst,
      collapseLoad: collapse,
      collapseDesign: collapse * inp.dfCollapse,
      tension: t,
      tensionDesign: Math.max(t * inp.dfTension, t + inp.overpull),
    });
  }
  return out;
}

/** API biaxial (ellipse) collapse reduction for axial tension. */
export function biaxialCollapse(c: CasingGrade, tensionKips: number) {
  const as = (Math.PI / 4) * (c.od * c.od - c.id * c.id);
  const sa = (tensionKips * 1000) / as;
  const r = sa / c.yieldPsi;
  const factor = Math.sqrt(Math.max(0, 1 - 0.75 * r * r)) - 0.5 * r;
  return c.collapse * Math.min(1, Math.max(0, factor));
}

export function evaluateGrade(inp: CasingInput, c: CasingGrade) {
  const loads = casingLoads(inp, c.weight);
  let sfBurst = Infinity,
    sfCollapse = Infinity,
    sfTension = Infinity;
  let burstAt = 0,
    collapseAt = 0;
  for (const p of loads) {
    if (p.burstLoad > 0) {
      const s = c.burst / p.burstLoad;
      if (s < sfBurst) {
        sfBurst = s;
        burstAt = p.depth;
      }
    }
    if (p.collapseLoad > 0) {
      const rating = inp.biaxial ? biaxialCollapse(c, p.tension) : c.collapse;
      const s = rating / p.collapseLoad;
      if (s < sfCollapse) {
        sfCollapse = s;
        collapseAt = p.depth;
      }
    }
    if (p.tension > 0) {
      const s = c.bodyYield / Math.max(p.tension, 1e-6);
      sfTension = Math.min(sfTension, s);
    }
  }
  const top = loads[0];
  const tensionOk = c.bodyYield >= top.tensionDesign;
  const pass = sfBurst >= inp.dfBurst && sfCollapse >= inp.dfCollapse && tensionOk;
  return { grade: c, loads, sfBurst, sfCollapse, sfTension, burstAt, collapseAt, tensionOk, pass };
}
