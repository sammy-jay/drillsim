"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { useLocalStore } from "@/lib/localStore";
import { NavIcon } from "./NavIcon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Modules" className="flex flex-col gap-6">
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            {group.label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition ${
                      active
                        ? "bg-accent-soft font-medium text-ink"
                        : "text-ink-2 hover:bg-panel-2 hover:text-ink"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" />
                    )}
                    <NavIcon
                      name={item.icon}
                      size={16}
                      strokeWidth={1.8}
                      className={active ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}
                    />
                    {item.short}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStore("drillsim-sidebar-hidden-v1", false);

  function toggleSidebar() {
    setCollapsed(!collapsed);
  }

  return (
    <>
      <aside
        aria-hidden={collapsed}
        inert={collapsed}
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-line bg-panel/80 backdrop-blur transition-[width,opacity] duration-200 lg:flex ${collapsed ? "w-0 border-r-0 opacity-0" : "w-[248px] border-r opacity-100"}`}
      >
        <div className="flex items-center gap-2 px-4 pb-5 pt-5">
          <Link href="/" className="min-w-0 flex-1" aria-label="DrillSim home">
            <Logo />
          </Link>
          <button
            type="button"
            aria-label="Hide sidebar"
            title="Hide sidebar"
            onClick={toggleSidebar}
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink-3 transition hover:bg-panel-2 hover:text-ink"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-4">
          <NavList />
        </div>
        <div className="border-t border-line p-3">
          <ThemeToggle />
          <p className="mt-2.5 px-1 text-[11px] leading-snug text-ink-3">
            Oilfield units · ft, ppg, psi, gpm, bbl
          </p>
        </div>
      </aside>
      {collapsed && (
        <button
          type="button"
          aria-label="Show sidebar"
          title="Show sidebar"
          onClick={toggleSidebar}
          className="fixed left-0 top-1/2 z-40 hidden size-9 -translate-y-1/2 place-items-center rounded-r-md border border-l-0 border-line bg-panel/95 text-ink-2 shadow-[var(--shadow-panel)] transition hover:bg-panel-2 hover:text-ink lg:grid"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </>
  );
}

export function MobileBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 print:hidden items-center justify-between border-b border-line bg-panel/90 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="DrillSim home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-ink-2"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" key={pathname}>
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-panel shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4">
              <Logo />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-panel-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-6">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
