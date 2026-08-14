import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'packages/api/src/index.js'),
      fileName: () => 'solar-assistant-api.js',
      formats: ['iife'],
      name: 'SolarAssistant',
    },
    outDir: resolve(__dirname, 'packages/api/dist'),
    emptyOutDir: true,
  },
})
