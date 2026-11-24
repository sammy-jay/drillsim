"use client";

import { useMemo, useState } from "react";
import { XYChart, type ChartSeries } from "@/components/charts/XYChart";
import { FieldGrid, NumberField, Segmented } from "@/components/ui/fields";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Badge, Callout, Stat, StatGrid } from "@/components/ui/Stat";
import { planWell, type PlanType } from "@/lib/calc/trajectory";
import { broomstick, surfaceLoads, type TDComponent, type TDInput } from "@/lib/calc/torqueDrag";
import { fmt } from "@/lib/format";

const FFS = [0.15, 0.25, 0.35];
const DASH = ["2 4", "", "8 5"];

export function TorqueDragApp() {
  const [path, setPath] = useState({ type: "horizontal" as PlanType, kop: 7200, bur: 8, targetTvd: 9000, targetDisp: 3500, lateral: 3000 });
  const [str, setStr] = useState<TDComponent[]>([
    { name: '5" DP 19.5# S-135', od: 5, id_: 4.276, tjOd: 6.625, weight: 22.6, length: 0 },
    { name: '5" HWDP', od: 5, id_: 3.0, tjOd: 6.5, weight: 49.3, length: 450 },
    { name: '6-3/4" BHA', od: 6.75, id_: 2.8125, tjOd: 6.75, weight: 100, length: 150 },
  ]);
  const [env, setEnv] = useState({
    mw: 10.0,
    ffCased: 0.2,
    ffOpen: 0.3,
    shoe: 7000,
    hole: 8.5,
    casingId: 8.681,
    wob: 20,
    bitTorque: 4,
    block: 45,
    mut: 32,
    tensile: 560,
  });
  const [chart, setChart] = useState<"broom" | "force" | "torque">("broom");

  const plan = useMemo(
    () =>
      planWell({
        type: path.type,
        kop: path.kop,
        bur: path.bur,
        dor: 2,
        targetTvd: path.targetTvd,
        targetDisp: path.targetDisp,
        azimuth: 0,
        lateral: path.lateral,
        landingInc: 90,
        stationStep: 100,
      }),
    [path],
  );

  const inp: TDInput | null = useMemo(
    () =>
      plan.ok
        ? {
            stations: plan.stations,
            string: str,
            bitDepth: plan.tdMd,
            mw: env.mw,
            ffCased: env.ffCased,
            ffOpen: env.ffOpen,
            shoe: env.shoe,
            holeSize: env.hole,
            casingId: env.casingId,
            wob: env.wob,
            bitTorque: env.bitTorque,
            blockWeight: env.block,
          }
        : null,
    [plan, str, env],
  );

  const loads = useMemo(() => (inp ? surfaceLoads(inp) : null), [inp]);
  const broom = useMemo(() => (inp ? broomstick(inp, FFS, 28) : null), [inp]);

  if (!inp || !loads || !broom) {
    return (
      <Callout status="serious" title="Well path not feasible">
        {plan.message}
      </Callout>
    );
  }

  const slide = loads.slide.nodes;
  const helical = slide.some((n) => n.force < -n.helical);
  const sinusoidal = slide.some((n) => n.force < -n.sinusoidal);
  const lockup = loads.slide.hookload < env.block + 5;
  const mop = env.tensile * 0.9 - loads.pu.hookload + env.block;
  const torqueRatio = loads.drill.torque / env.mut;

  const broomSeries: ChartSeries[] = [
    ...broom.lines.map((l, i) => ({
      id: `pu${i}`,
      label: `Pick-up μ ${l.ff}`,
      color: "var(--series-1)",
      dash: DASH[i] || undefined,
      data: l.pu,
    })),
    { id: "rob", label: "Rotating off bottom", color: "var(--series-3)", data: broom.rob, width: 2.5 },
    ...broom.lines.map((l, i) => ({
      id: `so${i}`,
      label: `Slack-off μ ${l.ff}`,
      color: "var(--series-2)",
      dash: DASH[i] || undefined,
      data: l.so,
    })),
  ];

  const modeSeries = (key: "force" | "torque") => {
    const pick = key === "force" ? (["pu", "so", "rob", "drill", "slide"] as const) : (["rob", "drill"] as const);
    const names = { pu: "Pick-up", so: "Slack-off", rob: "Rotating off bottom", drill: "Rotary drilling", slide: "Slide drilling" };
    const colors = { pu: "var(--series-1)", so: "var(--series-2)", rob: "var(--series-3)", drill: "var(--series-4)", slide: "var(--series-5)" };
    return pick.map((m) => ({
      id: m,
      label: names[m],
      color: colors[m],
      data: loads[m].nodes.map((n) => ({ x: key === "force" ? n.force : n.torque, y: n.md })),
    }));
  };

  const setC = (i: number, patch: Partial<TDComponent>) => setStr(str.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Well path">
          <Segmented
            value={path.type}
            onChange={(t: PlanType) => setPath({ ...path, type: t, ...(t === "horizontal" ? { kop: 7200, bur: 8 } : { kop: 2000, bur: 3 }) })}
            options={[
              { value: "j", label: "J-type" },
              { value: "s", label: "S-type" },
              { value: "horizontal", label: "Horizontal" },
            ]}
            className="mb-4"
          />
          <FieldGrid>
            <NumberField label="Kick-off point" unit="ft" value={path.kop} onChange={(v) => setPath({ ...path, kop: v })} min={0} />
            <NumberField label="Build rate" unit="°/100ft" value={path.bur} step={0.5} onChange={(v) => setPath({ ...path, bur: v })} min={0.5} />
            {path.type === "horizontal" ? (
              <NumberField label="Lateral length" unit="ft" value={path.lateral} onChange={(v) => setPath({ ...path, lateral: v })} min={0} className="col-span-2" />
            ) : (
              <>
                <NumberField label="Target TVD" unit="ft" value={path.targetTvd} onChange={(v) => setPath({ ...path, targetTvd: v })} />
                <NumberField label="Departure" unit="ft" value={path.targetDisp} onChange={(v) => setPath({ ...path, targetDisp: v })} />
              </>
            )}
          </FieldGrid>
          <div className="mt-3 text-[12px] text-ink-3">
            TD {fmt(plan.tdMd, 0)} ft MD · {fmt(plan.stations.at(-1)?.tvd, 0)} ft TVD · max {plan.maxInc.toFixed(1)}°
          </div>
        </Panel>

        <Panel title="Operating conditions">
          <FieldGrid>
            <NumberField label="Mud weight" unit="ppg" step={0.1} value={env.mw} onChange={(v) => setEnv({ ...env, mw: v })} />
            <NumberField label="Block weight" unit="klbf" value={env.block} onChange={(v) => setEnv({ ...env, block: v })} />
            <NumberField label="Friction · cased" step={0.01} value={env.ffCased} onChange={(v) => setEnv({ ...env, ffCased: v })} min={0} max={1} />
            <NumberField label="Friction · open hole" step={0.01} value={env.ffOpen} onChange={(v) => setEnv({ ...env, ffOpen: v })} min={0} max={1} />
            <NumberField label="Casing shoe MD" unit="ft" value={env.shoe} onChange={(v) => setEnv({ ...env, shoe: v })} />
            <NumberField label="Hole size" unit="in" step={0.125} value={env.hole} onChange={(v) => setEnv({ ...env, hole: v })} />
            <NumberField label="WOB" unit="klbf" value={env.wob} onChange={(v) => setEnv({ ...env, wob: v })} min={0} />
            <NumberField label="Bit torque" unit="kft·lbf" step={0.5} value={env.bitTorque} onChange={(v) => setEnv({ ...env, bitTorque: v })} min={0} />
            <NumberField label="Make-up torque" unit="kft·lbf" value={env.mut} onChange={(v) => setEnv({ ...env, mut: v })} />
            <NumberField label="DP tensile (new)" unit="klbf" value={env.tensile} onChange={(v) => setEnv({ ...env, tensile: v })} />
          </FieldGrid>
        </Panel>

        <Panel title="Drill string" subtitle="Weights in air, incl. tool joints">
          <div className="flex flex-col gap-3">
            {str.map((c, i) => (
              <div key={c.name}>
                <SectionLabel>{c.name}</SectionLabel>
                <div className="grid grid-cols-4 gap-2">
                  <NumberField dense label="OD" value={c.od} step={0.125} onChange={(v) => setC(i, { od: v })} />
                  <NumberField dense label="ID" value={c.id_} step={0.001} onChange={(v) => setC(i, { id_: v })} />
                  <NumberField dense label="lb/ft" value={c.weight} onChange={(v) => setC(i, { weight: v })} />
                  {i === 0 ? (
                    <NumberField dense label="TJ OD" value={c.tjOd} step={0.125} onChange={(v) => setC(i, { tjOd: v })} />
                  ) : (
                    <NumberField dense label="Length" value={c.length} onChange={(v) => setC(i, { length: v })} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {(helical || lockup) && (
          <Callout status="critical" title="Slide drilling limited">
            {lockup
              ? "Slack-off hookload is at block weight — the string locks up before the requested WOB reaches the bit."
              : "Compression exceeds the helical buckling limit while sliding. Expect poor weight transfer."}
          </Callout>
        )}
        <Panel title="Surface loads at TD" subtitle={`Bit at ${fmt(plan.tdMd, 0)} ft MD`}>
          <StatGrid>
            <Stat emphasis label="Pick-up hookload" value={fmt(loads.pu.hookload, 0)} unit="klbf" />
            <Stat emphasis label="Slack-off hookload" value={fmt(loads.so.hookload, 0)} unit="klbf" />
            <Stat label="Rotating off bottom" value={fmt(loads.rob.hookload, 0)} unit="klbf" />
            <Stat label="Drag (PU − ROB)" value={fmt(loads.pu.hookload - loads.rob.hookload, 0)} unit="klbf" />
            <Stat label="Off-bottom torque" value={fmt(loads.rob.torque, 1)} unit="kft·lbf" />
            <Stat
              label="Drilling torque"
              value={fmt(loads.drill.torque, 1)}
              unit="kft·lbf"
              sub={`${(torqueRatio * 100).toFixed(0)}% of make-up`}
              status={torqueRatio > 0.9 ? "critical" : torqueRatio > 0.75 ? "warning" : "good"}
            />
            <Stat label="Margin of overpull" value={fmt(mop, 0)} unit="klbf" sub="90% tensile − PU string" status={mop < 50 ? "warning" : "good"} />
            <Stat
              label="Buckling (sliding)"
              value={<span className="text-[16px]">{helical ? "Helical" : sinusoidal ? "Sinusoidal" : "None"}</span>}
              status={helical ? "critical" : sinusoidal ? "warning" : "good"}
            />
          </StatGrid>
        </Panel>

        <Panel
          title={chart === "broom" ? "Broomstick plot" : chart === "force" ? "Axial force along the string" : "Torque along the string"}
          subtitle={
            chart === "broom"
              ? "Hookload while tripping vs bit depth for a range of open-hole friction factors"
              : chart === "force"
                ? "Effective tension (+) and compression (−) at TD, with buckling limits for the sliding case"
                : "Rotating torque build-up from bit to surface"
          }
          actions={
            <Segmented
              size="sm"
              value={chart}
              onChange={setChart}
              options={[
                { value: "broom", label: "Broomstick" },
                { value: "force", label: "Axial force" },
                { value: "torque", label: "Torque" },
              ]}
            />
          }
        >
          {chart === "broom" && (
            <XYChart
              series={broomSeries}
              xLabel="Hookload"
              xUnit="klbf"
              yLabel="Bit depth (MD)"
              yUnit="ft"
              invertY
              independent="y"
              height={460}
              valueDigits={0}
              refLines={[{ axis: "y", value: env.shoe, label: "Shoe", color: "var(--ink-3)" }]}
            />
          )}
          {chart === "force" && (
            <XYChart
              series={[
                ...modeSeries("force"),
                {
                  id: "sin",
                  label: "Sinusoidal limit",
                  color: "var(--ink-3)",
                  dash: "4 4",
                  width: 1.5,
                  data: slide.map((n) => ({ x: -n.sinusoidal, y: n.md })),
                },
                {
                  id: "hel",
                  label: "Helical limit",
                  color: "var(--ink-2)",
                  dash: "1 4",
                  width: 1.5,
                  data: slide.map((n) => ({ x: -n.helical, y: n.md })),
                },
              ]}
              xLabel="Axial force"
              xUnit="klbf"
              yLabel="Measured depth"
              yUnit="ft"
              invertY
              independent="y"
              height={460}
              valueDigits={1}
              xDomain={[Math.max(-150, Math.min(...slide.map((n) => n.force)) * 1.6 - 10), null]}
              refLines={[{ axis: "x", value: 0, color: "var(--chart-axis)", dash: false }]}
            />
          )}
          {chart === "torque" && (
            <XYChart
              series={modeSeries("torque")}
              refLines={[{ axis: "x", value: env.mut, label: "Make-up torque", color: "var(--critical)" }]}
              xLabel="Torque"
              xUnit="kft·lbf"
              yLabel="Measured depth"
              yUnit="ft"
              invertY
              independent="y"
              height={460}
              valueDigits={1}
              xDomain={[0, null]}
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-ink-3">
            <Badge status="info">Soft-string model (Johancsik et al., 1984)</Badge>
            <Badge status="info">Buckling: Dawson-Pasley / Chen</Badge>
          </div>
        </Panel>
      </div>
    </div>
  );
}
