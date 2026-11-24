"use client";

import { useCallback, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { XYChart } from "@/components/charts/XYChart";
import { Button, FieldGrid, NumberField } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Callout, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { cementTrain, cementVolumes, type CementCell, type CementInput, type Fluid } from "@/lib/calc/cementing";
import { fmt, fmtDuration } from "@/lib/format";
import { useAnimationLoop } from "@/lib/hooks";

const FLUID: Record<Fluid, { label: string; color: string }> = {
  mud: { label: "Drilling mud", color: "color-mix(in oklab, var(--ink-3) 38%, var(--panel-2))" },
  spacer: { label: "Spacer", color: "var(--series-3)" },
  lead: { label: "Lead slurry", color: "var(--series-1)" },
  tail: { label: "Tail slurry", color: "var(--series-2)" },
  disp: { label: "Displacement", color: "var(--series-4)" },
};

export function CementingApp() {
  const [c, setC] = useState<CementInput>({
    shoe: 7500,
    casingOd: 9.625,
    casingId: 8.681,
    holeSize: 12.25,
    excess: 0.3,
    prevShoe: 3000,
    prevId: 12.415,
    leadTop: 2500,
    tailLength: 1000,
    shoeTrack: 80,
    ratHole: 20,
    mudWeight: 10.5,
    spacerVol: 40,
    spacerWeight: 11.5,
    leadWeight: 13.5,
    leadYield: 1.75,
    leadWater: 9.1,
    tailWeight: 15.8,
    tailYield: 1.16,
    tailWater: 5.0,
    dispWeight: 10.5,
    lineVol: 5,
    rate: 6,
    pumpOutput: 0.1018,
    thickening: 240,
    bumpMargin: 500,
  });
  const set = (p: Partial<CementInput>) => setC((x) => ({ ...x, ...p }));
  const v = useMemo(() => cementVolumes(c), [c]);
  const train = useMemo(() => cementTrain(c), [c]);
  const [pumped, setPumped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const p = Math.min(pumped, train.total);
  const state = useMemo(() => train.stateAt(p), [train, p]);

  const tick = useCallback(
    (dt: number) => setPumped((x) => Math.min(train.total, x + (train.total / 14000) * dt)),
    [train.total],
  );
  const active = playing && p < train.total;
  useAnimationLoop(tick, active);

  const stage = train.stages.find((s) => p >= s.start && p < s.end)?.fluid ?? (p >= train.total ? "disp" : "spacer");
  const pumpedTime = p / c.rate;
  const ttOk = v.cementOnBottomMinutes < c.thickening * 0.75;
  const totalWater = v.leadWater + v.tailWater;
  const curP = Math.max(0, state.diff);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Wellbore">
          <FieldGrid>
            <NumberField label="Casing shoe" unit="ft" value={c.shoe} onChange={(x) => set({ shoe: x })} min={500} />
            <NumberField label="Hole size" unit="in" step={0.125} value={c.holeSize} onChange={(x) => set({ holeSize: x })} />
            <NumberField label="Casing OD" unit="in" step={0.125} value={c.casingOd} onChange={(x) => set({ casingOd: x })} />
            <NumberField label="Casing ID" unit="in" step={0.001} value={c.casingId} onChange={(x) => set({ casingId: x })} />
            <NumberField label="Previous shoe" unit="ft" value={c.prevShoe} onChange={(x) => set({ prevShoe: x })} min={0} />
            <NumberField label="Previous casing ID" unit="in" step={0.001} value={c.prevId} onChange={(x) => set({ prevId: x })} />
            <NumberField label="Open-hole excess" unit="%" value={Math.round(c.excess * 100)} onChange={(x) => set({ excess: x / 100 })} min={0} max={300} />
            <NumberField label="Shoe track" unit="ft" value={c.shoeTrack} onChange={(x) => set({ shoeTrack: x })} min={0} />
            <NumberField label="Rat hole" unit="ft" value={c.ratHole} onChange={(x) => set({ ratHole: x })} min={0} />
            <NumberField label="Mud weight" unit="ppg" step={0.1} value={c.mudWeight} onChange={(x) => set({ mudWeight: x })} />
          </FieldGrid>
        </Panel>
        <Panel title="Slurry design">
          <FieldGrid>
            <NumberField label="Top of lead" unit="ft" value={c.leadTop} onChange={(x) => set({ leadTop: x })} min={0} />
            <NumberField label="Tail length" unit="ft" value={c.tailLength} onChange={(x) => set({ tailLength: x })} min={0} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Lead · Tail</span>
          </SectionLabel>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <NumberField dense label="Lead density" unit="ppg" step={0.1} value={c.leadWeight} onChange={(x) => set({ leadWeight: x })} />
            <NumberField dense label="Tail density" unit="ppg" step={0.1} value={c.tailWeight} onChange={(x) => set({ tailWeight: x })} />
            <NumberField dense label="Lead yield" unit="ft³/sk" step={0.01} value={c.leadYield} onChange={(x) => set({ leadYield: x })} />
            <NumberField dense label="Tail yield" unit="ft³/sk" step={0.01} value={c.tailYield} onChange={(x) => set({ tailYield: x })} />
            <NumberField dense label="Lead water" unit="gal/sk" step={0.1} value={c.leadWater} onChange={(x) => set({ leadWater: x })} />
            <NumberField dense label="Tail water" unit="gal/sk" step={0.1} value={c.tailWater} onChange={(x) => set({ tailWater: x })} />
          </div>
        </Panel>
        <Panel title="Pumping">
          <FieldGrid>
            <NumberField label="Spacer volume" unit="bbl" value={c.spacerVol} onChange={(x) => set({ spacerVol: x })} min={0} />
            <NumberField label="Spacer density" unit="ppg" step={0.1} value={c.spacerWeight} onChange={(x) => set({ spacerWeight: x })} />
            <NumberField label="Displacement fluid" unit="ppg" step={0.1} value={c.dispWeight} onChange={(x) => set({ dispWeight: x })} />
            <NumberField label="Surface lines" unit="bbl" value={c.lineVol} onChange={(x) => set({ lineVol: x })} min={0} />
            <NumberField label="Pump rate" unit="bbl/min" step={0.5} value={c.rate} onChange={(x) => set({ rate: x })} min={0.5} />
            <NumberField label="Pump output" unit="bbl/stk" step={0.001} value={c.pumpOutput} onChange={(x) => set({ pumpOutput: x })} />
            <NumberField label="Thickening time" unit="min" value={c.thickening} onChange={(x) => set({ thickening: x })} />
            <NumberField label="Bump over final" unit="psi" value={c.bumpMargin} onChange={(x) => set({ bumpMargin: x })} />
          </FieldGrid>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {!ttOk && (
          <Callout status="serious" title="Thickening time margin is thin">
            Cement placement takes {fmtDuration(v.cementOnBottomMinutes)}, more than 75% of the {fmtDuration(c.thickening)} thickening
            time. Retard the slurry or increase the pump rate.
          </Callout>
        )}
        <StatGrid>
          <Stat emphasis label="Lead slurry" value={fmt(v.leadVol, 1)} unit="bbl" sub={`${fmt(v.leadSacks, 0)} sacks`} />
          <Stat emphasis label="Tail slurry" value={fmt(v.tailVol, 1)} unit="bbl" sub={`${fmt(v.tailSacks, 0)} sacks`} />
          <Stat label="Mix water" value={fmt(totalWater, 1)} unit="bbl" sub={`Lead ${fmt(v.leadWater, 0)} · tail ${fmt(v.tailWater, 0)}`} />
          <Stat label="Displacement" value={fmt(v.dispVol, 1)} unit="bbl" sub={`${fmt(v.dispStrokes, 0)} strokes`} />
          <Stat label="Final differential" value={fmt(Math.max(0, v.differential), 0)} unit="psi" sub="U-tube at plug bump" />
          <Stat label="Bump pressure" value={fmt(v.bumpPressure, 0)} unit="psi" />
          <Stat label="Pumping time" value={fmtDuration(v.jobMinutes)} sub="incl. 10 min plug drop" />
          <Stat label="Placement vs TT" value={`${((v.cementOnBottomMinutes / c.thickening) * 100).toFixed(0)}%`} sub="of thickening time" status={ttOk ? "good" : "serious"} />
        </StatGrid>

        <Panel
          title="Job simulation"
          subtitle="Fluid positions and surface pressure as the train is pumped (static, friction neglected)"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => { setPumped(0); setPlaying(false); }}>
                <RotateCcw size={14} /> Reset
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (p >= train.total) {
                    setPumped(0);
                    setPlaying(true);
                  } else setPlaying(!active);
                }}
              >
                {active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                {active ? "Pause" : p >= train.total ? "Pump again" : "Pump job"}
              </Button>
            </>
          }
        >
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <WellSchematic c={c} cells={state.cells} />
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                {(Object.keys(FLUID) as Fluid[]).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                    <span className="inline-block size-2.5 rounded-[3px] ring-1 ring-inset ring-line" style={{ background: FLUID[f].color }} />
                    {FLUID[f].label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <div className="mb-3">
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span className="text-ink-2">
                    Pumping <span className="font-medium text-ink">{FLUID[stage].label.toLowerCase()}</span>
                  </span>
                  <span className="num text-ink-3">
                    {fmt(p, 0)} / {fmt(train.total, 0)} bbl · {fmtDuration(pumpedTime)}
                  </span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {train.stages.map((s) => (
                    <span
                      key={s.fluid}
                      className="h-full"
                      style={{ width: `${((s.end - s.start) / train.total) * 100}%`, background: FLUID[s.fluid].color, opacity: p >= s.start ? 1 : 0.35 }}
                      title={`${FLUID[s.fluid].label}: ${fmt(s.end - s.start, 0)} bbl`}
                    />
                  ))}
                </div>
                <input
                  type="range"
                  className="slider mt-2"
                  aria-label="Volume pumped"
                  min={0}
                  max={train.total}
                  step={train.total / 500}
                  value={p}
                  onChange={(e) => {
                    setPlaying(false);
                    setPumped(Number(e.target.value));
                  }}
                  style={{ ["--fill" as string]: `${(p / train.total) * 100}%` }}
                />
              </div>
              <XYChart
                series={[
                  { id: "p", label: "Surface pressure", color: "var(--series-1)", data: train.curve.map((x) => ({ x: x.vol, y: x.pressure })) },
                ]}
                refLines={[
                  ...train.stages.slice(1).map((s) => ({ axis: "x" as const, value: s.start, label: FLUID[s.fluid].label.split(" ")[0], color: "var(--ink-3)" })),
                ]}
                markers={[{ x: p, y: curP, label: `${fmt(curP, 0)} psi`, color: "var(--accent)" }]}
                xLabel="Volume pumped"
                xUnit="bbl"
                yLabel="Pump pressure"
                yUnit="psi"
                height={260}
                yDomain={[0, null]}
                valueDigits={0}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                  <KV k="Annulus hydro." v={fmt(state.hann, 0)} unit="psi" />
                </div>
                <div className="rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                  <KV k="Inside hydro." v={fmt(state.hin, 0)} unit="psi" />
                </div>
                <div className="rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                  <KV k={state.diff < 0 ? "Free-fall" : "Pump needs"} v={fmt(Math.abs(state.diff), 0)} unit="psi" />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Volume breakdown">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <KV k="Cased annulus capacity" v={v.csgAnnCap.toFixed(4)} unit="bbl/ft" />
              <KV k="Open-hole annulus (with excess)" v={v.ohCap.toFixed(4)} unit="bbl/ft" />
              <KV k="Casing capacity" v={v.insideCap.toFixed(4)} unit="bbl/ft" />
              <KV k="Top of tail" v={fmt(v.tailTop, 0)} unit="ft" />
            </div>
            <div>
              <KV k="Tail in annulus" v={fmt(v.tailAnn, 1)} unit="bbl" />
              <KV k="Shoe track" v={fmt(v.shoeTrackVol, 1)} unit="bbl" />
              <KV k="Rat hole" v={fmt(v.ratHoleVol, 1)} unit="bbl" />
              <KV k="Spacer top in annulus" v={fmt(v.spacerTop, 0)} unit="ft" />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function WellSchematic({ c, cells }: { c: CementInput; cells: CementCell[] }) {
  const H = 420;
  const W = 220;
  const depth = c.shoe + c.ratHole;
  const y = (z: number) => 8 + (z / depth) * (H - 16);
  const cx = W / 2;
  const scale = 7;
  const ci = (c.casingId / 2) * scale;
  const co = (c.casingOd / 2) * scale;
  const hole = (c.holeSize / 2) * scale * 1.05;
  const prev = (c.prevId / 2) * scale;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cementing wellbore schematic with fluid positions">
      {/* formation background */}
      <rect x={0} y={y(c.prevShoe)} width={W} height={y(depth) - y(c.prevShoe)} style={{ fill: "var(--lith-shale)" }} opacity={0.25} />
      {/* annulus cells */}
      {cells
        .filter((k) => k.side === "ann")
        .map((k, i) => {
          const outer = (k.top + k.bottom) / 2 < c.prevShoe ? prev : hole;
          const y0 = y(k.top);
          const h = y(k.bottom) - y0 + 0.6;
          return (
            <g key={`a${i}`}>
              <rect x={cx - outer} y={y0} width={outer - co} height={h} style={{ fill: FLUID[k.fluid].color }} />
              <rect x={cx + co} y={y0} width={outer - co} height={h} style={{ fill: FLUID[k.fluid].color }} />
            </g>
          );
        })}
      {/* inside cells */}
      {cells
        .filter((k) => k.side === "in")
        .map((k, i) => (
          <rect key={`i${i}`} x={cx - ci} y={y(k.top)} width={ci * 2} height={y(k.bottom) - y(k.top) + 0.6} style={{ fill: FLUID[k.fluid].color }} />
        ))}
      {/* rat hole */}
      <rect x={cx - hole} y={y(c.shoe)} width={hole * 2} height={y(depth) - y(c.shoe)} style={{ fill: "var(--panel-3)" }} />
      {/* casing walls */}
      <rect x={cx - co} y={y(0)} width={co - ci} height={y(c.shoe) - y(0)} style={{ fill: "var(--ink-2)" }} />
      <rect x={cx + ci} y={y(0)} width={co - ci} height={y(c.shoe) - y(0)} style={{ fill: "var(--ink-2)" }} />
      {/* previous casing */}
      <rect x={cx - prev - 3} y={y(0)} width={3} height={y(c.prevShoe) - y(0)} style={{ fill: "var(--ink)" }} />
      <rect x={cx + prev} y={y(0)} width={3} height={y(c.prevShoe) - y(0)} style={{ fill: "var(--ink)" }} />
      {/* open hole wall */}
      <line x1={cx - hole} x2={cx - hole} y1={y(c.prevShoe)} y2={y(depth)} style={{ stroke: "var(--ink-3)" }} strokeDasharray="3 3" />
      <line x1={cx + hole} x2={cx + hole} y1={y(c.prevShoe)} y2={y(depth)} style={{ stroke: "var(--ink-3)" }} strokeDasharray="3 3" />
      {/* float collar & shoe */}
      <rect x={cx - ci} y={y(c.shoe - c.shoeTrack) - 1.5} width={ci * 2} height={3} style={{ fill: "var(--ink)" }} />
      <path d={`M${cx - co} ${y(c.shoe)} Q ${cx} ${y(c.shoe) + 12} ${cx + co} ${y(c.shoe)} Z`} style={{ fill: "var(--ink-2)" }} />
      {/* labels */}
      <text x={4} y={y(c.prevShoe) - 4} className="num fill-[var(--ink-3)] text-[9.5px]">
        prev. shoe {fmt(c.prevShoe, 0)}
      </text>
      <text x={4} y={y(c.shoe) - 4} className="num fill-[var(--ink-3)] text-[9.5px]">
        shoe {fmt(c.shoe, 0)}
      </text>
    </svg>
  );
}
