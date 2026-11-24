"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  Anchor,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Waves,
  Wrench,
} from "lucide-react";
import { Gauge } from "@/components/charts/Gauge";
import { XYChart, type ChartSeries } from "@/components/charts/XYChart";
import { Button, Segmented, SelectField, SliderField, Toggle } from "@/components/ui/fields";
import { Panel, cn } from "@/components/ui/Panel";
import { Badge, KV, StatusIcon } from "@/components/ui/Stat";
import { Unit } from "@/components/ui/Unit";
import { useAnimationLoop } from "@/lib/hooks";
import { fmt, fmtClock } from "@/lib/format";
import {
  alarms,
  annulusVolume,
  bottomsUpMinutes,
  costPerFoot,
  maasp,
  RIG,
  spm,
  totalCost,
  type Level,
  type Mode,
} from "@/lib/sim/engine";
import { fgAt, layerAt, ppAt, SCENARIOS } from "@/lib/sim/scenarios";
import { FormationColumn } from "./FormationColumn";
import { SimStore } from "./store";

const SPEEDS = [
  { value: "1", label: "1×" },
  { value: "30", label: "30×" },
  { value: "120", label: "120×" },
  { value: "600", label: "600×" },
  { value: "1800", label: "1800×" },
];

const MODE_META: Record<Mode, { label: string; level: Level }> = {
  drilling: { label: "Drilling", level: "good" },
  circulating: { label: "Circulating", level: "info" },
  idle: { label: "Idle", level: "info" },
  connection: { label: "Connection", level: "info" },
  "shut-in": { label: "Shut in", level: "serious" },
  killing: { label: "Killing well", level: "warning" },
  tripping: { label: "Tripping", level: "info" },
};

function levelToStatus(l: Level) {
  return l === "info" ? "info" : l;
}

export function SimulatorApp() {
  const [store] = useState(() => new SimStore("transition"));
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const s = store.sim;
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState("120");
  const [trendSet, setTrendSet] = useState<"drilling" | "control">("drilling");
  const [reveal, setReveal] = useState(false);

  const loop = useCallback(
    (dtMs: number) => {
      store.advance((dtMs / 1000) * Number(speed), performance.now());
      if (store.sim.ended) setRunning(false);
    },
    [store, speed],
  );
  useAnimationLoop(loop, running && !s.ended);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "SELECT" && tag !== "BUTTON" && tag !== "TEXTAREA") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sc = s.scenario;
  const layer = layerAt(sc, s.depth);
  const al = alarms(s);
  const mode = MODE_META[s.mode];
  const busy = s.mode === "shut-in" || s.mode === "killing" || s.mode === "tripping";
  const tNow = s.t / 3600;
  const win = 3;
  const xDomain: [number, number] = tNow < win ? [0, Math.max(0.5, Math.ceil(tNow * 2) / 2)] : [tNow - win, tNow];
  const tr = s.trend;
  const kmwEst = s.mode === "shut-in" ? s.mw + s.sidpp / (0.052 * s.depth) : NaN;

  const trend = (id: string, label: string, color: string, key: keyof (typeof tr)[number], unit: string, digits = 0): ChartSeries => ({
    id,
    label,
    color,
    unit,
    digits,
    data: tr.map((p) => ({ x: p.t / 60, y: p[key] as number })),
  });

  const charts =
    trendSet === "drilling"
      ? [
          { title: "Rate of penetration", s: [trend("rop", "ROP", "var(--series-1)", "rop", "ft/hr")], y: "ROP", u: "ft/hr" },
          { title: "Weight on bit", s: [trend("wob", "WOB", "var(--series-2)", "wob", "klbf", 1)], y: "WOB", u: "klbf" },
          { title: "Rotary torque", s: [trend("tq", "Torque", "var(--series-3)", "torque", "kft·lbf", 1)], y: "Torque", u: "kft·lbf" },
          { title: "Standpipe pressure", s: [trend("spp", "SPP", "var(--series-7)", "spp", "psi")], y: "SPP", u: "psi" },
        ]
      : [
          { title: "Pit gain", s: [trend("pit", "Pit gain", "var(--series-1)", "pit", "bbl", 1)], y: "Pit gain", u: "bbl" },
          { title: "Flow out", s: [trend("fo", "Flow out", "var(--series-2)", "flowOut", "%")], y: "Flow out", u: "%" },
          { title: "Gas at shakers", s: [trend("gas", "Gas", "var(--series-3)", "gas", "units")], y: "Gas", u: "units" },
          {
            title: "Mud weight & ECD",
            s: [trend("mw", "Mud weight", "var(--series-1)", "mw", "ppg", 2), trend("ecd", "ECD", "var(--series-2)", "ecd", "ppg", 2)],
            y: "Density",
            u: "ppg",
          },
        ];

  const logY: [number, number] = [Math.floor(s.startDepth / 100) * 100, Math.max(s.startDepth + 300, Math.ceil(s.depth / 100) * 100)];

  const pressureProfile = (() => {
    const pp: { x: number; y: number }[] = [];
    const fg: { x: number; y: number }[] = [];
    for (let z = Math.max(0, sc.shoe - 500); z <= sc.td; z += 25) {
      pp.push({ x: ppAt(sc, z), y: z });
      fg.push({ x: fgAt(sc, z), y: z });
    }
    return { pp, fg };
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* top bar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Scenario"
            value={sc.id}
            onChange={(id) => {
              store.reset(id);
              setRunning(false);
            }}
            options={SCENARIOS.map((x) => ({ value: x.id, label: x.name }))}
            className="w-[200px]"
          />
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-ink-2">Sim speed</div>
            <Segmented value={speed} onChange={setSpeed} options={SPEEDS} ariaLabel="Simulation speed" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              store.reset(sc.id);
              setRunning(false);
            }}
          >
            <RotateCcw size={15} /> Reset
          </Button>
          <Button variant="primary" onClick={() => setRunning((r) => !r)} disabled={!!s.ended} className="min-w-[118px]">
            {running ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            {running ? "Pause" : s.t > 0 ? "Resume" : "Start drilling"}
          </Button>
        </div>
      </div>

      {/* scenario brief + status strip */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <div className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{sc.name}. </span>
            {sc.summary} <span className="text-ink-3">{sc.objective}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5">
            <span
              className={cn("size-2.5 rounded-full", running && !s.ended ? "animate-pulse" : "")}
              style={{ background: mode.level === "info" ? "var(--ink-3)" : `var(--${mode.level})` }}
            />
            <span className="text-[13px] font-semibold text-ink">{s.ended ? "Ended" : mode.label}</span>
          </div>
          <StripStat label="Sim time" value={fmtClock(s.t)} />
          <StripStat label="Hole depth" value={`${fmt(s.depth, 0)} ft`} />
          <StripStat label="Cost / ft" value={Number.isFinite(costPerFoot(s)) ? `$${fmt(costPerFoot(s), 0)}` : "—"} />
        </div>
      </div>

      {/* alarms */}
      {al.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--critical)_35%,transparent)] bg-[color-mix(in_oklab,var(--critical)_7%,transparent)] px-3 py-2" role="alert">
          <Siren size={15} className="text-critical-ink" />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-critical-ink">Alarms</span>
          {al.map((a, i) => (
            <Badge key={i} status={levelToStatus(a.level)}>
              {a.msg}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] min-[1680px]:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* ---------------- console ---------------- */}
        <div className="flex flex-col gap-4">
          <Panel title="Driller's console" icon={<Wrench size={15} />}>
            <div className="flex flex-col gap-4">
              <SliderField label="Weight on bit" value={s.ctrl.wob} onChange={(v) => store.setCtrl({ wob: v })} min={0} max={60} step={1} unit="klbf" />
              <SliderField label="Rotary speed" value={s.ctrl.rpm} onChange={(v) => store.setCtrl({ rpm: v })} min={0} max={220} step={5} unit="rpm" />
              <SliderField label="Flow rate" value={s.ctrl.flow} onChange={(v) => store.setCtrl({ flow: v })} min={0} max={RIG.maxGpm} step={10} unit="gpm" />
              <div>
                <SliderField
                  label="Mud weight (target)"
                  value={s.ctrl.mwTarget}
                  onChange={(v) => store.setCtrl({ mwTarget: Math.round(v * 10) / 10 })}
                  min={8.6}
                  max={16}
                  step={0.1}
                  digits={1}
                  unit="ppg"
                  disabled={s.mode === "killing"}
                />
                <div className="mt-1 flex justify-between text-[11.5px] text-ink-3">
                  <span>
                    Active <span className="num text-ink">{s.mw.toFixed(2)}</span> ppg
                  </span>
                  <span>
                    {Math.abs(s.ctrl.mwTarget - s.mw) > 0.02
                      ? s.flow > 50
                        ? s.ctrl.mwTarget > s.mw
                          ? "Weighting up…"
                          : "Diluting…"
                        : "Circulate to condition"
                      : "Conditioned"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-panel-2 p-3">
                <Toggle label="Mud pumps" checked={s.ctrl.pumps} onChange={(v) => store.setCtrl({ pumps: v })} />
                <Toggle label="Rotary / top drive" checked={s.ctrl.rotary} onChange={(v) => store.setCtrl({ rotary: v })} />
                <Toggle label="Bit on bottom" checked={s.ctrl.onBottom} onChange={(v) => store.setCtrl({ onBottom: v })} />
                <Toggle label="Auto connections" checked={s.ctrl.autoConn} onChange={(v) => store.setCtrl({ autoConn: v })} />
              </div>
            </div>
          </Panel>

          <Panel title="Well control" icon={<ShieldAlert size={15} />}>
            {s.mode === "killing" && s.kill ? (
              <KillProgress s={s} />
            ) : (
              <div className="flex flex-col gap-2">
                {s.mode === "shut-in" && (
                  <div className="mb-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5">
                    <KV k="SIDPP" v={fmt(s.sidpp, 0)} unit="psi" />
                    <KV k="SICP" v={fmt(s.sicp, 0)} unit="psi" />
                    <KV k="MAASP" v={fmt(maasp(s), 0)} unit="psi" />
                    <KV k="Pit gain" v={fmt(s.pitGain, 1)} unit="bbl" />
                    <KV k="Est. KMW" v={Number.isFinite(kmwEst) ? fmt(Math.ceil(kmwEst * 10 - 1e-9) / 10, 1) : "—"} unit="ppg" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => store.act("flow-check")} disabled={busy}>
                    <Waves size={14} /> Flow check
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => store.act("shut-in")} disabled={s.mode === "shut-in" || s.mode === "killing"}>
                    <Siren size={14} /> Shut in
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => store.act("start-kill")} disabled={s.mode !== "shut-in"}>
                    <ShieldCheck size={14} /> W&amp;W kill
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => store.act("open-bop")} disabled={s.mode !== "shut-in"}>
                    Open BOP
                  </Button>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-3">
                  Shut in on any positive flow check or pit gain. Wait ~3 min for pressures to stabilise before killing.
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Bit & BHA" icon={<Anchor size={15} />} actions={<span className="num text-[12px] text-ink-3">Bit #{s.bits}</span>}>
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[12px] text-ink-2">
                <span>Cutter wear</span>
                <span className="num text-ink">
                  {fmt(Math.min(8, s.wear * 8), 1)} / 8
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, s.wear * 100)}%`,
                    background: s.wear > 0.85 ? "var(--critical)" : s.wear > 0.6 ? "var(--warning)" : "var(--good)",
                  }}
                />
              </div>
            </div>
            <KV k="Hours on bit" v={fmt(s.bitHours, 1)} unit="h" />
            <KV k="Footage" v={fmt(s.bitFootage, 0)} unit="ft" />
            <KV k="Formation" v={layer.name} />
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => store.act("trip")} disabled={busy || !!s.ended}>
              Trip for new bit
            </Button>
          </Panel>
        </div>

        {/* ---------------- instruments ---------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Gauge label="Hookload" value={s.hook} min={0} max={400} unit="klbf" />
            <Gauge label="WOB" value={s.wob} min={0} max={60} unit="klbf" digits={1} setpoint={s.ctrl.wob} />
            <Gauge
              label="Torque"
              value={s.torque}
              min={0}
              max={30}
              unit="kft·lbf"
              digits={1}
              sub={`${fmt(s.rpm, 0)} rpm`}
              zones={[{ from: 18, to: 25, status: "warning" }, { from: 25, to: 30, status: "critical" }]}
            />
            <Gauge
              label="Standpipe"
              value={s.spp}
              min={0}
              max={5000}
              unit="psi"
              sub={`${fmt(spm(s), 0)} spm`}
              zones={[{ from: 4000, to: 4500, status: "warning" }, { from: 4500, to: 5000, status: "critical" }]}
            />
            <Gauge
              label="Flow out"
              value={s.flow > 1 ? (s.flowOut / s.flow) * 100 : s.flowOut > 0.5 ? 150 : 0}
              min={0}
              max={150}
              unit="% of flow in"
              sub={`${fmt(s.flowOut, 0)} gpm`}
              zones={
                s.flow > 1
                  ? [
                      { from: 0, to: 85, status: "serious" },
                      { from: 95, to: 105, status: "good" },
                      { from: 106, to: 150, status: "critical" },
                    ]
                  : [{ from: 1, to: 150, status: "critical" }]
              }
            />
            <Gauge
              label="Pit gain"
              value={s.pitGain}
              min={-20}
              max={30}
              unit="bbl"
              digits={1}
              zones={[{ from: -20, to: -10, status: "serious" }, { from: 5, to: 15, status: "warning" }, { from: 15, to: 30, status: "critical" }]}
            />
            <Gauge
              label="Casing / choke"
              value={s.casingP}
              min={0}
              max={Math.max(1500, Math.ceil((maasp(s) * 1.4) / 500) * 500)}
              unit="psi"
              sub={`MAASP ${fmt(maasp(s), 0)}`}
              zones={[{ from: maasp(s), to: Math.max(1500, Math.ceil((maasp(s) * 1.4) / 500) * 500), status: "critical" }]}
            />
            <Gauge
              label="Gas"
              value={s.gas}
              min={0}
              max={3000}
              unit="units"
              zones={[{ from: 300, to: 1000, status: "warning" }, { from: 1000, to: 3000, status: "serious" }]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MiniStat label="ROP" value={fmt(s.rop, 0)} unit="ft/hr" />
            <MiniStat label="ECD" value={s.ecd.toFixed(2)} unit="ppg" />
            <MiniStat label="Bottoms-up" value={Number.isFinite(bottomsUpMinutes(s)) ? fmt(bottomsUpMinutes(s), 0) : "—"} unit="min" />
            <MiniStat label="Annulus vol." value={fmt(annulusVolume(s.depth, sc.shoe), 0)} unit="bbl" />
          </div>

          <Panel
            title="Real-time trends"
            subtitle="Last 3 hours of rig time"
            actions={
              <Segmented
                size="sm"
                value={trendSet}
                onChange={setTrendSet}
                options={[
                  { value: "drilling", label: "Drilling" },
                  { value: "control", label: "Well control" },
                ]}
              />
            }
          >
            <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
              {charts.map((c) => (
                <div key={c.title}>
                  <div className="mb-1 text-[12px] font-medium text-ink-2">{c.title}</div>
                  <XYChart
                    series={c.s}
                    xLabel="Rig time"
                    xUnit="h"
                    yLabel={c.y}
                    yUnit={c.u}
                    height={170}
                    xDomain={xDomain}
                    indepDigits={2}
                    tableView={false}
                    legend={c.s.length > 1}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ---------------- right rail ---------------- */}
        <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 lg:col-span-2 min-[1680px]:col-span-1 min-[1680px]:grid-cols-1">
          <Panel title="Formation prognosis" subtitle={`Bit in ${layer.name.toLowerCase()}`} bodyClassName="p-3">
            <FormationColumn scenario={sc} depth={s.depth} bitDepth={s.bitDepth} />
          </Panel>
          <Panel title="Event log" bodyClassName="p-0">
            <ul className="scroll-thin max-h-[300px] overflow-y-auto md:max-h-[476px] min-[1680px]:max-h-[300px]">
              {s.events.map((e, i) => (
                <li key={`${e.t}-${i}`} className="flex gap-2.5 border-b border-line px-4 py-2.5 last:border-0">
                  <span className="mt-0.5">
                    <StatusIcon status={levelToStatus(e.level)} size={13} />
                  </span>
                  <div className="min-w-0">
                    <div className="num text-[10.5px] text-ink-3">{fmtClock(e.t)}</div>
                    <div className="text-[12.5px] leading-snug text-ink-2">{e.msg}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* mud log */}
      <Panel
        title="Drilling log"
        subtitle="Recorded every 5 ft. Watch the d-exponent and gas for the onset of overpressure."
        actions={<Toggle label="Reveal true pressures" checked={reveal} onChange={setReveal} />}
      >
        <div className={cn("grid gap-5", reveal ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
          <XYChart
            series={[{ id: "rop", label: "ROP", color: "var(--series-1)", data: s.log.map((l) => ({ x: l.rop, y: l.depth })), width: 1.5 }]}
            xLabel="ROP"
            xUnit="ft/hr"
            yLabel="Depth"
            yUnit="ft"
            invertY
            independent="y"
            yDomain={logY}
            height={420}
            xDomain={[0, null]}
          />
          <XYChart
            series={[{ id: "dxc", label: "dxc", color: "var(--series-7)", data: s.log.map((l) => ({ x: l.dxc, y: l.depth })), width: 1.5, digits: 2 }]}
            xLabel="Corrected d-exponent"
            yLabel="Depth"
            yUnit="ft"
            invertY
            independent="y"
            yDomain={logY}
            height={420}
            valueDigits={2}
          />
          <XYChart
            series={[{ id: "gas", label: "Gas", color: "var(--series-3)", data: s.log.map((l) => ({ x: l.gas, y: l.depth })), width: 1.5 }]}
            xLabel="Gas"
            xUnit="units"
            yLabel="Depth"
            yUnit="ft"
            invertY
            independent="y"
            yDomain={logY}
            height={420}
            xDomain={[0, null]}
          />
          {reveal && (
            <XYChart
              series={[
                { id: "pp", label: "Pore pressure", color: "var(--series-1)", data: pressureProfile.pp, digits: 2 },
                { id: "fg", label: "Fracture gradient", color: "var(--series-2)", data: pressureProfile.fg, digits: 2 },
              ]}
              refLines={[
                { axis: "x", value: s.mw, label: "MW", color: "var(--ink)", dash: false },
                { axis: "x", value: s.ecd, label: "ECD", color: "var(--series-3)", labelAt: "start" },
                { axis: "y", value: s.depth, label: "Bit", color: "var(--accent)" },
              ]}
              xLabel="EMW"
              xUnit="ppg"
              yLabel="Depth"
              yUnit="ft"
              invertY
              independent="y"
              height={420}
              valueDigits={2}
            />
          )}
        </div>
      </Panel>

      {s.ended && (
        <EndCard
          s={s}
          onRestart={() => {
            store.reset(sc.id);
            setRunning(false);
          }}
        />
      )}
    </div>
  );
}

function StripStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-line bg-panel px-3.5 py-1.5">
      <span className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</span>
      <span className="num text-[14px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2">
      <span className="text-[12px] text-ink-3">{label}</span>
      <span className="num text-[15px] font-semibold text-ink">
        {value}
        <span className="ml-1 text-[11px] font-normal text-ink-3"><Unit u={unit} /></span>
      </span>
    </div>
  );
}

function KillProgress({ s }: { s: SimStore["sim"] }) {
  const k = s.kill!;
  const pct = Math.min(100, (k.strokes / k.total) * 100);
  const surfToBit = k.sheet.stk.surfaceToBit;
  const target =
    k.strokes < surfToBit ? k.sheet.icp + 50 - ((k.sheet.icp - k.sheet.fcp) * k.strokes) / surfToBit : k.sheet.fcp + 50;
  const phase = k.strokes < surfToBit ? "KMW going down the string" : "KMW coming up the annulus";
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1 flex justify-between text-[12px]">
          <span className="font-medium text-ink">{phase}</span>
          <span className="num text-ink-3">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-panel-3">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-lg border border-line bg-panel-2 px-3 py-1.5">
        <KV k="Strokes" v={`${fmt(k.strokes, 0)} / ${fmt(k.total, 0)}`} />
        <KV k="Kill mud weight" v={k.kmw.toFixed(1)} unit="ppg" />
        <KV k="DP pressure (target)" v={fmt(target, 0)} unit="psi" />
        <KV k="Casing pressure" v={fmt(s.casingP, 0)} unit="psi" />
        <KV k="Bottomhole margin" v="+50" unit="psi" />
      </div>
      <p className="text-[11.5px] leading-snug text-ink-3">
        The choke operator holds bottomhole pressure constant by following the drill-pipe schedule. Speed up the
        sim to fast-forward the kill.
      </p>
    </div>
  );
}

function EndCard({ s, onRestart }: { s: SimStore["sim"]; onRestart: () => void }) {
  const e = s.ended!;
  const footage = s.depth - s.startDepth;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <StatusIcon status={e.success ? "good" : "critical"} size={20} />
          <h2 id="end-title" className="text-[20px] font-semibold text-ink">
            {e.title}
          </h2>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{e.msg}</p>
        <div className="mt-4 rounded-lg border border-line bg-panel-2 px-3 py-1.5">
          <KV k="Footage drilled" v={fmt(footage, 0)} unit="ft" />
          <KV k="Rig time" v={fmtClock(s.t)} />
          <KV k="Bits used" v={s.bits} />
          <KV k="Non-productive time" v={fmt(s.npt, 1)} unit="h" />
          <KV k="Mud lost" v={fmt(s.lossTotal, 0)} unit="bbl" />
          <KV k="Total cost" v={`$${fmt(totalCost(s), 0)}`} />
          <KV k="Cost per foot" v={Number.isFinite(costPerFoot(s)) ? `$${fmt(costPerFoot(s), 0)}` : "—"} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="primary" onClick={onRestart}>
            <RotateCcw size={15} /> Restart scenario
          </Button>
        </div>
      </div>
    </div>
  );
}
