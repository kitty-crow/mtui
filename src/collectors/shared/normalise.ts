/** Driver sentinels, NaN and absent values are never presented as measurements. */
export function nonNegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function positive(value: unknown): number | null {
  const number = nonNegative(value);
  return number !== null && number > 0 ? number : null;
}

export function percentage(value: unknown): number | null {
  const number = nonNegative(value);
  return number !== null && number <= 100 ? number : null;
}

/** SI reports unknown temperatures as zero or -1 on several platforms. */
export function temperature(value: unknown): number | null {
  const number = positive(value);
  return number !== null && number < 200 ? number : null;
}

export function ratio(used: number | null, total: number | null): number | null {
  if (used === null || total === null || total <= 0) return null;
  return Math.min(100, Math.max(0, used / total * 100));
}

export function mebibytes(value: unknown): number | null {
  const number = nonNegative(value);
  return number === null ? null : number * 1024 * 1024;
}
