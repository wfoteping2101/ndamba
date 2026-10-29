import { defineConfig } from 'vitest/config'

// Unit tests for the games (simulation, drills, story data). Separate from vite.config.ts on purpose.
export default defineConfig({
  test: {
    include: ['src/games/**/*.test.ts'],
    environment: 'node',
  },
})
