import { afterEach, beforeEach, expect, test } from 'vitest'
import '../src/index.js'   // the bundle every portal loads: sa-sites.js alone leaves local, activate and reset-password undefined
import { errorText, open, outletCalls, showing, signIn, stubFetch, tick } from './helpers.js'

// <sa-sites>._mount appends the outlet — firing connectedCallback — and only then
// sets the route params, so every outlet exists for a moment before it knows what
// it is for. In that moment it must ask for nothing and fail at nothing, which is
// the contract both sa-sites-offline and sa-sites-activate have broken.

const SITE = { id: 1, name: 'roof', url: null, local_ip: '10.0.0.4', owner: { id: 1 } }

const ROUTES = [
  ['GET',  /\/user$/,                    { body: { id: 1, organization: { name: 'Acme' } } }],
  ['GET',  /\/sites$/,                   { body: [SITE] }],
  ['GET',  /\/sites\/\d+$/,              { body: SITE }],
  ['POST', /\/sites\/\d+\/authorize$/,   { body: { token: 't', site_key: 'k', site_host: 'h' } }],
  ['POST', /\/sites\/request_activation$/, { body: { status: 'requested', site_id: 1, site_name: 'roof' } }],
  ['PUT',  /\/sites\/\d+\/offline$/,     { body: { reachable: false, status: 'disconnected', status_at: new Date().toISOString() } }],
]

const CASES = [
  { hash: '#123', tag: 'sa-sites-show', param: '123',
    requests: [['GET', '/api/v1/sites/123']] },
  { hash: '#123/invite', tag: 'sa-sites-invite', param: '123',
    requests: [['GET', '/api/v1/sites/123']] },
  { hash: '#123/reset_password', tag: 'sa-sites-reset-password', param: '123',
    requests: [['POST', '/api/v1/sites/123/authorize']] },
  { hash: '#activate?uid=ABC123', tag: 'sa-sites-activate', param: 'ABC123',
    requests: [['POST', '/api/v1/sites/request_activation']] },
  { hash: '#offline?host=roof.eu.solar-power.live', tag: 'sa-sites-offline', param: 'roof',
    requests: [['GET', '/api/v1/sites'], ['PUT', '/api/v1/sites/1/offline']] },
  // The registration form has nothing to fetch: the uid is claimed on submit.
  { hash: '#register?uid=ABC123', tag: 'sa-sites-register', param: 'ABC123', requests: [] },
]

let calls

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  signIn()
  calls = stubFetch(ROUTES)
})

afterEach(() => { document.body.innerHTML = '' })

test.each(CASES)('$tag loads once, on its own param, and shows no error', async c => {
  const sites = open(c.hash, '<sa-sites></sa-sites>')
  await tick()
  await tick()

  const outlet = showing(sites)
  expect(outlet.tagName.toLowerCase()).toBe(c.tag)
  expect(errorText(outlet)).toBe('')
  expect(outletCalls(calls).map(call => [call.method, call.path])).toEqual(c.requests)
})

test.each(CASES.filter(c => c.requests.length))('$tag never asks without its param', async c => {
  open(c.hash, '<sa-sites></sa-sites>')
  await tick()
  await tick()

  for (const call of outletCalls(calls)) {
    expect(`${call.path}?${call.query}${call.body || ''}`).toContain(c.param)
  }
})

// The same gap, entered from the other side: an outlet that is already on screen
// is re-parameterised in place rather than rebuilt, and has to load again.
test('an outlet already on screen loads again when the route changes under it', async () => {
  const sites = open('#123', '<sa-sites></sa-sites>')
  await tick()
  const show = showing(sites)

  window.location.hash = '#456'
  await tick()
  await tick()

  expect(showing(sites)).toBe(show)
  expect(errorText(show)).toBe('')
  expect(outletCalls(calls).map(call => call.path))
    .toEqual(['/api/v1/sites/123', '/api/v1/sites/456'])
})
