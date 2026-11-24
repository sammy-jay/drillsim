export type Lith = "clay" | "shale" | "sand" | "lime" | "dolo" | "salt";

export type Layer = {
  top: number;
  base: number;
  name: string;
  lith: Lith;
  a1: number; // drillability (ln ft/hr)
  abrasive: number; // tooth life at reference (hours)
  pp: [number, number]; // ppg at top, base
  fg: [number, number]; // ppg at top, base
  perm: number; // 0..1 permeability index
  fluid: "gas" | "oil" | "water" | null;
  gas: number; // background gas units while drilling
  stickSlip: number; // 0..1 torque oscillation tendency
};

export type Scenario = {
  id: string;
  name: string;
  summary: string;
  objective: string;
  td: number;
  shoe: number;
  lot: number; // ppg EMW at shoe
  startDepth: number;
  startMw: number;
  layers: Layer[];
  seed: number;
};

const L = (
  top: number,
  base: number,
  name: string,
  lith: Lith,
  a1: number,
  abrasive: number,
  pp: [number, number],
  fg: [number, number],
  perm = 0,
  fluid: Layer["fluid"] = null,
  gas = 8,
  stickSlip = 0.1,
): Layer => ({ top, base, name, lith, a1, abrasive, pp, fg, perm, fluid, gas, stickSlip });

export const SCENARIOS: Scenario[] = [
  {
    id: "transition",
    name: "Transition zone",
    summary: "Drill 8-1/2\" hole from 6,000 ft into a geopressured section with a charged gas sand.",
    objective:
      "Read the trend changes - ROP, d-exponent, background and connection gas - and weight up before the gas sand. Shut in and kill if you take a kick.",
    td: 9500,
    shoe: 5000,
    lot: 14.2,
    startDepth: 6000,
    startMw: 9.8,
    seed: 7,
    layers: [
      L(0, 1600, "Surface clays", "clay", 4.4, 80, [8.6, 8.7], [11.8, 12.4]),
      L(1600, 3900, "Upper shale", "shale", 3.9, 60, [8.7, 8.9], [12.4, 13.4]),
      L(3900, 4700, "Sand A (water)", "sand", 4.1, 30, [8.9, 9.0], [13.4, 13.8], 0.3, "water", 10),
      L(4700, 6450, "Middle shale", "shale", 3.65, 55, [9.0, 9.2], [13.8, 14.4], 0, null, 12),
      L(6450, 7150, "Massive limestone", "lime", 2.95, 40, [9.2, 9.3], [14.4, 14.8], 0.05, "water", 6, 0.45),
      L(7150, 7950, "Transition shale", "shale", 3.55, 55, [9.4, 11.0], [14.8, 15.3], 0, null, 40),
      L(7950, 8420, "Gas sand B", "sand", 4.05, 28, [11.3, 11.4], [15.3, 15.5], 1.0, "gas", 160),
      L(8420, 9150, "Lower shale", "shale", 3.45, 55, [11.0, 10.9], [15.5, 15.8], 0, null, 55),
      L(9150, 9330, "Dolomite stringer", "dolo", 2.35, 14, [10.8, 10.8], [15.8, 15.9], 0, null, 10, 0.8),
      L(9330, 10000, "Reservoir sand C", "sand", 3.95, 30, [10.6, 10.6], [15.9, 16.1], 0.9, "oil", 120),
    ],
  },
  {
    id: "narrow",
    name: "Narrow window",
    summary: "Depleted sand under a pressured shale - too little mud weight kicks, too much ECD loses returns.",
    objective:
      "Manage flow rate and mud weight to keep ECD inside the window. Watch the flow-out and pit volume for losses.",
    td: 9000,
    shoe: 6000,
    lot: 13.1,
    startDepth: 6100,
    startMw: 10.6,
    seed: 21,
    layers: [
      L(0, 2500, "Surface section", "clay", 4.3, 80, [8.6, 8.8], [12.0, 12.8]),
      L(2500, 6200, "Upper shale", "shale", 3.8, 60, [8.8, 10.2], [12.8, 13.4], 0, null, 14),
      L(6200, 7300, "Pressured shale", "shale", 3.5, 55, [10.3, 10.6], [13.4, 13.6], 0, null, 45),
      L(7300, 7650, "Depleted sand D", "sand", 4.1, 30, [8.9, 8.9], [11.85, 11.9], 1.0, "water", 25),
      L(7650, 8400, "Silty shale", "shale", 3.5, 50, [10.6, 11.15], [13.6, 13.9], 0.15, "gas", 60),
      L(8400, 9200, "Reservoir sand E", "sand", 3.95, 30, [11.2, 11.2], [13.9, 14.1], 0.8, "gas", 140),
    ],
  },
  {
    id: "hardrock",
    name: "Hard rock run",
    summary: "Normally pressured carbonates and abrasive stringers - a bit economics exercise.",
    objective:
      "Find the WOB/RPM that minimises cost per foot and decide when a worn bit should be pulled.",
    td: 11000,
    shoe: 6500,
    lot: 15.0,
    startDepth: 6600,
    startMw: 9.4,
    seed: 3,
    layers: [
      L(0, 3000, "Clastics", "shale", 4.0, 60, [8.6, 8.8], [12.0, 13.2]),
      L(3000, 6800, "Upper carbonate", "lime", 3.0, 45, [8.8, 8.9], [13.2, 14.6], 0.05, "water", 6, 0.4),
      L(6800, 7600, "Cherty dolomite", "dolo", 2.3, 12, [8.9, 9.0], [14.6, 14.9], 0, null, 6, 0.85),
      L(7600, 8900, "Limestone", "lime", 2.85, 40, [9.0, 9.0], [14.9, 15.4], 0.05, "water", 8, 0.45),
      L(8900, 9400, "Anhydrite", "salt", 3.1, 50, [9.0, 9.0], [15.4, 15.6], 0, null, 4, 0.3),
      L(9400, 10400, "Dolomite", "dolo", 2.45, 16, [9.0, 9.1], [15.6, 15.9], 0.2, "gas", 30, 0.75),
      L(10400, 11500, "Reef limestone", "lime", 3.05, 40, [9.1, 9.1], [15.9, 16.2], 0.6, "oil", 60, 0.4),
    ],
  },
];

export function layerAt(sc: Scenario, z: number): Layer {
  return sc.layers.find((l) => z >= l.top && z < l.base) ?? sc.layers[sc.layers.length - 1];
}

export function ppAt(sc: Scenario, z: number) {
  const l = layerAt(sc, z);
  const t = Math.min(1, Math.max(0, (z - l.top) / Math.max(1, l.base - l.top)));
  return l.pp[0] + (l.pp[1] - l.pp[0]) * t;
}

export function fgAt(sc: Scenario, z: number) {
  const l = layerAt(sc, z);
  const t = Math.min(1, Math.max(0, (z - l.top) / Math.max(1, l.base - l.top)));
  return l.fg[0] + (l.fg[1] - l.fg[0]) * t;
}

export const LITH_FILL: Record<Lith, string> = {
  clay: "var(--lith-clay)",
  shale: "var(--lith-shale)",
  sand: "var(--lith-sand)",
  lime: "var(--lith-lime)",
  dolo: "var(--lith-dolo)",
  salt: "var(--lith-salt)",
};
