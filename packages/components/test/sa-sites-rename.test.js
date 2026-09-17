import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import '../src/index.js'
import { open, showing, signIn, stubFetch, tick } from './helpers.js'

// Renaming changes the host a device is reached at. The device catches up by itself
// on its next check-in, but the page closes that window by sending the browser to
// the device under its new name, the way sa_cloud's own rename page does.

const REGISTERED = { id: 7, name: 'roof', url: 'https://roof.eu.solar-power.live', owner: { id: 1 }, users: [] }
const UNREGISTERED = { id: 8, name: null, url: null, users: [] }
const RENAMED_URL = 'https://attic.eu.solar-power.live'

let calls
let navigated

const base = [['GET', /\/user$/, { body: { id: 1 } }]]

async function show(site, rename) {
  calls = stubFetch([
    ...base,
    ['GET', /\/sites\/\d+$/, { body: site }],
    ['PATCH', /\/sites\/\d+\/name$/, rename || { body: { ...site, name: 'attic', url: RENAMED_URL, token: 'unused' } }],
  ])
  const sites = open(`#${site.id}`, '<sa-sites></sa-sites>')
  await tick(); await tick()
  return showing(sites)
}

const $ = (outlet, selector) => outlet.shadowRoot.querySelector(selector)

async function rename(outlet, name) {
  $(outlet, '[data-rename]').click()
  $(outlet, 'input[name="name"]').value = name
  $(outlet, '[data-rename-save]').click()
  await tick(); await tick()
}

beforeEach(() => {
  localStorage.clear()
  signIn()
  navigated = []
  vi.spyOn(window.location, 'href', 'set').mockImplementation(url => navigated.push(url))
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

test('a registered site can be renamed', async () => {
  const outlet = await show(REGISTERED)
  expect($(outlet, '[data-rename]')).not.toBeNull()
})

// Same rule as inviting: the page does not know the viewer's rights on a site, and
// an organization admin's come from the organization rather than the site's users.
test('an unregistered site offers no rename, as it offers no invite', async () => {
  const outlet = await show(UNREGISTERED)
  expect($(outlet, '[data-rename]')).toBeNull()
  expect($(outlet, '[data-invite]')).toBeNull()
})

test('saving sends only the name', async () => {
  const outlet = await show(REGISTERED)
  await rename(outlet, 'attic')

  const patch = calls.find(call => call.method === 'PATCH')
  expect(patch.path).toBe('/api/v1/sites/7/name')
  expect(JSON.parse(patch.body)).toEqual({ name: 'attic' })
})

test('after a rename the browser reaches the device under its new name', async () => {
  const outlet = await show(REGISTERED)
  await rename(outlet, 'attic')
  expect(navigated).toEqual([`${RENAMED_URL}/configuration/activate`])
})

// The response's url, not one assembled here: a partner's sites live on their own
// domain, which only the server knows.
test('the address comes from the response, not from the name typed', async () => {
  const outlet = await show(REGISTERED, { body: { ...REGISTERED, name: 'attic', url: 'https://attic.partner.example' } })
  await rename(outlet, 'attic')
  expect(navigated).toEqual(['https://attic.partner.example/configuration/activate'])
})

test('an invalid name is reported on the field and nobody is sent anywhere', async () => {
  const outlet = await show(REGISTERED, { status: 422, body: { errors: { name: ['is already taken'] } } })
  await rename(outlet, 'roof')

  expect(outlet.shadowRoot.textContent).toContain('is already taken')
  expect(navigated).toEqual([])
})

// The page offers the action to anyone who can see the site and lets the server
// decide, exactly as it does for inviting.
test('a refused rename says so and sends nobody anywhere', async () => {
  const outlet = await show(REGISTERED, { status: 403, body: { error: 'Forbidden' } })
  await rename(outlet, 'attic')

  expect($(outlet, '.rename-error').textContent.trim()).not.toBe('')
  expect(navigated).toEqual([])
})

test('cancelling puts the name back without asking the server anything', async () => {
  const outlet = await show(REGISTERED)
  $(outlet, '[data-rename]').click()
  $(outlet, 'input[name="name"]').value = 'attic'
  $(outlet, '[data-rename-cancel]').click()
  await tick()

  expect(calls.some(call => call.method === 'PATCH')).toBe(false)
  expect($(outlet, 'input[name="name"]')).toBeNull()
  expect(outlet.shadowRoot.textContent).toContain('roof')
})
