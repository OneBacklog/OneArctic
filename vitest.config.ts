import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const shared = fileURLToPath(new URL('./shared', import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { '#shared': shared } },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          environment: 'node',
          // The suite builds the app once before running
          hookTimeout: 5 * 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
