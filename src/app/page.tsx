import Link from "next/link";
import { ArrowRight, Play, ShieldAlert } from "lucide-react";
import { NAV } from "@/lib/nav";
import { NavIcon } from "@/components/shell/NavIcon";
import { WellHero } from "@/components/home/WellHero";

const WORKFLOW = [
  { href: "/pore-pressure", label: "Pore & frac pressure", note: "Mud window" },
  { href: "/casing", label: "Casing design", note: "Seats & grades" },
  { href: "/trajectory", label: "Trajectory", note: "Well path" },
  { href: "/torque-drag", label: "Torque & drag", note: "String loads" },
  { href: "/hydraulics", label: "Hydraulics", note: "ECD & bit" },
  { href: "/cementing", label: "Cementing", note: "Zonal isolation" },
  { href: "/simulator", label: "Drill it", note: "Live rig" },
];

export default function Home() {
  const moduleCount = NAV.reduce((s, g) => s + g.items.length, 0);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-10">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              Drilling engineering suite
            </div>
            <h1 className="max-w-xl text-[36px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[52px]">
              Drill the well <span className="text-accent">before</span> you drill the well.
            </h1>
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-2">
              Interactive simulations and design tools for the full well lifecycle. Plan the trajectory, size casing,
              tune hydraulics, then take the brake on a live rig through overpressure, losses and kicks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/simulator"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[14px] font-semibold text-accent-ink transition hover:brightness-110"
              >
                <Play size={16} fill="currentColor" />
                Launch rig simulator
              </Link>
              <Link
                href="/well-control"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-panel-2 px-5 text-[14px] font-medium text-ink transition hover:border-line-strong"
              >
                <ShieldAlert size={16} />
                Build a kill sheet
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                [String(moduleCount), "modules"],
                ["3", "rig scenarios"],
                ["100%", "in-browser"],
              ].map(([v, k]) => (
                <div key={k}>
                  <dt className="sr-only">{k}</dt>
                  <dd className="num text-[24px] font-semibold text-ink">{v}</dd>
                  <dd className="text-[12.5px] text-ink-3">{k}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative min-h-[380px] border-t border-line bg-panel-2/60 lg:border-l lg:border-t-0">
            <div className="absolute inset-0 p-4 sm:p-6">
              <WellHero />
            </div>
          </div>
        </div>
      </section>

      {/* workflow */}
      <section className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-3">The well design workflow</h2>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WORKFLOW.map((w, i) => (
            <li key={w.href}>
              <Link
                href={w.href}
                className="group flex h-full items-start gap-3 rounded-xl border border-line bg-panel px-3.5 py-3 transition hover:border-accent-line hover:bg-accent-soft"
              >
                <span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-panel-3 text-[11px] font-semibold text-ink-2 group-hover:bg-accent group-hover:text-accent-ink">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight text-ink">{w.label}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-3">{w.note}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* modules */}
      {NAV.map((group) => (
        <section key={group.label} className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-3">{group.label}</h2>
            <span className="text-[12px] text-ink-3">{group.items.length} modules</span>
          </div>
          <div className={`grid gap-3 sm:grid-cols-2 ${group.items.length >= 4 ? "xl:grid-cols-3" : ""}`}>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-col rounded-xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent-line hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-lg border border-line bg-panel-2 text-accent">
                    <NavIcon name={item.icon} size={19} strokeWidth={1.8} />
                  </span>
                  <ArrowRight size={16} className="text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-ink">{item.title}</h3>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-2">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span key={t} className="rounded-md bg-panel-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-3 ring-1 ring-inset ring-line">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
