import { afterEach, beforeEach, expect, test } from 'vitest'
import '../src/sa-sites.js'
import { navigate, open, showing, signIn, stubFetch, tick } from './helpers.js'

// Stand-in outlets rather than the real ones, through the same seam a partner uses
// to replace one — so the table is testable on its own and the override contract
// is covered with it.
const OUTLETS = ['index', 'show', 'invite', 'reset', 'local', 'activate', 'register', 'offline']
for (const name of OUTLETS) customElements.define(`t-${name}`, class extends HTMLElement {})

const MARKUP = `<sa-sites
  index="t-index" show="t-show" invite="t-invite" reset-password="t-reset"
  local="t-local" activate="t-activate" register="t-register" offline="t-offline"></sa-sites>`

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  signIn()
  stubFetch([['GET', /\/user$/, { body: { id: 1 } }]])
})

afterEach(() => { document.body.innerHTML = '' })

const at = async hash => {
  const sites = open(hash, MARKUP)
  await tick()
  return sites
}

test.each([
  ['', 't-index'],
  ['#123', 't-show'],
  ['#123/invite', 't-invite'],
  ['#123/reset_password', 't-reset'],
  ['#local', 't-local'],
  ['#local?uid=ABC123', 't-local'],
  ['#activate?uid=ABC123', 't-activate'],
  ['#register?uid=ABC123&callback=http%3A%2F%2F10.0.0.4%2Fcb', 't-register'],
  ['#offline?host=roof.eu.solar-power.live', 't-offline'],
])('%s reaches %s', async (hash, tag) => {
  const sites = await at(hash)
  expect(showing(sites).tagName.toLowerCase()).toBe(tag)
})

// A device's own link always carries ?uid=, and the route used to match `local`
// exactly — so the one page devices link to was the one page that was blank.
test('a route matches with its query and only with its own name', async () => {
  expect(showing(await at('#local?uid=ABC123')).getAttribute('uid')).toBe('ABC123')
  expect(showing(await at('#localnonsense'))).toBe(undefined)
  expect(showing(await at('#nonsense'))).toBe(undefined)
})

test('a path route hands the outlet the id out of the path', async () => {
  expect(showing(await at('#123')).getAttribute('site-id')).toBe('123')
  expect(showing(await at('#123/invite')).getAttribute('site-id')).toBe('123')
  expect(showing(await at('#123/reset_password')).getAttribute('site-id')).toBe('123')
})

test('a query route lifts every key it names', async () => {
  const outlet = showing(await at('#activate?uid=ABC123&callback=http%3A%2F%2F10.0.0.4%2Fcb'))
  expect(outlet.getAttribute('uid')).toBe('ABC123')
  expect(outlet.getAttribute('callback')).toBe('http://10.0.0.4/cb')
})

// Outlets are kept alive across navigations so their state survives, which means
// a key the new route does not carry has to be cleared rather than left standing.
test('an absent key is cleared, not inherited from the last visit', async () => {
  const sites = await at('#activate?uid=ABC123&callback=http%3A%2F%2F10.0.0.4%2Fcb')
  await navigate('#activate?uid=DEF456')

  const outlet = showing(sites)
  expect(outlet.getAttribute('uid')).toBe('DEF456')
  expect(outlet.hasAttribute('callback')).toBe(false)
})

test('an outlet is mounted once and hidden, not rebuilt', async () => {
  const sites = await at('#123')
  const show = showing(sites)

  await navigate('')
  expect(show.hidden).toBe(true)
  expect(showing(sites).tagName.toLowerCase()).toBe('t-index')

  await navigate('#123')
  expect(showing(sites)).toBe(show)
})

// Nothing is mounted and nothing is torn down: an unmatched hash leaves whatever
// was on screen alone rather than blanking the page.
test('an unmatched hash leaves the last outlet standing', async () => {
  const sites = await at('#123')
  await navigate('#nonsense')
  expect(showing(sites).tagName.toLowerCase()).toBe('t-show')
})

test('an outlet is handed the client, the current user and the sign-in path', async () => {
  const sites = open('#123', `<sa-sites show="t-show" sign-in="/login"></sa-sites>`)
  await tick()

  const outlet = showing(sites)
  expect(outlet.api).toBeTypeOf('object')
  expect(outlet.getAttribute('sign-in')).toBe('/login')
  expect(outlet.currentUser).toEqual({ id: 1 })
})
