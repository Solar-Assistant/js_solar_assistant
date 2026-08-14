import { defineConfig } from 'vite'
import { resolve } from 'path'

// Builds the ES module every portal loads from the CDN. The elements register
// themselves on import, so the bundle has no entry point to call.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'packages/components/src/index.js'),
      fileName: () => 'solar-assistant.js',
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'packages/components/dist'),
    emptyOutDir: true,
  },
})
