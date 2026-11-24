/* Oilfield-unit drilling fundamentals. */

export const PSI_PER_FT_PER_PPG = 0.052;
export const STEEL_PPG = 65.5;

/** Hydrostatic pressure (psi) */
export const hydrostatic = (mwPpg: number, tvdFt: number) => PSI_PER_FT_PER_PPG * mwPpg * tvdFt;

/** Equivalent mud weight (ppg) of a pressure at a TVD */
export const emw = (psi: number, tvdFt: number) => (tvdFt > 0 ? psi / (PSI_PER_FT_PER_PPG * tvdFt) : 0);

/** Pressure gradient (psi/ft) of a mud weight */
export const gradient = (mwPpg: number) => PSI_PER_FT_PER_PPG * mwPpg;

/** Internal capacity of a pipe or hole (bbl/ft) */
export const capacity = (idIn: number) => (idIn * idIn) / 1029.4;

/** Annular capacity (bbl/ft) */
export const annularCapacity = (holeIn: number, odIn: number) => Math.max(0, holeIn * holeIn - odIn * odIn) / 1029.4;

/** Steel (open-end) displacement (bbl/ft) */
export const steelDisplacement = (odIn: number, idIn: number) => (odIn * odIn - idIn * idIn) / 1029.4;

/** Buoyancy factor for steel */
export const buoyancyFactor = (mwPpg: number) => 1 - mwPpg / STEEL_PPG;

/** Triplex pump output (bbl/stk). efficiency as fraction. */
export const triplexOutput = (linerIn: number, strokeIn: number, eff: number) =>
  0.000243 * linerIn * linerIn * strokeIn * eff;

/** Duplex pump output (bbl/stk). */
export const duplexOutput = (linerIn: number, strokeIn: number, rodIn: number, eff: number) =>
  0.000162 * strokeIn * (2 * linerIn * linerIn - rodIn * rodIn) * eff;

/** Annular velocity (ft/min) */
export const annularVelocity = (gpm: number, holeIn: number, odIn: number) =>
  holeIn > odIn ? (24.51 * gpm) / (holeIn * holeIn - odIn * odIn) : 0;

/** Drill collar weight (lb/ft) for plain steel collars */
export const collarWeight = (odIn: number, idIn: number) => 2.67 * (odIn * odIn - idIn * idIn);

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Round a mud weight up to the next 0.1 ppg */
export const roundUpTenth = (v: number) => Math.ceil(v * 10 - 1e-9) / 10;

export type StringComponent = {
  id: string;
  name: string;
  od: number; // in
  id_: number; // in
  length: number; // ft
  weight: number; // lb/ft in air (adjusted, incl. tool joints)
};

export type HoleSection = {
  name: string;
  id: number; // in (casing ID or hole size)
  bottom: number; // ft MD
  cased: boolean;
};

/** Default well shared across modules for consistency. */
export const DEFAULT_WELL = {
  md: 10000,
  tvd: 10000,
  mw: 10.5,
  casingShoe: 7500,
  casingId: 8.681, // 9-5/8" 47#
  casingOd: 9.625,
  holeSize: 8.5,
  string: [
    { id: "dp", name: '5" DP 19.5#', od: 5, id_: 4.276, length: 8950, weight: 22.6 },
    { id: "hw", name: '5" HWDP', od: 5, id_: 3.0, length: 450, weight: 49.3 },
    { id: "dc", name: '6-1/2" DC', od: 6.5, id_: 2.8125, length: 600, weight: 91.8 },
  ] as StringComponent[],
  pump: { liner: 6, stroke: 12, eff: 0.97 },
};
