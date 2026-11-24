"use client";

import { useMemo, useState } from "react";
import { XYChart } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, Segmented, SelectField } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Callout, KV, Stat, StatGrid } from "@/components/ui/Stat";
import { buoyancyFactor, collarWeight } from "@/lib/calc/common";
import { fmt } from "@/lib/format";

type Grade = "E-75" | "X-95" | "G-105" | "S-135";
const DP: Record<string, { label: string; od: number; id: number; ppf: number; tensile: Record<Grade, number>; premium: Record<Grade, number> }> = {
  "3.5": {
    label: '3-1/2" 13.30#',
    od: 3.5,
    id: 2.764,
    ppf: 14.6,
    tensile: { "E-75": 271569, "X-95": 343988, "G-105": 380197, "S-135": 488825 },
    premium: { "E-75": 212150, "X-95": 268723, "G-105": 297010, "S-135": 381870 },
  },
  "4.5": {
    label: '4-1/2" 16.60#',
    od: 4.5,
    id: 3.826,
    ppf: 18.4,
    tensile: { "E-75": 330558, "X-95": 418707, "G-105": 462781, "S-135": 595004 },
    premium: { "E-75": 260165, "X-95": 329542, "G-105": 364231, "S-135": 468297 },
  },
  "5": {
    label: '5" 19.50#',
    od: 5,
    id: 4.276,
    ppf: 22.6,
    tensile: { "E-75": 395595, "X-95": 501090, "G-105": 553833, "S-135": 712070 },
    premium: { "E-75": 311535, "X-95": 394612, "G-105": 436150, "S-135": 560764 },
  },
  "5.5": {
    label: '5-1/2" 21.90#',
    od: 5.5,
    id: 4.778,
    ppf: 24.5,
    tensile: { "E-75": 437116, "X-95": 553681, "G-105": 611963, "S-135": 786809 },
    premium: { "E-75": 344780, "X-95": 436721, "G-105": 482692, "S-135": 620604 },
  },
};

export function DrillStringApp() {
  const [p, setP] = useState({
    mw: 11,
    wob: 35,
    sf: 1.15,
    inc: 0,
    depth: 12000,
    dcOd: 6.5,
    dcId: 2.8125,
    dcLen: 600,
    hwLen: 450,
    hwPpf: 49.3,
    dpSize: "5",
    grade: "G-105" as Grade,
    cls: "premium" as "new" | "premium",
    mop: 100,
    design: 0.9,
  });
  const set = (x: Partial<typeof p>) => setP((o) => ({ ...o, ...x }));

  const r = useMemo(() => {
    const bf = buoyancyFactor(p.mw);
    const dcPpf = collarWeight(p.dcOd, p.dcId);
    const cos = Math.cos((p.inc * Math.PI) / 180);
    const dcEff = dcPpf * bf * cos; // lb/ft available for WOB
    const reqLen = (p.wob * 1000 * p.sf) / Math.max(1, dcEff);
    const npDc = (p.wob * 1000) / Math.max(1, dcEff);
    let np = npDc;
    let npIn = "drill collars";
    if (npDc > p.dcLen) {
      const rem = p.wob * 1000 - dcEff * p.dcLen;
      const hwEff = p.hwPpf * bf * cos;
      const into = rem / Math.max(1, hwEff);
      np = p.dcLen + into;
      npIn = into > p.hwLen ? "drill pipe" : "HWDP";
    }
    const dp = DP[p.dpSize];
    const pt = (p.cls === "new" ? dp.tensile : dp.premium)[p.grade];
    const pa = pt * p.design;
    const dpLen = Math.max(0, p.depth - p.dcLen - p.hwLen);
    const bhaAir = dcPpf * p.dcLen + p.hwPpf * p.hwLen;
    const stringAir = bhaAir + dp.ppf * dpLen;
    const hookStatic = (stringAir * bf) / 1000; // klbf (excl. block)
    const mopAvail = pa / 1000 - hookStatic;
    const maxDpLen = ((pa - p.mop * 1000) / bf - bhaAir) / dp.ppf;
    const maxWobBha = (dcEff * p.dcLen) / p.sf / 1000;

    // tension profile (vertical): static & drilling
    const pts: { z: number; stat: number; drill: number }[] = [];
    const segs = [
      { top: 0, bottom: dpLen, w: dp.ppf },
      { top: dpLen, bottom: dpLen + p.hwLen, w: p.hwPpf },
      { top: dpLen + p.hwLen, bottom: p.depth, w: dcPpf },
    ];
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const z = (p.depth * i) / N;
      let below = 0;
      for (const s of segs) below += Math.max(0, s.bottom - Math.max(z, s.top)) * s.w;
      const wTens = (below * bf * cos) / 1000;
      pts.push({ z, stat: wTens, drill: wTens - p.wob });
    }
    return { bf, dcPpf, reqLen, np, npIn, pt, pa, dpLen, hookStatic, mopAvail, maxDpLen, maxWobBha, pts, joints: Math.ceil(reqLen / 31), dp };
  }, [p]);

  const shortBha = r.reqLen > p.dcLen;
  const mopOk = r.mopAvail >= p.mop;

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Operating conditions">
          <FieldGrid>
            <NumberField label="Mud weight" unit="ppg" step={0.1} value={p.mw} onChange={(v) => set({ mw: v })} />
            <NumberField label="Max WOB" unit="klbf" value={p.wob} onChange={(v) => set({ wob: v })} min={0} />
            <NumberField label="BHA safety factor" step={0.05} value={p.sf} onChange={(v) => set({ sf: v })} min={1} hint="Keeps neutral point in the collars" />
            <NumberField label="Inclination" unit="°" value={p.inc} onChange={(v) => set({ inc: v })} min={0} max={89} />
            <NumberField label="Bit depth" unit="ft" value={p.depth} onChange={(v) => set({ depth: v })} className="col-span-2" />
          </FieldGrid>
        </Panel>
        <Panel title="BHA">
          <FieldGrid>
            <NumberField label="Collar OD" unit="in" step={0.125} value={p.dcOd} onChange={(v) => set({ dcOd: v })} />
            <NumberField label="Collar ID" unit="in" step={0.0625} value={p.dcId} onChange={(v) => set({ dcId: v })} />
            <NumberField label="Collar length" unit="ft" value={p.dcLen} onChange={(v) => set({ dcLen: v })} />
            <NumberField label="HWDP length" unit="ft" value={p.hwLen} onChange={(v) => set({ hwLen: v })} />
            <NumberField label="HWDP weight" unit="lb/ft" value={p.hwPpf} onChange={(v) => set({ hwPpf: v })} className="col-span-2" />
          </FieldGrid>
        </Panel>
        <Panel title="Drill pipe">
          <FieldGrid>
            <SelectField label="Size" value={p.dpSize} onChange={(v) => set({ dpSize: v })} options={Object.entries(DP).map(([k, d]) => ({ value: k, label: d.label }))} />
            <SelectField label="Grade" value={p.grade} onChange={(v) => set({ grade: v })} options={(["E-75", "X-95", "G-105", "S-135"] as Grade[]).map((g) => ({ value: g, label: g }))} />
          </FieldGrid>
          <SectionLabel>
            <span className="mt-4 block">Inspection class</span>
          </SectionLabel>
          <Segmented value={p.cls} onChange={(v) => set({ cls: v })} options={[{ value: "new", label: "New" }, { value: "premium", label: "Premium" }]} />
          <FieldGrid className="mt-4">
            <NumberField label="Design factor" step={0.05} value={p.design} onChange={(v) => set({ design: v })} max={1} />
            <NumberField label="Required MOP" unit="klbf" value={p.mop} onChange={(v) => set({ mop: v })} />
          </FieldGrid>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {(shortBha || !mopOk) && (
          <Callout status="serious" title="Design check">
            {shortBha && (
              <div>
                The BHA needs {fmt(r.reqLen, 0)} ft of collars for {p.wob} klbf with SF {p.sf}; only {fmt(p.dcLen, 0)} ft is run. The
                neutral point sits in the {r.npIn}.
              </div>
            )}
            {!mopOk && <div>Available overpull ({fmt(r.mopAvail, 0)} klbf) is below the required margin of {p.mop} klbf.</div>}
          </Callout>
        )}
        <StatGrid>
          <Stat emphasis label="Collar length needed" value={fmt(r.reqLen, 0)} unit="ft" sub={`≈ ${r.joints} joints of 31 ft`} status={shortBha ? "serious" : "good"} />
          <Stat emphasis label="Neutral point" value={fmt(r.np, 0)} unit="ft" sub={`above bit · in ${r.npIn}`} />
          <Stat label="Buoyancy factor" value={r.bf.toFixed(4)} />
          <Stat label="Collar weight" value={fmt(r.dcPpf, 1)} unit="lb/ft" sub="in air" />
          <Stat label="Hookload (static)" value={fmt(r.hookStatic, 0)} unit="klbf" sub="excl. block" />
          <Stat label="Margin of overpull" value={fmt(r.mopAvail, 0)} unit="klbf" status={mopOk ? "good" : "serious"} />
          <Stat label="Max DP length" value={fmt(r.maxDpLen, 0)} unit="ft" sub={`for ${p.mop} klbf MOP`} />
          <Stat label="Max WOB for BHA" value={fmt(r.maxWobBha, 1)} unit="klbf" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel title="Axial load along the string" subtitle="Static hanging vs drilling with full WOB">
            <XYChart
              series={[
                { id: "s", label: "Static", color: "var(--series-1)", data: r.pts.map((x) => ({ x: x.stat, y: x.z })) },
                { id: "d", label: `Drilling (${p.wob} klbf WOB)`, color: "var(--series-2)", data: r.pts.map((x) => ({ x: x.drill, y: x.z })) },
              ]}
              refLines={[
                { axis: "x", value: r.pa / 1000, label: `${Math.round(p.design * 100)}% tensile`, color: "var(--critical)", labelAt: "start" },
                { axis: "x", value: 0, color: "var(--chart-axis)", dash: false },
                { axis: "y", value: p.depth - r.np, label: "Neutral point", color: "var(--ink-2)" },
              ]}
              xLabel="Axial load"
              xUnit="klbf"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={420}
              valueDigits={0}
            />
          </Panel>
          <Panel title="Drill pipe">
            <KV k="Pipe" v={`${r.dp.label} ${p.grade}`} />
            <KV k="Class" v={p.cls === "new" ? "New" : "Premium"} />
            <KV k="Tensile rating" v={fmt(r.pt / 1000, 1)} unit="klbf" />
            <KV k={`Allowable (×${p.design})`} v={fmt(r.pa / 1000, 1)} unit="klbf" />
            <KV k="Adjusted weight" v={r.dp.ppf} unit="lb/ft" />
            <KV k="DP in string" v={fmt(r.dpLen, 0)} unit="ft" />
            <KV k="Buoyed collar weight" v={fmt(r.dcPpf * r.bf, 1)} unit="lb/ft" />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
              Neutral point = WOB ÷ (buoyed collar weight × cos θ). Running a safety factor of {p.sf} keeps the pipe above the
              collars in tension and out of buckling.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
