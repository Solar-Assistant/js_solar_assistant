import { afterEach, beforeEach, expect, test } from 'vitest'
import '../src/sa-sign-in.js'
import { stubFetch, tick } from './helpers.js'

class Outlet extends HTMLElement {}
customElements.define('t-set-password', Outlet)
customElements.define('t-form', class extends HTMLElement {})

const MARKUP =
  '<sa-sign-in organization-id="acme" set-password="t-set-password" form="t-form"></sa-sign-in>'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  stubFetch([])
})

afterEach(() => { document.body.innerHTML = '' })

async function open(hash) {
  window.happyDOM.setURL(`http://portal.example/sign_in${hash}`)
  document.body.innerHTML = MARKUP
  await tick()
  const host = document.body.firstElementChild
  return [...host.shadowRoot.children].find(el => !el.hidden)
}

// `return_to` arrives in the URL, so anyone can put anything in it, and it is
// followed straight after the visitor has typed their password.
test('a return_to within the portal is kept whole, fragment and all', () => {
  window.happyDOM.setURL('http://portal.example/sign_in')
  const signInEl = document.createElement('sa-sign-in')

  expect(signInEl._samePage('/sites#register?uid=ABC123')).toBe('/sites#register?uid=ABC123')
  expect(signInEl._samePage('/sites?ref=mail')).toBe('/sites?ref=mail')
})

test.each([
  ['https://evil.example/x'],
  ['//evil.example/x'],
  ['javascript:alert(1)'],
  [''],
  [null],
])('a return_to of %s is not somewhere we send a browser', value => {
  window.happyDOM.setURL('http://portal.example/sign_in')
  expect(document.createElement('sa-sign-in')._samePage(value)).toBe(null)
})

// The invite mail appends ?site_id=, and the token used to be matched greedily, so
// every invited user on a partner portal was handed a token the API could not read.
test('an invite link’s token stops at the query', async () => {
  const outlet = await open('#password/set/abc.123-XYZ?site_id=7')

  expect(outlet.getAttribute('mode')).toBe('set')
  expect(outlet.getAttribute('token')).toBe('abc.123-XYZ')
  expect(outlet.getAttribute('site-id')).toBe('7')
})

test('a plain reset link carries a token and no site', async () => {
  const outlet = await open('#password/reset/abc.123-XYZ')

  expect(outlet.getAttribute('mode')).toBe('reset')
  expect(outlet.getAttribute('token')).toBe('abc.123-XYZ')
  expect(outlet.hasAttribute('site-id')).toBe(false)
})

// The outlet is kept across navigations, so a site from a previous visit must not
// still be there on a link that names none.
test('a site from the last link is cleared, not inherited', async () => {
  await open('#password/set/one?site_id=7')
  window.location.hash = '#password/set/two'
  await tick()

  const outlet = [...document.body.firstElementChild.shadowRoot.children].find(el => !el.hidden)
  expect(outlet.getAttribute('token')).toBe('two')
  expect(outlet.hasAttribute('site-id')).toBe(false)
})

test('no hash is the sign-in form', async () => {
  const outlet = await open('')
  expect(outlet.tagName.toLowerCase()).toBe('t-form')
})

// A to_* parameter names a target to act on, never a URL to follow. Several at
// once is ambiguous, and ambiguity on the auth page is the worst kind, so act on
// none.
test('a lone to_site is a target and two of them are not', async () => {
  window.happyDOM.setURL('http://portal.example/sign_in?to_site=https%3A%2F%2Froof.example%2Fx')
  const el = document.createElement('sa-sign-in')
  expect(el._toSite()).toBe('https://roof.example/x')

  window.happyDOM.setURL('http://portal.example/sign_in?to_site=https%3A%2F%2Fa.example&to_other=x')
  expect(document.createElement('sa-sign-in')._toSite()).toBe(null)
})

test('an organization is required before anything is mounted', async () => {
  document.body.innerHTML = '<sa-sign-in></sa-sign-in>'
  await tick()
  expect(document.body.firstElementChild.shadowRoot).toBe(null)
})
