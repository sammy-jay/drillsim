import type { ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  icon,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-line bg-panel shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-ink">
                {icon && <span className="text-ink-3">{icon}</span>}
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <span className="h-px w-5 bg-accent" />
          {eyebrow}
        </div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:px-8 sm:py-8", wide ? "max-w-[1680px]" : "max-w-[1440px]")}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
      {children}
    </div>
  );
}
