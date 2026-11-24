"use client";

import { useMemo, useState } from "react";
import { XYChart } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, Segmented, SelectField, Toggle } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Badge, Callout, Stat, StatGrid } from "@/components/ui/Stat";
import { biaxialCollapse, CASING_CATALOG, CASING_SIZES, evaluateGrade, type CasingInput } from "@/lib/calc/casing";
import { fmt } from "@/lib/format";

const SIZE_DEFAULTS: Record<string, Partial<CasingInput>> = {
  '13-3/8"': { depth: 3000, mwSet: 9.2, nextTd: 7500, nextPp: 9.6, nextMw: 10.5, fracShoe: 13.5, fluidLevel: 1000 },
  '9-5/8"': { depth: 7500, mwSet: 10.5, nextTd: 10000, nextPp: 11.0, nextMw: 11.5, fracShoe: 15.0, fluidLevel: 3000 },
  '7"': { depth: 10000, mwSet: 11.5, nextTd: 12500, nextPp: 13.0, nextMw: 13.5, fracShoe: 16.0, fluidLevel: 4000 },
  '5-1/2"': { depth: 12500, mwSet: 13.5, nextTd: 12500, nextPp: 13.0, nextMw: 13.5, fracShoe: 16.5, fluidLevel: 0 },
};

export function CasingApp() {
  const [inp, setInp] = useState<CasingInput>({
    size: '9-5/8"',
    depth: 7500,
    mwSet: 10.5,
    nextTd: 10000,
    nextPp: 11.0,
    nextMw: 11.5,
    fracShoe: 15.0,
    gasGrad: 0.1,
    backupGrad: 0.465,
    evacuation: "partial",
    fluidLevel: 3000,
    dfBurst: 1.1,
    dfCollapse: 1.125,
    dfTension: 1.6,
    overpull: 100,
    biaxial: true,
  });
  const [picked, setPicked] = useState<string | null>(null);
  const set = (p: Partial<CasingInput>) => setInp((x) => ({ ...x, ...p }));

  const evals = useMemo(
    () => CASING_CATALOG.filter((c) => c.size === inp.size).map((c) => evaluateGrade(inp, c)),
    [inp],
  );
  const recommended = useMemo(() => {
    const passing = evals.filter((e) => e.pass).sort((a, b) => a.grade.costIndex - b.grade.costIndex);
    return passing[0] ?? null;
  }, [evals]);
  const key = (e: (typeof evals)[number]) => `${e.grade.weight}-${e.grade.grade}`;
  const sel = evals.find((e) => key(e) === picked) ?? recommended ?? evals[evals.length - 1];
  const loads = sel.loads;

  const sfStatus = (sf: number, df: number) => (sf >= df ? "good" : sf >= 1 ? "warning" : "critical");

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="String & loads">
          <FieldGrid>
            <SelectField
              label="Casing size"
              value={inp.size}
              onChange={(v) => {
                set({ size: v, ...SIZE_DEFAULTS[v] });
                setPicked(null);
              }}
              options={CASING_SIZES.map((s) => ({ value: s, label: s }))}
            />
            <NumberField label="Setting depth" unit="ft" value={inp.depth} onChange={(v) => set({ depth: v })} min={100} />
            <NumberField label="Mud in place" unit="ppg" step={0.1} value={inp.mwSet} onChange={(v) => set({ mwSet: v })} />
            <NumberField label="Frac at shoe" unit="ppg" step={0.1} value={inp.fracShoe} onChange={(v) => set({ fracShoe: v })} />
            <NumberField label="Next section TD" unit="ft" value={inp.nextTd} onChange={(v) => set({ nextTd: v })} />
            <NumberField label="Pore pressure @ TD" unit="ppg" step={0.1} value={inp.nextPp} onChange={(v) => set({ nextPp: v })} />
            <NumberField label="Max mud next section" unit="ppg" step={0.1} value={inp.nextMw} onChange={(v) => set({ nextMw: v })} />
            <NumberField label="Gas gradient" unit="psi/ft" step={0.01} value={inp.gasGrad} onChange={(v) => set({ gasGrad: v })} />
            <NumberField label="Backup gradient" unit="psi/ft" step={0.005} value={inp.backupGrad} onChange={(v) => set({ backupGrad: v })} className="col-span-2" hint="External pressure behind casing (0.465 = saltwater)" />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Collapse case</span>
          </SectionLabel>
          <Segmented
            value={inp.evacuation}
            onChange={(v) => set({ evacuation: v })}
            options={[
              { value: "full", label: "Full evacuation" },
              { value: "partial", label: "Lost returns" },
            ]}
          />
          {inp.evacuation === "partial" && (
            <NumberField label="Fluid level drop" unit="ft" value={inp.fluidLevel} onChange={(v) => set({ fluidLevel: v })} className="mt-3" min={0} />
          )}
        </Panel>
        <Panel title="Design factors">
          <FieldGrid>
            <NumberField label="Burst" step={0.05} value={inp.dfBurst} onChange={(v) => set({ dfBurst: v })} />
            <NumberField label="Collapse" step={0.025} value={inp.dfCollapse} onChange={(v) => set({ dfCollapse: v })} />
            <NumberField label="Tension" step={0.1} value={inp.dfTension} onChange={(v) => set({ dfTension: v })} />
            <NumberField label="Overpull" unit="kips" value={inp.overpull} onChange={(v) => set({ overpull: v })} />
          </FieldGrid>
          <div className="mt-4">
            <Toggle label="Biaxial collapse (API ellipse)" checked={inp.biaxial} onChange={(v) => set({ biaxial: v })} />
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {!recommended && (
          <Callout status="critical" title="No single grade passes">
            None of the {inp.size} grades in the catalog satisfies all three design factors. Consider a heavier size, a
            combination string, or revisiting the load assumptions.
          </Callout>
        )}
        <StatGrid>
          <Stat emphasis label="Selected" value={<span className="text-[17px]">{`${sel.grade.weight}# ${sel.grade.grade}`}</span>} sub={sel.pass ? "Meets all design factors" : "Fails a design factor"} status={sel.pass ? "good" : "critical"} />
          <Stat label="Burst SF (min)" value={sel.sfBurst.toFixed(2)} sub={`at ${fmt(sel.burstAt, 0)} ft`} status={sfStatus(sel.sfBurst, inp.dfBurst)} />
          <Stat label="Collapse SF (min)" value={sel.sfCollapse.toFixed(2)} sub={`at ${fmt(sel.collapseAt, 0)} ft`} status={sfStatus(sel.sfCollapse, inp.dfCollapse)} />
          <Stat label="Tension SF (top)" value={sel.sfTension.toFixed(2)} sub={`${fmt(loads[0].tension, 0)} kips hanging`} status={sel.tensionOk ? "good" : "critical"} />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Burst" subtitle="Gas to surface, capped by shoe fracture">
            <XYChart
              series={[
                { id: "l", label: "Load", color: "var(--series-1)", data: loads.map((p) => ({ x: p.burstLoad, y: p.depth })) },
                { id: "d", label: `Design ×${inp.dfBurst}`, color: "var(--series-2)", dash: "6 4", data: loads.map((p) => ({ x: p.burstDesign, y: p.depth })) },
              ]}
              refLines={[{ axis: "x", value: sel.grade.burst, label: "Rating", color: "var(--ink)", dash: false }]}
              xLabel="Pressure"
              xUnit="psi"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={340}
              xDomain={[0, null]}
              valueDigits={0}
            />
          </Panel>
          <Panel title="Collapse" subtitle={inp.evacuation === "full" ? "Fully evacuated casing" : "Partial evacuation (lost returns)"}>
            <XYChart
              series={[
                { id: "l", label: "Load", color: "var(--series-1)", data: loads.map((p) => ({ x: p.collapseLoad, y: p.depth })) },
                { id: "d", label: `Design ×${inp.dfCollapse}`, color: "var(--series-2)", dash: "6 4", data: loads.map((p) => ({ x: p.collapseDesign, y: p.depth })) },
                ...(inp.biaxial
                  ? [{ id: "r", label: "Biaxial rating", color: "var(--ink)", data: loads.map((p) => ({ x: biaxialCollapse(sel.grade, p.tension), y: p.depth })) }]
                  : []),
              ]}
              refLines={inp.biaxial ? [] : [{ axis: "x", value: sel.grade.collapse, label: "Rating", color: "var(--ink)", dash: false }]}
              xLabel="Pressure"
              xUnit="psi"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={340}
              xDomain={[0, null]}
              valueDigits={0}
            />
          </Panel>
          <Panel title="Tension" subtitle="Buoyed weight + overpull / DF">
            <XYChart
              series={[
                { id: "l", label: "Load", color: "var(--series-1)", data: loads.map((p) => ({ x: p.tension, y: p.depth })) },
                { id: "d", label: "Design", color: "var(--series-2)", dash: "6 4", data: loads.map((p) => ({ x: p.tensionDesign, y: p.depth })) },
              ]}
              refLines={[{ axis: "x", value: sel.grade.bodyYield, label: "Body yield", color: "var(--ink)", dash: false }]}
              xLabel="Axial load"
              xUnit="kips"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={340}
              xDomain={[0, null]}
              valueDigits={0}
            />
          </Panel>
        </div>

        <Panel title={`${inp.size} grade selection`} subtitle="Click a row to inspect it. Recommended = lowest relative cost that passes." bodyClassName="p-0">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-panel-2 text-ink-3">
                <tr>
                  {["lb/ft", "Grade", "ID", "Burst", "Collapse", "Yield", "SF burst", "SF coll.", "SF tens.", "Result"].map((h, i) => (
                    <th key={h} className={`whitespace-nowrap border-b border-line px-2.5 py-2 font-medium ${i < 2 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => {
                  const active = key(e) === key(sel);
                  return (
                    <tr
                      key={key(e)}
                      onClick={() => setPicked(key(e))}
                      className={`cursor-pointer border-b border-line last:border-0 ${active ? "bg-accent-soft" : "hover:bg-panel-2"}`}
                    >
                      <td className="num px-3 py-2 text-ink">{e.grade.weight}</td>
                      <td className="px-3 py-2 font-medium text-ink">{e.grade.grade}</td>
                      <td className="num px-3 py-2 text-right text-ink-2">{e.grade.id.toFixed(3)}</td>
                      <td className="num px-3 py-2 text-right text-ink-2">{fmt(e.grade.burst, 0)}</td>
                      <td className="num px-3 py-2 text-right text-ink-2">{fmt(e.grade.collapse, 0)}</td>
                      <td className="num px-3 py-2 text-right text-ink-2">{fmt(e.grade.bodyYield, 0)}k</td>
                      <td className="px-3 py-2 text-right"><SF v={e.sfBurst} df={inp.dfBurst} /></td>
                      <td className="px-3 py-2 text-right"><SF v={e.sfCollapse} df={inp.dfCollapse} /></td>
                      <td className="px-3 py-2 text-right"><SF v={e.sfTension} df={inp.dfTension} /></td>
                      <td className="px-3 py-2 text-right">
                        {recommended && key(e) === key(recommended) ? (
                          <Badge status="good">Recommended</Badge>
                        ) : e.pass ? (
                          <Badge status="good">Pass</Badge>
                        ) : (
                          <Badge status="critical">Fail</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-[12px] text-ink-3">
            Ratings are representative API 5CT minimum performance values for teaching. Verify connection ratings and
            manufacturer data for real designs.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function SF({ v, df }: { v: number; df: number }) {
  const ok = v >= df;
  return (
    <span className={`num ${ok ? "text-ink" : v >= 1 ? "text-warning-ink" : "text-critical-ink"} font-medium`}>
      {Number.isFinite(v) ? v.toFixed(2) : "∞"}
    </span>
  );
}
