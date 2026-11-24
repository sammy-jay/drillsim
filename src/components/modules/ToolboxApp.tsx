"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { NumberField, SelectField } from "@/components/ui/fields";
import { Panel, cn } from "@/components/ui/Panel";
import { CATEGORIES, FORMULAS } from "@/lib/units";

function smart(v: number) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 1e9)) return v.toExponential(4);
  const d = a >= 1000 ? 2 : a >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(v);
}

export function ToolboxApp() {
  const [cat, setCat] = useState("density");
  const category = CATEGORIES.find((c) => c.id === cat)!;
  const [unit, setUnit] = useState(category.units[0].id);
  const [value, setValue] = useState(10);
  const [q, setQ] = useState("");

  const from = category.units.find((u) => u.id === unit) ?? category.units[0];
  const base = from.toBase(value);

  const formulas = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? FORMULAS.filter((f) => `${f.group} ${f.name} ${f.expr} ${f.vars}`.toLowerCase().includes(s))
      : FORMULAS;
    const groups = new Map<string, typeof FORMULAS>();
    list.forEach((f) => groups.set(f.group, [...(groups.get(f.group) ?? []), f]));
    return [...groups.entries()];
  }, [q]);

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Unit converter" icon={<ArrowLeftRight size={15} />}>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCat(c.id);
                  setUnit(c.units[0].id);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12px] font-medium transition",
                  c.id === cat ? "bg-accent text-accent-ink" : "bg-panel-2 text-ink-2 ring-1 ring-inset ring-line hover:text-ink",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <NumberField label="Value" value={value} onChange={setValue} />
            <SelectField label="From" value={from.id} onChange={setUnit} options={category.units.map((u) => ({ value: u.id, label: u.label }))} />
          </div>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {category.units.map((u) => (
              <li key={u.id} className={cn("flex items-baseline justify-between gap-3 px-3.5 py-2.5", u.id === from.id ? "bg-accent-soft" : "bg-panel-2/40")}>
                <span className="text-[13px] text-ink-2">{u.label}</span>
                <button
                  type="button"
                  title="Use this value"
                  onClick={() => {
                    setValue(Number(u.fromBase(base).toPrecision(8)));
                    setUnit(u.id);
                  }}
                  className="num text-right text-[15px] font-semibold text-ink hover:text-accent"
                >
                  {smart(u.fromBase(base))}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] text-ink-3">Click any result to convert from it.</p>
        </Panel>
      </div>

      <Panel
        title="Formula reference"
        subtitle={`${FORMULAS.length} oilfield-unit formulas used across DrillSim`}
        actions={
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search formulas…"
              aria-label="Search formulas"
              className="h-8 w-[220px] rounded-lg border border-line bg-panel-2 pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </label>
        }
      >
        {formulas.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-ink-3">No formulas match “{q}”.</div>
        ) : (
          <div className="flex flex-col gap-6">
            {formulas.map(([group, list]) => (
              <section key={group}>
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{group}</h3>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {list.map((f) => (
                    <div key={f.name} className="rounded-lg border border-line bg-panel-2 px-3.5 py-3">
                      <div className="text-[13px] font-medium text-ink">{f.name}</div>
                      <div className="num mt-1.5 break-words text-[13.5px] text-accent">{f.expr}</div>
                      {f.vars && <div className="mt-1 text-[11.5px] text-ink-3">{f.vars}</div>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
