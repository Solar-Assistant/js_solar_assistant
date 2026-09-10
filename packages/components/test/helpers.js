import { vi } from 'vitest'
import { persistSession } from '@solar-assistant/api'

// Every outlet takes its API client from `el.api`, and <sa-sites> builds one from a
// stored token, so a session and a stubbed fetch are the whole harness.
export function signIn() {
  persistSession(localStorage, 'sa_token', 'test-token',
    new Date(Date.now() + 3600_000).toISOString())
}

// Answers from the first [method, pattern, body] whose path matches, and records
// every request. An unmatched one throws rather than 404ing, which a component
// would render as its own error and the test would read as a component bug.
export function stubFetch(routes) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const method = init.method || 'GET'
    const { pathname, searchParams } = new URL(url)
    calls.push({ method, path: pathname, query: searchParams, body: init.body })
    for (const [m, pattern, answer] of routes) {
      if (m !== method || !pattern.test(pathname)) continue
      const { status = 200, body = {} } = typeof answer === 'function' ? answer() : answer
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error(`no stub for ${method} ${pathname}`)
  }))
  return calls
}

// The router reads location.hash on connect, so the URL is set before mounting.
export function open(hash, html) {
  window.happyDOM.setURL(`http://portal.example/sites${hash}`)
  document.body.innerHTML = html
  return document.body.firstElementChild
}

export function navigate(hash) {
  window.location.hash = hash
  return tick()
}

// Long enough for a chain of awaited fetches to settle; the stub resolves at once,
// so this is only about draining the microtask queue behind them.
export const tick = () => new Promise(resolve => setTimeout(resolve, 0))

// The outlet the router is currently showing — they all stay mounted, hidden.
export const showing = sites => [...sites.children].find(el => !el.hidden)

// What an outlet is currently saying went wrong, or '' if it is not saying
// anything. Every outlet in the family renders its failures into `.error`.
export function errorText(outlet) {
  const errors = [...outlet.shadowRoot.querySelectorAll('.error, #error')]
  return errors.filter(el => !el.hidden).map(el => el.textContent.trim()).join(' ').trim()
}

// The requests an outlet made, with the router's own /user lookup left out.
export const outletCalls = calls => calls.filter(call => !call.path.endsWith('/user'))
