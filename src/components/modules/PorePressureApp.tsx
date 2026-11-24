"use client";

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { XYChart } from "@/components/charts/XYChart";
import { Button, FieldGrid, NumberField } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { DataTable, Stat, StatGrid } from "@/components/ui/Stat";
import { LabelWithUnit } from "@/components/ui/Unit";
import { porePressureModel, type CasingSeat, type PPInput } from "@/lib/calc/porePressure";
import { fmt } from "@/lib/format";

const SIZE_W: Record<string, number> = { '30"': 30, '20"': 20, '13-3/8"': 13.375, '9-5/8"': 9.625, '7"': 7 };

export function PorePressureApp() {
  const [inp, setInp] = useState<PPInput>({
    td: 14000,
    step: 20,
    onset: 9000,
    ramp: 2500,
    severity: 0.25,
    noise: 3,
    seed: 11,
    dtMatrix: 55,
    dtSurface: 160,
    compaction: 0.00022,
    eatonExp: 3,
    normalPp: 8.9,
    nuTop: 0.3,
    nuBottom: 0.42,
    tripMargin: 0.3,
    kickMargin: 0.5,
    minSurfaceShoe: 1500,
    smoothWindow: 400,
  });
  const set = (p: Partial<PPInput>) => setInp((x) => ({ ...x, ...p }));
  const res = useMemo(() => porePressureModel(inp), [inp]);
  const rows = res.rows;
  const seats = res.seats;

  const thin = rows.filter((_, i) => i % 2 === 0);
  const maxPp = rows.reduce((m, r) => Math.max(m, r.ppSmooth), 0);
  const run = Math.max(1, Math.round(500 / inp.step));
  const onsetIdx = rows.findIndex((_, i) => i + run <= rows.length && rows.slice(i, i + run).every((r) => r.ppSmooth > inp.normalPp + 0.5));
  const onset = onsetIdx >= 0 ? rows[onsetIdx].depth : undefined;
  const minWindow = rows.reduce((m, r) => Math.min(m, r.fg - r.ppSmooth), Infinity);

  const mudWindow = [
    ...thin.map((r) => ({ x: r.mwMin, y: r.depth })),
    ...[...thin].reverse().map((r) => ({ x: r.mwMax, y: r.depth })),
  ];

  const program = seats.flatMap((s) => [
    { x: s.mw, y: s.top },
    { x: s.mw, y: s.shoe },
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel
          title="Synthetic geology"
          subtitle="Generates the observed shale sonic log"
          actions={
            <Button size="sm" variant="ghost" onClick={() => set({ seed: inp.seed + 1 })}>
              <Shuffle size={14} /> New log
            </Button>
          }
        >
          <FieldGrid>
            <NumberField label="Total depth" unit="ft" value={inp.td} onChange={(v) => set({ td: v })} min={3000} max={30000} />
            <NumberField label="Log noise" unit="µs/ft" step={0.5} value={inp.noise} onChange={(v) => set({ noise: v })} min={0} />
            <NumberField label="Overpressure top" unit="ft" value={inp.onset} onChange={(v) => set({ onset: v })} min={0} />
            <NumberField label="Transition thickness" unit="ft" value={inp.ramp} onChange={(v) => set({ ramp: v })} min={100} />
            <NumberField label="Undercompaction" unit="frac" step={0.01} value={inp.severity} onChange={(v) => set({ severity: v })} min={0} max={0.8} className="col-span-2" hint="Fractional sonic excursion above the normal trend" />
          </FieldGrid>
        </Panel>
        <Panel title="Interpretation" subtitle="Normal compaction trend & Eaton">
          <FieldGrid>
            <NumberField label="Δt matrix" unit="µs/ft" value={inp.dtMatrix} onChange={(v) => set({ dtMatrix: v })} />
            <NumberField label="Δt at surface" unit="µs/ft" value={inp.dtSurface} onChange={(v) => set({ dtSurface: v })} />
            <NumberField label="Compaction coeff." unit="1/ft" step={0.00001} value={inp.compaction} onChange={(v) => set({ compaction: v })} />
            <NumberField label="Eaton exponent" step={0.1} value={inp.eatonExp} onChange={(v) => set({ eatonExp: v })} min={0.5} max={5} />
            <NumberField label="Normal pore pressure" unit="ppg" step={0.1} value={inp.normalPp} onChange={(v) => set({ normalPp: v })} />
            <NumberField label="Smoothing" unit="ft" value={inp.smoothWindow} onChange={(v) => set({ smoothWindow: v })} min={0} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Fracture gradient (Eaton)</span>
          </SectionLabel>
          <FieldGrid>
            <NumberField label="Poisson's ratio · top" step={0.01} value={inp.nuTop} onChange={(v) => set({ nuTop: v })} min={0.1} max={0.49} />
            <NumberField label="Poisson's ratio · TD" step={0.01} value={inp.nuBottom} onChange={(v) => set({ nuBottom: v })} min={0.1} max={0.49} />
          </FieldGrid>
        </Panel>
        <Panel title="Casing seat criteria">
          <FieldGrid>
            <NumberField label="Trip margin" unit="ppg" step={0.1} value={inp.tripMargin} onChange={(v) => set({ tripMargin: v })} min={0} />
            <NumberField label="Kick margin" unit="ppg" step={0.1} value={inp.kickMargin} onChange={(v) => set({ kickMargin: v })} min={0} />
            <NumberField label="Min. surface shoe" unit="ft" value={inp.minSurfaceShoe} onChange={(v) => set({ minSurfaceShoe: v })} min={0} className="col-span-2" />
          </FieldGrid>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <StatGrid>
          <Stat emphasis label="Max pore pressure" value={maxPp.toFixed(2)} unit="ppg" />
          <Stat label="Overpressure onset" value={onset ? fmt(onset, 0) : "—"} unit={onset ? "ft" : undefined} sub="> normal + 0.5 ppg" />
          <Stat label="Narrowest window" value={minWindow.toFixed(2)} unit="ppg" sub="FG − PP" status={minWindow < 1 ? "warning" : "good"} />
          <Stat label="Casing strings" value={seats.length} sub="Bottom-up selection" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Panel title="Shale sonic log" subtitle="Observed Δt vs interpreted normal trend">
            <XYChart
              series={[
                { id: "obs", label: "Observed Δt", color: "var(--series-1)", width: 1.2, data: rows.map((r) => ({ x: r.dtObs, y: r.depth })) },
                { id: "nct", label: "Normal trend", color: "var(--series-2)", dash: "6 4", data: thin.map((r) => ({ x: r.dtNormal, y: r.depth })) },
              ]}
              refLines={[{ axis: "y", value: inp.onset, label: "Overpressure top", color: "var(--ink-3)" }]}
              xLabel="Δt"
              xUnit="µs/ft"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={560}
              valueDigits={1}
            />
          </Panel>
          <Panel title="Pressure profile & mud window" subtitle="EMW in ppg — shaded band is the usable mud window">
            <XYChart
              series={[
                { id: "pp", label: "Pore pressure", color: "var(--series-1)", data: thin.map((r) => ({ x: r.ppSmooth, y: r.depth })), digits: 2 },
                { id: "fg", label: "Fracture gradient", color: "var(--series-2)", data: thin.map((r) => ({ x: r.fg, y: r.depth })), digits: 2 },
                { id: "ob", label: "Overburden", color: "var(--series-3)", data: thin.map((r) => ({ x: r.obg, y: r.depth })), digits: 2 },
                { id: "mw", label: "Mud program", color: "var(--ink)", data: program, width: 2.5, digits: 1 },
              ]}
              areas={[{ id: "win", label: "Mud window (with margins)", color: "var(--series-1)", opacity: 0.1, polygon: mudWindow }]}
              refLines={seats.slice(0, -1).map((s: CasingSeat) => ({ axis: "y" as const, value: s.shoe, label: `${s.size} shoe`, color: "var(--ink-2)" }))}
              xLabel="Equivalent mud weight"
              xUnit="ppg"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={560}
              valueDigits={2}
              xDomain={[8, null]}
            />
          </Panel>
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel title="Casing program" subtitle="Bottom-up seat selection using trip and kick margins">
            <DataTable
              columns={[
                { key: "name", label: "String" },
                { key: "size", label: "Casing" },
                { key: "bit", label: "Hole" },
                { key: "interval", label: <LabelWithUnit label="Open hole" unit="ft" />, align: "right" },
                { key: "mw", label: <LabelWithUnit label="MW" unit="ppg" />, align: "right" },
              ]}
              rows={seats.map((s) => ({
                name: s.name,
                size: s.size,
                bit: s.bit,
                interval: `${fmt(s.top, 0)} – ${fmt(s.shoe, 0)}`,
                mw: s.mw.toFixed(1),
              }))}
            />
          </Panel>
          <Panel title="Schematic" bodyClassName="p-3">
            <CasingSchematic seats={seats} td={inp.td} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CasingSchematic({ seats, td }: { seats: CasingSeat[]; td: number }) {
  const W = 280;
  const H = 300;
  const y = (z: number) => 12 + (z / td) * (H - 24);
  const maxW = Math.max(...seats.map((s) => SIZE_W[s.size] ?? 10), 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[320px]" role="img" aria-label="Casing program schematic">
      <line x1={10} x2={W - 10} y1={12} y2={12} style={{ stroke: "var(--ink-3)" }} />
      {seats.map((s, i) => {
        const half = ((SIZE_W[s.size] ?? 10) / maxW) * 70;
        const cx = 80;
        return (
          <g key={i}>
            <line x1={cx - half} x2={cx - half} y1={12} y2={y(s.shoe)} style={{ stroke: "var(--ink)" }} strokeWidth={2} />
            <line x1={cx + half} x2={cx + half} y1={12} y2={y(s.shoe)} style={{ stroke: "var(--ink)" }} strokeWidth={2} />
            <path d={`M${cx - half} ${y(s.shoe)} l-5 0 l5 -6 Z M${cx + half} ${y(s.shoe)} l5 0 l-5 -6 Z`} style={{ fill: "var(--ink)" }} />
            <text x={cx + 82} y={y(s.shoe)} dy="0.32em" className="fill-[var(--ink-2)] text-[10.5px]">
              {s.size} @ {fmt(s.shoe, 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
