import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../src/sa-sites-offline.js'
import { apiClient } from '@solar-assistant/api'
import { errorText, outletCalls, signIn, stubFetch, tick } from './helpers.js'

// The page a customer lands on when their device cannot be reached — the one most
// likely to be seen and least likely to be looked at.

const HOST = 'roof.eu.solar-power.live'
const SITE = { id: 1, name: 'roof', url: 'https://roof.eu.solar-power.live', local_ip: '10.0.0.4' }

let calls
let navigated

beforeEach(() => {
  localStorage.clear()
  signIn()
  navigated = []
  vi.spyOn(window.location, 'href', 'set').mockImplementation(url => navigated.push(url))
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

async function mount(report, site = SITE) {
  calls = stubFetch([
    ['GET', /\/sites$/, { body: [site] }],
    ['PUT', /\/sites\/1\/offline$/, report],
  ])
  const outlet = document.createElement('sa-sites-offline')
  outlet.api = apiClient('test-token')
  outlet.setAttribute('host', HOST)
  document.body.appendChild(outlet)
  await tick()
  await tick()
  return outlet
}

const put = () => outletCalls(calls).find(call => call.method === 'PUT')
const statusText = outlet => outlet.shadowRoot.getElementById('status')?.textContent ?? ''
const countdown = outlet => {
  const row = outlet.shadowRoot.getElementById('next')
  return row.hidden ? null : outlet.shadowRoot.getElementById('countdown').textContent
}

// One character from data loss: no key leaves the answers a customer gave on
// sa_cloud's own offline page alone, and `answers: {}` erases every one of them.
test('the probe never sends an answers key', async () => {
  await mount({ body: { reachable: false, status: 'disconnected', status_at: new Date().toISOString() } })

  const body = JSON.parse(put().body)
  expect(body).toEqual({ uri: HOST })
  expect('answers' in body).toBe(false)
})

// The address the proxy sent us, not the site's current one: the cloud needs the
// original to tell which host the visitor actually tried, notably after a region
// or partner-domain move.
test('the probe carries the address the visitor arrived on', async () => {
  await mount({ body: { reachable: false, status: 'disconnected' } })
  expect(JSON.parse(put().body).uri).toBe(HOST)
})

// `reachable`, never the status: two statuses mean the device answered, and keying
// on status strands every http_error visitor on a page insisting it did not.
test('a device answering with its own error is still a device that answered', async () => {
  await mount({ body: { reachable: true, status: 'http_error' } })
  expect(navigated).toEqual([SITE.url])
})

test('a device that did not answer is not followed, whatever the status says', async () => {
  const outlet = await mount({ body: { reachable: false, status: 'connected', status_at: new Date().toISOString() } })
  expect(navigated).toEqual([])
  expect(statusText(outlet)).not.toBe('')
})

// Nothing is left to probe, so a countdown here would fail again forever.
test('a site that has gone away is reported once and not chased', async () => {
  const outlet = await mount({ status: 404, body: {} })

  expect(countdown(outlet)).toBe(null)
  expect(statusText(outlet)).not.toBe('')
  await tick()
  expect(outletCalls(calls).filter(call => call.method === 'PUT')).toHaveLength(1)
})

// The cloud caches a probe per site for a minute, so a visitor arriving mid-cache
// must be told how long is actually left rather than a fresh minute.
test('the countdown runs from the cloud’s last check, not from our request', async () => {
  const outlet = await mount({
    body: {
      reachable: false,
      status: 'disconnected',
      status_at: new Date(Date.now() - 45_000).toISOString(),
    },
  })

  expect(countdown(outlet)).toContain('15')
})

// The router appends the outlet before it sets `host`; loading in that gap painted
// a red error over the top of the real load a moment later.
test('an outlet with no host yet asks for nothing and says nothing is wrong', async () => {
  calls = stubFetch([])
  const outlet = document.createElement('sa-sites-offline')
  outlet.api = apiClient('test-token')
  document.body.appendChild(outlet)
  await tick()

  expect(outletCalls(calls)).toEqual([])
  expect(errorText(outlet)).toBe('')
})
