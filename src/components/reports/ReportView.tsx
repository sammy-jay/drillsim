"use client";

import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Stat";
import { Unit } from "@/components/ui/Unit";
import { fmt } from "@/lib/format";
import {
  BIT_FIELDS,
  CASING_FIELDS,
  codeName,
  computeSurveys,
  COST_FIELDS,
  HEADER_FIELDS,
  HSE_FIELDS,
  IADC_CODES,
  MUD_FIELDS,
  num,
  PARAM_FIELDS,
  rowHours,
  SECTION_GUIDE,
  timeCheck,
  WC_FIELDS,
  type DDR,
  type FieldDef,
  type SectionId,
} from "@/lib/reports/schema";

const CAT_COLOR = { drill: "var(--series-1)", flat: "var(--series-3)", other: "var(--series-7)" } as const;

function hasAny(rec: Record<string, string> | undefined) {
  return !!rec && Object.values(rec).some((v) => v && v.trim() !== "");
}

function Fields({ defs, rec, cols = 4 }: { defs: FieldDef[]; rec: Record<string, string>; cols?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        "grid gap-x-5 gap-y-2.5",
        cols === 4 && "grid-cols-2 md:grid-cols-4",
        cols === 3 && "grid-cols-2 md:grid-cols-3",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {defs.map((d) => {
        const v = rec?.[d.k];
        return (
          <div key={d.k} className={cn("min-w-0", d.wide && "col-span-2")}>
            <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
              {d.label}
              {d.unit && (
                <span className="ml-1 normal-case tracking-normal">
                  (<Unit u={d.unit} />)
                </span>
              )}
            </dt>
            <dd className={cn("mt-0.5 text-[13px] leading-snug", v ? "text-ink" : "text-ink-3")}>{v || "—"}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Section({ id, guided, children, title }: { id: SectionId; guided: boolean; children: ReactNode; title?: string }) {
  const g = SECTION_GUIDE[id];
  return (
    <section className={cn("grid gap-4 border-t border-line py-5 first:border-t-0", guided && "xl:grid-cols-[minmax(0,1fr)_280px]")}>
      <div className="min-w-0">
        <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">{title ?? g.title}</h3>
        {children}
      </div>
      {guided && (
        <aside className="h-fit rounded-lg border border-dashed border-accent-line bg-accent-soft px-3.5 py-3 text-[12.5px] leading-relaxed print:hidden">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
            <Lightbulb size={13} className="text-accent" /> {g.title}
          </div>
          <p className="text-ink-2">{g.what}</p>
          <p className="mt-1.5 text-ink-2">
            <span className="font-medium text-ink">How to write it: </span>
            {g.how}
          </p>
        </aside>
      )}
    </section>
  );
}

export function ReportView({ r, guided }: { r: DDR; guided: boolean }) {
  const h = r.header;
  const progress = num(h.md) - num(h.mdPrev);
  const tc = timeCheck(r.time);
  const surveys = computeSurveys(r.surveys);
  const drillHours = r.time.filter((t) => t.code === "2" && !t.npt).reduce((s, t) => s + Math.max(0, rowHours(t) || 0), 0);

  return (
    <article className="rounded-xl border border-line bg-panel px-5 py-5 shadow-[var(--shadow-panel)] sm:px-7 print:border-0 print:px-0 print:shadow-none">
      {/* title block */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">Daily drilling report</div>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
            {h.well || "Untitled well"} · Report #{h.reportNo || "—"}
          </h2>
        </div>
        <div className="text-right text-[12.5px] text-ink-2">
          <div className="num text-[15px] font-semibold text-ink">{h.date || "—"}</div>
          <div>{h.period || "00:00 – 24:00"}</div>
        </div>
      </div>

      {/* key figures */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Depth at 24:00", h.md ? `${h.md}` : "—", "ft"],
          ["24 h progress", Number.isFinite(progress) ? fmt(progress, 0) : "—", "ft"],
          ["Days from spud", h.dfs || "—", ""],
          ["Daily cost", r.costs?.daily ? `$${r.costs.daily}` : "—", ""],
        ].map(([k, v, u]) => (
          <div key={k} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{k}</div>
            <div className="num text-[18px] font-semibold text-ink">
              {v}
              {u && v !== "—" && (
                <span className="ml-1 text-[11.5px] font-normal text-ink-3">
                  <Unit u={u} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <Section id="header" guided={guided} title="Well & report details">
          <Fields defs={HEADER_FIELDS} rec={h} />
        </Section>

        <Section id="status" guided={guided}>
          <p className="rounded-lg border-l-4 border-accent bg-panel-2 px-3.5 py-2.5 text-[14px] font-medium text-ink">
            {r.status || "—"}
          </p>
        </Section>

        <Section id="summary" guided={guided}>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{r.summary || "—"}</p>
        </Section>

        <Section id="forecast" guided={guided}>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{r.forecast || "—"}</p>
        </Section>

        <Section id="time" guided={guided}>
          {/* 24-hour bar */}
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
            {(["drill", "flat", "other"] as const).map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px]" style={{ background: CAT_COLOR[c] }} />
                {c === "drill" ? "Making hole (drill, ream, survey)" : c === "flat" ? "Flat time (trips, casing, circulate…)" : "Other"}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] ring-2 ring-inset ring-[var(--critical)]" style={{ background: "repeating-linear-gradient(45deg, var(--serious) 0 3px, transparent 3px 6px)" }} />
              Non-productive time (NPT)
            </span>
          </div>
          <div className="relative mb-1 flex h-7 overflow-hidden rounded-md border border-line bg-panel-3">
            {r.time.map((t, i) => {
              const hrs = rowHours(t);
              if (!Number.isFinite(hrs) || hrs <= 0) return null;
              const cat = IADC_CODES.find((c) => c.code === t.code)?.cat ?? "other";
              return (
                <div
                  key={i}
                  title={`${t.from}–${t.to} · ${codeName(t.code)}${t.npt ? " · NPT" : ""}`}
                  className="h-full border-r border-panel last:border-r-0"
                  style={{
                    width: `${(hrs / 24) * 100}%`,
                    background: t.npt
                      ? "repeating-linear-gradient(45deg, var(--serious) 0 4px, color-mix(in oklab, var(--serious) 45%, transparent) 4px 8px)"
                      : CAT_COLOR[cat],
                  }}
                />
              );
            })}
          </div>
          <div className="num mb-4 flex justify-between text-[10px] text-ink-3">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((x) => (
              <span key={x}>{String(x).padStart(2, "0")}:00</span>
            ))}
          </div>

          <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead className="bg-panel-2 text-ink-3">
                <tr>
                  <th className="px-2.5 py-2 text-left font-medium">From</th>
                  <th className="px-2.5 py-2 text-left font-medium">To</th>
                  <th className="px-2.5 py-2 text-right font-medium">
                    <Unit u="h" />
                  </th>
                  <th className="px-2.5 py-2 text-left font-medium">IADC code</th>
                  <th className="px-2.5 py-2 text-left font-medium">Operations</th>
                </tr>
              </thead>
              <tbody>
                {r.time.map((t, i) => {
                  const hrs = rowHours(t);
                  return (
                    <tr key={i} className={cn("border-t border-line align-top", t.npt && "bg-[color-mix(in_oklab,var(--serious)_8%,transparent)]")}>
                      <td className="num px-2.5 py-2 text-ink">{t.from}</td>
                      <td className="num px-2.5 py-2 text-ink">{t.to}</td>
                      <td className="num px-2.5 py-2 text-right text-ink">{Number.isFinite(hrs) ? hrs.toFixed(2) : "—"}</td>
                      <td className="px-2.5 py-2">
                        <div className="whitespace-nowrap text-ink">
                          <span className="num mr-1 rounded bg-panel-3 px-1.5 py-0.5 text-[11px]">{t.code}</span>
                          {codeName(t.code)}
                        </div>
                        {t.npt && (
                          <Badge status="serious" className="mt-1">
                            NPT
                          </Badge>
                        )}
                      </td>
                      <td className="px-2.5 py-2 leading-relaxed text-ink-2">
                        {t.phase && <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t.phase}</span>}
                        {t.ops}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-panel-2">
                <tr>
                  <td colSpan={2} className="px-2.5 py-2 font-medium text-ink">
                    Total
                  </td>
                  <td className="num px-2.5 py-2 text-right font-semibold text-ink">{tc.total.toFixed(2)}</td>
                  <td colSpan={2} className="px-2.5 py-2 text-[12px] text-ink-2">
                    On-bottom drilling {drillHours.toFixed(2)} h · NPT {tc.npt.toFixed(2)} h ({((tc.npt / Math.max(tc.total, 1e-9)) * 100).toFixed(0)}%)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {tc.issues.length > 0 && (
            <ul className="mt-2 space-y-1">
              {tc.issues.map((m) => (
                <li key={m}>
                  <Badge status="warning">{m}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="params" guided={guided} title="Drilling parameters · bit · BHA">
          <Fields defs={PARAM_FIELDS} rec={r.params} />
          <div className="mt-5">
            <Fields defs={BIT_FIELDS} rec={r.bit} />
          </div>
          <div className="mt-4">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Bottomhole assembly</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{r.bha || "—"}</p>
          </div>
          {guided && (
            <p className="mt-3 rounded-md bg-panel-2 px-3 py-2 text-[12px] text-ink-2 print:hidden">
              <span className="font-medium text-ink">Bit record: </span>
              {SECTION_GUIDE.bit.how}
            </p>
          )}
        </Section>

        <Section id="mud" guided={guided}>
          <Fields defs={MUD_FIELDS} rec={r.mud} />
        </Section>

        <Section id="surveys" guided={guided}>
          {surveys.length === 0 ? (
            <p className="text-[13px] text-ink-3">No surveys taken this period.</p>
          ) : (
            <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead className="bg-panel-2 text-ink-3">
                  <tr>
                    {[
                      ["MD", "ft"],
                      ["Inc", "°"],
                      ["Azi", "°"],
                      ["TVD", "ft"],
                      ["N/S", "ft"],
                      ["E/W", "ft"],
                      ["DLS", "°/100ft"],
                    ].map(([k, u]) => (
                      <th key={k} className="px-2.5 py-2 text-right font-medium">
                        {k} (<Unit u={u} />)
                      </th>
                    ))}
                    <th className="px-2.5 py-2 text-left font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="num px-2.5 py-1.5 text-right text-ink">{fmt(s.md, 0)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{s.inc.toFixed(2)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{s.azi.toFixed(1)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{fmt(s.tvd, 1)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{fmt(s.north, 1)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{fmt(s.east, 1)}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{s.tieIn ? "—" : s.dls.toFixed(2)}</td>
                      <td className="px-2.5 py-1.5 text-ink-2">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {hasAny(r.casing) && (
          <Section id="casing" guided={guided}>
            <Fields defs={CASING_FIELDS} rec={r.casing} cols={2} />
          </Section>
        )}

        <Section id="wellControl" guided={guided}>
          <Fields defs={WC_FIELDS} rec={r.wellControl} cols={2} />
        </Section>

        <Section id="hse" guided={guided}>
          <Fields defs={HSE_FIELDS} rec={r.hse} cols={2} />
        </Section>

        <Section id="personnel" guided={guided}>
          {r.personnel.length === 0 ? (
            <p className="text-[13px] text-ink-3">—</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-[12.5px]">
                <thead className="bg-panel-2 text-ink-3">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-medium">Company</th>
                    <th className="px-2.5 py-2 text-left font-medium">Role</th>
                    <th className="px-2.5 py-2 text-right font-medium">POB</th>
                  </tr>
                </thead>
                <tbody>
                  {r.personnel.map((p, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-2.5 py-1.5 text-ink">{p.company}</td>
                      <td className="px-2.5 py-1.5 text-ink-2">{p.role}</td>
                      <td className="num px-2.5 py-1.5 text-right text-ink">{p.count}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-line bg-panel-2">
                    <td colSpan={2} className="px-2.5 py-1.5 font-medium text-ink">
                      Total on location
                    </td>
                    <td className="num px-2.5 py-1.5 text-right font-semibold text-ink">
                      {r.personnel.reduce((s, p) => s + (num(p.count) || 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section id="bulks" guided={guided}>
          {r.bulks.length === 0 ? (
            <p className="text-[13px] text-ink-3">—</p>
          ) : (
            <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[480px] text-[12.5px]">
                <thead className="bg-panel-2 text-ink-3">
                  <tr>
                    {["Item", "Unit", "Start", "Received", "Used", "Remaining"].map((c, i) => (
                      <th key={c} className={cn("px-2.5 py-2 font-medium", i < 2 ? "text-left" : "text-right")}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.bulks.map((b, i) => {
                    const end = num(b.start) + num(b.received || "0") - num(b.used || "0");
                    return (
                      <tr key={i} className="border-t border-line">
                        <td className="px-2.5 py-1.5 text-ink">{b.item}</td>
                        <td className="px-2.5 py-1.5 text-ink-2">
                          <Unit u={b.unit} />
                        </td>
                        <td className="num px-2.5 py-1.5 text-right text-ink-2">{b.start}</td>
                        <td className="num px-2.5 py-1.5 text-right text-ink-2">{b.received}</td>
                        <td className="num px-2.5 py-1.5 text-right text-ink-2">{b.used}</td>
                        <td className="num px-2.5 py-1.5 text-right font-medium text-ink">{Number.isFinite(end) ? fmt(end, 0) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section id="costs" guided={guided}>
          <Fields defs={COST_FIELDS} rec={r.costs} />
          {Number.isFinite(num(r.costs.cumulative)) && Number.isFinite(num(r.costs.afe)) && num(r.costs.afe) > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11.5px] text-ink-3">
                <span>Spent vs AFE</span>
                <span className="num">{((num(r.costs.cumulative) / num(r.costs.afe)) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel-3">
                <div
                  className="h-full rounded-full bg-[var(--series-1)]"
                  style={{ width: `${Math.min(100, (num(r.costs.cumulative) / num(r.costs.afe)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </Section>

        <Section id="remarks" guided={guided}>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{r.remarks || "—"}</p>
        </Section>
      </div>
    </article>
  );
}
