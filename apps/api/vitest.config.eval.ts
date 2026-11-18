import { defineConfig } from 'vitest/config';

// Evals call the real database and model: run by hand only (npm run eval), never with the unit tests.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['evals/**/*.eval.ts'],
  },
});
