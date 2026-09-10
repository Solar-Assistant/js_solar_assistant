import { beforeEach, expect, test, vi } from 'vitest'
import { BASE, apiClient, inviteRoles, normalizeRole, siteUrl } from '@solar-assistant/api'

// A site's address is the server's to report. Assembled from the name and region
// it was wrong for every partner, and for an unnamed site it looked real and went
// nowhere.
test('a site is only ever at the address the server reported', () => {
  expect(siteUrl({ id: 1, name: 'acme', url: 'https://acme.eu.solar-power.live' }))
    .toBe('https://acme.eu.solar-power.live')
})

test('a site with no address has none', () => {
  expect(siteUrl({ id: 1, name: 'acme' })).toBe(null)
  expect(siteUrl({ id: 1, name: 'acme', url: '' })).toBe(null)
})

test('an unregistered site is not given one', () => {
  expect(siteUrl({ id: 1, name: null })).toBe(null)
})

test('owner can be granted only by the owner', () => {
  const site = { id: 1, owner: { id: 7 } }
  expect(inviteRoles(site, { id: 7 })).toEqual(['viewer', 'admin', 'owner'])
  expect(inviteRoles(site, { id: 8 })).toEqual(['viewer', 'admin'])
  expect(inviteRoles(site, null)).toEqual(['viewer', 'admin'])
})

test('an older deployment reading back member means viewer', () => {
  expect(normalizeRole('member')).toBe('viewer')
  expect(normalizeRole('admin')).toBe('admin')
})

// Filters go into the q term; only limit and offset are their own parameters. Both
// the offline page and the to_site exchange resolve a site by `name:`.
test('a filter becomes a q term and pagination stays its own parameter', () => {
  const fetch = vi.fn(() => Promise.resolve(new Response('[]')))
  vi.stubGlobal('fetch', fetch)
  const api = apiClient('tok')

  api.get('/sites', { name: 'acme' })
  expect(fetch.mock.calls[0][0]).toBe(`${BASE}/sites?q=name%3Aacme`)

  api.get('/sites', { search: 'roof', name: 'acme', limit: 10 })
  expect(fetch.mock.calls[1][0]).toBe(`${BASE}/sites?limit=10&q=roof+name%3Aacme`)

  api.get('/sites')
  expect(fetch.mock.calls[2][0]).toBe(`${BASE}/sites`)
})

test('the token travels as a bearer header', () => {
  const fetch = vi.fn(() => Promise.resolve(new Response('{}')))
  vi.stubGlobal('fetch', fetch)
  apiClient('tok').post('/sites/1/authorize', {})
  expect(fetch.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    headers: { Authorization: 'Bearer tok' },
    body: '{}',
  })
})
