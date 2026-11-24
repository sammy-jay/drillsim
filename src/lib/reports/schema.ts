import { minimumCurvature } from "../calc/trajectory";

/* ------------------------------------------------------------------ */
/* Data model — values are kept as text, the way they are typed        */
/* ------------------------------------------------------------------ */
export type TimeRow = { from: string; to: string; code: string; npt: boolean; phase: string; ops: string };
export type SurveyRow = { md: string; inc: string; azi: string; tvd: string; note: string };
export type PersonRow = { company: string; role: string; count: string };
export type BulkRow = { item: string; unit: string; start: string; received: string; used: string };

export type FieldDef = { k: string; label: string; unit?: string; wide?: boolean; placeholder?: string };

export const HEADER_FIELDS: FieldDef[] = [
  { k: "well", label: "Well" },
  { k: "field", label: "Field" },
  { k: "rig", label: "Rig" },
  { k: "operator", label: "Operator" },
  { k: "contractor", label: "Drilling contractor" },
  { k: "reportNo", label: "Report no." },
  { k: "date", label: "Report date", placeholder: "YYYY-MM-DD" },
  { k: "period", label: "Period", placeholder: "00:00 – 24:00" },
  { k: "spud", label: "Spud date", placeholder: "YYYY-MM-DD" },
  { k: "dfs", label: "Days from spud" },
  { k: "afeDays", label: "Planned days (AFE)" },
  { k: "mdPrev", label: "Depth at 00:00 (MD)", unit: "ft" },
  { k: "md", label: "Depth at 24:00 (MD)", unit: "ft" },
  { k: "tvd", label: "TVD at 24:00", unit: "ft" },
  { k: "hole", label: "Hole size", unit: "in" },
  { k: "lastCsg", label: "Last casing" },
  { k: "shoe", label: "Shoe depth (MD)", unit: "ft" },
  { k: "lot", label: "LOT / FIT (EMW)", unit: "ppg" },
  { k: "nextCsg", label: "Next casing" },
  { k: "supervisor", label: "Company man" },
  { k: "toolpusher", label: "Toolpusher" },
  { k: "engineer", label: "Drilling engineer" },
];

export const MUD_FIELDS: FieldDef[] = [
  { k: "type", label: "Mud type", wide: true },
  { k: "sample", label: "Sample from / time" },
  { k: "mw", label: "Mud weight", unit: "ppg" },
  { k: "fv", label: "Funnel viscosity", unit: "s/qt" },
  { k: "pv", label: "Plastic viscosity", unit: "cP" },
  { k: "yp", label: "Yield point", unit: "lb/100ft²" },
  { k: "gels", label: "Gels 10 s / 10 min", unit: "lb/100ft²" },
  { k: "fl", label: "API fluid loss", unit: "mL/30min" },
  { k: "cake", label: "Filter cake", unit: "/32 in" },
  { k: "ph", label: "pH" },
  { k: "solids", label: "Solids", unit: "%" },
  { k: "sand", label: "Sand", unit: "%" },
  { k: "mbt", label: "MBT", unit: "lb/bbl" },
  { k: "cl", label: "Chlorides", unit: "mg/L" },
  { k: "temp", label: "Flowline temp.", unit: "°F" },
  { k: "ecd", label: "ECD at bit", unit: "ppg" },
  { k: "losses", label: "Mud losses (24 h)", unit: "bbl" },
];

export const BIT_FIELDS: FieldDef[] = [
  { k: "no", label: "Bit no." },
  { k: "size", label: "Size", unit: "in" },
  { k: "type", label: "Type / model", wide: true },
  { k: "iadc", label: "IADC code" },
  { k: "serial", label: "Serial no." },
  { k: "jets", label: "Nozzles", unit: "/32" },
  { k: "depthIn", label: "Depth in", unit: "ft" },
  { k: "depthOut", label: "Depth out", unit: "ft" },
  { k: "footage", label: "Footage (cum.)", unit: "ft" },
  { k: "hours", label: "Hours (cum.)", unit: "h" },
  { k: "rop", label: "Average ROP", unit: "ft/hr" },
  { k: "dull", label: "IADC dull grade", wide: true },
];

export const PARAM_FIELDS: FieldDef[] = [
  { k: "wob", label: "Weight on bit", unit: "klbf" },
  { k: "rpm", label: "Rotary speed", unit: "rpm" },
  { k: "torque", label: "Torque", unit: "kft·lbf" },
  { k: "flow", label: "Flow rate", unit: "gpm" },
  { k: "spp", label: "Standpipe pressure", unit: "psi" },
  { k: "rop", label: "ROP", unit: "ft/hr" },
  { k: "pu", label: "Pick-up weight", unit: "klbf" },
  { k: "so", label: "Slack-off weight", unit: "klbf" },
  { k: "rot", label: "Rotating weight", unit: "klbf" },
  { k: "gas", label: "Background / max gas", unit: "units" },
];

export const CASING_FIELDS: FieldDef[] = [
  { k: "string", label: "Casing run", wide: true },
  { k: "shoe", label: "Shoe depth", unit: "ft" },
  { k: "fc", label: "Float collar", unit: "ft" },
  { k: "joints", label: "Joints / centralizers" },
  { k: "spacer", label: "Spacer" },
  { k: "lead", label: "Lead slurry" },
  { k: "tail", label: "Tail slurry" },
  { k: "disp", label: "Displacement" },
  { k: "bump", label: "Plug bump / floats" },
  { k: "toc", label: "Top of cement (est.)", unit: "ft" },
];

export const WC_FIELDS: FieldDef[] = [
  { k: "scr1", label: "SCR pump 1", wide: true },
  { k: "scr2", label: "SCR pump 2", wide: true },
  { k: "maasp", label: "MAASP", unit: "psi" },
  { k: "kickTol", label: "Kick tolerance", unit: "bbl" },
  { k: "bopTest", label: "Last BOP test" },
  { k: "nextBop", label: "Next BOP test" },
  { k: "kick", label: "Kick / influx", wide: true },
  { k: "shutIn", label: "Shut-in pressures", wide: true },
  { k: "kill", label: "Kill summary", wide: true },
];

export const HSE_FIELDS: FieldDef[] = [
  { k: "incidents", label: "Incidents / near misses", wide: true },
  { k: "lti", label: "Days since last LTI" },
  { k: "drills", label: "Drills" },
  { k: "meetings", label: "Safety meetings", wide: true },
  { k: "permits", label: "Permits / JSAs", wide: true },
  { k: "observations", label: "Observation cards" },
  { k: "weather", label: "Weather" },
];

export const COST_FIELDS: FieldDef[] = [
  { k: "daily", label: "Daily cost", unit: "$" },
  { k: "cumulative", label: "Cumulative cost", unit: "$" },
  { k: "afe", label: "AFE (approved budget)", unit: "$" },
  { k: "mud", label: "Mud cost (daily)", unit: "$" },
];

export type DDR = {
  id: string;
  example?: boolean;
  label?: string;
  header: Record<string, string>;
  status: string;
  summary: string;
  forecast: string;
  time: TimeRow[];
  mud: Record<string, string>;
  bit: Record<string, string>;
  bha: string;
  params: Record<string, string>;
  surveys: SurveyRow[];
  casing: Record<string, string>;
  wellControl: Record<string, string>;
  hse: Record<string, string>;
  personnel: PersonRow[];
  bulks: BulkRow[];
  costs: Record<string, string>;
  remarks: string;
};

const blankRecord = (defs: FieldDef[]) => Object.fromEntries(defs.map((d) => [d.k, ""]));

export function blankReport(id: string): DDR {
  return {
    id,
    header: { ...blankRecord(HEADER_FIELDS), period: "00:00 – 24:00" },
    status: "",
    summary: "",
    forecast: "",
    time: [{ from: "00:00", to: "", code: "2", npt: false, phase: "", ops: "" }],
    mud: blankRecord(MUD_FIELDS),
    bit: blankRecord(BIT_FIELDS),
    bha: "",
    params: blankRecord(PARAM_FIELDS),
    surveys: [],
    casing: blankRecord(CASING_FIELDS),
    wellControl: blankRecord(WC_FIELDS),
    hse: blankRecord(HSE_FIELDS),
    personnel: [],
    bulks: [],
    costs: blankRecord(COST_FIELDS),
    remarks: "",
  };
}

/* ------------------------------------------------------------------ */
/* IADC daily drilling report operation codes                          */
/* ------------------------------------------------------------------ */
export const IADC_CODES: { code: string; name: string; cat: "drill" | "flat" | "other" }[] = [
  { code: "1", name: "Rig up and tear down", cat: "flat" },
  { code: "2", name: "Drilling actual", cat: "drill" },
  { code: "3", name: "Reaming", cat: "drill" },
  { code: "4", name: "Coring", cat: "drill" },
  { code: "5", name: "Condition and circulate mud", cat: "flat" },
  { code: "6", name: "Trips", cat: "flat" },
  { code: "7", name: "Lubricate rig", cat: "flat" },
  { code: "8", name: "Repair rig", cat: "flat" },
  { code: "9", name: "Cut off drilling line", cat: "flat" },
  { code: "10", name: "Deviation survey", cat: "drill" },
  { code: "11", name: "Wireline logs", cat: "flat" },
  { code: "12", name: "Run casing and cement", cat: "flat" },
  { code: "13", name: "Wait on cement", cat: "flat" },
  { code: "14", name: "Nipple up BOP", cat: "flat" },
  { code: "15", name: "Test BOP", cat: "flat" },
  { code: "16", name: "Drill stem test", cat: "flat" },
  { code: "17", name: "Plug back", cat: "flat" },
  { code: "18", name: "Squeeze cement", cat: "flat" },
  { code: "19", name: "Fishing", cat: "flat" },
  { code: "20", name: "Directional work", cat: "drill" },
  { code: "21", name: "Other (specify)", cat: "other" },
];

export function codeName(code: string) {
  return IADC_CODES.find((c) => c.code === code)?.name ?? "—";
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */
export function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59 || (h === 24 && mm > 0)) return null;
  return h * 60 + mm;
}

export function rowHours(r: TimeRow) {
  const a = parseTime(r.from);
  const b = parseTime(r.to);
  if (a === null || b === null) return NaN;
  return (b - a) / 60;
}

export function timeCheck(rows: TimeRow[]) {
  const issues: string[] = [];
  let total = 0;
  let npt = 0;
  rows.forEach((r, i) => {
    const h = rowHours(r);
    if (!Number.isFinite(h)) {
      issues.push(`Line ${i + 1}: enter times as HH:MM.`);
      return;
    }
    if (h <= 0) issues.push(`Line ${i + 1}: end time must be after start time.`);
    total += Math.max(0, h);
    if (r.npt) npt += Math.max(0, h);
    if (i > 0 && rows[i - 1].to && r.from && rows[i - 1].to !== r.from) {
      issues.push(`Gap or overlap between line ${i} (${rows[i - 1].to}) and line ${i + 1} (${r.from}).`);
    }
  });
  if (rows.length && rows[0].from !== "00:00") issues.push("The first line should start at 00:00.");
  if (Math.abs(total - 24) > 0.01) issues.push(`Time log totals ${total.toFixed(2)} h — a daily report must account for 24 h.`);
  return { total, npt, issues };
}

export const num = (s: string | undefined) => {
  if (!s) return NaN;
  const v = Number(String(s).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(v) ? v : NaN;
};

/** Surveys: the first row is the tie-in (needs TVD); later rows are computed by minimum curvature. */
export function computeSurveys(rows: SurveyRow[]) {
  const valid = rows.filter((r) => Number.isFinite(num(r.md)) && Number.isFinite(num(r.inc)) && Number.isFinite(num(r.azi)));
  if (valid.length === 0) return [];
  const stations = minimumCurvature(valid.map((r) => ({ md: num(r.md), inc: num(r.inc), azi: num(r.azi) })));
  const tie = Number.isFinite(num(valid[0].tvd)) ? num(valid[0].tvd) : stations[0].tvd;
  const off = tie - stations[0].tvd;
  return stations.map((s, i) => ({
    ...s,
    tvd: s.tvd + off,
    given: num(valid[i].tvd),
    note: valid[i].note,
    tieIn: i === 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Reading guide                                                       */
/* ------------------------------------------------------------------ */
export type SectionId =
  | "header"
  | "status"
  | "summary"
  | "forecast"
  | "time"
  | "mud"
  | "bit"
  | "params"
  | "surveys"
  | "casing"
  | "wellControl"
  | "hse"
  | "personnel"
  | "bulks"
  | "costs"
  | "remarks";

export const SECTION_GUIDE: Record<SectionId, { title: string; what: string; how: string }> = {
  header: {
    title: "Header",
    what: "Identifies the well and the report, and gives a snapshot of where the well stands at the end of the period (usually midnight).",
    how: "Depth at 24:00 minus depth at 00:00 = progress. Always quote measured depth (MD); add TVD for deviated wells. Days from spud lets readers compare actual vs planned (AFE) time.",
  },
  status: {
    title: "Status at report time",
    what: "One line describing what the rig is doing when the report is sent (often 06:00 the next morning).",
    how: "Start with the time, then the operation and depth: “06:00: Drilling 8-1/2\" hole at 8,540 ft.”",
  },
  summary: {
    title: "24-hour summary",
    what: "The executive summary. Many managers read only this, so it must stand alone.",
    how: "3–6 sentences: footage drilled, key operations, any problem with its cause and duration (NPT), and safety. Lead with the most important fact. Use numbers, not adjectives.",
  },
  forecast: {
    title: "24-hour forecast",
    what: "What the team plans to do next, so logistics and service companies can prepare.",
    how: "Short, in planned order. Mention anything that needs people or equipment mobilised.",
  },
  time: {
    title: "Time breakdown (operations log)",
    what: "The heart of the report: every minute of the 24 hours, in order, with no gaps or overlaps.",
    how: "Each line: from–to, hours, IADC operation code, NPT flag and a factual description in past tense with depths, parameters and volumes. One operation per line. Flag non-productive time (NPT) with its cause: it drives cost analysis and lessons learned.",
  },
  mud: {
    title: "Mud properties",
    what: "The mud engineer's check of the drilling fluid at a stated time and sample point.",
    how: "Compare with the mud program. Trends matter more than single values: rising solids, falling pH or increasing fluid loss are early warnings.",
  },
  bit: {
    title: "Bit record",
    what: "Which bit is in the hole and how much it has done.",
    how: "When a bit is pulled, record the 8-part IADC dull grade: inner / outer cutting structure (0–8), dull characteristic, location, bearings, gauge (1/16 in out), other dull, reason pulled.",
  },
  params: {
    title: "Drilling parameters",
    what: "Typical values (or ranges) used while drilling, plus string weights.",
    how: "Pick-up / slack-off / rotating weights at connections track drag: a widening gap between them means worsening hole condition.",
  },
  surveys: {
    title: "Directional surveys",
    what: "Inclination and azimuth from the MWD at survey depths.",
    how: "The first line is the tie-in (last survey of the previous report). TVD, vertical section and dogleg severity are computed with the minimum-curvature method.",
  },
  casing: {
    title: "Casing & cementing",
    what: "The permanent record of what was cemented in the well — essential for well integrity.",
    how: "Record string details, shoe and float-collar depths, volumes and densities pumped, displacement, plug bump pressure and whether the floats held.",
  },
  wellControl: {
    title: "Well control",
    what: "Data the crew needs to kill the well instantly, and a record of any well-control event.",
    how: "Take slow circulating rates (SCRs) every tour, after mud weight changes and new BHAs. Update MAASP whenever the mud weight changes. For a kick record time, depth, pit gain, SIDPP, SICP, kill mud weight and the method used.",
  },
  hse: {
    title: "Health, safety & environment",
    what: "Incidents, near misses, drills, meetings and permits.",
    how: "Report near misses as faithfully as incidents — they are free lessons. Record drill response times.",
  },
  personnel: {
    title: "Personnel on board (POB)",
    what: "Headcount by company — required for emergency response and for cost tracking.",
    how: "List every company on location; the total must match the muster list.",
  },
  bulks: {
    title: "Bulk materials",
    what: "Stock of consumables: fuel, water, barite, cement, chemicals.",
    how: "Remaining = start + received − used. Low stocks of barite or cement are a well-control and logistics risk.",
  },
  costs: {
    title: "Costs",
    what: "Daily and cumulative spend against the approved budget (AFE).",
    how: "Cumulative cost ÷ depth drilled (and vs days) shows whether the well is on budget.",
  },
  remarks: {
    title: "Remarks & lessons learned",
    what: "Observations that don't fit elsewhere, recommendations and lessons learned.",
    how: "Be specific: what happened, why, and what will be done differently.",
  },
};

export const WRITING_RULES: { rule: string; example: string }[] = [
  { rule: "Account for all 24 hours — no gaps, no overlaps.", example: "00:00–05:30, 05:30–06:00, 06:00–11:00 …" },
  { rule: "Write in the past tense, factually, without blame.", example: "“Changed out washpipe packing.” — not “The crew finally fixed the washpipe.”" },
  { rule: "Quantify everything: depths, volumes, pressures, times.", example: "“Pumped 30 bbl hi-vis sweep at 4,480 ft — 10% more cuttings at shakers.”" },
  { rule: "Depths are MD unless stated; give TVD for deviated wells.", example: "“Shoe at 7,490 ft MD / 7,487 ft TVD.”" },
  { rule: "Use 24-hour clock and standard abbreviations consistently.", example: "POOH, RIH, CBU, WOC, PJSM …" },
  { rule: "One operation per time line; split long activities when parameters change.", example: "Separate “drilled” from “circulated” and “surveyed”." },
  { rule: "Flag NPT and state cause, responsible party and corrective action.", example: "“NPT 1.5 h — top-drive washpipe leak (contractor equipment).”" },
  { rule: "Record well-control data every tour even when nothing happens.", example: "SCRs, MAASP, pit drill times." },
  { rule: "The summary must stand alone — someone reading only it should understand the day.", example: "Lead with footage and the biggest event." },
];

export const ABBREVIATIONS: [string, string][] = [
  ["AFE", "Authorisation for expenditure (approved budget)"],
  ["API", "American Petroleum Institute (standards, e.g. API fluid loss)"],
  ["AV", "Annular velocity"],
  ["BHA", "Bottomhole assembly"],
  ["BHP", "Bottomhole pressure"],
  ["B/O", "Break out (unscrew a connection)"],
  ["BOP", "Blowout preventer"],
  ["BTC", "Buttress thread connection (casing)"],
  ["BU / CBU", "Bottoms up / circulate bottoms up"],
  ["CIP", "Cement in place (time the plug bumped)"],
  ["CSG / CMT", "Casing / cement"],
  ["DC", "Drill collar"],
  ["DD", "Directional driller"],
  ["DFS", "Days from spud"],
  ["DLS", "Dogleg severity"],
  ["DP", "Drill pipe"],
  ["ECD", "Equivalent circulating density"],
  ["EMW", "Equivalent mud weight"],
  ["FC / FS", "Float collar / float shoe"],
  ["FCP / ICP", "Final / initial circulating pressure (kill)"],
  ["FIT / LOT", "Formation integrity test / leak-off test"],
  ["HCR", "Hydraulically controlled remote valve (choke line)"],
  ["HWDP", "Heavy-weight drill pipe"],
  ["JSA", "Job safety analysis"],
  ["KMW", "Kill mud weight"],
  ["KOP", "Kick-off point"],
  ["LCM", "Lost-circulation material"],
  ["L/D", "Lay down (pipe or tools)"],
  ["LTI", "Lost-time injury"],
  ["MAASP", "Maximum allowable annular surface pressure"],
  ["MD / TVD", "Measured depth / true vertical depth"],
  ["M/U", "Make up (screw together a connection)"],
  ["MW", "Mud weight"],
  ["MWD / LWD", "Measurement / logging while drilling"],
  ["NPT", "Non-productive time"],
  ["OH", "Open hole"],
  ["PJSM", "Pre-job safety meeting"],
  ["POB", "Personnel on board"],
  ["POOH / TOH", "Pull out of hole / trip out of hole"],
  ["P/U / S/O", "Pick up / slack off (string weights)"],
  ["PV / YP", "Plastic viscosity / yield point"],
  ["R/U / R/D", "Rig up / rig down"],
  ["RIH / TIH", "Run in hole / trip in hole"],
  ["ROP", "Rate of penetration"],
  ["SCR", "Slow circulating rate (pressure at kill pump rate)"],
  ["SICP / SIDPP", "Shut-in casing / drill-pipe pressure"],
  ["SPP", "Standpipe pressure"],
  ["TD", "Total depth (of the well or section)"],
  ["TOC", "Top of cement"],
  ["W&W", "Wait & Weight (Engineer's) kill method"],
  ["WOB", "Weight on bit"],
  ["WOC", "Wait on cement"],
];

export const DULL_GRADE: [string, string][] = [
  ["1 · Inner rows", "Cutter wear on the inner 2/3 of the bit, 0 (none) – 8 (fully worn)"],
  ["2 · Outer rows", "Cutter wear on the outer 1/3, 0 – 8"],
  ["3 · Dull characteristic", "Main wear feature, e.g. WT worn teeth, BT broken teeth, CT chipped, LT lost teeth, RO ring out, NO none"],
  ["4 · Location", "Where on the bit: C cone, N nose, T taper, S shoulder, G gauge, A all areas"],
  ["5 · Bearings / seals", "Roller-cone bearings (E effective, F failed); X for fixed-cutter (PDC) bits"],
  ["6 · Gauge", "I in gauge, or how far under gauge in 1/16 in (e.g. 1/16)"],
  ["7 · Other dull", "Secondary feature (same codes as 3)"],
  ["8 · Reason pulled", "e.g. TD total depth, PR penetration rate, CP core point, HR hours, BHA change, DMF motor failure"],
];
