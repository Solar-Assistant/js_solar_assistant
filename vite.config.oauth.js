import { defineConfig } from 'vite'
import { resolve } from 'path'

// Its own global rather than SolarAssistant: the api bundle is an IIFE that claims that name,
// so sharing it would leave whichever script tag came last as the only one on the page.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'packages/oauth/src/index.js'),
      fileName: () => 'solar-assistant-oauth.js',
      formats: ['iife'],
      name: 'SolarAssistantOAuth',
    },
    outDir: resolve(__dirname, 'packages/oauth/dist'),
    emptyOutDir: true,
  },
})
