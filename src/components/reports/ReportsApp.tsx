"use client";

import { useMemo, useState } from "react";
import { BookOpen, Copy, Eye, FilePlus2, FileText, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { Button, Segmented, Toggle } from "@/components/ui/fields";
import { Panel, cn } from "@/components/ui/Panel";
import { Callout } from "@/components/ui/Stat";
import { useLocalStore } from "@/lib/localStore";
import { SAMPLE_REPORTS } from "@/lib/reports/samples";
import { ABBREVIATIONS, blankReport, DULL_GRADE, IADC_CODES, timeCheck, WRITING_RULES, type DDR } from "@/lib/reports/schema";
import { ReportEditor } from "./ReportEditor";
import { ReportView } from "./ReportView";

const NO_REPORTS: DDR[] = [];
const STORE_KEY = "drillsim.ddr.v1";

type Tab = "examples" | "mine" | "guide";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now()}`;
}

export function ReportsApp() {
  const [tab, setTab] = useState<Tab>("examples");
  const [exampleId, setExampleId] = useState(SAMPLE_REPORTS[0].id);
  const [guided, setGuided] = useState(true);
  const [mine, setMine] = useLocalStore<DDR[]>(STORE_KEY, NO_REPORTS);
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [confirmDel, setConfirmDel] = useState(false);

  const example = SAMPLE_REPORTS.find((r) => r.id === exampleId) ?? SAMPLE_REPORTS[0];
  const selected = mine.find((r) => r.id === selId) ?? mine[0] ?? null;

  const createFrom = (src: DDR | null) => {
    const id = newId();
    const base = src ? (JSON.parse(JSON.stringify(src)) as DDR) : blankReport(id);
    const r: DDR = { ...base, id, example: false, label: undefined };
    if (src) r.header = { ...r.header, reportNo: `${src.header.reportNo || ""} (copy)` };
    setMine((list) => [r, ...list]);
    setSelId(id);
    setMode("edit");
    setTab("mine");
  };

  const update = (r: DDR) => setMine((list) => list.map((x) => (x.id === r.id ? r : x)));
  const remove = (id: string) => {
    setMine((list) => list.filter((x) => x.id !== id));
    setSelId(null);
    setConfirmDel(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "examples", label: <span className="flex items-center gap-1.5"><FileText size={14} /> Example reports</span> },
            { value: "mine", label: <span className="flex items-center gap-1.5"><Pencil size={14} /> My reports{mine.length ? ` (${mine.length})` : ""}</span> },
            { value: "guide", label: <span className="flex items-center gap-1.5"><BookOpen size={14} /> How to write a DDR</span> },
          ]}
        />
        {tab !== "guide" && (
          <div className="flex flex-wrap items-center gap-3">
            {(tab === "examples" || mode === "preview") && <Toggle label="Explain each section" checked={guided} onChange={setGuided} />}
            {(tab === "examples" || (tab === "mine" && selected && mode === "preview")) && (
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer size={14} /> Print / PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ---------------- examples ---------------- */}
      {tab === "examples" && (
        <>
          <div className="grid gap-2.5 md:grid-cols-3 print:hidden">
            {SAMPLE_REPORTS.map((r) => {
              const tc = timeCheck(r.time);
              const active = r.id === example.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setExampleId(r.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition",
                    active ? "border-accent-line bg-accent-soft" : "border-line bg-panel hover:border-line-strong",
                  )}
                >
                  <div className="text-[13.5px] font-semibold text-ink">{r.label}</div>
                  <div className="num mt-0.5 text-[11.5px] text-ink-3">
                    {r.header.date} · {r.header.mdPrev} → {r.header.md} ft · NPT {tc.npt.toFixed(2)} h
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <p className="text-[13px] text-ink-2">
              Read the report top to bottom, then switch off the explanations and try to summarise the day yourself.
            </p>
            <Button size="sm" variant="primary" onClick={() => createFrom(example)}>
              <Copy size={14} /> Use as a template
            </Button>
          </div>
          <ReportView r={example} guided={guided} />
        </>
      )}

      {/* ---------------- my reports ---------------- */}
      {tab === "mine" && (
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3 print:hidden">
            <Panel title="My reports" subtitle="Saved in this browser" bodyClassName="p-3">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="primary" onClick={() => createFrom(null)}>
                  <FilePlus2 size={14} /> Blank
                </Button>
                <Button size="sm" variant="secondary" onClick={() => createFrom(selected ?? SAMPLE_REPORTS[0])} title="Copy the selected report (e.g. yesterday's) as a starting point">
                  <Copy size={14} /> Duplicate
                </Button>
              </div>
              {mine.length === 0 ? (
                <p className="px-1 py-4 text-center text-[12.5px] text-ink-3">No reports yet. Start blank or use an example as a template.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {mine.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelId(r.id);
                          setConfirmDel(false);
                        }}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left transition",
                          selected?.id === r.id ? "bg-accent-soft ring-1 ring-inset ring-accent-line" : "hover:bg-panel-2",
                        )}
                      >
                        <div className="truncate text-[13px] font-medium text-ink">
                          {r.header.well || "Untitled well"} · #{r.header.reportNo || "—"}
                        </div>
                        <div className="num text-[11.5px] text-ink-3">{r.header.date || "no date"}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Callout status="info">
              Tip: a new day&apos;s report usually starts as a copy of yesterday&apos;s — then update depths, the time log and the summary.
            </Callout>
          </div>

          <div className="min-w-0">
            {!selected ? (
              <Panel>
                <div className="py-14 text-center">
                  <FileText className="mx-auto text-ink-3" size={28} />
                  <p className="mt-3 text-[14px] text-ink-2">Create your first daily drilling report.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="primary" onClick={() => createFrom(null)}>
                      <FilePlus2 size={15} /> Start blank
                    </Button>
                    <Button variant="secondary" onClick={() => createFrom(SAMPLE_REPORTS[0])}>
                      <Copy size={15} /> Start from an example
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <Segmented
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "edit", label: <span className="flex items-center gap-1.5"><Pencil size={14} /> Write</span> },
                      { value: "preview", label: <span className="flex items-center gap-1.5"><Eye size={14} /> Preview</span> },
                    ]}
                  />
                  {confirmDel ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] text-ink-2">Delete this report permanently?</span>
                      <Button size="sm" variant="danger" onClick={() => remove(selected.id)}>
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(true)}>
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                </div>
                {mode === "edit" ? <ReportEditor r={selected} onChange={update} /> : <ReportView r={selected} guided={guided} />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- guide ---------------- */}
      {tab === "guide" && <WritingGuide />}
    </div>
  );
}

function WritingGuide() {
  const [q, setQ] = useState("");
  const abbr = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? ABBREVIATIONS.filter(([a, b]) => `${a} ${b}`.toLowerCase().includes(s)) : ABBREVIATIONS;
  }, [q]);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Golden rules of a good DDR" subtitle="What supervisors and engineers expect">
        <ol className="flex flex-col gap-3">
          {WRITING_RULES.map((r, i) => (
            <li key={r.rule} className="flex gap-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft text-[12px] font-semibold text-accent">{i + 1}</span>
              <div>
                <div className="text-[13.5px] font-medium text-ink">{r.rule}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">{r.example}</div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Anatomy of a report" subtitle="Sections in the order they usually appear">
        <ol className="grid gap-2 sm:grid-cols-2">
          {[
            "Header — well, rig, date, depths, casing",
            "Status at report time",
            "24-hour summary",
            "24-hour forecast",
            "Time breakdown (operations log)",
            "Drilling parameters, bit & BHA",
            "Mud properties",
            "Directional surveys",
            "Casing & cementing (when run)",
            "Well control (SCRs, MAASP, events)",
            "HSE",
            "Personnel on board",
            "Bulk materials",
            "Costs",
            "Remarks & lessons learned",
          ].map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-lg bg-panel-2 px-3 py-2 text-[12.5px] text-ink-2">
              <span className="num text-[11px] font-semibold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title="Abbreviations you will meet"
        actions={
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              aria-label="Search abbreviations"
              className="h-8 w-[180px] rounded-lg border border-line bg-panel-2 pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </label>
        }
        bodyClassName="p-0"
      >
        <div className="scroll-thin max-h-[460px] overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <tbody>
              {abbr.map(([a, b]) => (
                <tr key={a} className="border-b border-line last:border-0">
                  <td className="num w-[120px] whitespace-nowrap px-4 py-2 font-semibold text-accent">{a}</td>
                  <td className="px-4 py-2 text-ink-2">{b}</td>
                </tr>
              ))}
              {abbr.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-ink-3">No match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="IADC operation codes" subtitle="Used to classify every line of the time log" bodyClassName="p-0">
          <div className="grid sm:grid-cols-2">
            {IADC_CODES.map((c) => (
              <div key={c.code} className="flex items-center gap-2.5 border-b border-line px-4 py-1.5 text-[12.5px]">
                <span className="num w-6 text-right font-semibold text-ink">{c.code}</span>
                <span className="text-ink-2">{c.name}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Reading an IADC dull grade" subtitle="e.g. 2-3-BT-S-X-I-CT-TD">
          <ul className="flex flex-col gap-2">
            {DULL_GRADE.map(([k, v]) => (
              <li key={k} className="text-[12.5px]">
                <span className="font-medium text-ink">{k}: </span>
                <span className="text-ink-2">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
