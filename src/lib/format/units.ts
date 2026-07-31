const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human-readable byte size using binary steps (1 KB = 1024 B).
 *
 * Returns `'0 B'` for zero and for anything non-finite so that callers never
 * have to guard against `NaN` leaking into the UI.
 */
export function formatBytes(bytes: number | undefined, fractionDigits = 1): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const unit = BYTE_UNITS[exponent] ?? 'B';
  const value = bytes / 1024 ** exponent;

  return `${exponent === 0 ? value : Number(value.toFixed(fractionDigits))} ${unit}`;
}

/** Compact number formatting: 1200 -> `1.2K`, 1_500_000 -> `1.5M`. */
export function formatCount(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const RELATIVE_STEPS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** `2026-07-01` -> `4 weeks ago`. Falls back to `''` for unparsable input. */
export function formatRelativeTime(
  isoDate: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!isoDate) return '';

  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return '';

  const deltaMs = timestamp - now;
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

  for (const [unit, ms] of RELATIVE_STEPS) {
    if (Math.abs(deltaMs) >= ms) {
      return formatter.format(Math.round(deltaMs / ms), unit);
    }
  }

  return formatter.format(Math.round(deltaMs / 1000), 'second');
}
