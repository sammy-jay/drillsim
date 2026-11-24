const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number) {
  const key = `${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

/** Fixed decimals with thousands separators. Deterministic locale so SSR == client. */
export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const v = Object.is(n, -0) ? 0 : n;
  return nf(digits, digits).format(v);
}

/** Compact significant formatting for axis ticks. */
export function fmtTick(n: number, step: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(step);
  let d = 0;
  if (abs < 1) d = Math.min(4, Math.ceil(-Math.log10(abs) + 0.0001));
  if (Math.abs(n) >= 100000 && abs >= 1000) {
    return nf(0, 1).format(n / 1000) + "k";
  }
  return nf(0, d).format(Object.is(n, -0) ? 0 : n);
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function fmtDuration(minutes: number) {
  if (!Number.isFinite(minutes)) return "—";
  const m = Math.max(0, minutes);
  const h = Math.floor(m / 60);
  const mm = Math.round(m - h * 60);
  if (h === 0) return `${mm} min`;
  return `${h} h ${String(mm).padStart(2, "0")} min`;
}

export function fmtClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return d > 0 ? `${d}d ${hh}:${mm}` : `${hh}:${mm}`;
}

/** Seeded PRNG (mulberry32) - deterministic synthetic data, no hydration drift. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian from a uniform source (Box-Muller). */
export function gauss(rand: () => number) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
