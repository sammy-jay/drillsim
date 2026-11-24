/* Animated wellbore schematic for the landing hero. Pure SVG + CSS animation. */

const LAYERS = [
  { y: 150, h: 70, fill: "var(--lith-clay)", name: "Clays" },
  { y: 220, h: 90, fill: "var(--lith-shale)", name: "Shale" },
  { y: 310, h: 45, fill: "var(--lith-sand)", name: "Sand" },
  { y: 355, h: 70, fill: "var(--lith-lime)", name: "Limestone" },
  { y: 425, h: 60, fill: "var(--lith-shale)", name: "Shale" },
  { y: 485, h: 55, fill: "var(--lith-gas)", name: "Gas sand" },
];

export function WellHero() {
  const cx = 210;
  return (
    <svg viewBox="0 0 420 560" className="h-full w-full" role="img" aria-label="Animated wellbore schematic with mud circulating down the drill string and up the annulus">
      <defs>
        <linearGradient id="hero-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--panel)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--panel)" stopOpacity="0.85" />
        </linearGradient>
        <clipPath id="hero-earth">
          <rect x="0" y="150" width="420" height="410" rx="0" />
        </clipPath>
      </defs>

      {/* formations */}
      <g clipPath="url(#hero-earth)">
        {LAYERS.map((l, i) => (
          <g key={i}>
            <rect x="0" y={l.y} width="420" height={l.h} style={{ fill: l.fill }} opacity={0.55} />
            <line x1="0" x2="420" y1={l.y} y2={l.y} style={{ stroke: "var(--panel)" }} strokeOpacity={0.5} />
            <text x="12" y={l.y + 16} textAnchor="start" className="fill-[var(--ink-2)] text-[10.5px] font-medium">
              {l.name}
            </text>
          </g>
        ))}
        <rect x="0" y="150" width="420" height="410" fill="url(#hero-fade)" />
      </g>

      {/* ground */}
      <line x1="0" x2="420" y1="150" y2="150" style={{ stroke: "var(--ink-3)" }} strokeWidth="1.5" />

      {/* derrick */}
      <g style={{ stroke: "var(--ink-2)" }} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d={`M${cx - 46} 150 L${cx - 10} 22 M${cx + 46} 150 L${cx + 10} 22 M${cx - 10} 22 H${cx + 10}`} />
        <path d={`M${cx - 37} 118 H${cx + 37} M${cx - 28} 86 H${cx + 28} M${cx - 19} 54 H${cx + 19}`} />
        <path d={`M${cx - 37} 118 L${cx + 28} 86 M${cx + 37} 118 L${cx - 28} 86 M${cx - 28} 86 L${cx + 19} 54 M${cx + 28} 86 L${cx - 19} 54`} strokeOpacity="0.5" />
      </g>
      <rect x={cx - 60} y="140" width="120" height="10" rx="2" style={{ fill: "var(--panel-3)", stroke: "var(--ink-3)" }} />
      {/* travelling block + top drive */}
      <rect x={cx - 7} y="40" width="14" height="22" rx="3" style={{ fill: "var(--accent)" }} />
      <line x1={cx} x2={cx} y1="22" y2="40" style={{ stroke: "var(--ink-2)" }} strokeWidth="1.2" />

      {/* mud pits & lines */}
      <rect x="40" y="122" width="70" height="18" rx="3" style={{ fill: "var(--panel-3)", stroke: "var(--ink-3)" }} />
      <text x="75" y="134" textAnchor="middle" className="fill-[var(--ink-2)] text-[9.5px] font-medium">Mud pits</text>
      <path d={`M75 122 V100 H${cx - 22} V62 H${cx - 7}`} fill="none" style={{ stroke: "var(--series-1)" }} strokeWidth="2.5" strokeDasharray="5 7" className="flow-down" />
      <path d={`M${cx + 30} 160 H330 V128 H110`} fill="none" style={{ stroke: "var(--series-2)" }} strokeWidth="2.5" strokeDasharray="5 7" className="flow-up" opacity="0.9" />

      {/* casing strings */}
      <g style={{ stroke: "var(--ink-2)" }} strokeWidth="2.5">
        <line x1={cx - 30} x2={cx - 30} y1="150" y2="300" />
        <line x1={cx + 30} x2={cx + 30} y1="150" y2="300" />
        <path d={`M${cx - 30} 300 l-6 0 l6 -8`} fill="var(--ink-2)" />
        <path d={`M${cx + 30} 300 l6 0 l-6 -8`} fill="var(--ink-2)" />
        <line x1={cx - 22} x2={cx - 22} y1="150" y2="420" strokeWidth="2" />
        <line x1={cx + 22} x2={cx + 22} y1="150" y2="420" strokeWidth="2" />
        <path d={`M${cx - 22} 420 l-5 0 l5 -7`} fill="var(--ink-2)" strokeWidth="2" />
        <path d={`M${cx + 22} 420 l5 0 l-5 -7`} fill="var(--ink-2)" strokeWidth="2" />
      </g>
      {/* cement behind casing */}
      <rect x={cx - 36} y="250" width="6" height="50" style={{ fill: "var(--ink-3)" }} opacity="0.35" />
      <rect x={cx + 30} y="250" width="6" height="50" style={{ fill: "var(--ink-3)" }} opacity="0.35" />
      <rect x={cx - 30} y="370" width="8" height="50" style={{ fill: "var(--ink-3)" }} opacity="0.35" />
      <rect x={cx + 22} y="370" width="8" height="50" style={{ fill: "var(--ink-3)" }} opacity="0.35" />
      {/* open hole wall */}
      <path d={`M${cx - 18} 420 C ${cx - 20} 450, ${cx - 16} 480, ${cx - 18} 520 M${cx + 18} 420 C ${cx + 20} 450, ${cx + 16} 480, ${cx + 18} 520`} fill="none" style={{ stroke: "var(--ink-3)" }} strokeWidth="1.5" strokeDasharray="3 3" />

      {/* drill string */}
      <rect x={cx - 5} y="62" width="10" height="400" style={{ fill: "var(--panel-3)", stroke: "var(--ink-2)" }} strokeWidth="1" />
      <rect x={cx - 8} y="462" width="16" height="48" rx="1.5" style={{ fill: "var(--panel-3)", stroke: "var(--ink-2)" }} strokeWidth="1" />
      {/* mud down the string */}
      <line x1={cx} x2={cx} y1="66" y2="508" style={{ stroke: "var(--series-1)" }} strokeWidth="3" strokeDasharray="5 7" className="flow-down" />
      {/* returns up the annulus */}
      <line x1={cx - 13} x2={cx - 13} y1="515" y2="160" style={{ stroke: "var(--series-2)" }} strokeWidth="2.5" strokeDasharray="5 7" className="flow-up" />
      <line x1={cx + 13} x2={cx + 13} y1="515" y2="160" style={{ stroke: "var(--series-2)" }} strokeWidth="2.5" strokeDasharray="5 7" className="flow-up" />

      {/* bit */}
      <path d={`M${cx - 12} 510 H${cx + 12} L${cx + 8} 522 L${cx} 528 L${cx - 8} 522 Z`} style={{ fill: "var(--accent)" }} />
      <circle cx={cx} cy={524} r="10" style={{ fill: "none", stroke: "var(--accent)" }} strokeWidth="2" className="pulse-ring" />

      {/* labels */}
      <g className="text-[10px] font-medium">
        <line x1={cx + 31} y1="230" x2={cx + 70} y2="230" style={{ stroke: "var(--ink-3)" }} />
        <text x={cx + 74} y="233" className="fill-[var(--ink-2)]">13-3/8&quot; surface csg</text>
        <line x1={cx + 23} y1="395" x2={cx + 70} y2="395" style={{ stroke: "var(--ink-3)" }} />
        <text x={cx + 74} y="398" className="fill-[var(--ink-2)]">9-5/8&quot; intermediate</text>
        <line x1={cx - 9} y1="486" x2={cx - 70} y2="486" style={{ stroke: "var(--ink-3)" }} />
        <text x={cx - 74} y="489" textAnchor="end" className="fill-[var(--ink-2)]">BHA</text>
      </g>
    </svg>
  );
}
