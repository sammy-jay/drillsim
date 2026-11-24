import { fmt } from "@/lib/format";
import { Unit } from "@/components/ui/Unit";

type Zone = { from: number; to: number; status: "good" | "warning" | "serious" | "critical" };

const START = -120;
const SWEEP = 240;

/* Rounded so server- and client-side trig produce identical markup (no hydration drift). */
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: Math.round((cx + r * Math.cos(a)) * 100) / 100, y: Math.round((cy + r * Math.sin(a)) * 100) / 100 };
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
}

export function Gauge({
  label,
  value,
  min,
  max,
  unit,
  digits = 0,
  zones = [],
  sub,
  setpoint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  digits?: number;
  zones?: Zone[];
  sub?: string;
  setpoint?: number;
}) {
  const size = 150;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = 58;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
  const ang = START + SWEEP * t;
  const toAng = (v: number) => START + SWEEP * Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
  const needleTip = polar(cx, cy, r - 14, ang);
  const activeZone = zones.find((z) => value >= z.from && value <= z.to);
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl border border-line bg-panel-2 px-2 pb-2.5 pt-2">
      <div className="flex w-full items-center justify-between px-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        <span className="truncate">{label}</span>
        {activeZone && activeZone.status !== "good" && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: `var(--${activeZone.status})` }}
            aria-label={activeZone.status}
          />
        )}
      </div>
      <div className="relative w-full max-w-[170px]">
      <svg viewBox={`0 0 ${size} ${size - 18}`} className="w-full" role="img" aria-label={`${label} ${fmt(value, digits)} ${unit}`}>
        <path d={arc(cx, cy, r, START, START + SWEEP)} fill="none" style={{ stroke: "var(--panel-3)" }} strokeWidth={8} strokeLinecap="round" />
        {zones.map((z, i) => (
          <path
            key={i}
            d={arc(cx, cy, r + 7, toAng(z.from), toAng(z.to))}
            fill="none"
            style={{ stroke: `var(--${z.status})` }}
            strokeWidth={3}
            opacity={0.85}
          />
        ))}
        <path
          d={arc(cx, cy, r, START, Math.max(START + 0.01, ang))}
          fill="none"
          style={{ stroke: "var(--accent)", transition: "d 200ms linear" }}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {ticks.map((k) => {
          const a = START + SWEEP * k;
          const p0 = polar(cx, cy, r - 9, a);
          const major = Math.round(k * 10) % 5 === 0;
          const q = polar(cx, cy, major ? r - 16 : r - 13, a);
          return (
            <line
              key={k}
              x1={p0.x}
              y1={p0.y}
              x2={q.x}
              y2={q.y}
              style={{ stroke: "var(--ink-3)" }}
              strokeWidth={major ? 1.5 : 1}
              opacity={major ? 0.9 : 0.5}
            />
          );
        })}
        {setpoint !== undefined && (
          (() => {
            const a = toAng(setpoint);
            const p0 = polar(cx, cy, r - 5, a);
            const p1 = polar(cx, cy, r + 5, a);
            return <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} style={{ stroke: "var(--ink)" }} strokeWidth={2} />;
          })()
        )}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          style={{ stroke: "var(--ink)" }}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} style={{ fill: "var(--ink)" }} />
        <text x={cx} y={cy + 30} textAnchor="middle" className="num fill-[var(--ink)] text-[19px] font-semibold">
          {fmt(value, digits)}
        </text>
      </svg>
      <span className="absolute left-1/2 top-[86%] -translate-x-1/2 whitespace-nowrap text-[10.5px] leading-none text-ink-3">
        <Unit u={unit} />
      </span>
      </div>
      {sub && <div className="num -mt-1 truncate text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}
