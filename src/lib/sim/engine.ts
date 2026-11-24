import { annularCapacity, DEFAULT_WELL, triplexOutput } from "../calc/common";
import { computeHydraulics, DEFAULT_RHEOLOGY, SURFACE_CASES, tfa } from "../calc/hydraulics";
import { byRop } from "../calc/rop";
import { killSheet, simulateKill, type KillInput, type KillPoint } from "../calc/wellControl";
import { gauss, rng } from "../format";
import { fgAt, layerAt, ppAt, SCENARIOS, type Layer, type Scenario } from "./scenarios";

/* ------------------------------------------------------------------ */
/* Rig constants                                                       */
/* ------------------------------------------------------------------ */
export const RIG = {
  bit: 8.5,
  nozzles: [13, 13, 13],
  casingId: DEFAULT_WELL.casingId,
  pumpOutput: triplexOutput(6, 12, 0.97),
  block: 45, // klbf
  rigRate: 1800, // $/hr
  bitCost: 28000,
  mudLossCost: 120, // $/bbl
  weightUpCost: 9500, // $ per ppg raised (whole system)
  killSpm: 30,
  maxGpm: 900,
  connTime: 150, // s
  standLength: 93,
};
const TFA = tfa(RIG.nozzles);
const SURF_E = SURFACE_CASES[1].E;
const HW_LEN = 450;
const DC_LEN = 600;

export type Level = "info" | "good" | "warning" | "serious" | "critical";
export type SimEvent = { t: number; level: Level; msg: string };
export type TrendPt = {
  t: number; // minutes
  rop: number;
  wob: number;
  rpm: number;
  spp: number;
  torque: number;
  hook: number;
  pit: number;
  gas: number;
  flowOut: number;
  ecd: number;
  mw: number;
  casing: number;
};
export type LogPt = { depth: number; rop: number; dxc: number; gas: number; mw: number; ecd: number };

export type Mode = "drilling" | "circulating" | "idle" | "connection" | "shut-in" | "killing" | "tripping";

export type SimState = {
  scenario: Scenario;
  rand: () => number;
  t: number;
  depth: number;
  bitDepth: number;
  ctrl: {
    wob: number;
    rpm: number;
    flow: number;
    mwTarget: number;
    pumps: boolean;
    rotary: boolean;
    onBottom: boolean;
    autoConn: boolean;
  };
  wob: number;
  rpm: number;
  flow: number;
  mw: number;
  spp: number;
  ecd: number;
  hook: number;
  torque: number;
  rop: number;
  ropRaw: number;
  flowOut: number;
  pitGain: number;
  gas: number;
  gasTarget: number;
  casingP: number;
  sidpp: number;
  sicp: number;
  migration: number;
  wear: number;
  bitHours: number;
  bitFootage: number;
  bits: number;
  mode: Mode;
  modeTimer: number;
  tripTotal: number;
  nextConn: number;
  bop: boolean;
  influx: number;
  influxFluid: Layer["fluid"];
  lossRate: number;
  influxRate: number;
  lossTotal: number;
  pumped: number;
  queue: { at: number; gas: number; influx: number }[];
  pend: { gasTime: number; time: number; influx: number; connGas: number };
  kick: { depth: number; pp: number } | null;
  shutInAt: number;
  kill: null | {
    profile: KillPoint[];
    sheet: ReturnType<typeof killSheet>;
    strokes: number;
    total: number;
    kmw: number;
    startT: number;
  };
  cost: { rig: number; bits: number; mud: number; losses: number };
  npt: number;
  connections: number;
  events: SimEvent[];
  trend: TrendPt[];
  lastTrend: number;
  log: LogPt[];
  lastLog: number;
  noise: number;
  ended: null | { success: boolean; title: string; msg: string };
  startDepth: number;
  breakRef: number;
  drillTime: number;
  lastBreak: number;
  lastInfluxNote: number;
  wornWarned: boolean;
};

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
function stringFor(depth: number) {
  const s = DEFAULT_WELL.string;
  return [
    { ...s[0], length: Math.max(0, depth - HW_LEN - DC_LEN) },
    { ...s[1], length: HW_LEN },
    { ...s[2], length: DC_LEN },
  ];
}

export function annulusVolume(depth: number, shoe: number) {
  let v = 0;
  let top = 0;
  for (const c of stringFor(depth)) {
    const bottom = top + c.length;
    const cased = Math.max(0, Math.min(bottom, shoe) - top);
    const open = Math.max(0, bottom - top - cased);
    v += cased * annularCapacity(RIG.casingId, c.od) + open * annularCapacity(RIG.bit, c.od);
    top = bottom;
  }
  return v;
}

function influxHeight(vol: number) {
  const capDc = annularCapacity(RIG.bit, 6.5);
  const capDp = annularCapacity(RIG.bit, 5);
  if (vol <= capDc * DC_LEN) return vol / capDc;
  return DC_LEN + (vol - capDc * DC_LEN) / capDp;
}

export function stringWeightAir(depth: number) {
  return stringFor(depth).reduce((s, c) => s + (c.weight * c.length) / 1000, 0);
}

export function maasp(s: SimState) {
  return Math.max(0, (s.scenario.lot - s.mw) * 0.052 * s.scenario.shoe);
}

function hydraulicsAt(s: SimState, q: number, mw: number) {
  return computeHydraulics({
    q,
    mw,
    rheology: DEFAULT_RHEOLOGY,
    surfaceE: SURF_E,
    depth: s.depth,
    tvd: s.depth,
    casingShoe: s.scenario.shoe,
    casingId: RIG.casingId,
    holeSize: RIG.bit,
    string: stringFor(s.depth),
    nozzles: RIG.nozzles,
  });
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */
export function createSim(id: string): SimState {
  const sc = SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];
  const s: SimState = {
    scenario: sc,
    rand: rng(sc.seed),
    t: 0,
    depth: sc.startDepth,
    bitDepth: sc.startDepth - 30,
    ctrl: { wob: 25, rpm: 120, flow: 520, mwTarget: sc.startMw, pumps: true, rotary: true, onBottom: true, autoConn: true },
    wob: 0,
    rpm: 0,
    flow: 0,
    mw: sc.startMw,
    spp: 0,
    ecd: sc.startMw,
    hook: 0,
    torque: 0,
    rop: 0,
    ropRaw: 0,
    flowOut: 0,
    pitGain: 0,
    gas: 0,
    gasTarget: 0,
    casingP: 0,
    sidpp: 0,
    sicp: 0,
    migration: 0,
    wear: 0,
    bitHours: 0,
    bitFootage: 0,
    bits: 1,
    mode: "idle",
    modeTimer: 0,
    tripTotal: 0,
    nextConn: sc.startDepth + RIG.standLength,
    bop: false,
    influx: 0,
    influxFluid: null,
    lossRate: 0,
    influxRate: 0,
    lossTotal: 0,
    pumped: 0,
    queue: [],
    pend: { gasTime: 0, time: 0, influx: 0, connGas: 0 },
    kick: null,
    shutInAt: 0,
    kill: null,
    cost: { rig: 0, bits: RIG.bitCost, mud: 0, losses: 0 },
    npt: 0,
    connections: 0,
    events: [],
    trend: [],
    lastTrend: -999,
    log: [],
    lastLog: sc.startDepth,
    noise: 0,
    ended: null,
    startDepth: sc.startDepth,
    breakRef: 0,
    drillTime: 0,
    lastBreak: -1e9,
    lastInfluxNote: -1e9,
    wornWarned: false,
  };
  s.hook = RIG.block + stringWeightAir(s.depth) * (1 - s.mw / 65.5);
  pushEvent(s, "info", `Scenario loaded: ${sc.name}. Bit at ${sc.startDepth.toLocaleString("en-US")} ft, ${sc.startMw.toFixed(1)} ppg mud.`);
  return s;
}

function pushEvent(s: SimState, level: Level, msg: string) {
  s.events.unshift({ t: s.t, level, msg });
  if (s.events.length > 80) s.events.length = 80;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */
export type SimAction = "shut-in" | "open-bop" | "start-kill" | "trip" | "flow-check";

export function simAction(s: SimState, a: SimAction) {
  if (s.ended) return;
  const m = s.mode;
  if (a === "shut-in") {
    if (m === "shut-in" || m === "killing") return;
    if (m === "tripping") {
      pushEvent(s, "warning", "Tripping interrupted — stabbing safety valve and shutting in.");
    }
    s.mode = "shut-in";
    s.bop = true;
    s.shutInAt = s.t;
    s.sidpp = 0;
    s.sicp = 0;
    s.migration = 0;
    s.ctrl.onBottom = false;
    pushEvent(s, "warning", `Well shut in at ${Math.round(s.depth).toLocaleString("en-US")} ft (hard shut-in). Pit gain ${s.pitGain.toFixed(1)} bbl.`);
  } else if (a === "open-bop") {
    if (m !== "shut-in") return;
    if (s.sicp > 25 || s.sidpp > 25) {
      pushEvent(s, "critical", "Cannot open BOP with pressure trapped — circulate a kill first.");
      return;
    }
    s.bop = false;
    s.mode = "idle";
    s.casingP = 0;
    pushEvent(s, "good", "No pressure on the well. BOP opened, resume operations.");
  } else if (a === "start-kill") {
    if (m !== "shut-in") return;
    if (s.t - s.shutInAt < 180) {
      pushEvent(s, "info", "Wait for shut-in pressures to stabilise (≈3 min) before starting the kill.");
      return;
    }
    if (s.sidpp < 10 && s.sicp < 10) {
      pushEvent(s, "info", "No shut-in pressure recorded — open the BOP instead.");
      return;
    }
    const scr = hydraulicsAt(s, RIG.killSpm * RIG.pumpOutput * 42, s.mw).total;
    const inp: KillInput = {
      md: s.depth,
      tvd: s.depth,
      mw: s.mw,
      sidpp: Math.max(1, s.sidpp),
      sicp: Math.max(s.sidpp + 1, s.sicp),
      pitGain: Math.max(0.5, s.influx),
      scr,
      killSpm: RIG.killSpm,
      pumpOutput: RIG.pumpOutput,
      shoeMd: s.scenario.shoe,
      lotEmw: s.scenario.lot,
      casingId: RIG.casingId,
      holeSize: RIG.bit,
      string: stringFor(s.depth),
      margin: 50,
      steps: 10,
    };
    const sheet = killSheet(inp);
    const profile = simulateKill(inp, "ww");
    s.kill = { profile, sheet, strokes: 0, total: profile[profile.length - 1].strokes, kmw: sheet.kmw, startT: s.t };
    s.mode = "killing";
    pushEvent(
      s,
      "warning",
      `Wait & Weight kill started: KMW ${sheet.kmw.toFixed(1)} ppg, ICP ${Math.round(sheet.icp + 50)} psi → FCP ${Math.round(sheet.fcp + 50)} psi at ${RIG.killSpm} spm.`,
    );
  } else if (a === "trip") {
    if (m === "shut-in" || m === "killing" || m === "tripping") return;
    s.mode = "tripping";
    s.tripTotal = (s.depth / 1000) * 3600; // 1 h per 1000 ft round trip
    s.modeTimer = s.tripTotal;
    s.ctrl.onBottom = false;
    pushEvent(s, "info", `Pulling out of hole for a new bit (est. ${(s.tripTotal / 3600).toFixed(1)} h round trip).`);
  } else if (a === "flow-check") {
    if (m === "shut-in" || m === "killing" || m === "tripping") return;
    s.ctrl.pumps = false;
    s.ctrl.rotary = false;
    s.ctrl.onBottom = false;
    pushEvent(s, "info", "Flow check: pumps off, string off bottom. Watch flow-out and pit volume.");
  }
}

/* ------------------------------------------------------------------ */
/* Integration                                                         */
/* ------------------------------------------------------------------ */
export function stepSim(s: SimState, dtTotal: number) {
  let remaining = dtTotal;
  while (remaining > 1e-9 && !s.ended) {
    const dt = Math.min(2, remaining);
    step(s, dt);
    remaining -= dt;
  }
}

function exposedLayers(s: SimState) {
  const sc = s.scenario;
  return sc.layers
    .filter((l) => l.base > sc.shoe && l.top < s.depth)
    .map((l) => ({ l, top: Math.max(l.top, sc.shoe), bottom: Math.min(l.base, s.depth) }))
    .filter((x) => x.bottom > x.top);
}

function step(s: SimState, dt: number) {
  const sc = s.scenario;
  s.t += dt;

  /* ---------- timed modes ---------- */
  if (s.mode === "connection") {
    s.modeTimer -= dt;
    if (s.modeTimer <= 0) {
      s.mode = "idle";
    }
  }
  if (s.mode === "tripping") {
    s.modeTimer -= dt;
    const frac = 1 - s.modeTimer / Math.max(1, s.tripTotal);
    s.bitDepth = frac < 0.5 ? s.depth * (1 - frac * 2) : s.depth * ((frac - 0.5) * 2);
    if (s.modeTimer <= 0) {
      s.mode = "idle";
      s.wear = 0;
      s.bitHours = 0;
      s.bitFootage = 0;
      s.bits += 1;
      s.wornWarned = false;
      s.drillTime = 0;
      s.breakRef = 0;
      s.cost.bits += RIG.bitCost;
      s.bitDepth = s.depth - 30;
      s.ctrl.pumps = true;
      s.ctrl.rotary = true;
      s.ctrl.onBottom = true;
      pushEvent(s, "good", `New bit #${s.bits} run to bottom — drilling ahead.`);
    }
  }

  const shut = s.mode === "shut-in";
  const killing = s.mode === "killing";
  const conn = s.mode === "connection";
  const tripping = s.mode === "tripping";
  const busy = shut || killing || conn || tripping;

  /* ---------- actuators ---------- */
  let flowT = s.ctrl.pumps && !busy ? s.ctrl.flow : 0;
  if (killing) flowT = RIG.killSpm * RIG.pumpOutput * 42;
  const rpmT = s.ctrl.rotary && !busy ? s.ctrl.rpm : 0;
  const canDrill = s.ctrl.onBottom && !busy && s.depth < sc.td;
  const wobT = canDrill ? s.ctrl.wob : 0;
  s.flow += (flowT - s.flow) * Math.min(1, dt / 6);
  s.rpm += (rpmT - s.rpm) * Math.min(1, dt / 4);
  s.wob += (wobT - s.wob) * Math.min(1, dt / 5);
  if (s.flow < 0.5) s.flow = 0;
  if (s.rpm < 0.5) s.rpm = 0;

  /* ---------- mud conditioning ---------- */
  if (s.flow > 50 && !killing) {
    const dmw = (s.ctrl.mwTarget - s.mw) * Math.min(1, dt / 1100);
    if (dmw > 0) s.cost.mud += dmw * RIG.weightUpCost;
    s.mw += dmw;
  }

  /* ---------- hydraulics ---------- */
  let annLoss = 0;
  if (s.flow > 1) {
    const h = hydraulicsAt(s, s.flow, s.mw);
    s.ecd = h.ecd;
    annLoss = h.sumAnn;
    if (!killing) s.spp = h.total;
  } else {
    s.ecd = s.mw;
    if (!killing && !shut) s.spp = 0;
  }
  void annLoss;

  /* ---------- drilling ---------- */
  const layer = layerAt(sc, s.depth);
  const pp = ppAt(sc, s.depth);
  const drilling = canDrill && s.wob > 2 && s.rpm > 5 && s.flow > 150;
  s.noise += (-s.noise * dt) / 150 + gauss(s.rand) * 0.018 * Math.sqrt(dt);
  let rop = 0;
  if (drilling) {
    rop = byRop({
      depth: s.depth,
      pp,
      ecd: s.ecd,
      wob: s.wob,
      rpm: s.rpm,
      bitSize: RIG.bit,
      wear: Math.min(1, s.wear),
      q: s.flow,
      mw: s.mw,
      tfa: TFA,
      // +0.9 ln(ft/hr): PDC drillability uplift over the roller-cone reference coefficients
      formation: { id: "", name: "", a1: layer.a1 + 0.9, a5: 1.0, a6: 0.6, abrasiveness: layer.abrasive, bitMu: 0.6 },
      a2: 0.00009,
      a3: 0.00025,
      a4: 0.00005,
      a7: 0.9,
      a8: 0.35,
      threshold: 0.4,
    });
    rop *= Math.exp(s.noise);
    if (s.wear > 0.9) rop *= Math.max(0.08, 1 - (s.wear - 0.9) * 6);
    rop = Math.min(rop, 350);
    const dz = (rop * dt) / 3600;
    s.depth = Math.min(sc.td, s.depth + dz);
    s.bitFootage += dz;
    s.bitHours += dt / 3600;
    const wd = s.wob / RIG.bit;
    // PDC cutters last ~2.5x the roller-cone reference tooth life
    const life = 2.5 * layer.abrasive * Math.pow(60 / Math.max(20, s.rpm), 1.5) * ((9 - Math.min(8.5, wd)) / 5);
    s.wear = Math.min(1.2, s.wear + dt / 3600 / Math.max(0.5, life));
  }
  s.ropRaw = rop;
  s.rop += (rop - s.rop) * Math.min(1, dt / 8);
  if (!tripping) s.bitDepth = drilling || (s.ctrl.onBottom && !busy) ? s.depth : Math.max(0, s.depth - 30);

  if (s.wear > 0.85 && !s.wornWarned) {
    s.wornWarned = true;
    pushEvent(s, "warning", "Bit performance falling off — torque erratic, ROP declining. Consider tripping for a new bit.");
  }

  /* ---------- torque & hookload ---------- */
  if (s.rpm > 1) {
    const t0 = (2.0 + 0.00055 * s.bitDepth) * (0.85 + (0.15 * s.rpm) / 120);
    const tb = drilling ? 0.6 * s.wob * (RIG.bit / 36) : 0;
    const ss = drilling
      ? layer.stickSlip * (s.wob / 30) * (90 / Math.max(40, s.rpm)) * 3.2 * Math.sin((s.t * 2 * Math.PI) / 7)
      : 0;
    const wearTq = drilling && s.wear > 0.85 ? (s.wear - 0.85) * 12 * (0.5 + s.rand()) : 0;
    s.torque = Math.max(0, t0 + tb + ss + wearTq + gauss(s.rand) * 0.12);
  } else {
    s.torque = 0;
  }
  const bf = 1 - s.mw / 65.5;
  const strW = stringWeightAir(s.depth) * bf;
  const tripFrac = tripping ? s.bitDepth / Math.max(1, s.depth) : 1;
  s.hook = RIG.block + strW * tripFrac - s.wob + gauss(s.rand) * 0.3;

  /* ---------- influx & losses ---------- */
  let qIn = 0;
  let qLoss = 0;
  const exposed = exposedLayers(s);
  const pumping = s.flow > 1;
  const wellEmw = (pumping ? s.ecd : s.mw) - (tripping && s.modeTimer > s.tripTotal / 2 ? 0.25 : 0);
  let worst: { depth: number; pp: number; fluid: Layer["fluid"] } | null = null;
  if (!s.bop) {
    for (const x of exposed) {
      if (x.l.perm <= 0) continue;
      const z = x.bottom;
      const ppz = ppAt(sc, Math.max(x.top, z - 0.01));
      const dP = 0.052 * (ppz - wellEmw) * z;
      if (dP > 0) {
        const exposure = Math.min(1, (x.bottom - x.top) / 25);
        qIn += 0.0035 * x.l.perm * dP * exposure;
        if (!worst || ppz - wellEmw > worst.pp - wellEmw) worst = { depth: z, pp: ppz, fluid: x.l.fluid };
      }
    }
    let minFg = sc.lot;
    let weakZ = sc.shoe;
    for (const x of exposed) {
      const fg = Math.min(fgAt(sc, x.top + 0.01), fgAt(sc, x.bottom - 0.01));
      if (fg < minFg) {
        minFg = fg;
        weakZ = x.top;
      }
    }
    if (wellEmw > minFg) {
      qLoss = 0.025 * 0.052 * (wellEmw - minFg) * weakZ;
      qLoss = Math.min(qLoss, pumping ? s.flow / 42 + 0.5 : 3);
    }
  }
  if (killing) {
    qIn = 0;
    qLoss = 0;
  }
  if (qIn > 0 && worst) {
    if (s.influxRate === 0 && s.t - s.lastInfluxNote > 900) {
      s.lastInfluxNote = s.t;
      pushEvent(s, "info", pumping ? "Flow-out trending above flow-in." : "Returns observed with pumps off.");
    }
    s.influxFluid = worst.fluid;
    s.kick = { depth: worst.depth, pp: worst.pp };
  }
  if (qLoss > 0.2 && s.lossRate <= 0.2) pushEvent(s, "serious", `Losses: returns dropping (${qLoss.toFixed(1)} bbl/min). ECD exceeds the weak zone.`);
  if (qLoss <= 0.05 && s.lossRate > 0.2) pushEvent(s, "good", "Losses healed — full returns.");
  s.influxRate = qIn;
  s.lossRate = qLoss;
  s.influx += (qIn * dt) / 60;
  s.pend.influx += (qIn * dt) / 60;
  s.lossTotal += (qLoss * dt) / 60;
  s.cost.losses += ((qLoss * dt) / 60) * RIG.mudLossCost;
  if (!killing) s.pitGain += ((qIn - qLoss) * dt) / 60;
  s.flowOut = s.bop ? (killing ? s.flow : 0) : Math.max(0, s.flow + (qIn - qLoss) * 42);

  /* ---------- lag transport of gas & influx ---------- */
  if (pumping && !s.bop) {
    s.pumped += ((s.flow / 42) * dt) / 60;
    const conc = drilling ? layer.gas * Math.pow(Math.max(1, s.rop) / 40, 0.7) * (520 / Math.max(150, s.flow)) : 3;
    s.pend.gasTime += conc * dt;
    s.pend.time += dt;
    if (s.pend.time >= 20) {
      const annVol = annulusVolume(s.depth, sc.shoe);
      const gas =
        s.pend.gasTime / s.pend.time +
        s.pend.connGas +
        (s.pend.influx > 0 ? (s.influxFluid === "gas" ? 900 : 150) * Math.min(6, s.pend.influx) : 0);
      s.queue.push({ at: s.pumped + annVol, gas, influx: s.pend.influx });
      s.pend = { gasTime: 0, time: 0, influx: 0, connGas: 0 };
    }
  } else if (!pumping && !s.bop) {
    // static near-balance -> connection / trip gas
    for (const x of exposed) {
      if (x.l.fluid !== "gas" && x.l.gas < 30) continue;
      const margin = s.mw - ppAt(sc, x.bottom - 0.01);
      if (margin < 0.35) s.pend.connGas += (dt / 60) * x.l.gas * 0.25 * Math.min(1, (0.35 - margin) / 0.35);
    }
  }
  while (s.queue.length && s.queue[0].at <= s.pumped) {
    const q = s.queue.shift()!;
    s.gasTarget = q.gas;
    if (q.influx > 0.01) {
      s.influx = Math.max(0, s.influx - q.influx);
      s.pitGain -= q.influx * 0.85;
      if (q.influx > 0.4)
        pushEvent(s, q.influx > 4 ? "serious" : "warning", `Influx at surface: ${q.influx.toFixed(1)} bbl of ${s.influxFluid ?? "formation fluid"} through the flowline.`);
      if (q.influx > 18) {
        endSim(s, false, "Well control incident", "A large gas influx unloaded the annulus at surface before the well was shut in.");
        return;
      }
    }
  }
  if (!pumping) s.gasTarget *= Math.exp(-dt / 600);
  if (killing && s.kill) {
    const p = killPoint(s.kill.profile, s.kill.strokes);
    s.gasTarget = p.phase.includes("choke") ? 2400 : 40;
  }
  s.gas += (s.gasTarget - s.gas) * Math.min(1, dt / 25);

  /* ---------- shut-in ---------- */
  if (shut) {
    if (!s.kick) {
      let best: { depth: number; pp: number } | null = null;
      for (const x of exposed) {
        if (x.l.perm <= 0) continue;
        const ppz = ppAt(sc, x.bottom - 0.01);
        if (!best || ppz - s.mw > best.pp - s.mw) best = { depth: x.bottom, pp: ppz };
      }
      s.kick = best;
    }
    const k = s.kick;
    const sidppT = k ? Math.max(0, 0.052 * (k.pp - s.mw) * k.depth) : 0;
    const h = influxHeight(s.influx);
    const gi = s.influxFluid === "gas" ? 0.1 : s.influxFluid === "oil" ? 0.33 : 0.45;
    const sicpT = s.influx > 0.05 ? sidppT + h * Math.max(0, 0.052 * s.mw - gi) : sidppT;
    if (s.influxFluid === "gas" && s.influx > 0.2 && sidppT > 0) s.migration += dt * 0.014;
    s.sidpp += (sidppT + s.migration - s.sidpp) * Math.min(1, dt / 70);
    s.sicp += (sicpT + s.migration - s.sicp) * Math.min(1, dt / 70);
    s.casingP = s.sicp;
    s.spp = s.sidpp;
    s.npt += dt / 3600;
    if (s.sicp > maasp(s) + 250) {
      endSim(s, false, "Shoe broke down", "Casing pressure exceeded MAASP by a wide margin — the formation at the shoe fractured (underground blowout).");
      return;
    }
  } else if (!killing) {
    s.casingP = 0;
  }

  /* ---------- kill ---------- */
  if (killing && s.kill) {
    s.npt += dt / 3600;
    s.kill.strokes += (RIG.killSpm * dt) / 60;
    const p = killPoint(s.kill.profile, s.kill.strokes);
    s.spp = p.dp;
    s.casingP = p.casing;
    s.pitGain = p.pit;
    s.flowOut = s.flow;
    if (s.kill.strokes >= s.kill.total) {
      const kmw = s.kill.kmw;
      const hrs = (s.t - s.shutInAt) / 3600;
      s.cost.mud += Math.max(0, kmw - s.mw) * RIG.weightUpCost;
      s.mw = kmw;
      s.ctrl.mwTarget = kmw;
      s.influx = 0;
      s.pitGain = 0;
      s.sidpp = 0;
      s.sicp = 0;
      s.casingP = 0;
      s.migration = 0;
      s.kick = null;
      s.bop = false;
      s.queue = [];
      s.mode = "idle";
      s.kill = null;
      s.ctrl.pumps = true;
      s.ctrl.flow = Math.min(s.ctrl.flow, 520);
      pushEvent(s, "good", `Well killed with ${kmw.toFixed(1)} ppg. Shut-in to dead well: ${hrs.toFixed(1)} h. BOP open — consider a trip margin.`);
    }
  }

  /* ---------- connections ---------- */
  if (drilling && s.ctrl.autoConn && s.depth >= s.nextConn && s.depth < sc.td) {
    s.mode = "connection";
    s.modeTimer = RIG.connTime;
    s.nextConn += RIG.standLength;
    s.connections += 1;
  } else if (!s.ctrl.autoConn && s.depth >= s.nextConn) {
    s.nextConn = s.depth + RIG.standLength;
  }

  /* ---------- drilling-break assist ---------- */
  if (drilling && s.wob > s.ctrl.wob * 0.9) {
    s.drillTime += dt;
    if (s.drillTime < 900) {
      s.breakRef = s.breakRef === 0 ? rop : s.breakRef + (rop - s.breakRef) * Math.min(1, dt / 120);
    } else {
      const fast = s.rop > s.breakRef * 1.8 && s.rop > 30;
      if (fast && s.t - s.lastBreak > 1800) {
        pushEvent(s, "warning", `Drilling break at ${Math.round(s.depth).toLocaleString("en-US")} ft (ROP ${Math.round(s.rop)} ft/hr). Flow check recommended.`);
        s.lastBreak = s.t;
      }
      s.breakRef += (rop - s.breakRef) * Math.min(1, dt / 1500);
    }
  }

  /* ---------- incidents ---------- */
  if (s.pitGain > 60) {
    endSim(s, false, "Well control incident", "Pit gain exceeded 60 bbl without the well being shut in.");
    return;
  }
  if (s.lossTotal > 650) {
    endSim(s, false, "Total losses", "More than 650 bbl of mud lost to the formation — hole lost the mud column.");
    return;
  }

  /* ---------- mode label ---------- */
  if (!busy && s.mode !== "connection") s.mode = drilling ? "drilling" : s.flow > 50 ? "circulating" : "idle";

  /* ---------- cost ---------- */
  s.cost.rig += (RIG.rigRate * dt) / 3600;

  /* ---------- sampling ---------- */
  if (s.t - s.lastTrend >= 20) {
    s.lastTrend = s.t;
    s.trend.push({
      t: s.t / 60,
      rop: s.rop,
      wob: s.wob,
      rpm: s.rpm,
      spp: s.spp,
      torque: s.torque,
      hook: s.hook,
      pit: s.pitGain,
      gas: s.gas,
      flowOut: s.flow > 1 ? (s.flowOut / s.flow) * 100 : s.flowOut > 0.5 ? 100 : 0,
      ecd: s.ecd,
      mw: s.mw,
      casing: s.casingP,
    });
    if (s.trend.length > 540) s.trend.splice(0, s.trend.length - 540);
  }
  if (drilling && s.depth - s.lastLog >= 5) {
    s.lastLog = s.depth;
    const R = Math.max(0.5, s.rop);
    const N = Math.max(1, s.rpm);
    const W = Math.max(1000, s.wob * 1000);
    const d = Math.log10(R / (60 * N)) / Math.log10((12 * W) / (1e6 * RIG.bit));
    const dxc = d * (8.9 / Math.max(8.3, s.ecd));
    s.log.push({ depth: s.depth, rop: s.rop, dxc, gas: s.gas, mw: s.mw, ecd: s.ecd });
    if (s.log.length > 2000) s.log.shift();
  }

  if (s.depth >= sc.td) {
    endSim(s, true, "TD reached", `Section drilled to ${sc.td.toLocaleString("en-US")} ft.`);
  }
}

function killPoint(profile: KillPoint[], strokes: number): KillPoint {
  if (strokes <= 0) return profile[0];
  for (let i = 1; i < profile.length; i++) {
    if (profile[i].strokes >= strokes) {
      const a = profile[i - 1];
      const b = profile[i];
      const t = (strokes - a.strokes) / Math.max(1e-6, b.strokes - a.strokes);
      return {
        ...b,
        dp: a.dp + (b.dp - a.dp) * t,
        casing: a.casing + (b.casing - a.casing) * t,
        pit: a.pit + (b.pit - a.pit) * t,
        shoe: a.shoe + (b.shoe - a.shoe) * t,
      };
    }
  }
  return profile[profile.length - 1];
}

function endSim(s: SimState, success: boolean, title: string, msg: string) {
  s.ended = { success, title, msg };
  pushEvent(s, success ? "good" : "critical", `${title}: ${msg}`);
}

/* ------------------------------------------------------------------ */
/* Derived                                                             */
/* ------------------------------------------------------------------ */
export function totalCost(s: SimState) {
  return s.cost.rig + s.cost.bits + s.cost.mud + s.cost.losses;
}

export function costPerFoot(s: SimState) {
  const ft = s.depth - s.startDepth;
  return ft > 1 ? totalCost(s) / ft : NaN;
}

export function spm(s: SimState) {
  return s.flow / 42 / RIG.pumpOutput;
}

export function bottomsUpMinutes(s: SimState) {
  const v = annulusVolume(s.depth, s.scenario.shoe);
  return s.flow > 1 ? v / (s.flow / 42) : Infinity;
}

export type Alarm = { level: Level; msg: string };

export function alarms(s: SimState): Alarm[] {
  const out: Alarm[] = [];
  if (s.mode === "shut-in" && s.sicp > maasp(s)) out.push({ level: "critical", msg: "SICP above MAASP" });
  if (!s.bop && s.flow < 1 && s.flowOut > 3) out.push({ level: "critical", msg: "Well flowing with pumps off — shut in" });
  if (s.pitGain > 15) out.push({ level: "critical", msg: `Pit gain ${s.pitGain.toFixed(1)} bbl` });
  else if (s.pitGain > 5) out.push({ level: "serious", msg: `Pit gain ${s.pitGain.toFixed(1)} bbl` });
  else if (s.pitGain > 2) out.push({ level: "warning", msg: `Pit gain ${s.pitGain.toFixed(1)} bbl` });
  if (s.pitGain < -10) out.push({ level: "serious", msg: `Pit loss ${(-s.pitGain).toFixed(1)} bbl` });
  if (!s.bop && s.flow > 1) {
    const diff = ((s.flowOut - s.flow) / s.flow) * 100;
    if (diff > 6) out.push({ level: "serious", msg: `Flow-out +${diff.toFixed(0)}%` });
    if (diff < -10) out.push({ level: "serious", msg: `Flow-out ${diff.toFixed(0)}% (losses)` });
  }
  if (s.gas > 1000) out.push({ level: "serious", msg: `Gas ${Math.round(s.gas)} units` });
  else if (s.gas > 300) out.push({ level: "warning", msg: `Gas ${Math.round(s.gas)} units` });
  if (s.ecd > s.scenario.lot - 0.2 && s.flow > 1) out.push({ level: "warning", msg: "ECD near shoe LOT" });
  if (s.torque > 18) out.push({ level: "warning", msg: "High torque / stick-slip" });
  if (s.wear > 0.85) out.push({ level: "warning", msg: `Bit wear ${(s.wear * 100).toFixed(0)}%` });
  return out;
}
