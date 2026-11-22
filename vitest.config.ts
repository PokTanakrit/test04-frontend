import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

// The Start development plugins transform React for SSR. Component tests need
// a single client React instance, without Start's server transform.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: { dedupe: ['react', 'react-dom'] },
})
