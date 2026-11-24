"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Trajectory3D } from "@/components/charts/Trajectory3D";
import { WellDiagram } from "@/components/charts/WellDiagram";
import { XYChart } from "@/components/charts/XYChart";
import { Button, NumberField, Segmented, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { Panel, cn } from "@/components/ui/Panel";
import { Badge, Callout, Stat, StatGrid } from "@/components/ui/Stat";
import { Unit } from "@/components/ui/Unit";
import { computePlot, parseSurveyText, PLOT_COLS, pointAtMd, toCsv, type PlotRow } from "@/lib/calc/surveyData";
import { planWell } from "@/lib/calc/trajectory";
import { fmt, gauss, rng } from "@/lib/format";
import { useLocalStore } from "@/lib/localStore";

type CasingRow = { label: string; shoe: string; od: string; hole: string };
type TopRow = { name: string; tvd: string };
type TargetRow = { name: string; tvd: string; ns: string; ew: string; radius: string };

type PlotState = {
  wellName: string;
  vsAz: string;
  elevation: string;
  openHole: string;
  useGiven: boolean;
  rows: PlotRow[];
  casing: CasingRow[];
  tops: TopRow[];
  targets: TargetRow[];
};

const COL_META: Record<keyof PlotRow, { label: string; unit: string; hint: string }> = {
  md: { label: "MD", unit: "ft", hint: "Measured depth — required" },
  inc: { label: "Inc", unit: "°", hint: "Inclination" },
  azi: { label: "Azi", unit: "°", hint: "Azimuth (0–360, from north)" },
  tvd: { label: "TVD", unit: "ft", hint: "Optional — computed if blank" },
  vs: { label: "VSec", unit: "ft", hint: "Optional — computed if blank" },
  ns: { label: "N/S", unit: "ft", hint: "Optional (+N / −S)" },
  ew: { label: "E/W", unit: "ft", hint: "Optional (+E / −W)" },
};

function jTypeExample(withGiven: boolean): PlotRow[] {
  const plan = planWell({ type: "j", kop: 2500, bur: 3, dor: 2, targetTvd: 9000, targetDisp: 3500, azimuth: 45, lateral: 0, landingInc: 90, stationStep: 50 });
  const r = rng(9);
  const out: PlotRow[] = [];
  let dI = 0;
  let dA = 0;
  const pick = plan.stations.filter((s, i) => i === 0 || Math.round(s.md) % 300 === 0 || i === plan.stations.length - 1);
  for (const s of pick) {
    if (s.inc > 0.5) {
      dI = dI * 0.8 + gauss(r) * 0.35;
      dA = dA * 0.8 + gauss(r) * 0.8;
    }
    out.push({
      md: String(Math.round(s.md)),
      inc: (Math.max(0, s.inc + (s.inc > 0.5 ? dI : 0))).toFixed(2),
      azi: (s.inc > 0.5 ? s.azi + dA : 0).toFixed(2),
      tvd: "",
      vs: "",
      ns: "",
      ew: "",
    });
  }
  if (!withGiven) return out;
  // emulate a survey company listing (with one transcription error to show QC)
  const st = computePlot(out, 45, false);
  return out.map((row, i) => ({
    ...row,
    tvd: (st[i].tvd + (i === 14 ? 25 : 0)).toFixed(2),
    vs: st[i].vs.toFixed(2),
    ns: st[i].ns.toFixed(2),
    ew: st[i].ew.toFixed(2),
  }));
}

const DEFAULT_STATE: PlotState = {
  wellName: "DS-2 directional (example)",
  vsAz: "45",
  elevation: "25",
  openHole: "8.5",
  useGiven: false,
  rows: jTypeExample(false),
  casing: [
    { label: '20" conductor', shoe: "120", od: "20", hole: "26" },
    { label: '13-3/8" surface', shoe: "1500", od: "13.375", hole: "17.5" },
    { label: '9-5/8" intermediate', shoe: "7000", od: "9.625", hole: "12.25" },
  ],
  tops: [
    { name: "Upper shale", tvd: "1800" },
    { name: "Sand A", tvd: "4700" },
    { name: "Massive limestone", tvd: "6450" },
    { name: "Transition shale", tvd: "7150" },
    { name: "Gas sand B", tvd: "7950" },
    { name: "Reservoir", tvd: "8800" },
  ],
  targets: [{ name: "Target T1", tvd: "9000", ns: "2475", ew: "2475", radius: "150" }],
};

const STORE_KEY = "drillsim.plotter.v1";
const num = (s: string) => {
  const v = Number(String(s).replace(/,/g, ""));
  return s.trim() === "" || !Number.isFinite(v) ? NaN : v;
};

export function WellPlotterApp() {
  const [st, setSt] = useLocalStore<PlotState>(STORE_KEY, DEFAULT_STATE);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);
  const [view, setView] = useState<"plan" | "3d" | "inc" | "dls">("plan");
  const [trueScale, setTrueScale] = useState(true);

  const set = (patch: Partial<PlotState>) => setSt((s) => ({ ...s, ...patch }));
  const vsAz = Number.isFinite(num(st.vsAz)) ? num(st.vsAz) : 0;
  const elev = Number.isFinite(num(st.elevation)) ? num(st.elevation) : 0;

  const stations = useMemo(() => computePlot(st.rows, vsAz, st.useGiven), [st.rows, vsAz, st.useGiven]);
  const valid = stations.filter((s) => Number.isFinite(s.tvd) && Number.isFinite(s.vs));
  const last = valid[valid.length - 1];
  const maxInc = stations.reduce((m, s) => (Number.isFinite(s.inc) ? Math.max(m, s.inc) : m), 0);
  const maxDlsSt = stations.reduce<(typeof stations)[number] | null>((m, s) => (Number.isFinite(s.dls) && (!m || s.dls > m.dls) ? s : m), null);
  const qcCount = stations.filter((s) => s.qc.length > 0).length;
  const a = (vsAz * Math.PI) / 180;

  const targets = st.targets
    .map((t) => ({ name: t.name || "Target", tvd: num(t.tvd), ns: num(t.ns), ew: num(t.ew), radius: Number.isFinite(num(t.radius)) ? num(t.radius) : 50 }))
    .filter((t) => Number.isFinite(t.tvd) && Number.isFinite(t.ns) && Number.isFinite(t.ew))
    .map((t) => ({ ...t, vs: t.ns * Math.cos(a) + t.ew * Math.sin(a) }));
  const casing = st.casing
    .map((c) => ({ label: c.label || `${c.od}"`, shoe: num(c.shoe), od: num(c.od), hole: num(c.hole) }))
    .filter((c) => Number.isFinite(c.shoe) && Number.isFinite(c.od));
  const tops = st.tops.map((t) => ({ name: t.name, tvd: num(t.tvd) })).filter((t) => t.name && Number.isFinite(t.tvd));

  // distance from TD to each target (at target TVD along the well)
  const targetMiss = targets.map((t) => {
    let best = Infinity;
    for (const s of valid) best = Math.min(best, Math.hypot(s.ns - t.ns, s.ew - t.ew, s.tvd - t.tvd));
    return { ...t, miss: best };
  });

  const editRow = (i: number, k: keyof PlotRow, v: string) => set({ rows: st.rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });

  const doPaste = () => {
    const res = parseSurveyText(pasteText);
    if (res.rows.length === 0) {
      setPasteMsg("No rows with a measured depth were found. Make sure MD is the first column or that the header names the columns.");
      return;
    }
    set({ rows: res.rows });
    setPasteMsg(null);
    setPasteOpen(false);
    setPasteText("");
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(stations, elev)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${(st.wellName || "well").replace(/[^\w-]+/g, "_")}_surveys.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  const shoeMarkers = casing
    .map((c) => {
      const p = pointAtMd(stations, c.shoe);
      return p ? { n: p.ns, e: p.ew, tvd: p.tvd, label: `${c.label} shoe`, color: "var(--ink-2)" } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x && Number.isFinite(x.n));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ---------- settings ---------- */}
        <div className="flex flex-col gap-4">
          <Panel title="Well">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Well name" value={st.wellName} onChange={(v) => set({ wellName: v })} className="col-span-2" />
              <NumberField label="VSec azimuth" unit="°" value={vsAz} onChange={(v) => set({ vsAz: String(v) })} hint="Direction of the vertical-section plane" />
              <NumberField label="RKB elevation" unit="ft" value={elev} onChange={(v) => set({ elevation: String(v) })} hint="For TVDSS = TVD − elevation" />
              <NumberField label="Open hole below last shoe" unit="in" step={0.125} value={num(st.openHole) || 8.5} onChange={(v) => set({ openHole: String(v) })} className="col-span-2" />
            </div>
            <div className="mt-4 rounded-lg border border-line bg-panel-2 p-3">
              <Toggle label="Plot entered TVD / VSec / N / E when given" checked={st.useGiven} onChange={(v) => set({ useGiven: v })} />
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
                Off: positions are recomputed from MD, Inc and Azi by minimum curvature, and any entered values are QC-checked against
                them. On: your entered values are plotted as-is.
              </p>
            </div>
          </Panel>

        </div>

        {/* ---------- survey data ---------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title="Survey data"
            subtitle="Type values, or paste columns straight from Excel / a survey listing. Only MD, Inc and Azi are needed — everything else is optional."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => setPasteOpen((v) => !v)}>
                  <ClipboardPaste size={14} /> Paste data
                </Button>
                <Button size="sm" variant="secondary" onClick={exportCsv} disabled={stations.length === 0}>
                  <Download size={14} /> CSV
                </Button>
              </div>
            }
            bodyClassName="p-0"
          >
            {pasteOpen && (
              <div className="border-b border-line bg-panel-2/60 p-4">
                <TextArea
                  label="Paste survey rows (tab, comma, semicolon or space separated)"
                  rows={7}
                  value={pasteText}
                  onChange={setPasteText}
                  placeholder={"MD\tInc\tAzi\tTVD\tVSec\tN/S\tE/W\n0\t0\t0\n500\t0.3\t120\n1000\t0.6\t118\n…"}
                  hint="A header row is detected automatically (MD, Incl, Azim, TVD, VSec, N/S, E/W). Without a header, columns are read in that order."
                />
                {pasteMsg && <p className="mt-2 text-[12.5px] text-warning-ink">{pasteMsg}</p>}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={doPaste} disabled={!pasteText.trim()}>
                    Import rows (replace)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="text-[12px] text-ink-3">Examples:</span>
              <Button size="sm" variant="ghost" onClick={() => set({ rows: jTypeExample(false), useGiven: false })}>
                MD / Inc / Azi only
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ rows: jTypeExample(true), useGiven: false })}>
                Full survey listing (with a QC error)
              </Button>
              <span className="mx-1 h-4 w-px bg-line" />
              <Button size="sm" variant="ghost" onClick={() => setSt(DEFAULT_STATE)}>
                <RotateCcw size={14} /> Reset all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ rows: [{ md: "0", inc: "0", azi: "0", tvd: "", vs: "", ns: "", ew: "" }] })}>
                <Trash2 size={14} /> Clear rows
              </Button>
            </div>
            <div className="scroll-thin max-h-[520px] overflow-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead className="sticky top-0 z-[1] bg-panel-2 text-ink-3">
                  <tr>
                    <th className="w-8 px-2 py-2 text-right font-medium">#</th>
                    {PLOT_COLS.map((k) => (
                      <th key={k} className="px-1.5 py-2 text-right font-medium" title={COL_META[k].hint}>
                        <span className={cn(k === "md" || k === "inc" || k === "azi" ? "text-ink" : "")}>{COL_META[k].label}</span> (<Unit u={COL_META[k].unit} />)
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left font-medium">QC</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {st.rows.map((r, i) => {
                    const s = stations.find((x) => x.md === num(r.md));
                    return (
                      <tr key={i} className="border-t border-line">
                        <td className="num px-2 text-right text-[11px] text-ink-3">{i + 1}</td>
                        {PLOT_COLS.map((k) => (
                          <td key={k} className="px-1 py-0.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`${COL_META[k].label} row ${i + 1}`}
                              value={r[k]}
                              placeholder={k === "md" || k === "inc" || k === "azi" || !s || !Number.isFinite(s[k]) ? "" : s[k].toFixed(1)}
                              onChange={(e) => editRow(i, k, e.target.value)}
                              onPaste={(e) => {
                                const text = e.clipboardData.getData("text");
                                if (/[\t\n]/.test(text)) {
                                  e.preventDefault();
                                  const res = parseSurveyText(text);
                                  if (res.rows.length) set({ rows: [...st.rows.slice(0, i), ...res.rows] });
                                }
                              }}
                              className={cn(
                                "num h-7 w-full min-w-[74px] rounded-md border border-transparent bg-transparent px-1.5 text-right text-ink outline-none placeholder:text-ink-3/60 hover:border-line focus:border-accent focus:bg-panel",
                              )}
                            />
                          </td>
                        ))}
                        <td className="px-2">{s && s.qc.length > 0 ? <Badge status="warning">{s.qc[0]}</Badge> : s?.computed ? <span className="text-[11px] text-good-ink">✓</span> : null}</td>
                        <td className="pr-2">
                          <button
                            type="button"
                            aria-label={`Delete row ${i + 1}`}
                            onClick={() => set({ rows: st.rows.filter((_, j) => j !== i) })}
                            className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-critical-ink"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const l = st.rows[st.rows.length - 1];
                  set({ rows: [...st.rows, { md: l ? String((num(l.md) || 0) + 100) : "0", inc: l?.inc ?? "0", azi: l?.azi ?? "0", tvd: "", vs: "", ns: "", ew: "" }] });
                }}
              >
                <Plus size={14} /> Add station
              </Button>
              <span className="text-[12px] text-ink-3">
                {st.rows.length} stations · greyed values are computed · tip: paste a whole block into any MD cell
              </span>
            </div>
          </Panel>
          {qcCount > 0 && (
            <Callout status="warning" title={`${qcCount} station${qcCount > 1 ? "s disagree" : " disagrees"} with minimum curvature`}>
              The entered TVD / coordinates don&apos;t match what MD, Inc and Azi imply (tolerance 1 ft or 0.2% of MD). Check for a
              transcription error or a different calculation method. The diagram uses the {st.useGiven ? "entered" : "computed"} values.
            </Callout>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Casing strings" subtitle="Drawn on the well diagram" bodyClassName="p-3">
          <MiniTable
            rows={st.casing}
            onChange={(rows) => set({ casing: rows })}
            blank={{ label: "", shoe: "", od: "", hole: "" }}
            cols={[
              { k: "label", label: "Name", w: "minmax(0,1.6fr)" },
              { k: "shoe", label: "Shoe MD", unit: "ft", w: "minmax(0,1fr)" },
              { k: "od", label: "OD", unit: "in", w: "minmax(0,0.8fr)" },
              { k: "hole", label: "Hole", unit: "in", w: "minmax(0,0.8fr)" },
            ]}
          />
        </Panel>
        <Panel title="Formation tops" bodyClassName="p-3">
          <MiniTable
            rows={st.tops}
            onChange={(rows) => set({ tops: rows })}
            blank={{ name: "", tvd: "" }}
            cols={[
              { k: "name", label: "Formation", w: "minmax(0,1.6fr)" },
              { k: "tvd", label: "Top TVD", unit: "ft", w: "minmax(0,1fr)" },
            ]}
          />
        </Panel>
        <Panel title="Targets" bodyClassName="p-3">
          <MiniTable
            rows={st.targets}
            onChange={(rows) => set({ targets: rows })}
            blank={{ name: "", tvd: "", ns: "", ew: "", radius: "100" }}
            cols={[
              { k: "name", label: "Name", w: "minmax(0,1.3fr)" },
              { k: "tvd", label: "TVD", unit: "ft", w: "minmax(0,1fr)" },
              { k: "ns", label: "N/S", unit: "ft", w: "minmax(0,1fr)" },
              { k: "ew", label: "E/W", unit: "ft", w: "minmax(0,1fr)" },
              { k: "radius", label: "Radius", unit: "ft", w: "minmax(0,0.8fr)" },
            ]}
          />
        </Panel>
      </div>

      <StatGrid className="xl:grid-cols-6">
        <Stat emphasis label="TD (MD)" value={last ? fmt(last.md, 0) : "—"} unit="ft" />
        <Stat emphasis label="TD (TVD)" value={last ? fmt(last.tvd, 0) : "—"} unit="ft" sub={last ? `TVDSS ${fmt(last.tvd - elev, 0)} ft` : undefined} />
        <Stat label="Vertical section at TD" value={last ? fmt(last.vs, 0) : "—"} unit="ft" />
        <Stat label="Closure" value={last ? fmt(last.closure, 0) : "—"} unit="ft" sub={last ? `toward ${fmt(last.closureAzi, 1)}°` : undefined} />
        <Stat label="Max inclination" value={fmt(maxInc, 1)} unit="°" />
        <Stat label="Max dogleg" value={maxDlsSt ? maxDlsSt.dls.toFixed(2) : "—"} unit="°/100ft" sub={maxDlsSt ? `at ${fmt(maxDlsSt.md, 0)} ft MD` : undefined} />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel
          title={`Well diagram — ${st.wellName || "untitled"}`}
          subtitle="Vertical section with casing, hole sections, formation tops and targets (pipe diameters exaggerated)"
          actions={<Toggle label="True scale" checked={trueScale} onChange={setTrueScale} />}
          bodyClassName="p-3 sm:p-4"
        >
          <WellDiagram
            stations={stations}
            casing={casing.map((c) => ({ ...c, hole: Number.isFinite(c.hole) ? c.hole : c.od + 2 }))}
            openHole={num(st.openHole) || 8.5}
            tops={tops}
            targets={targets.map((t) => ({ name: t.name, vs: t.vs, tvd: t.tvd, radius: t.radius }))}
            trueScale={trueScale}
            vsAz={vsAz}
            height={660}
          />
          {targetMiss.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {targetMiss.map((t) => (
                <Badge key={t.name} status={t.miss <= t.radius ? "good" : "warning"}>
                  {t.name}: closest approach {fmt(t.miss, 0)} ft {t.miss <= t.radius ? "(inside radius)" : `(outside ${fmt(t.radius, 0)} ft radius)`}
                </Badge>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="More views"
          actions={
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "plan", label: "Plan" },
                { value: "3d", label: "3D" },
                { value: "inc", label: "Inc & Azi" },
                { value: "dls", label: "Dogleg" },
              ]}
            />
          }
        >
          {view === "plan" && (
            <XYChart
              series={[{ id: "p", label: "Well path", color: "var(--series-1)", data: valid.map((s) => ({ x: s.ew, y: s.ns })), points: valid.length < 60 }]}
              markers={[
                ...targets.map((t) => ({ x: t.ew, y: t.ns, label: t.name, color: "var(--accent)", size: 6 })),
                ...(last ? [{ x: last.ew, y: last.ns, label: "TD", color: "var(--series-1)" }] : []),
              ]}
              xLabel="Easting"
              xUnit="ft"
              yLabel="Northing"
              yUnit="ft"
              height={600}
              valueDigits={1}
            />
          )}
          {view === "3d" && (
            <Trajectory3D
              height={600}
              paths={[{ id: "w", label: st.wellName || "Well", color: "var(--series-1)", points: valid.map((s) => ({ n: s.ns, e: s.ew, tvd: s.tvd, md: s.md, inc: s.inc })) }]}
              markers={[...targets.map((t) => ({ n: t.ns, e: t.ew, tvd: t.tvd, label: t.name })), ...shoeMarkers]}
            />
          )}
          {view === "inc" && (
            <div className="flex flex-col gap-5">
              <XYChart
                series={[{ id: "inc", label: "Inclination", color: "var(--series-1)", data: stations.filter((s) => Number.isFinite(s.inc)).map((s) => ({ x: s.md, y: s.inc })), digits: 2 }]}
                xLabel="Measured depth"
                xUnit="ft"
                yLabel="Inclination"
                yUnit="°"
                height={280}
                yDomain={[0, null]}
                valueDigits={2}
              />
              <XYChart
                series={[{ id: "azi", label: "Azimuth", color: "var(--series-2)", data: stations.filter((s) => Number.isFinite(s.azi) && s.inc > 0.5).map((s) => ({ x: s.md, y: s.azi })), digits: 1 }]}
                xLabel="Measured depth"
                xUnit="ft"
                yLabel="Azimuth"
                yUnit="°"
                height={280}
                valueDigits={1}
              />
            </div>
          )}
          {view === "dls" && (
            <XYChart
              series={[{ id: "dls", label: "Dogleg severity", color: "var(--series-2)", data: stations.filter((s) => Number.isFinite(s.dls) && s.md > stations[0].md).map((s) => ({ x: s.md, y: s.dls })), step: true, digits: 2 }]}
              xLabel="Measured depth"
              xUnit="ft"
              yLabel="DLS"
              yUnit="°/100ft"
              height={600}
              yDomain={[0, null]}
              valueDigits={2}
            />
          )}
        </Panel>
      </div>

      <Panel title="Computed survey" subtitle="Minimum-curvature results used for the plots" bodyClassName="p-0">
        <div className="scroll-thin max-h-[440px] overflow-auto">
          <table className="w-full min-w-[900px] text-[12.5px]">
            <thead className="sticky top-0 bg-panel-2 text-ink-3">
              <tr>
                {[
                  ["MD", "ft"],
                  ["Inc", "°"],
                  ["Azi", "°"],
                  ["TVD", "ft"],
                  ["TVDSS", "ft"],
                  ["N/S", "ft"],
                  ["E/W", "ft"],
                  ["VSec", "ft"],
                  ["DLS", "°/100ft"],
                  ["Build", "°/100ft"],
                  ["Turn", "°/100ft"],
                  ["Closure", "ft"],
                ].map(([k, u]) => (
                  <th key={k} className="whitespace-nowrap px-2.5 py-2 text-right font-medium">
                    {k} (<Unit u={u} />)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => (
                <tr key={i} className={cn("border-t border-line", s.qc.length > 0 && "bg-[color-mix(in_oklab,var(--warning)_10%,transparent)]")}>
                  {[
                    fmt(s.md, 1),
                    Number.isFinite(s.inc) ? s.inc.toFixed(2) : "—",
                    Number.isFinite(s.azi) ? s.azi.toFixed(2) : "—",
                    fmt(s.tvd, 1),
                    fmt(s.tvd - elev, 1),
                    fmt(s.ns, 1),
                    fmt(s.ew, 1),
                    fmt(s.vs, 1),
                    i === 0 || !Number.isFinite(s.dls) ? "—" : s.dls.toFixed(2),
                    i === 0 || !Number.isFinite(s.build) ? "—" : s.build.toFixed(2),
                    i === 0 || !Number.isFinite(s.turn) ? "—" : s.turn.toFixed(2),
                    fmt(s.closure, 1),
                  ].map((v, j) => (
                    <td key={j} className="num whitespace-nowrap px-2.5 py-1.5 text-right text-ink">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

type MiniCol<T> = { k: keyof T & string; label: string; w: string; unit?: string };

function MiniTable<T extends Record<string, string>>({
  rows,
  cols,
  onChange,
  blank,
}: {
  rows: T[];
  cols: MiniCol<T>[];
  onChange: (rows: T[]) => void;
  blank: T;
}) {
  const grid = `${cols.map((c) => c.w).join(" ")} 28px`;
  return (
    <div>
      <div className="grid gap-1.5 px-0.5 pb-1 text-[11px] font-medium text-ink-3" style={{ gridTemplateColumns: grid }}>
        {cols.map((c) => (
          <span key={c.k} className="truncate">
            {c.label}
            {c.unit && (
              <>
                {" "}
                (<Unit u={c.unit} />)
              </>
            )}
          </span>
        ))}
        <span />
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <div key={i} className="grid items-center gap-1.5" style={{ gridTemplateColumns: grid }}>
            {cols.map((c) => (
              <input
                key={c.k}
                type="text"
                aria-label={`${c.label} row ${i + 1}`}
                value={r[c.k] ?? ""}
                onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.k]: e.target.value } : x)))}
                className={cn("h-8 w-full min-w-0 rounded-md border border-line bg-panel-2 px-2 text-[12.5px] text-ink outline-none focus:border-accent", c.unit && "num")}
              />
            ))}
            <button
              type="button"
              aria-label="Delete row"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-critical-ink"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...blank }])}
        className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-2 hover:bg-panel-2 hover:text-ink"
      >
        <Plus size={13} /> Add
      </button>
    </div>
  );
}
