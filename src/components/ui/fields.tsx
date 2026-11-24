"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "./Panel";
import { Unit } from "./Unit";

function clean(v: number) {
  if (!Number.isFinite(v)) return "";
  return String(Number(v.toPrecision(10)));
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  hint,
  className,
  dense = false,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const bound = (v: number) => {
    let x = v;
    if (min !== undefined) x = Math.max(min, x);
    if (max !== undefined) x = Math.min(max, x);
    return x;
  };

  const invalid =
    focused && (text.trim() === "" || !Number.isFinite(Number(text)) ||
      (min !== undefined && Number(text) < min) || (max !== undefined && Number(text) > max));

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block truncate text-[12px] font-medium text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center rounded-lg border bg-panel-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--focus)]",
          invalid ? "border-critical" : "border-line hover:border-line-strong",
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={focused ? text : clean(value)}
          onFocus={(e) => {
            setText(clean(value));
            setFocused(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            const n = Number(text);
            if (text.trim() !== "" && Number.isFinite(n)) onChange(bound(n));
            setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={cn(
            "num w-full min-w-0 bg-transparent px-3 text-[13.5px] text-ink outline-none",
            dense ? "h-8" : "h-9",
          )}
        />
        {unit && (
          <span className="shrink-0 select-none pr-3 text-[11.5px] font-medium text-ink-3">
            <Unit u={unit} />
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  hint,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block truncate text-[12px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-9 w-full appearance-none rounded-lg border border-line bg-panel-2 pl-3 pr-8 text-[13.5px] text-ink outline-none transition hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-[var(--focus)]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      {hint && <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  digits = 0,
  className,
  disabled,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  digits?: number;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("min-w-0", disabled && "opacity-50", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="truncate text-[12px] font-medium text-ink-2">
          {label}
        </label>
        <span className="num text-[13px] text-ink">
          {value.toFixed(digits)}
          {unit && <span className="ml-1 text-[11px] text-ink-3"><Unit u={unit} /></span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${pct}%` }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full flex-wrap rounded-lg border border-line bg-panel-2 p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md font-medium transition focus-visible:outline-2 focus-visible:outline-accent",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
              active ? "bg-panel text-ink shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-ink-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-panel-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  className,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-9 px-3.5 text-[13px]",
        variant === "primary" && "bg-accent text-accent-ink hover:brightness-110",
        variant === "secondary" && "border border-line bg-panel-2 text-ink hover:border-line-strong hover:bg-panel-3",
        variant === "ghost" && "text-ink-2 hover:bg-panel-2 hover:text-ink",
        variant === "danger" && "bg-critical text-white hover:brightness-110",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FieldGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-x-3 gap-y-3.5",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-2 sm:grid-cols-3",
        cols === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  className,
  dense = false,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  className?: string;
  dense?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block truncate text-[12px] font-medium text-ink-2">
          {label}
        </label>
      )}
      <div className="flex items-center rounded-lg border border-line bg-panel-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--focus)] hover:border-line-strong">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full min-w-0 bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-ink-3",
            dense ? "h-8" : "h-9",
          )}
        />
        {unit && (
          <span className="shrink-0 select-none pr-3 text-[11.5px] font-medium text-ink-3">
            <Unit u={unit} />
          </span>
        )}
      </div>
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  className,
  hint,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-ink-2">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="scroll-thin w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-[var(--focus)]"
      />
      {hint && <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}
