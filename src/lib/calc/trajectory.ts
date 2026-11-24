import { deg, rad } from "./common";

export type SurveyInput = { md: number; inc: number; azi: number };

export type Station = SurveyInput & {
  tvd: number;
  north: number;
  east: number;
  vs: number;
  dls: number; // deg/100ft
  closure: number;
  closureAzi: number;
  build: number; // deg/100ft
  turn: number; // deg/100ft
};

/** Minimum curvature survey computation. */
export function minimumCurvature(surveys: SurveyInput[], vsAzimuth = 0): Station[] {
  const sorted = [...surveys].filter((s) => Number.isFinite(s.md)).sort((a, b) => a.md - b.md);
  const out: Station[] = [];
  let tvd = 0,
    n = 0,
    e = 0;
  const vsA = rad(vsAzimuth);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    let dls = 0,
      build = 0,
      turn = 0;
    if (i === 0) {
      // assume vertical from surface to first station if it does not start at 0
      tvd = s.md * Math.cos(rad(s.inc));
      n = 0;
      e = 0;
    } else {
      const p = sorted[i - 1];
      const dMD = s.md - p.md;
      const i1 = rad(p.inc),
        i2 = rad(s.inc),
        a1 = rad(p.azi),
        a2 = rad(s.azi);
      const cosB = Math.cos(i2 - i1) - Math.sin(i1) * Math.sin(i2) * (1 - Math.cos(a2 - a1));
      const beta = Math.acos(Math.min(1, Math.max(-1, cosB)));
      const rf = beta < 1e-7 ? 1 : (2 / beta) * Math.tan(beta / 2);
      n += (dMD / 2) * (Math.sin(i1) * Math.cos(a1) + Math.sin(i2) * Math.cos(a2)) * rf;
      e += (dMD / 2) * (Math.sin(i1) * Math.sin(a1) + Math.sin(i2) * Math.sin(a2)) * rf;
      tvd += (dMD / 2) * (Math.cos(i1) + Math.cos(i2)) * rf;
      if (dMD > 0) {
        dls = (deg(beta) * 100) / dMD;
        build = ((s.inc - p.inc) * 100) / dMD;
        let dA = s.azi - p.azi;
        if (dA > 180) dA -= 360;
        if (dA < -180) dA += 360;
        turn = (dA * 100) / dMD;
      }
    }
    const closure = Math.hypot(n, e);
    let cAzi = deg(Math.atan2(e, n));
    if (cAzi < 0) cAzi += 360;
    out.push({
      ...s,
      tvd,
      north: n,
      east: e,
      vs: n * Math.cos(vsA) + e * Math.sin(vsA),
      dls,
      closure,
      closureAzi: cAzi,
      build,
      turn,
    });
  }
  return out;
}

export type PlanType = "j" | "s" | "horizontal";

export type PlanInput = {
  type: PlanType;
  kop: number; // ft
  bur: number; // deg/100ft
  dor: number; // drop rate deg/100ft (S-type)
  targetTvd: number;
  targetDisp: number; // horizontal departure
  azimuth: number;
  lateral: number; // horizontal lateral length
  landingInc: number; // horizontal landing inclination
  stationStep: number;
};

export type PlanResult = {
  ok: boolean;
  message?: string;
  maxInc: number;
  eobMd: number;
  eobTvd: number;
  holdLength: number;
  sodMd?: number;
  eodMd?: number;
  tdMd: number;
  surveys: SurveyInput[];
  stations: Station[];
  keyPoints: { label: string; md: number }[];
};

/**
 * Build a well plan. J (build-hold) and S (build-hold-drop to vertical at target) share one
 * closed form: with an effective radius R (R1 for J, R1+R2 for S) the tangent angle solves
 * d sin(t) + (R - X) cos(t) = R, where d = target TVD - KOP and X = departure.
 */
export function planWell(p: PlanInput): PlanResult {
  const R1 = 18000 / (Math.PI * Math.max(0.1, p.bur));
  const R2 = 18000 / (Math.PI * Math.max(0.1, p.dor));
  const step = Math.max(10, p.stationStep);
  const fail = (message: string): PlanResult => ({
    ok: false,
    message,
    maxInc: 0,
    eobMd: 0,
    eobTvd: 0,
    holdLength: 0,
    tdMd: 0,
    surveys: [],
    stations: [],
    keyPoints: [],
  });

  // inclination as a function of MD
  let incAt: (md: number) => number;
  let tdMd: number;
  let maxInc: number;
  let eobMd: number;
  let hold = 0;
  let sodMd: number | undefined;
  let eodMd: number | undefined;
  const keyPoints: { label: string; md: number }[] = [];

  if (p.type === "horizontal") {
    const theta = Math.min(95, Math.max(1, p.landingInc));
    const buildLen = (theta / p.bur) * 100;
    eobMd = p.kop + buildLen;
    tdMd = eobMd + Math.max(0, p.lateral);
    maxInc = theta;
    incAt = (md) => (md <= p.kop ? 0 : md <= eobMd ? ((md - p.kop) * p.bur) / 100 : theta);
    keyPoints.push({ label: "KOP", md: p.kop }, { label: "Landing", md: eobMd }, { label: "TD", md: tdMd });
  } else {
    const d = p.targetTvd - p.kop;
    const X = p.targetDisp;
    if (d <= 0) return fail("Target TVD must be deeper than the kick-off point.");
    const R = p.type === "j" ? R1 : R1 + R2;
    const A = d;
    const B = R - X;
    const L = Math.hypot(A, B);
    if (L < R) return fail("Target is inside the build radius — raise the build rate or move KOP up.");
    const phi = Math.atan2(B, A);
    const t = Math.asin(R / L) - phi;
    if (!(t >= 0) || t > Math.PI / 2 + 1e-6) return fail("No feasible tangent angle for this target.");
    const tDeg = deg(t);
    hold = Math.sqrt(Math.max(0, L * L - R * R));
    maxInc = tDeg;
    eobMd = p.kop + (tDeg / p.bur) * 100;
    if (p.type === "j") {
      tdMd = eobMd + hold;
      incAt = (md) => (md <= p.kop ? 0 : md <= eobMd ? ((md - p.kop) * p.bur) / 100 : tDeg);
      keyPoints.push({ label: "KOP", md: p.kop }, { label: "EOB", md: eobMd }, { label: "Target", md: tdMd });
    } else {
      sodMd = eobMd + hold;
      eodMd = sodMd + (tDeg / p.dor) * 100;
      tdMd = eodMd;
      const s0 = sodMd;
      incAt = (md) =>
        md <= p.kop
          ? 0
          : md <= eobMd
            ? ((md - p.kop) * p.bur) / 100
            : md <= s0
              ? tDeg
              : Math.max(0, tDeg - ((md - s0) * p.dor) / 100);
      keyPoints.push(
        { label: "KOP", md: p.kop },
        { label: "EOB", md: eobMd },
        { label: "SOD", md: sodMd },
        { label: "Target", md: eodMd },
      );
    }
  }

  const mds = new Set<number>();
  for (let md = 0; md < tdMd; md += step) mds.add(Math.round(md * 100) / 100);
  keyPoints.forEach((k) => mds.add(Math.round(k.md * 100) / 100));
  mds.add(Math.round(tdMd * 100) / 100);
  const surveys = [...mds]
    .sort((a, b) => a - b)
    .map((md) => ({ md, inc: incAt(md), azi: incAt(md) > 0 ? p.azimuth : 0 }));
  // keep azimuth constant along the whole plan for clean min-curvature
  surveys.forEach((s) => (s.azi = p.azimuth));
  const stations = minimumCurvature(surveys, p.azimuth);
  const eob = stations.find((s) => Math.abs(s.md - eobMd) < 0.01);

  return {
    ok: true,
    maxInc,
    eobMd,
    eobTvd: eob?.tvd ?? 0,
    holdLength: hold,
    sodMd,
    eodMd,
    tdMd,
    surveys,
    stations,
    keyPoints,
  };
}

/** Interpolate a station (inc, azi, tvd, n, e) at an arbitrary MD along computed stations. */
export function interpolateAt(stations: Station[], md: number) {
  if (stations.length === 0) return { md, inc: 0, azi: 0, tvd: md, north: 0, east: 0 };
  if (md <= stations[0].md) {
    const s = stations[0];
    return { md, inc: s.inc, azi: s.azi, tvd: (md / Math.max(1, s.md)) * s.tvd, north: 0, east: 0 };
  }
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1];
    const b = stations[i];
    if (md <= b.md) {
      const t = (md - a.md) / Math.max(1e-6, b.md - a.md);
      return {
        md,
        inc: a.inc + (b.inc - a.inc) * t,
        azi: a.azi + (b.azi - a.azi) * t,
        tvd: a.tvd + (b.tvd - a.tvd) * t,
        north: a.north + (b.north - a.north) * t,
        east: a.east + (b.east - a.east) * t,
      };
    }
  }
  const l = stations[stations.length - 1];
  return { md, inc: l.inc, azi: l.azi, tvd: l.tvd, north: l.north, east: l.east };
}
