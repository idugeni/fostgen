import {
  DEFAULT_GENERATOR_OPTIONS,
  MAX_DEPTH_CEILING,
  MAX_RECENT_REPOSITORIES,
  parseGeneratorOptions,
  parseRecentRepositories,
} from '@/lib/config';

describe('parseGeneratorOptions', () => {
  it('accepts a complete, valid payload', () => {
    const stored = {
      ...DEFAULT_GENERATOR_OPTIONS,
      format: 'yaml',
      sort: 'alpha',
      maxDepth: 3,
      includeFiles: false,
      ignorePatterns: ['*.md'],
    };

    expect(parseGeneratorOptions(stored)).toEqual(stored);
  });

  it('rejects non-objects', () => {
    expect(parseGeneratorOptions(null)).toBeNull();
    expect(parseGeneratorOptions('nope')).toBeNull();
    expect(parseGeneratorOptions(42)).toBeNull();
  });

  it('falls back per field instead of discarding the whole payload', () => {
    const result = parseGeneratorOptions({
      format: 'not-a-format',
      sort: 7,
      includeFiles: 'yes',
      ignorePatterns: ['keep', 12, null],
      showSizes: true,
    });

    expect(result).toMatchObject({
      format: DEFAULT_GENERATOR_OPTIONS.format,
      sort: DEFAULT_GENERATOR_OPTIONS.sort,
      includeFiles: DEFAULT_GENERATOR_OPTIONS.includeFiles,
      ignorePatterns: ['keep'],
      showSizes: true,
    });
  });

  it('preserves an explicit unlimited depth but rejects out-of-range numbers', () => {
    expect(parseGeneratorOptions({ maxDepth: null })?.maxDepth).toBeNull();
    expect(parseGeneratorOptions({ maxDepth: 1 })?.maxDepth).toBe(1);
    expect(parseGeneratorOptions({ maxDepth: MAX_DEPTH_CEILING })?.maxDepth).toBe(
      MAX_DEPTH_CEILING,
    );
    expect(parseGeneratorOptions({ maxDepth: 0 })?.maxDepth).toBe(
      DEFAULT_GENERATOR_OPTIONS.maxDepth,
    );
    expect(parseGeneratorOptions({ maxDepth: MAX_DEPTH_CEILING + 5 })?.maxDepth).toBe(
      DEFAULT_GENERATOR_OPTIONS.maxDepth,
    );
    expect(parseGeneratorOptions({ maxDepth: 2.5 })?.maxDepth).toBe(
      DEFAULT_GENERATOR_OPTIONS.maxDepth,
    );
  });
});

describe('parseRecentRepositories', () => {
  it('keeps only non-empty strings and caps the list', () => {
    const input = ['a/b', '', 3, null, 'c/d', 'e/f', 'g/h', 'i/j', 'k/l', 'm/n', 'o/p'];
    const result = parseRecentRepositories(input);

    expect(result).toEqual([
      'a/b',
      'c/d',
      'e/f',
      'g/h',
      'i/j',
      'k/l',
    ].slice(0, MAX_RECENT_REPOSITORIES));
    expect(result?.length).toBeLessThanOrEqual(MAX_RECENT_REPOSITORIES);
  });

  it('rejects non-arrays', () => {
    expect(parseRecentRepositories({})).toBeNull();
    expect(parseRecentRepositories(undefined)).toBeNull();
  });
});
