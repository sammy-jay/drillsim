"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, TextArea, TextField } from "@/components/ui/fields";
import { Panel, cn } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Stat";
import {
  BIT_FIELDS,
  CASING_FIELDS,
  COST_FIELDS,
  HEADER_FIELDS,
  HSE_FIELDS,
  IADC_CODES,
  MUD_FIELDS,
  PARAM_FIELDS,
  rowHours,
  SECTION_GUIDE,
  timeCheck,
  WC_FIELDS,
  type DDR,
  type FieldDef,
  type SectionId,
  type TimeRow,
} from "@/lib/reports/schema";

function RecordEditor({ defs, rec, onChange }: { defs: FieldDef[]; rec: Record<string, string>; onChange: (r: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-4">
      {defs.map((d) => (
        <TextField
          key={d.k}
          label={d.label}
          unit={d.unit}
          placeholder={d.placeholder}
          value={rec[d.k] ?? ""}
          onChange={(v) => onChange({ ...rec, [d.k]: v })}
          className={cn(d.wide && "col-span-2")}
        />
      ))}
    </div>
  );
}

function GuidedPanel({ id, title, children, actions }: { id: SectionId; title?: string; children: ReactNode; actions?: ReactNode }) {
  const g = SECTION_GUIDE[id];
  return (
    <Panel title={title ?? g.title} subtitle={g.how} actions={actions}>
      {children}
    </Panel>
  );
}

type Col<T> = { k: keyof T & string; label: string; w: string; unit?: string; right?: boolean };

function RowsEditor<T extends Record<string, string>>({
  rows,
  cols,
  onChange,
  blank,
  addLabel,
}: {
  rows: T[];
  cols: Col<T>[];
  onChange: (rows: T[]) => void;
  blank: () => T;
  addLabel: string;
}) {
  const grid = `${cols.map((c) => c.w).join(" ")} 32px`;
  return (
    <div>
      {rows.length > 0 && (
        <div className="scroll-thin overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid gap-2 pb-1.5 text-[11.5px] font-medium text-ink-3" style={{ gridTemplateColumns: grid }}>
              {cols.map((c) => (
                <span key={c.k}>{c.label}</span>
              ))}
              <span />
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r, i) => (
                <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: grid }}>
                  {cols.map((c) => (
                    <TextField key={c.k} dense unit={c.unit} value={r[c.k] ?? ""} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.k]: v } : x)))} />
                  ))}
                  <button
                    type="button"
                    aria-label="Delete row"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-critical-ink"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => onChange([...rows, blank()])}>
        <Plus size={14} /> {addLabel}
      </Button>
    </div>
  );
}

function TimeLogEditor({ rows, onChange }: { rows: TimeRow[]; onChange: (rows: TimeRow[]) => void }) {
  const tc = timeCheck(rows);
  const set = (i: number, patch: Partial<TimeRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const h = rowHours(r);
        return (
          <div key={i} className={cn("rounded-lg border p-3", r.npt ? "border-[color-mix(in_oklab,var(--serious)_45%,transparent)] bg-[color-mix(in_oklab,var(--serious)_6%,transparent)]" : "border-line bg-panel-2/50")}>
            <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[84px_84px_64px_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
              <TextField dense label="From" placeholder="HH:MM" value={r.from} onChange={(v) => set(i, { from: v })} />
              <TextField dense label="To" placeholder="HH:MM" value={r.to} onChange={(v) => set(i, { to: v })} />
              <div className="min-w-0">
                <div className="mb-1.5 text-[12px] font-medium text-ink-2">Hours</div>
                <div className="num flex h-8 items-center rounded-lg bg-panel-3 px-2.5 text-[13px] text-ink">{Number.isFinite(h) ? h.toFixed(2) : "—"}</div>
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-[12px] font-medium text-ink-2" htmlFor={`code-${i}`}>
                  IADC code
                </label>
                <select
                  id={`code-${i}`}
                  value={r.code}
                  onChange={(e) => set(i, { code: e.target.value })}
                  className="h-8 w-full rounded-lg border border-line bg-panel-2 px-2 text-[12.5px] text-ink outline-none focus:border-accent"
                >
                  {IADC_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <TextField dense label="Phase" placeholder='e.g. 8-1/2" hole' value={r.phase} onChange={(v) => set(i, { phase: v })} />
              <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 text-[12px] text-ink-2">
                  <input type="checkbox" checked={r.npt} onChange={(e) => set(i, { npt: e.target.checked })} className="accent-[var(--accent)]" />
                  NPT
                </label>
                <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-ink">
                  <ArrowUp size={14} />
                </button>
                <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-ink">
                  <ArrowDown size={14} />
                </button>
                <button type="button" aria-label="Delete line" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-panel-3 hover:text-critical-ink">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <TextArea
              className="mt-2"
              rows={2}
              value={r.ops}
              onChange={(v) => set(i, { ops: v })}
              placeholder="What was done, in past tense, with depths, parameters and volumes. e.g. Drilled 8-1/2&quot; hole from 7,850 ft to 8,262 ft. WOB 22–28 klbf, 130 rpm, 520 gpm."
            />
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange([...rows, { from: rows.at(-1)?.to ?? "00:00", to: "", code: rows.at(-1)?.code ?? "2", npt: false, phase: rows.at(-1)?.phase ?? "", ops: "" }])}
        >
          <Plus size={14} /> Add time line
        </Button>
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="text-ink-2">
            Total <span className="num font-semibold text-ink">{tc.total.toFixed(2)}</span> / 24 h · NPT{" "}
            <span className="num font-semibold text-ink">{tc.npt.toFixed(2)}</span> h
          </span>
          {tc.issues.length === 0 ? <Badge status="good">24 h accounted for</Badge> : <Badge status="warning">{tc.issues.length} to fix</Badge>}
        </div>
      </div>
      {tc.issues.length > 0 && (
        <ul className="space-y-1 text-[12px] text-warning-ink">
          {tc.issues.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReportEditor({ r, onChange }: { r: DDR; onChange: (r: DDR) => void }) {
  const set = <K extends keyof DDR>(k: K, v: DDR[K]) => onChange({ ...r, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <GuidedPanel id="header" title="Well & report details">
        <RecordEditor defs={HEADER_FIELDS} rec={r.header} onChange={(v) => set("header", v)} />
      </GuidedPanel>

      <GuidedPanel id="status" title="Status, summary & forecast">
        <div className="flex flex-col gap-3">
          <TextField label="Status at report time" value={r.status} onChange={(v) => set("status", v)} placeholder='06:00: Drilling 8-1/2" hole at 8,540 ft.' />
          <TextArea label="24-hour summary" rows={4} value={r.summary} onChange={(v) => set("summary", v)} hint={SECTION_GUIDE.summary.how} />
          <TextArea label="24-hour forecast" rows={3} value={r.forecast} onChange={(v) => set("forecast", v)} hint={SECTION_GUIDE.forecast.how} />
        </div>
      </GuidedPanel>

      <GuidedPanel id="time">
        <TimeLogEditor rows={r.time} onChange={(v) => set("time", v)} />
      </GuidedPanel>

      <GuidedPanel id="params" title="Drilling parameters">
        <RecordEditor defs={PARAM_FIELDS} rec={r.params} onChange={(v) => set("params", v)} />
      </GuidedPanel>

      <GuidedPanel id="bit" title="Bit & BHA">
        <RecordEditor defs={BIT_FIELDS} rec={r.bit} onChange={(v) => set("bit", v)} />
        <TextArea className="mt-3" label="Bottomhole assembly (bit upward)" rows={2} value={r.bha} onChange={(v) => set("bha", v)} />
      </GuidedPanel>

      <GuidedPanel id="mud">
        <RecordEditor defs={MUD_FIELDS} rec={r.mud} onChange={(v) => set("mud", v)} />
      </GuidedPanel>

      <GuidedPanel id="surveys">
        <RowsEditor
          rows={r.surveys}
          onChange={(v) => set("surveys", v)}
          blank={() => ({ md: "", inc: "", azi: "", tvd: "", note: "" })}
          addLabel="Add survey"
          cols={[
            { k: "md", label: "MD", w: "minmax(0,1fr)", unit: "ft" },
            { k: "inc", label: "Inc", w: "minmax(0,0.8fr)", unit: "°" },
            { k: "azi", label: "Azi", w: "minmax(0,0.8fr)", unit: "°" },
            { k: "tvd", label: "TVD (tie-in only)", w: "minmax(0,1fr)", unit: "ft" },
            { k: "note", label: "Note", w: "minmax(0,1.4fr)" },
          ]}
        />
      </GuidedPanel>

      <GuidedPanel id="casing">
        <RecordEditor defs={CASING_FIELDS} rec={r.casing} onChange={(v) => set("casing", v)} />
      </GuidedPanel>

      <GuidedPanel id="wellControl">
        <RecordEditor defs={WC_FIELDS} rec={r.wellControl} onChange={(v) => set("wellControl", v)} />
      </GuidedPanel>

      <GuidedPanel id="hse">
        <RecordEditor defs={HSE_FIELDS} rec={r.hse} onChange={(v) => set("hse", v)} />
      </GuidedPanel>

      <GuidedPanel id="personnel">
        <RowsEditor
          rows={r.personnel}
          onChange={(v) => set("personnel", v)}
          blank={() => ({ company: "", role: "", count: "" })}
          addLabel="Add company"
          cols={[
            { k: "company", label: "Company", w: "minmax(0,1.2fr)" },
            { k: "role", label: "Role", w: "minmax(0,1.6fr)" },
            { k: "count", label: "POB", w: "72px" },
          ]}
        />
      </GuidedPanel>

      <GuidedPanel id="bulks">
        <RowsEditor
          rows={r.bulks}
          onChange={(v) => set("bulks", v)}
          blank={() => ({ item: "", unit: "", start: "", received: "", used: "" })}
          addLabel="Add item"
          cols={[
            { k: "item", label: "Item", w: "minmax(0,1.4fr)" },
            { k: "unit", label: "Unit", w: "72px" },
            { k: "start", label: "Start", w: "minmax(0,1fr)" },
            { k: "received", label: "Received", w: "minmax(0,1fr)" },
            { k: "used", label: "Used", w: "minmax(0,1fr)" },
          ]}
        />
      </GuidedPanel>

      <GuidedPanel id="costs">
        <RecordEditor defs={COST_FIELDS} rec={r.costs} onChange={(v) => set("costs", v)} />
      </GuidedPanel>

      <GuidedPanel id="remarks">
        <TextArea rows={4} value={r.remarks} onChange={(v) => set("remarks", v)} />
      </GuidedPanel>
    </div>
  );
}
