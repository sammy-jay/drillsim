"use client";

import { useMemo, useState } from "react";
import { FieldGrid, NumberField, Segmented } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Badge, DataTable, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { LabelWithUnit, Unit } from "@/components/ui/Unit";
import {
  annularCapacity,
  annularVelocity,
  capacity,
  DEFAULT_WELL,
  duplexOutput,
  steelDisplacement,
  triplexOutput,
} from "@/lib/calc/common";
import { fmt, fmtDuration } from "@/lib/format";

export function VolumesApp() {
  const [hole, setHole] = useState({ depth: 10000, casingId: 8.681, shoe: 7500, openHole: 8.5, washout: 5, pits: 600, lines: 10 });
  const [str, setStr] = useState(DEFAULT_WELL.string.map((c) => ({ ...c })));
  const [pump, setPump] = useState({ type: "triplex" as "triplex" | "duplex", liner: 6, stroke: 12, rod: 2.5, eff: 97, spm: 120, pumps: 1 });
  const [trip, setTrip] = useState({ mw: 10.5, stands: 5, standLen: 93, dryLen: 200, slugVol: 25 });

  const r = useMemo(() => {
    const bottomLen = str.slice(1).reduce((s, c) => s + c.length, 0);
    const comps = str.map((c, i) => ({ ...c, length: i === 0 ? Math.max(0, hole.depth - bottomLen) : c.length }));
    const ohEff = hole.openHole * Math.sqrt(1 + hole.washout / 100);
    const sections: { name: string; len: number; cap: number; vol: number; av: number; dh: number; od: number }[] = [];
    let top = 0;
    let stringVol = 0;
    let steel = 0;
    for (const c of comps) {
      const bottom = top + c.length;
      stringVol += capacity(c.id_) * c.length;
      steel += steelDisplacement(c.od, c.id_) * c.length;
      const cased = Math.max(0, Math.min(bottom, hole.shoe) - top);
      const open = Math.max(0, c.length - cased);
      if (cased > 0) sections.push({ name: `${c.name} × casing`, len: cased, cap: annularCapacity(hole.casingId, c.od), vol: 0, av: 0, dh: hole.casingId, od: c.od });
      if (open > 0) sections.push({ name: `${c.name} × open hole`, len: open, cap: annularCapacity(ohEff, c.od), vol: 0, av: 0, dh: ohEff, od: c.od });
      top = bottom;
    }
    const po = (pump.type === "triplex" ? triplexOutput(pump.liner, pump.stroke, pump.eff / 100) : duplexOutput(pump.liner, pump.stroke, pump.rod, pump.eff / 100)) * pump.pumps;
    const gpm = po * pump.spm * 42;
    sections.forEach((s) => {
      s.vol = s.cap * s.len;
      s.av = annularVelocity(gpm, s.dh, s.od);
    });
    const annVol = sections.reduce((s, x) => s + x.vol, 0);
    const holeVol = capacity(hole.casingId) * Math.min(hole.shoe, hole.depth) + capacity(ohEff) * Math.max(0, hole.depth - hole.shoe);
    const activeVol = annVol + stringVol + hole.pits + hole.lines;
    const stk = (v: number) => v / po;
    const mins = (v: number) => stk(v) / pump.spm;
    return { comps, sections, stringVol, steel, annVol, holeVol, activeVol, po, gpm, stk, mins, ohEff };
  }, [hole, str, pump]);

  // tripping
  const dp = str[0];
  const dryDisp = steelDisplacement(dp.od, dp.id_);
  const wetDisp = dryDisp + capacity(dp.id_);
  const casingCap = capacity(hole.casingId);
  const pulled = trip.stands * trip.standLen;
  const dropDry = (0.052 * trip.mw * dryDisp * pulled) / (casingCap - dryDisp);
  const dropWet = (0.052 * trip.mw * wetDisp * pulled) / (casingCap - wetDisp);
  const slugWeight = trip.mw + (trip.mw * trip.dryLen * capacity(dp.id_)) / Math.max(0.1, trip.slugVol);
  const slugPitGain = trip.dryLen * capacity(dp.id_);

  const bars = [
    { name: "Drill string", v: r.stringVol },
    ...r.sections.map((s) => ({ name: s.name, v: s.vol })),
    { name: "Surface lines", v: hole.lines },
    { name: "Active pits", v: hole.pits },
  ];
  const maxBar = Math.max(...bars.map((b) => b.v));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Hole">
          <FieldGrid>
            <NumberField label="Bit depth" unit="ft" value={hole.depth} onChange={(v) => setHole({ ...hole, depth: v })} min={100} />
            <NumberField label="Casing shoe" unit="ft" value={hole.shoe} onChange={(v) => setHole({ ...hole, shoe: v })} min={0} />
            <NumberField label="Casing ID" unit="in" step={0.001} value={hole.casingId} onChange={(v) => setHole({ ...hole, casingId: v })} />
            <NumberField label="Open hole (bit)" unit="in" step={0.125} value={hole.openHole} onChange={(v) => setHole({ ...hole, openHole: v })} />
            <NumberField label="Washout" unit="% vol" value={hole.washout} onChange={(v) => setHole({ ...hole, washout: v })} min={0} />
            <NumberField label="Active pits" unit="bbl" value={hole.pits} onChange={(v) => setHole({ ...hole, pits: v })} min={0} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">String (top → bit)</span>
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {str.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1fr_66px_66px_78px] items-end gap-2">
                <div className="pb-2 text-[12.5px] text-ink-2">{c.name}</div>
                <NumberField dense label="OD" value={c.od} step={0.125} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, od: v } : x)))} />
                <NumberField dense label="ID" value={c.id_} step={0.001} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, id_: v } : x)))} />
                {i === 0 ? (
                  <div className="num pb-2 text-right text-[11.5px] text-ink-3">{fmt(r.comps[0].length, 0)} ft</div>
                ) : (
                  <NumberField dense label="Length" value={c.length} onChange={(v) => setStr(str.map((x, k) => (k === i ? { ...x, length: v } : x)))} />
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Mud pumps">
          <Segmented
            value={pump.type}
            onChange={(t) => setPump({ ...pump, type: t })}
            options={[
              { value: "triplex", label: "Triplex" },
              { value: "duplex", label: "Duplex" },
            ]}
            className="mb-4"
          />
          <FieldGrid>
            <NumberField label="Liner" unit="in" step={0.25} value={pump.liner} onChange={(v) => setPump({ ...pump, liner: v })} />
            <NumberField label="Stroke" unit="in" value={pump.stroke} onChange={(v) => setPump({ ...pump, stroke: v })} />
            {pump.type === "duplex" && <NumberField label="Rod" unit="in" step={0.25} value={pump.rod} onChange={(v) => setPump({ ...pump, rod: v })} />}
            <NumberField label="Efficiency" unit="%" value={pump.eff} onChange={(v) => setPump({ ...pump, eff: v })} min={50} max={100} />
            <NumberField label="Speed" unit="spm" value={pump.spm} onChange={(v) => setPump({ ...pump, spm: v })} min={1} />
            <NumberField label="Pumps on line" value={pump.pumps} onChange={(v) => setPump({ ...pump, pumps: Math.max(1, Math.round(v)) })} min={1} max={4} />
          </FieldGrid>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <StatGrid>
          <Stat emphasis label="Pump output" value={r.po.toFixed(4)} unit="bbl/stk" sub={`${fmt(r.gpm, 0)} gpm · ${(r.gpm / 42).toFixed(2)} bbl/min`} />
          <Stat emphasis label="Bottoms-up" value={fmt(r.stk(r.annVol), 0)} unit="stk" sub={fmtDuration(r.mins(r.annVol))} />
          <Stat label="Surface → bit" value={fmt(r.stk(r.stringVol + hole.lines), 0)} unit="stk" sub={fmtDuration(r.mins(r.stringVol + hole.lines))} />
          <Stat label="Full circulation" value={fmt(r.stk(r.activeVol), 0)} unit="stk" sub={`${fmtDuration(r.mins(r.activeVol))} incl. pits`} />
          <Stat label="String volume" value={fmt(r.stringVol, 1)} unit="bbl" />
          <Stat label="Annular volume" value={fmt(r.annVol, 1)} unit="bbl" />
          <Stat label="Hole volume (no pipe)" value={fmt(r.holeVol, 1)} unit="bbl" />
          <Stat label="Steel displacement" value={fmt(r.steel, 1)} unit="bbl" />
        </StatGrid>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Panel title="Circulating system volume" subtitle={`${fmt(r.activeVol, 0)} bbl total`}>
            <ul className="flex flex-col gap-2">
              {bars.map((b) => (
                <li key={b.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_70px] items-center gap-3 text-[12.5px]">
                  <span className="truncate text-ink-2" title={b.name}>
                    {b.name}
                  </span>
                  <span className="h-3 rounded-[3px] bg-panel-3">
                    <span className="block h-full rounded-[3px] bg-[var(--series-1)]" style={{ width: `${Math.max(1, (b.v / maxBar) * 100)}%` }} />
                  </span>
                  <span className="num text-right text-ink">{fmt(b.v, 1)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Annular sections">
            <DataTable
              columns={[
                { key: "n", label: "Section" },
                { key: "len", label: <Unit u="ft" />, align: "right" },
                { key: "cap", label: <Unit u="bbl/ft" />, align: "right" },
                { key: "vol", label: <Unit u="bbl" />, align: "right" },
                { key: "av", label: <LabelWithUnit label="AV" unit="ft/min" />, align: "right" },
              ]}
              rows={r.sections.map((s) => ({
                n: s.name,
                len: fmt(s.len, 0),
                cap: s.cap.toFixed(4),
                vol: fmt(s.vol, 1),
                av: s.av < 100 ? <Badge status="warning">{fmt(s.av, 0)}</Badge> : fmt(s.av, 0),
              }))}
            />
            <p className="mt-2 text-[11.5px] text-ink-3">
              Open-hole capacity uses an effective diameter of {r.ohEff.toFixed(3)}&quot; for {hole.washout}% washout.
            </p>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Tripping out" subtitle={`Pulling ${trip.stands} stands of ${dp.name} without filling`}>
            <FieldGrid>
              <NumberField label="Mud weight" unit="ppg" step={0.1} value={trip.mw} onChange={(v) => setTrip({ ...trip, mw: v })} />
              <NumberField label="Stands pulled" value={trip.stands} onChange={(v) => setTrip({ ...trip, stands: v })} min={1} />
            </FieldGrid>
            <div className="mt-4">
              <KV k="Dry (open-end) displacement" v={dryDisp.toFixed(5)} unit="bbl/ft" />
              <KV k="Wet (closed-end) displacement" v={wetDisp.toFixed(5)} unit="bbl/ft" />
              <KV k="Fill volume · dry" v={fmt(dryDisp * pulled, 2)} unit="bbl" />
              <KV k="Fill volume · wet" v={fmt(wetDisp * pulled, 2)} unit="bbl" />
              <KV k="BHP loss if not filled · dry" v={fmt(dropDry, 0)} unit="psi" />
              <KV k="BHP loss if not filled · wet" v={fmt(dropWet, 0)} unit="psi" />
            </div>
          </Panel>
          <Panel title="Slug before a dry trip" subtitle="Heavy pill to pull dry pipe">
            <FieldGrid>
              <NumberField label="Dry pipe wanted" unit="ft" value={trip.dryLen} onChange={(v) => setTrip({ ...trip, dryLen: v })} min={0} />
              <NumberField label="Slug volume" unit="bbl" value={trip.slugVol} onChange={(v) => setTrip({ ...trip, slugVol: v })} min={1} />
            </FieldGrid>
            <div className="mt-4">
              <KV k="Required slug weight" v={slugWeight.toFixed(2)} unit="ppg" />
              <KV k="Pit gain when slug falls" v={fmt(slugPitGain, 1)} unit="bbl" />
              <KV k="Slug height in pipe" v={fmt(trip.slugVol / capacity(dp.id_), 0)} unit="ft" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
