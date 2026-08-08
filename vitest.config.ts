import { defineConfig } from 'vitest/config';

// Layer 1 unit tests only (src/**/*.test.ts) — pure logic, no RN runtime.
// See CLAUDE.md -> Conventions and the outer-folder TESTING_PLAN.md.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
