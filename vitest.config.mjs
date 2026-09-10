import { defineConfig } from 'vite'

// happy-dom, not a browser: custom elements and shadow DOM are all the router and
// its outlets need, and `el.api` is the seam that keeps the network out.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['packages/*/test/**/*.test.js'],
    // Behind UTC, which is the condition under which a build cut just after
    // midnight slips back a day — so formatDay is tested where it can fail.
    env: { TZ: 'Pacific/Honolulu' },
  },
})
