"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { XYChart } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, SelectField } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Badge, Callout, DataTable, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { LabelWithUnit, Unit } from "@/components/ui/Unit";
import { DEFAULT_WELL, annularVelocity } from "@/lib/calc/common";
import {
  computeHydraulics,
  DEFAULT_RHEOLOGY,
  optimizeNozzles,
  pv,
  SURFACE_CASES,
  sweepFlow,
  yp,
  type HydraulicsInput,
  type Rheology,
} from "@/lib/calc/hydraulics";
import { fmt } from "@/lib/format";

export function HydraulicsApp() {
  const [mw, setMw] = useState(10.5);
  const [rh, setRh] = useState<Rheology>(DEFAULT_RHEOLOGY);
  const [q, setQ] = useState(500);
  const [pMax, setPMax] = useState(4000);
  const [qRange, setQRange] = useState({ min: 300, max: 800 });
  const [surf, setSurf] = useState<string>("2");
  const [well, setWell] = useState({ depth: 10000, tvd: 10000, shoe: 7500, casingId: 8.681, hole: 8.5 });
  const [str, setStr] = useState(DEFAULT_WELL.string.map((c) => ({ ...c })));
  const [nozzles, setNozzles] = useState<number[]>([12, 12, 12]);
  const [motor, setMotor] = useState(0);
  const [minAv, setMinAv] = useState(120);

  const inp: HydraulicsInput = useMemo(
    () => ({
      q,
      mw,
      rheology: rh,
      surfaceE: SURFACE_CASES.find((c) => c.value === surf)?.E ?? 9.6e-5,
      depth: well.depth,
      tvd: Math.min(well.tvd, well.depth),
      casingShoe: well.shoe,
      casingId: well.casingId,
      holeSize: well.hole,
      string: str,
      nozzles: nozzles.filter((n) => n > 0),
      motorDp: motor,
    }),
    [q, mw, rh, surf, well, str, nozzles, motor],
  );

  const valid = rh.r600 > rh.r300 && rh.r300 > 0 && rh.r100 > rh.r3 && rh.r3 > 0 && nozzles.some((n) => n > 0);
  const h = useMemo(() => (valid ? computeHydraulics(inp) : null), [inp, valid]);
  const sweep = useMemo(() => (valid ? sweepFlow(inp, Math.max(50, qRange.min * 0.6), qRange.max * 1.15, 50) : []), [inp, qRange, valid]);
  const opt = useMemo(() => (valid ? optimizeNozzles(inp, pMax, qRange.min, qRange.max) : null), [inp, pMax, qRange, valid]);

  const nP = 3.32 * Math.log10(rh.r600 / rh.r300);
  const nA = 0.657 * Math.log10(rh.r100 / Math.max(0.1, rh.r3));

  if (!h || !opt) {
    return (
      <Callout status="serious" title="Check inputs">
        Fann readings must satisfy R600 &gt; R300 and R100 &gt; R3 &gt; 0, and at least one nozzle is required.
      </Callout>
    );
  }

  const breakdown = [
    { name: "Surface equipment", dp: h.surface, kind: "surface" },
    ...h.pipeLosses.map((l) => ({ name: `${l.name} (bore)`, dp: l.dp, kind: "pipe" })),
    ...(h.motor > 0 ? [{ name: "Mud motor / MWD", dp: h.motor, kind: "pipe" }] : []),
    { name: "Bit nozzles", dp: h.bit.dp, kind: "bit" },
    ...h.annLosses.map((l) => ({ name: l.name, dp: l.dp, kind: "ann" })),
  ];
  const maxDp = Math.max(...breakdown.map((b) => b.dp));
  const overPump = h.total > pMax;

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Mud & rheology" subtitle="Fann 35 viscometer dial readings">
          <FieldGrid cols={3}>
            <NumberField label="Mud weight" unit="ppg" step={0.1} value={mw} onChange={setMw} min={7} max={22} className="col-span-2 sm:col-span-3" />
            {(["r600", "r300", "r200", "r100", "r6", "r3"] as const).map((k) => (
              <NumberField key={k} label={`θ${k.slice(1)}`} value={rh[k]} onChange={(v) => setRh({ ...rh, [k]: v })} min={0} />
            ))}
          </FieldGrid>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              ["PV", fmt(pv(rh), 0), "cP"],
              ["YP", fmt(yp(rh), 0), "lb/100ft²"],
              ["n pipe", nP.toFixed(2), ""],
              ["n ann.", nA.toFixed(2), ""],
            ].map(([k, v, u]) => (
              <div key={k} className="rounded-lg bg-panel-2 px-2 py-1.5">
                <div className="text-[10.5px] text-ink-3">{k}</div>
                <div className="num text-[13.5px] font-semibold text-ink">{v}</div>
                {u && <div className="text-[9.5px] text-ink-3">{u}</div>}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Circulation">
          <FieldGrid>
            <NumberField label="Flow rate" unit="gpm" value={q} onChange={setQ} min={10} max={2000} />
            <NumberField label="Max pump pressure" unit="psi" value={pMax} onChange={setPMax} min={500} />
            <NumberField label="Min flow (hole cleaning)" unit="gpm" value={qRange.min} onChange={(v) => setQRange({ ...qRange, min: v })} min={10} />
            <NumberField label="Max flow (pumps)" unit="gpm" value={qRange.max} onChange={(v) => setQRange({ ...qRange, max: v })} min={20} />
            <SelectField label="Surface equipment" value={surf} onChange={setSurf} options={SURFACE_CASES.map((c) => ({ value: c.value, label: c.label }))} className="col-span-2" />
            <NumberField label="Motor / MWD ΔP" unit="psi" value={motor} onChange={setMotor} min={0} />
            <NumberField label="Min annular velocity" unit="ft/min" value={minAv} onChange={setMinAv} min={10} />
          </FieldGrid>
        </Panel>

        <Panel title="Bit nozzles" subtitle={`TFA ${h.tfa.toFixed(3)} in²`}>
          <div className="flex flex-wrap items-end gap-2">
            {nozzles.map((n, i) => (
              <NumberField key={i} dense label={`Jet ${i + 1}`} unit="/32" value={n} onChange={(v) => setNozzles(nozzles.map((x, k) => (k === i ? v : x)))} min={0} max={32} className="w-[88px]" />
            ))}
            <div className="flex gap-1 pb-0.5">
              <button
                type="button"
                aria-label="Remove nozzle"
                disabled={nozzles.length <= 1}
                onClick={() => setNozzles(nozzles.slice(0, -1))}
                className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2 text-ink-2 hover:text-ink disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                aria-label="Add nozzle"
                disabled={nozzles.length >= 9}
                onClick={() => setNozzles([...nozzles, 12])}
                className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2 text-ink-2 hover:text-ink disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Well & string">
          <FieldGrid>
            <NumberField label="Bit depth (MD)" unit="ft" value={well.depth} onChange={(v) => setWell({ ...well, depth: v })} min={500} />
            <NumberField label="TVD" unit="ft" value={well.tvd} onChange={(v) => setWell({ ...well, tvd: v })} min={500} />
            <NumberField label="Casing shoe" unit="ft" value={well.shoe} onChange={(v) => setWell({ ...well, shoe: v })} min={0} />
            <NumberField label="Casing ID" unit="in" step={0.001} value={well.casingId} onChange={(v) => setWell({ ...well, casingId: v })} />
            <NumberField label="Hole size" unit="in" step={0.125} value={well.hole} onChange={(v) => setWell({ ...well, hole: v })} className="col-span-2" />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">String (top → bit)</span>
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {str.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1fr_68px_68px_80px] items-end gap-2">
                <div className="pb-2 text-[12.5px] text-ink-2">{c.name}</div>
                <NumberField dense label="OD" value={c.od} step={0.125} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, od: v } : x)))} />
                <NumberField dense label="ID" value={c.id_} step={0.001} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, id_: v } : x)))} />
                {i === 0 ? (
                  <div className="pb-2 text-right text-[11.5px] text-ink-3">to surface</div>
                ) : (
                  <NumberField dense label="Length" value={c.length} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, length: v } : x)))} />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {overPump && (
          <Callout status="critical" title="Pump pressure limit exceeded">
            Standpipe pressure of {fmt(h.total, 0)} psi is above the {fmt(pMax, 0)} psi limit. Open up the nozzles or reduce the flow rate.
          </Callout>
        )}
        <Panel title="System summary" subtitle={`${fmt(q, 0)} gpm · ${mw.toFixed(1)} ppg`}>
          <StatGrid>
            <Stat emphasis label="Standpipe pressure" value={fmt(h.total, 0)} unit="psi" status={overPump ? "critical" : "good"} />
            <Stat emphasis label="ECD at TD" value={h.ecd.toFixed(2)} unit="ppg" sub={`+${(h.ecd - mw).toFixed(2)} ppg over MW`} />
            <Stat label="Bit pressure drop" value={fmt(h.bit.dp, 0)} unit="psi" sub={`${h.bitPct.toFixed(0)}% of SPP`} />
            <Stat label="Hydraulic HP at bit" value={fmt(h.bit.hhp, 0)} unit="hp" />
            <Stat label="HSI" value={h.bit.hsi.toFixed(2)} unit="hp/in²" status={h.bit.hsi < 1 ? "warning" : undefined} />
            <Stat label="Jet velocity" value={fmt(h.bit.vn, 0)} unit="ft/s" />
            <Stat label="Jet impact force" value={fmt(h.bit.impact, 0)} unit="lbf" />
            <Stat label="Annular losses" value={fmt(h.sumAnn, 0)} unit="psi" />
          </StatGrid>
        </Panel>

        <div className="grid gap-4 2xl:grid-cols-2">
          <Panel title="Pressure distribution" subtitle="Where the pump pressure goes">
            <ul className="flex flex-col gap-2">
              {breakdown.map((b) => (
                <li key={b.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_64px] items-center gap-3 text-[12.5px]">
                  <span className="truncate text-ink-2" title={b.name}>
                    {b.name}
                  </span>
                  <span className="h-3 rounded-[3px] bg-panel-3">
                    <span
                      className="block h-full rounded-[3px]"
                      style={{ width: `${Math.max(1, (b.dp / maxDp) * 100)}%`, background: b.kind === "bit" ? "var(--series-2)" : "var(--series-1)" }}
                    />
                  </span>
                  <span className="num text-right text-ink">{fmt(b.dp, 0)}</span>
                </li>
              ))}
              <li className="mt-1 flex justify-between border-t border-line pt-2 text-[12.5px]">
                <span className="font-medium text-ink"><LabelWithUnit label="Total" unit="psi" /></span>
                <span className="num font-semibold text-ink">{fmt(h.total, 0)}</span>
              </li>
            </ul>
          </Panel>

          <Panel title="Nozzle optimization" subtitle={`Pmax ${fmt(pMax, 0)} psi · flow exponent m = ${opt.m.toFixed(2)}`}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  ["Max bit hydraulic HP", opt.hhp, "Bit ΔP ≈ m/(m+1) · Pmax"],
                  ["Max jet impact force", opt.impact, "Bit ΔP ≈ m/(m+2) · Pmax"],
                ] as const
              ).map(([t, o, note]) => (
                <div key={t} className="rounded-lg border border-line bg-panel-2 px-3.5 py-2.5">
                  <div className="text-[13px] font-semibold text-ink">{t}</div>
                  <div className="mb-1 text-[11.5px] text-ink-3">{note}</div>
                  {o ? (
                    <>
                      <KV k="Optimum flow" v={fmt(o.q, 0)} unit="gpm" />
                      <KV k="Bit ΔP" v={fmt(o.bitDp, 0)} unit="psi" />
                      <KV k="TFA" v={o.area.toFixed(3)} unit="in²" />
                      <KV k="Nozzles" v={`3 × ${o.nozzle32.toFixed(1)}`} unit="/32" />
                      <KV k="HSI" v={o.hsi.toFixed(2)} />
                      <KV k="Impact" v={fmt(o.impact, 0)} unit="lbf" />
                      {o.limited && (
                        <div className="mt-1.5">
                          <Badge status="warning">Flow at limit</Badge>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-2 text-[12.5px] text-ink-3">Parasitic losses exceed Pmax.</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Flow-rate sweep" subtitle="Fixed nozzles — how pressures respond to flow">
          <XYChart
            series={[
              { id: "total", label: "Standpipe", color: "var(--series-1)", data: sweep.map((p) => ({ x: p.q, y: p.total })) },
              { id: "par", label: "Parasitic", color: "var(--series-2)", data: sweep.map((p) => ({ x: p.q, y: p.parasitic })) },
              { id: "bit", label: "Bit ΔP", color: "var(--series-3)", data: sweep.map((p) => ({ x: p.q, y: p.bit })) },
            ]}
            refLines={[
              { axis: "y", value: pMax, label: "Pump limit", color: "var(--critical)" },
              { axis: "x", value: q, label: "Current", color: "var(--ink-3)" },
            ]}
            xLabel="Flow rate"
            xUnit="gpm"
            yLabel="Pressure"
            yUnit="psi"
            height={280}
            yDomain={[0, null]}
            valueDigits={0}
          />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <XYChart
              series={[{ id: "hhp", label: "Bit HHP", color: "var(--series-1)", data: sweep.map((p) => ({ x: p.q, y: p.hhp })) }]}
              markers={opt.hhp ? [{ x: q, y: h.bit.hhp, label: "now", color: "var(--ink)" }] : []}
              xLabel="Flow rate"
              xUnit="gpm"
              yLabel="Bit hydraulic HP"
              yUnit="hp"
              height={200}
              yDomain={[0, null]}
              valueDigits={0}
            />
            <XYChart
              series={[{ id: "if", label: "Impact force", color: "var(--series-2)", data: sweep.map((p) => ({ x: p.q, y: p.impact })) }]}
              markers={[{ x: q, y: h.bit.impact, label: "now", color: "var(--ink)" }]}
              xLabel="Flow rate"
              xUnit="gpm"
              yLabel="Jet impact force"
              yUnit="lbf"
              height={200}
              yDomain={[0, null]}
              valueDigits={0}
            />
          </div>
        </Panel>

        <Panel title="Section-by-section" subtitle="API RP 13D power-law model">
          <DataTable
            columns={[
              { key: "name", label: "Section" },
              { key: "len", label: <LabelWithUnit label="Length" unit="ft" />, align: "right" },
              { key: "v", label: <LabelWithUnit label="V" unit="ft/min" />, align: "right" },
              { key: "re", label: "Reynolds", align: "right" },
              { key: "regime", label: "Regime" },
              { key: "grad", label: <Unit u="psi/ft" />, align: "right" },
              { key: "dp", label: <LabelWithUnit label="ΔP" unit="psi" />, align: "right" },
              { key: "av", label: "AV check" },
            ]}
            rows={[...h.pipeLosses, ...h.annLosses].map((l) => {
              const isAnn = l.kind === "annulus";
              return {
                name: l.name,
                len: fmt(l.length, 0),
                v: fmt(l.velocity, 0),
                re: fmt(l.reynolds, 0),
                regime: l.regime,
                grad: l.gradient.toFixed(4),
                dp: fmt(l.dp, 0),
                av: isAnn ? (
                  l.velocity >= minAv ? (
                    <Badge status="good">AV OK</Badge>
                  ) : (
                    <Badge status="warning">Below {minAv}</Badge>
                  )
                ) : (
                  <span className="text-ink-3">—</span>
                ),
              };
            })}
          />
          <p className="mt-3 text-[12px] text-ink-3">
            Annular velocity check uses {fmt(annularVelocity(q, well.hole, str[0].od), 0)} ft/min around the drill pipe in open
            hole as a reference. Transitional flow is interpolated between the laminar and turbulent Reynolds limits.
          </p>
        </Panel>
      </div>
    </div>
  );
}
