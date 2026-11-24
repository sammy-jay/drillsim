import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { cn } from "./Panel";
import { Unit } from "./Unit";

export type Status = "good" | "warning" | "serious" | "critical" | "info";

const STATUS_STYLE: Record<Status, { ink: string; bg: string; ring: string; label: string }> = {
  good: { ink: "text-good-ink", bg: "bg-[color-mix(in_oklab,var(--good)_12%,transparent)]", ring: "ring-[color-mix(in_oklab,var(--good)_35%,transparent)]", label: "OK" },
  warning: { ink: "text-warning-ink", bg: "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)]", ring: "ring-[color-mix(in_oklab,var(--warning)_40%,transparent)]", label: "Caution" },
  serious: { ink: "text-serious-ink", bg: "bg-[color-mix(in_oklab,var(--serious)_14%,transparent)]", ring: "ring-[color-mix(in_oklab,var(--serious)_40%,transparent)]", label: "Warning" },
  critical: { ink: "text-critical-ink", bg: "bg-[color-mix(in_oklab,var(--critical)_13%,transparent)]", ring: "ring-[color-mix(in_oklab,var(--critical)_40%,transparent)]", label: "Critical" },
  info: { ink: "text-ink-2", bg: "bg-panel-2", ring: "ring-line", label: "Info" },
};

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  const cls = STATUS_STYLE[status].ink;
  if (status === "good") return <CircleCheck size={size} className={cls} aria-hidden />;
  if (status === "warning") return <TriangleAlert size={size} className={cls} aria-hidden />;
  if (status === "serious") return <CircleAlert size={size} className={cls} aria-hidden />;
  if (status === "critical") return <OctagonAlert size={size} className={cls} aria-hidden />;
  return <Info size={size} className={cls} aria-hidden />;
}

export function Badge({
  status,
  children,
  className,
}: {
  status: Status;
  children?: ReactNode;
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset",
        s.bg,
        s.ring,
        s.ink,
        className,
      )}
    >
      <StatusIcon status={status} size={12} />
      {children ?? s.label}
    </span>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
  status,
  emphasis = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
  status?: Status;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-3.5 py-3",
        emphasis ? "border-accent-line bg-accent-soft" : "border-line bg-panel-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11.5px] font-medium text-ink-3">{label}</div>
        {status && status !== "info" && <StatusIcon status={status} size={13} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("num truncate font-semibold text-ink", emphasis ? "text-[24px]" : "text-[20px]")}>
          {value}
        </span>
        {unit && <span className="shrink-0 text-[12px] font-medium text-ink-3">{typeof unit === "string" ? <Unit u={unit} /> : unit}</span>}
      </div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>
  );
}

export function Callout({
  status = "info",
  title,
  children,
  className,
}: {
  status?: Status;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <div className={cn("flex gap-2.5 rounded-lg px-3.5 py-3 ring-1 ring-inset", s.bg, s.ring, className)}>
      <div className="mt-0.5">
        <StatusIcon status={status} size={15} />
      </div>
      <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
        {title && <div className="mb-0.5 font-semibold text-ink">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function KV({ k, v, unit }: { k: ReactNode; v: ReactNode; unit?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-1.5 text-[13px] last:border-0">
      <span className="text-ink-2">{k}</span>
      <span className="num text-right text-ink">
        {v}
        {unit && <span className="ml-1 text-[11.5px] text-ink-3">{typeof unit === "string" ? <Unit u={unit} /> : unit}</span>}
      </span>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  className,
  maxHeight,
  highlightRow,
}: {
  columns: { key: string; label: ReactNode; align?: "left" | "right"; className?: string }[];
  rows: Record<string, ReactNode>[];
  className?: string;
  maxHeight?: number;
  highlightRow?: (i: number) => boolean;
}) {
  return (
    <div
      className={cn("scroll-thin overflow-auto rounded-lg border border-line", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-[12.5px]">
        <thead className="sticky top-0 z-[1] bg-panel-2">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap border-b border-line px-3 py-2 font-medium text-ink-3",
                  c.align === "right" ? "text-right" : "text-left",
                  c.className,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-line last:border-0",
                highlightRow?.(i) ? "bg-accent-soft" : "hover:bg-panel-2",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 text-ink",
                    c.align === "right" ? "num text-right" : "text-left",
                    c.className,
                  )}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
