import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@tsi/domain': `${root}packages/domain/src/index.ts`,
      '@tsi/application': `${root}packages/application/src/index.ts`,
      '@tsi/infrastructure': `${root}packages/infrastructure/src/index.ts`,
      '@tsi/contracts': `${root}packages/contracts/src/index.ts`,
      '@tsi/shared': `${root}packages/shared/src/index.ts`,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
