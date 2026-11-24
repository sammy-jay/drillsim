"use client";

import { useMemo, useState } from "react";
import { Heatmap } from "@/components/charts/Heatmap";
import { XYChart } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, Segmented, SelectField } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { tfa } from "@/lib/calc/hydraulics";
import { bitRun, bitTorque, byRop, byTerms, FORMATIONS, mse, type Economics, type RopInput } from "@/lib/calc/rop";
import { fmt } from "@/lib/format";

const WOBS = Array.from({ length: 24 }, (_, i) => 6 + i * 2.5);
const RPMS = Array.from({ length: 22 }, (_, i) => 40 + i * 10);

type Metric = "cost" | "rop" | "life";

export function RopApp() {
  const [fid, setFid] = useState("sandstone");
  const [form, setForm] = useState(FORMATIONS.find((f) => f.id === "sandstone")!);
  const [op, setOp] = useState({ depth: 10000, pp: 9.0, ecd: 10.0, wob: 30, rpm: 120, bit: 8.5, q: 500, mw: 9.8, noz: 12 });
  const [coef, setCoef] = useState({ a2: 0.00009, a3: 0.0002, a4: 0.00004, a7: 0.9, a8: 0.35, threshold: 0.4 });
  const [eco, setEco] = useState<Economics>({ bitCost: 25000, rigRate: 3000, tripRate: 1, wdMax: 9, h1: 1.0, bearingLife: 80 });
  const [metric, setMetric] = useState<Metric>("cost");

  const base: RopInput = useMemo(
    () => ({
      depth: op.depth,
      pp: op.pp,
      ecd: op.ecd,
      wob: op.wob,
      rpm: op.rpm,
      bitSize: op.bit,
      wear: 0,
      q: op.q,
      mw: op.mw,
      tfa: tfa([op.noz, op.noz, op.noz]),
      formation: form,
      ...coef,
    }),
    [op, form, coef],
  );

  const run = useMemo(() => bitRun(base, eco), [base, eco]);
  const terms = useMemo(() => byTerms(base), [base]);
  const torque = bitTorque(op.wob, op.bit, form.bitMu);
  const mseVal = mse(op.wob, op.rpm, torque, run.rop0, op.bit);

  const grid = useMemo(() => {
    let best = { cost: Infinity, wob: 0, rpm: 0 };
    const values = RPMS.map((rpm) =>
      WOBS.map((wob) => {
        const r = bitRun({ ...base, wob, rpm }, eco);
        if (r.costPerFt < best.cost) best = { cost: r.costPerFt, wob, rpm };
        if (metric === "cost") return Number.isFinite(r.costPerFt) ? r.costPerFt : NaN;
        if (metric === "rop") return r.rop0;
        return r.hours;
      }),
    );
    return { values, best };
  }, [base, eco, metric]);

  const bestRun = useMemo(() => bitRun({ ...base, wob: grid.best.wob, rpm: grid.best.rpm }, eco), [base, eco, grid.best]);

  const drillOff = [60, 120, 180].map((rpm, i) => ({
    id: `r${rpm}`,
    label: `${rpm} rpm`,
    color: `var(--series-${i + 1})`,
    data: WOBS.map((wob) => ({ x: wob, y: byRop({ ...base, wob, rpm }) })),
  }));

  const contribs = [
    ["Formation strength (a1)", terms.contrib.formation],
    ["Compaction with depth", terms.contrib.compaction],
    ["Pore pressure (undercompaction)", terms.contrib.porePressure],
    ["Overbalance (chip hold-down)", terms.contrib.differential],
    ["Weight on bit", terms.contrib.wob],
    ["Rotary speed", terms.contrib.rpm],
    ["Bit hydraulics (jet impact)", terms.contrib.hydraulics],
  ] as const;
  const maxAbs = Math.max(...contribs.slice(1).map(([, v]) => Math.abs(v)), 0.1);

  const costCap = Number.isFinite(grid.best.cost) ? grid.best.cost * 3 : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Formation">
          <SelectField
            label="Lithology preset"
            value={fid}
            onChange={(v) => {
              setFid(v);
              setForm(FORMATIONS.find((f) => f.id === v)!);
            }}
            options={FORMATIONS.map((f) => ({ value: f.id, label: f.name }))}
          />
          <FieldGrid cols={2} className="mt-3">
            <NumberField label="a1 · drillability" step={0.1} value={form.a1} onChange={(v) => setForm({ ...form, a1: v })} />
            <NumberField label="a5 · WOB exponent" step={0.05} value={form.a5} onChange={(v) => setForm({ ...form, a5: v })} />
            <NumberField label="a6 · RPM exponent" step={0.05} value={form.a6} onChange={(v) => setForm({ ...form, a6: v })} />
            <NumberField label="Tooth life (ref.)" unit="h" value={form.abrasiveness} onChange={(v) => setForm({ ...form, abrasiveness: v })} min={1} />
          </FieldGrid>
        </Panel>
        <Panel title="Operating point">
          <FieldGrid>
            <NumberField label="WOB" unit="klbf" value={op.wob} onChange={(v) => setOp({ ...op, wob: v })} min={1} />
            <NumberField label="Rotary speed" unit="rpm" value={op.rpm} onChange={(v) => setOp({ ...op, rpm: v })} min={10} />
            <NumberField label="Depth" unit="ft" value={op.depth} onChange={(v) => setOp({ ...op, depth: v })} />
            <NumberField label="Bit size" unit="in" step={0.125} value={op.bit} onChange={(v) => setOp({ ...op, bit: v })} />
            <NumberField label="Pore pressure" unit="ppg" step={0.1} value={op.pp} onChange={(v) => setOp({ ...op, pp: v })} />
            <NumberField label="ECD" unit="ppg" step={0.1} value={op.ecd} onChange={(v) => setOp({ ...op, ecd: v })} />
            <NumberField label="Flow rate" unit="gpm" value={op.q} onChange={(v) => setOp({ ...op, q: v })} />
            <NumberField label="Nozzles (3×)" unit="/32" value={op.noz} onChange={(v) => setOp({ ...op, noz: v })} min={6} max={32} />
          </FieldGrid>
        </Panel>
        <Panel title="Economics">
          <FieldGrid>
            <NumberField label="Bit cost" unit="$" value={eco.bitCost} onChange={(v) => setEco({ ...eco, bitCost: v })} />
            <NumberField label="Rig spread rate" unit="$/h" value={eco.rigRate} onChange={(v) => setEco({ ...eco, rigRate: v })} />
            <NumberField label="Trip time" unit="h/kft" step={0.1} value={eco.tripRate} onChange={(v) => setEco({ ...eco, tripRate: v })} />
            <NumberField label="Bearing life (ref.)" unit="h" value={eco.bearingLife} onChange={(v) => setEco({ ...eco, bearingLife: v })} />
            <NumberField label="RPM wear exponent" step={0.1} value={eco.h1} onChange={(v) => setEco({ ...eco, h1: v })} min={0.2} max={3} />
            <NumberField label="Max W/d (teeth)" unit="klbf/in" step={0.5} value={eco.wdMax} onChange={(v) => setEco({ ...eco, wdMax: v })} min={5} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Model coefficients</span>
          </SectionLabel>
          <FieldGrid>
            <NumberField dense label="a2 · compaction" step={0.00001} value={coef.a2} onChange={(v) => setCoef({ ...coef, a2: v })} />
            <NumberField dense label="a3 · pore pressure" step={0.00001} value={coef.a3} onChange={(v) => setCoef({ ...coef, a3: v })} />
            <NumberField dense label="a4 · differential" step={0.00001} value={coef.a4} onChange={(v) => setCoef({ ...coef, a4: v })} />
            <NumberField dense label="a7 · tooth wear" step={0.05} value={coef.a7} onChange={(v) => setCoef({ ...coef, a7: v })} />
            <NumberField dense label="a8 · hydraulics" step={0.05} value={coef.a8} onChange={(v) => setCoef({ ...coef, a8: v })} />
            <NumberField dense label="Threshold W/d" unit="klbf/in" step={0.1} value={coef.threshold} onChange={(v) => setCoef({ ...coef, threshold: v })} />
          </FieldGrid>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <StatGrid>
          <Stat emphasis label="ROP (sharp bit)" value={fmt(run.rop0, 1)} unit="ft/hr" />
          <Stat emphasis label="Cost per foot" value={Number.isFinite(run.costPerFt) ? `$${fmt(run.costPerFt, 0)}` : "—"} />
          <Stat label="Bit life" value={fmt(run.hours, 1)} unit="h" sub={`Limited by ${run.limitedBy.toLowerCase()}`} />
          <Stat label="Footage per bit" value={fmt(run.footage, 0)} unit="ft" />
          <Stat label="Bit torque" value={fmt(torque / 1000, 2)} unit="kft·lbf" />
          <Stat label="Mech. specific energy" value={Number.isFinite(mseVal) ? fmt(mseVal / 1000, 1) : "—"} unit="ksi" sub="Teale MSE" />
          <Stat label="Optimum WOB" value={fmt(grid.best.wob, 1)} unit="klbf" sub={`at ${grid.best.rpm} rpm`} status="good" />
          <Stat label="Optimum cost/ft" value={`$${fmt(grid.best.cost, 0)}`} sub={`${fmt(bestRun.rop0, 0)} ft/hr · ${fmt(bestRun.hours, 0)} h run`} />
        </StatGrid>

        <Panel
          title="Operating map"
          subtitle="Every WOB × RPM combination run through the ROP and bit-wear models"
          actions={
            <Segmented
              size="sm"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "cost", label: "Cost / ft" },
                { value: "rop", label: "ROP" },
                { value: "life", label: "Bit life" },
              ]}
            />
          }
        >
          <Heatmap
            xs={WOBS}
            ys={RPMS}
            values={grid.values}
            xLabel="WOB"
            xUnit="klbf"
            yLabel="Rotary speed"
            yUnit="rpm"
            valueLabel={metric === "cost" ? "Cost per foot" : metric === "rop" ? "ROP (sharp bit)" : "Bit life"}
            valueUnit={metric === "cost" ? "$/ft" : metric === "rop" ? "ft/hr" : "h"}
            digits={metric === "life" ? 1 : 0}
            clampMax={metric === "cost" ? costCap : undefined}
            markers={[
              { x: op.wob, y: op.rpm, label: "Current" },
              ...(metric === "cost" ? [{ x: grid.best.wob, y: grid.best.rpm, label: "Optimum" }] : []),
            ]}
            height={360}
          />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Drill-off curves" subtitle="Sharp-bit ROP vs WOB">
            <XYChart
              series={drillOff}
              refLines={[{ axis: "x", value: op.wob, label: "Current", color: "var(--ink-3)" }]}
              xLabel="WOB"
              xUnit="klbf"
              yLabel="ROP"
              yUnit="ft/hr"
              height={260}
              yDomain={[0, null]}
              valueDigits={1}
            />
          </Panel>
          <Panel title="What drives ROP here" subtitle="Bourgoyne-Young terms as ROP multipliers">
            <ul className="flex flex-col gap-2.5">
              {contribs.map(([name, v], i) =>
                i === 0 ? (
                  <li key={name} className="flex justify-between border-b border-line pb-2 text-[12.5px]">
                    <span className="text-ink-2">{name}</span>
                    <span className="num text-ink">e^{v.toFixed(2)} = {fmt(Math.exp(v), 1)} ft/hr</span>
                  </li>
                ) : (
                  <li key={name} className="grid grid-cols-[minmax(0,1fr)_120px_52px] items-center gap-3 text-[12.5px]">
                    <span className="truncate text-ink-2">{name}</span>
                    <span className="relative h-3 rounded-[3px] bg-panel-3">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--chart-axis)]" />
                      <span
                        className="absolute inset-y-0 rounded-[3px]"
                        style={{
                          left: v >= 0 ? "50%" : `${50 - (Math.abs(v) / maxAbs) * 50}%`,
                          width: `${(Math.abs(v) / maxAbs) * 50}%`,
                          background: v >= 0 ? "var(--series-1)" : "var(--series-8)",
                        }}
                      />
                    </span>
                    <span className="num text-right text-ink">×{Math.exp(v).toFixed(2)}</span>
                  </li>
                ),
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
