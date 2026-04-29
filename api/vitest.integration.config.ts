import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'build'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 60_000,
    hookTimeout: 120_000,
    sequence: {
      concurrent: false,
    },
  },
});
