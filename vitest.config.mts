import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/server/policy.ts', 'src/server/result.ts', 'src/server/errors.ts', 'src/server/rate-limit.ts'],
      exclude: ['src/**/*.test.ts', 'src/domain/**/repository.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80 },
    },
  },
});
