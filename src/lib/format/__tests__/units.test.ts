import { formatBytes, formatCount, formatRelativeTime } from '@/lib/format/units';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [-5, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1 MB'],
    [1024 ** 4 * 3, '3 TB'],
    [1024 ** 6, '1048576 TB'],
  ])('formats %s bytes as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it('treats missing and non-finite values as zero', () => {
    expect(formatBytes(undefined)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
  });
});

describe('formatCount', () => {
  it('uses compact notation', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1200)).toBe('1.2K');
    expect(formatCount(1_500_000)).toBe('1.5M');
  });

  it('is defensive about bad input', () => {
    expect(formatCount(undefined)).toBe('0');
    expect(formatCount(Number.NaN)).toBe('0');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-07-31T12:00:00Z');

  it.each([
    ['2026-07-31T11:59:30Z', '30 seconds ago'],
    ['2026-07-31T11:30:00Z', '30 minutes ago'],
    ['2026-07-31T06:00:00Z', '6 hours ago'],
    ['2026-07-29T12:00:00Z', '2 days ago'],
    ['2026-07-10T12:00:00Z', '3 weeks ago'],
    ['2025-07-31T12:00:00Z', 'last year'],
  ])('formats %s', (input, expected) => {
    expect(formatRelativeTime(input, now)).toBe(expected);
  });

  it('returns an empty string for missing or unparsable input', () => {
    expect(formatRelativeTime(null, now)).toBe('');
    expect(formatRelativeTime(undefined, now)).toBe('');
    expect(formatRelativeTime('not a date', now)).toBe('');
  });
});
