import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  },
  resolve: {
    alias: {
      // fileURLToPath keeps this correct on Windows, where a bare
      // new URL(...).pathname yields a leading-slash drive path.
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
