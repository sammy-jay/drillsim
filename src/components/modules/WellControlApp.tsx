"use client";

import { useMemo, useState } from "react";
import { XYChart } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, Segmented } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Badge, Callout, DataTable, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { LabelWithUnit } from "@/components/ui/Unit";
import { DEFAULT_WELL, triplexOutput, type StringComponent } from "@/lib/calc/common";
import { killSheet, simulateKill, type KillInput } from "@/lib/calc/wellControl";
import { fmt, fmtDuration } from "@/lib/format";

type View = "casing" | "shoe" | "pit" | "dp";

export function WellControlApp() {
  const [well, setWell] = useState({
    md: 10000,
    tvd: 10000,
    shoeMd: 7500,
    lot: 15.0,
    hole: 8.5,
    casingId: 8.681,
  });
  const [str, setStr] = useState<StringComponent[]>(DEFAULT_WELL.string.map((c) => ({ ...c })));
  const [kick, setKick] = useState({ mw: 10.5, sidpp: 500, sicp: 790, pit: 20, margin: 0 });
  const [pump, setPump] = useState({ liner: 6, stroke: 12, eff: 97, spm: 30, scr: 600 });
  const [view, setView] = useState<View>("casing");

  const po = triplexOutput(pump.liner, pump.stroke, pump.eff / 100);
  const input: KillInput = useMemo(
    () => ({
      md: well.md,
      tvd: Math.min(well.tvd, well.md),
      mw: kick.mw,
      sidpp: kick.sidpp,
      sicp: Math.max(kick.sicp, kick.sidpp),
      pitGain: Math.max(0.1, kick.pit),
      scr: pump.scr,
      killSpm: Math.max(1, pump.spm),
      pumpOutput: po,
      shoeMd: Math.min(well.shoeMd, well.md),
      lotEmw: well.lot,
      casingId: well.casingId,
      holeSize: well.hole,
      string: str,
      margin: kick.margin,
      steps: 10,
    }),
    [well, str, kick, pump, po],
  );

  const ks = useMemo(() => killSheet(input), [input]);
  const ww = useMemo(() => simulateKill(input, "ww"), [input]);
  const dr = useMemo(() => simulateKill(input, "drillers"), [input]);

  const max = (arr: typeof ww, k: "casing" | "shoeEmw" | "pit") => arr.reduce((m, p) => Math.max(m, p[k]), 0);
  const cmp = {
    ww: { casing: max(ww, "casing"), shoe: max(ww, "shoeEmw"), pit: max(ww, "pit"), time: ww[ww.length - 1].minutes },
    dr: { casing: max(dr, "casing"), shoe: max(dr, "shoeEmw"), pit: max(dr, "pit"), time: dr[dr.length - 1].minutes },
  };
  const exceedsShoe = Math.max(cmp.ww.shoe, cmp.dr.shoe) > well.lot;
  const sicpOverMaasp = kick.sicp > ks.maasp;
  const kmwOverLot = ks.kmw >= well.lot;

  const chart = (() => {
    const key = view === "casing" ? "casing" : view === "shoe" ? "shoeEmw" : view === "pit" ? "pit" : "dp";
    const map = (arr: typeof ww) => arr.map((p) => ({ x: p.strokes, y: p[key] }));
    const label = { casing: "Casing pressure", shoe: "Shoe pressure (EMW)", pit: "Pit gain", dp: "Drill pipe pressure" }[view];
    const unit = { casing: "psi", shoe: "ppg", pit: "bbl", dp: "psi" }[view];
    return {
      label,
      unit,
      series: [
        { id: "ww", label: "Wait & Weight", color: "var(--series-1)", data: map(ww), digits: view === "shoe" ? 2 : 0 },
        { id: "dr", label: "Driller's method", color: "var(--series-2)", data: map(dr), digits: view === "shoe" ? 2 : 0 },
      ],
      refLines:
        view === "shoe"
          ? [{ axis: "y" as const, value: well.lot, label: `LOT ${well.lot.toFixed(1)} ppg`, color: "var(--critical)" }]
          : view === "casing"
            ? [{ axis: "y" as const, value: ks.maasp, label: `MAASP ${fmt(ks.maasp, 0)} psi`, color: "var(--critical)" }]
            : [],
    };
  })();

  const setComp = (i: number, patch: Partial<StringComponent>) =>
    setStr((s) => s.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      {/* inputs */}
      <div className="flex flex-col gap-4">
        <Panel title="Kick data" subtitle="Recorded after a stabilised shut-in">
          <FieldGrid>
            <NumberField label="Mud weight" unit="ppg" step={0.1} value={kick.mw} onChange={(v) => setKick({ ...kick, mw: v })} min={6} max={22} />
            <NumberField label="Pit gain" unit="bbl" value={kick.pit} onChange={(v) => setKick({ ...kick, pit: v })} min={0.1} />
            <NumberField label="SIDPP" unit="psi" value={kick.sidpp} onChange={(v) => setKick({ ...kick, sidpp: v })} min={0} />
            <NumberField label="SICP" unit="psi" value={kick.sicp} onChange={(v) => setKick({ ...kick, sicp: v })} min={0} />
            <NumberField label="Safety margin" unit="psi" value={kick.margin} onChange={(v) => setKick({ ...kick, margin: v })} min={0} hint="Held over BHP" />
          </FieldGrid>
        </Panel>

        <Panel title="Well geometry">
          <FieldGrid>
            <NumberField label="Measured depth" unit="ft" value={well.md} onChange={(v) => setWell({ ...well, md: v })} min={1000} />
            <NumberField label="True vertical depth" unit="ft" value={well.tvd} onChange={(v) => setWell({ ...well, tvd: v })} min={1000} />
            <NumberField label="Casing shoe (MD)" unit="ft" value={well.shoeMd} onChange={(v) => setWell({ ...well, shoeMd: v })} min={100} />
            <NumberField label="Leak-off (EMW)" unit="ppg" step={0.1} value={well.lot} onChange={(v) => setWell({ ...well, lot: v })} />
            <NumberField label="Open hole size" unit="in" step={0.125} value={well.hole} onChange={(v) => setWell({ ...well, hole: v })} />
            <NumberField label="Casing ID" unit="in" step={0.001} value={well.casingId} onChange={(v) => setWell({ ...well, casingId: v })} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Drill string (top → bit)</span>
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {str.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1fr_72px_72px_84px] items-end gap-2">
                <div className="pb-2 text-[12.5px] text-ink-2">{c.name}</div>
                <NumberField dense label="OD" value={c.od} step={0.125} onChange={(v) => setComp(i, { od: v })} />
                <NumberField dense label="ID" value={c.id_} step={0.001} onChange={(v) => setComp(i, { id_: v })} />
                {i === 0 ? (
                  <div className="pb-2 text-right text-[11.5px] text-ink-3">to surface</div>
                ) : (
                  <NumberField dense label="Length" value={c.length} onChange={(v) => setComp(i, { length: v })} />
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pump & slow circulating rate">
          <FieldGrid>
            <NumberField label="Liner" unit="in" step={0.25} value={pump.liner} onChange={(v) => setPump({ ...pump, liner: v })} />
            <NumberField label="Stroke" unit="in" value={pump.stroke} onChange={(v) => setPump({ ...pump, stroke: v })} />
            <NumberField label="Efficiency" unit="%" value={pump.eff} onChange={(v) => setPump({ ...pump, eff: v })} min={50} max={100} />
            <NumberField label="Kill rate" unit="spm" value={pump.spm} onChange={(v) => setPump({ ...pump, spm: v })} min={5} />
            <NumberField label="SCR pressure" unit="psi" value={pump.scr} onChange={(v) => setPump({ ...pump, scr: v })} className="col-span-2" hint={`Triplex output ${po.toFixed(4)} bbl/stk`} />
          </FieldGrid>
        </Panel>
      </div>

      {/* results */}
      <div className="flex min-w-0 flex-col gap-4">
        {(sicpOverMaasp || exceedsShoe || kmwOverLot) && (
          <Callout status="critical" title="Shoe integrity at risk">
            {sicpOverMaasp && <div>SICP ({fmt(kick.sicp, 0)} psi) already exceeds MAASP ({fmt(ks.maasp, 0)} psi).</div>}
            {exceedsShoe && <div>Predicted shoe pressure during the kill exceeds the leak-off EMW.</div>}
            {kmwOverLot && <div>Kill mud weight is at or above the leak-off EMW — the shoe cannot hold the kill column.</div>}
          </Callout>
        )}

        <Panel title="Kill sheet" subtitle="Wait & Weight (Engineer's) method">
          <StatGrid>
            <Stat emphasis label="Kill mud weight" value={ks.kmw.toFixed(1)} unit="ppg" sub={`exact ${ks.kmwExact.toFixed(2)} ppg`} />
            <Stat emphasis label="Initial circulating" value={fmt(ks.icp + kick.margin, 0)} unit="psi" sub="ICP = SCR + SIDPP" />
            <Stat emphasis label="Final circulating" value={fmt(ks.fcp + kick.margin, 0)} unit="psi" sub="FCP = SCR × KMW/OMW" />
            <Stat label="Formation pressure" value={fmt(ks.pf, 0)} unit="psi" sub={`${(ks.pf / (0.052 * input.tvd)).toFixed(2)} ppg EMW`} />
            <Stat label="MAASP · OMW" value={fmt(ks.maasp, 0)} unit="psi" status={sicpOverMaasp ? "critical" : "good"} />
            <Stat label="MAASP · KMW" value={fmt(ks.maaspKill, 0)} unit="psi" status={ks.maaspKill <= 0 ? "critical" : undefined} />
            <Stat label="Influx height" value={fmt(ks.influx.heightMd, 0)} unit="ft" sub={`${ks.influx.gradient.toFixed(3)} psi/ft`} />
            <Stat
              label="Influx type"
              value={<span className="text-[17px]">{ks.influx.type}</span>}
              sub={ks.influx.isGas ? "Expect expansion" : "Little expansion"}
            />
          </StatGrid>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <SectionLabel>Volumes & strokes</SectionLabel>
              <div className="rounded-lg border border-line bg-panel-2 px-3 py-1">
                <KV k="String volume" v={fmt(ks.strVol, 1)} unit="bbl" />
                <KV k="Annulus volume" v={fmt(ks.annVol, 1)} unit="bbl" />
                <KV k="Surface → bit" v={`${fmt(ks.stk.surfaceToBit, 0)} stk · ${fmtDuration(ks.minutes.surfaceToBit)}`} />
                <KV k="Bit → shoe" v={`${fmt(ks.stk.bitToShoe, 0)} stk`} />
                <KV k="Bit → surface" v={`${fmt(ks.stk.bitToSurface, 0)} stk · ${fmtDuration(ks.minutes.bitToSurface)}`} />
                <KV k="Total circulation" v={`${fmt(ks.stk.total, 0)} stk · ${fmtDuration(ks.minutes.total)}`} />
              </div>
            </div>
            <div>
              <SectionLabel>Drill-pipe pressure schedule</SectionLabel>
              <DataTable
                maxHeight={232}
                columns={[
                  { key: "step", label: "Step" },
                  { key: "stk", label: <LabelWithUnit label="Strokes" unit="stk" />, align: "right" },
                  { key: "min", label: <LabelWithUnit label="Time" unit="min" />, align: "right" },
                  { key: "p", label: <LabelWithUnit label="DP pressure" unit="psi" />, align: "right" },
                ]}
                rows={ks.schedule.map((r, i) => ({
                  step: i,
                  stk: fmt(r.strokes, 0),
                  min: fmt(r.minutes, 0),
                  p: fmt(r.pressure + kick.margin, 0),
                }))}
              />
            </div>
          </div>
          <div className="mt-5">
            <XYChart
              series={[
                {
                  id: "sched",
                  label: "Drill pipe pressure",
                  color: "var(--series-1)",
                  data: [
                    ...ks.schedule.map((r) => ({ x: r.strokes, y: r.pressure + kick.margin })),
                    { x: ks.stk.total, y: ks.fcp + kick.margin },
                  ],
                  step: true,
                  points: true,
                },
              ]}
              refLines={[{ axis: "x", value: ks.stk.surfaceToBit, label: "KMW at bit" }]}
              xLabel="Strokes pumped"
              xUnit="stk"
              yLabel="Drill pipe pressure"
              yUnit="psi"
              height={220}
              yDomain={[0, null]}
            />
          </div>
        </Panel>

        <Panel
          title="Kill simulation · Wait & Weight vs Driller's"
          subtitle="Single-bubble model with Boyle's-law expansion; choke holds BHP constant"
          actions={
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "casing", label: "Casing" },
                { value: "shoe", label: "Shoe" },
                { value: "pit", label: "Pit" },
                { value: "dp", label: "Drill pipe" },
              ]}
            />
          }
        >
          <XYChart
            series={chart.series}
            refLines={chart.refLines}
            xLabel="Strokes pumped"
            xUnit="stk"
            yLabel={chart.label}
            yUnit={chart.unit}
            height={300}
            valueDigits={view === "shoe" ? 2 : 0}
          />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {(
              [
                ["Wait & Weight", cmp.ww, "ww"],
                ["Driller's method", cmp.dr, "dr"],
              ] as const
            ).map(([name, c, id]) => (
              <div key={id} className="rounded-lg border border-line bg-panel-2 px-3.5 py-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: id === "ww" ? "var(--series-1)" : "var(--series-2)" }} />
                    {name}
                  </span>
                  {c.shoe > well.lot ? <Badge status="critical">Shoe exceeded</Badge> : <Badge status="good">Shoe OK</Badge>}
                </div>
                <KV k="Max casing pressure" v={fmt(c.casing, 0)} unit="psi" />
                <KV k="Max shoe EMW" v={c.shoe.toFixed(2)} unit="ppg" />
                <KV k="Max pit gain" v={fmt(c.pit, 1)} unit="bbl" />
                <KV k="Total pumping time" v={fmtDuration(c.time)} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
