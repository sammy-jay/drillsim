export function niceStep(range: number, count: number) {
  const raw = Math.abs(range) / Math.max(1, count);
  if (!Number.isFinite(raw) || raw === 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function roundTo(v: number, step: number) {
  const d = Math.max(0, -Math.floor(Math.log10(step)) + 2);
  return Number(v.toFixed(Math.min(12, d)));
}

export function niceDomain(
  min: number,
  max: number,
  count: number,
  fixedMin?: number | null,
  fixedMax?: number | null,
) {
  let lo = fixedMin ?? min;
  let hi = fixedMax ?? max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= fixedMin == null ? pad : 0;
    hi += fixedMax == null ? pad : 0;
  }
  if (lo > hi) [lo, hi] = [hi, lo];
  const step = niceStep(hi - lo, count);
  const nmin = fixedMin ?? Math.floor(lo / step + 1e-9) * step;
  const nmax = fixedMax ?? Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  const start = Math.ceil(nmin / step - 1e-9) * step;
  for (let t = start; t <= nmax + step * 1e-6; t += step) ticks.push(roundTo(t, step));
  return { min: nmin, max: nmax, ticks, step };
}

export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const f = (v: number) => r0 + (v - d0) * k;
  f.invert = (p: number) => (k === 0 ? d0 : d0 + (p - r0) / k);
  return f;
}
