export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
      {/* derrick */}
      <path
        d="M16 5 L10.5 22 M16 5 L21.5 22 M12.2 16.5 H19.8 M13.6 12 H18.4 M11.3 19.5 L20.7 19.5"
        stroke="var(--accent-ink)"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      {/* drill string + bit */}
      <path d="M16 5 V24" stroke="var(--accent-ink)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.8 24 H18.2 L16 27.5 Z" fill="var(--accent-ink)" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-ink">DrillSim</div>
        <div className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
          Engineering Suite
        </div>
      </div>
    </div>
  );
}
