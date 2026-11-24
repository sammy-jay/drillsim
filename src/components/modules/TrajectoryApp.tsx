"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Trajectory3D } from "@/components/charts/Trajectory3D";
import { XYChart } from "@/components/charts/XYChart";
import { Button, FieldGrid, NumberField, Segmented } from "@/components/ui/fields";
import { Panel } from "@/components/ui/Panel";
import { Badge, Callout, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { interpolateAt, minimumCurvature, planWell, type PlanInput, type PlanType, type SurveyInput } from "@/lib/calc/trajectory";
import { fmt, gauss, rng } from "@/lib/format";

const DEFAULT_PLAN: PlanInput = {
  type: "j",
  kop: 2500,
  bur: 3,
  dor: 2,
  targetTvd: 9000,
  targetDisp: 3500,
  azimuth: 45,
  lateral: 3000,
  landingInc: 90,
  stationStep: 100,
};

function syntheticActual(plan: ReturnType<typeof planWell>, seed: number): SurveyInput[] {
  if (!plan.ok) return [];
  const r = rng(seed);
  const out: SurveyInput[] = [];
  let dInc = 0;
  let dAzi = 0;
  const step = 300;
  for (let md = 0; md <= plan.tdMd + 1; md += step) {
    const p = interpolateAt(plan.stations, Math.min(md, plan.tdMd));
    if (p.inc > 0.5) {
      dInc = dInc * 0.85 + gauss(r) * 0.55;
      dAzi = dAzi * 0.85 + gauss(r) * 1.2;
    }
    const inc = Math.max(0, p.inc + dInc * Math.min(1, p.inc / 5));
    out.push({ md: Math.min(md, Math.round(plan.tdMd)), inc: Number(inc.toFixed(2)), azi: Number((((p.inc > 0.5 ? p.azi + dAzi : 0) + 360) % 360).toFixed(2)) });
  }
  return out;
}

export function TrajectoryApp() {
  const [plan, setPlan] = useState<PlanInput>(DEFAULT_PLAN);
  const [custom, setCustom] = useState<SurveyInput[] | null>(null);
  const [seed, setSeed] = useState(4);
  const [dlsLimit, setDlsLimit] = useState(4);
  const [view, setView] = useState<"section" | "plan" | "dls">("section");

  const pr = useMemo(() => planWell(plan), [plan]);
  const surveys = useMemo(() => custom ?? syntheticActual(pr, seed), [custom, pr, seed]);
  const actual = useMemo(() => minimumCurvature(surveys, plan.azimuth), [surveys, plan.azimuth]);
  const last = actual[actual.length - 1];
  const planAtLast = last ? interpolateAt(pr.stations, last.md) : null;
  const sep = last && planAtLast ? Math.hypot(last.north - planAtLast.north, last.east - planAtLast.east, last.tvd - planAtLast.tvd) : NaN;
  const maxDls = actual.reduce((m, s) => Math.max(m, s.dls), 0);

  const set = (patch: Partial<PlanInput>) => setPlan((p) => ({ ...p, ...patch }));
  const editRow = (i: number, patch: Partial<SurveyInput>) =>
    setCustom(surveys.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const planPts = pr.stations.map((s) => ({ n: s.north, e: s.east, tvd: s.tvd, md: s.md, inc: s.inc }));
  const actPts = actual.map((s) => ({ n: s.north, e: s.east, tvd: s.tvd, md: s.md, inc: s.inc }));
  const target = pr.ok ? pr.stations[pr.stations.length - 1] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Well plan">
            <Segmented
              value={plan.type}
              onChange={(t: PlanType) => {
                set(
                  t === "horizontal"
                    ? { type: t, kop: 7200, bur: 8, targetTvd: 9000 }
                    : t === "s"
                      ? { type: t, kop: 2000, bur: 3, dor: 2, targetDisp: 2500, targetTvd: 9000 }
                      : { type: t, kop: 2500, bur: 3, targetDisp: 3500, targetTvd: 9000 },
                );
                setCustom(null);
              }}
              options={[
                { value: "j", label: "J-type" },
                { value: "s", label: "S-type" },
                { value: "horizontal", label: "Horizontal" },
              ]}
              className="mb-4"
            />
            <FieldGrid>
              <NumberField label="Kick-off point" unit="ft" value={plan.kop} onChange={(v) => set({ kop: v })} min={0} />
              <NumberField label="Build rate" unit="°/100ft" step={0.5} value={plan.bur} onChange={(v) => set({ bur: v })} min={0.5} max={30} />
              {plan.type === "s" && (
                <NumberField label="Drop rate" unit="°/100ft" step={0.5} value={plan.dor} onChange={(v) => set({ dor: v })} min={0.5} max={20} />
              )}
              {plan.type !== "horizontal" ? (
                <>
                  <NumberField label="Target TVD" unit="ft" value={plan.targetTvd} onChange={(v) => set({ targetTvd: v })} min={100} />
                  <NumberField label="Target departure" unit="ft" value={plan.targetDisp} onChange={(v) => set({ targetDisp: v })} min={0} />
                </>
              ) : (
                <>
                  <NumberField label="Landing inclination" unit="°" value={plan.landingInc} onChange={(v) => set({ landingInc: v })} min={30} max={95} />
                  <NumberField label="Lateral length" unit="ft" value={plan.lateral} onChange={(v) => set({ lateral: v })} min={0} />
                </>
              )}
              <NumberField label="Azimuth" unit="°" value={plan.azimuth} onChange={(v) => set({ azimuth: ((v % 360) + 360) % 360 })} />
              <NumberField label="Station interval" unit="ft" value={plan.stationStep} onChange={(v) => set({ stationStep: v })} min={10} />
            </FieldGrid>
          </Panel>
          {pr.ok ? (
            <Panel title="Plan summary">
              <KV k={plan.type === "horizontal" ? "Landing inclination" : "Tangent angle"} v={pr.maxInc.toFixed(2)} unit="°" />
              <KV k={plan.type === "horizontal" ? "Landing MD" : "End of build MD"} v={fmt(pr.eobMd, 0)} unit="ft" />
              <KV k={plan.type === "horizontal" ? "Landing TVD" : "End of build TVD"} v={fmt(pr.eobTvd, 0)} unit="ft" />
              {plan.type !== "horizontal" && <KV k="Tangent length" v={fmt(pr.holdLength, 0)} unit="ft" />}
              {pr.sodMd !== undefined && <KV k="Start of drop MD" v={fmt(pr.sodMd, 0)} unit="ft" />}
              <KV k="Total MD" v={fmt(pr.tdMd, 0)} unit="ft" />
              <KV k="Final TVD" v={fmt(target?.tvd, 0)} unit="ft" />
              <KV k="Closure" v={`${fmt(target?.closure, 0)} ft @ ${fmt(target?.closureAzi, 1)}°`} />
              <KV k="Build radius" v={fmt(18000 / (Math.PI * plan.bur), 0)} unit="ft" />
            </Panel>
          ) : (
            <Callout status="serious" title="Plan not feasible">
              {pr.message}
            </Callout>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <StatGrid>
            <Stat emphasis label="Total MD" value={fmt(pr.tdMd, 0)} unit="ft" />
            <Stat label="Max inclination" value={fmt(pr.maxInc, 1)} unit="°" />
            <Stat label="Actual max DLS" value={maxDls.toFixed(2)} unit="°/100ft" status={maxDls > dlsLimit ? "warning" : "good"} />
            <Stat label="Actual vs plan at TD" value={fmt(sep, 0)} unit="ft" sub="Center-to-center" status={sep > 100 ? "warning" : "good"} />
          </StatGrid>
          <Panel title="3D wellbore" subtitle="Planned trajectory against the minimum-curvature survey solution" bodyClassName="p-3 sm:p-4">
            <Trajectory3D
              paths={[
                { id: "plan", label: "Plan", color: "var(--series-1)", points: planPts, dash: "6 5", width: 2 },
                { id: "act", label: "Surveys (actual)", color: "var(--series-2)", points: actPts, width: 2.5 },
              ]}
              markers={
                target
                  ? [
                      { n: target.north, e: target.east, tvd: target.tvd, label: plan.type === "horizontal" ? "TD" : "Target" },
                      ...pr.keyPoints
                        .filter((k) => k.label !== "Target" && k.label !== "TD")
                        .map((k) => {
                          const p = interpolateAt(pr.stations, k.md);
                          return { n: p.north, e: p.east, tvd: p.tvd, label: k.label, color: "var(--ink-2)" };
                        }),
                    ]
                  : []
              }
            />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel
          title="Projections"
          actions={
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "section", label: "Vertical section" },
                { value: "plan", label: "Plan view" },
                { value: "dls", label: "Dogleg" },
              ]}
            />
          }
        >
          {view === "section" && (
            <XYChart
              series={[
                { id: "p", label: "Plan", color: "var(--series-1)", dash: "6 5", data: pr.stations.map((s) => ({ x: s.vs, y: s.tvd })) },
                { id: "a", label: "Actual", color: "var(--series-2)", data: actual.map((s) => ({ x: s.vs, y: s.tvd })) },
              ]}
              xLabel={`Vertical section @ ${fmt(plan.azimuth, 0)}°`}
              xUnit="ft"
              yLabel="TVD"
              yUnit="ft"
              invertY
              independent="y"
              height={380}
              valueDigits={0}
            />
          )}
          {view === "plan" && (
            <XYChart
              series={[
                { id: "p", label: "Plan", color: "var(--series-1)", dash: "6 5", data: pr.stations.map((s) => ({ x: s.east, y: s.north })) },
                { id: "a", label: "Actual", color: "var(--series-2)", data: actual.map((s) => ({ x: s.east, y: s.north })) },
              ]}
              markers={target ? [{ x: target.east, y: target.north, label: "Target" }] : []}
              xLabel="Easting"
              xUnit="ft"
              yLabel="Northing"
              yUnit="ft"
              height={380}
              independent="x"
              valueDigits={0}
            />
          )}
          {view === "dls" && (
            <XYChart
              series={[{ id: "dls", label: "Dogleg severity", color: "var(--series-2)", data: actual.slice(1).map((s) => ({ x: s.md, y: s.dls })), step: true, digits: 2 }]}
              refLines={[{ axis: "y", value: dlsLimit, label: `Limit ${dlsLimit}°/100ft`, color: "var(--critical)" }]}
              xLabel="Measured depth"
              xUnit="ft"
              yLabel="DLS"
              yUnit="°/100ft"
              height={380}
              yDomain={[0, null]}
              valueDigits={2}
            />
          )}
        </Panel>

        <Panel
          title="Survey stations"
          subtitle={custom ? "Edited surveys" : "Synthetic MWD surveys around the plan — edit any cell"}
          actions={
            <>
              <NumberField dense label="DLS limit" unit="°/100" value={dlsLimit} onChange={setDlsLimit} className="w-[118px]" />
            </>
          }
          bodyClassName="p-0"
        >
          <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5">
            <Button size="sm" variant="secondary" onClick={() => setCustom([...surveys, { md: (surveys.at(-1)?.md ?? 0) + 100, inc: surveys.at(-1)?.inc ?? 0, azi: surveys.at(-1)?.azi ?? 0 }])}>
              <Plus size={14} /> Add station
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCustom(null); setSeed((s) => s + 1); }}>
              <RotateCcw size={14} /> New synthetic run
            </Button>
          </div>
          <div className="scroll-thin max-h-[372px] overflow-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 z-[1] bg-panel-2 text-ink-3">
                <tr>
                  {["MD", "Inc °", "Azi °", "TVD", "North", "East", "VS", "DLS", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line px-2.5 py-2 text-right font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actual.map((s, i) => (
                  <tr key={i} className="border-b border-line hover:bg-panel-2">
                    {(["md", "inc", "azi"] as const).map((k) => (
                      <td key={k} className="px-1.5 py-1">
                        <input
                          type="number"
                          aria-label={`${k} row ${i + 1}`}
                          value={surveys[i]?.[k] ?? s[k]}
                          step={k === "md" ? 10 : 0.1}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) editRow(i, { [k]: v });
                          }}
                          className="num h-7 w-[62px] rounded-md border border-transparent bg-transparent px-1.5 text-right text-ink outline-none hover:border-line focus:border-accent focus:bg-panel"
                        />
                      </td>
                    ))}
                    <td className="num px-2.5 text-right text-ink">{fmt(s.tvd, 1)}</td>
                    <td className="num px-2.5 text-right text-ink">{fmt(s.north, 1)}</td>
                    <td className="num px-2.5 text-right text-ink">{fmt(s.east, 1)}</td>
                    <td className="num px-2.5 text-right text-ink">{fmt(s.vs, 1)}</td>
                    <td className="px-2.5 text-right">
                      {s.dls > dlsLimit ? <Badge status="warning">{s.dls.toFixed(2)}</Badge> : <span className="num text-ink">{s.dls.toFixed(2)}</span>}
                    </td>
                    <td className="pr-2 text-right">
                      <button
                        type="button"
                        aria-label={`Delete station ${i + 1}`}
                        disabled={surveys.length <= 2}
                        onClick={() => setCustom(surveys.filter((_, k) => k !== i))}
                        className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-critical-ink disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
