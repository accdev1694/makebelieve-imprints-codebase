const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/cypress/**',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/cypress/',
    // Skip shipping routes tests due to Istanbul/Edge runtime incompatibility
    'app/api/shipping/__tests__/',
    // Integration tests run separately with: npm run test:integration
    '__tests__/integration/',
  ],
  // Coverage thresholds - raise these incrementally as test coverage improves
  // Current baseline: ~3.7% (Jan 2026) - raise as tests are added
  coverageThreshold: {
    global: {
      lines: 3,
      functions: 3,
      branches: 3,
      statements: 3,
    },
    // Critical service coverage requirements (per BMAD Squad review)
    // These files must maintain 60%+ coverage
    './lib/server/auth-service.ts': {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    './lib/server/stripe-service.ts': {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    './lib/server/order-state-machine.ts': {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    './lib/server/token-blacklist.ts': {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    './lib/server/rate-limiter.ts': {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
