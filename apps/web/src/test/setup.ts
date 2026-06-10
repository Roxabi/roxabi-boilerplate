import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// clientEnv (env.shared.ts) parses import.meta.env at module load — VITE_APP_URL
// is required, so give tests a baseline before any module imports it
import.meta.env.VITE_APP_URL ??= 'http://localhost:3000'

afterEach(() => {
  cleanup()
})
