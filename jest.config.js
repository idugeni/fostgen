const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/{layout,error,global-error,not-found,robots,sitemap,manifest}.tsx',
    '!src/app/**/{robots,sitemap,manifest}.ts',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  // A floor, not a target — it fails the build if a change strips out coverage.
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 70, lines: 70 },
  },
};

module.exports = createJestConfig(config);
