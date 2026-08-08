import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Layer 1 unit tests only (src/**/*.test.ts) — pure logic, no jsdom needed.
// See CLAUDE.md -> Conventions and the outer-folder TESTING_PLAN.md.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
