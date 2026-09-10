import { afterEach, expect, test } from 'vitest'
import {
  caption, field, formatDate, formatDay, linkField, registered, returnToHere, timeAgo,
} from '../src/sites-shared.js'

afterEach(() => { window.happyDOM.setURL('http://portal.example/') })

// The whole URL, not just the path. A link from a device carries its route and
// its parameters in the fragment, and signing in is a full navigation that would
// otherwise drop them — which it did, in four places at once.
test('coming back means coming back to the fragment too', () => {
  window.happyDOM.setURL('http://portal.example/sites?ref=mail#register?uid=ABC123')
  expect(returnToHere()).toBe('/sites?ref=mail#register?uid=ABC123')
})

test('a bare page comes back as a bare path', () => {
  window.happyDOM.setURL('http://portal.example/sites')
  expect(returnToHere()).toBe('/sites')
})

// The suite runs in a zone behind UTC (see vitest.config.mjs), where this instant
// is still the previous day locally. A build is named by the day it was cut.
test('a build cut just after midnight UTC keeps its own day', () => {
  const justAfterMidnight = '2026-08-25T00:30:00Z'
  expect(new Date(justAfterMidnight).toLocaleDateString()).not.toBe(formatDay(justAfterMidnight))
  expect(formatDay(justAfterMidnight))
    .toBe(new Date('2026-08-25T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC' }))
})

test('a day carries no time, a moment does', () => {
  const iso = '2026-08-25T13:45:00Z'
  expect(formatDate(iso)).toContain(new Date(iso).toLocaleDateString())
  expect(formatDate(iso)).not.toBe(formatDay(iso))
})

test('nothing formats as nothing', () => {
  expect(formatDay(null)).toBe(null)
  expect(formatDate(null)).toBe(null)
  expect(timeAgo(null)).toBe('—')
})

// The units table falls through to 'second', so a moment under a minute old still
// has words rather than dropping off the end of the loop as undefined.
test('a moment just gone still reads as a moment', () => {
  expect(timeAgo(new Date(Date.now() - 200).toISOString())).toEqual(expect.any(String))
  expect(timeAgo(new Date(Date.now() - 3 * 86400_000).toISOString()))
    .not.toBe(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString()))
})

test('a site with no name is shown by its number', () => {
  expect(caption({ id: 7, name: null })).toBe('Unregistered #7')
  expect(caption({ id: 7, name: '' })).toBe('Unregistered #7')
  expect(caption({ id: 7, name: 'Roof' })).toBe('Roof')
  expect(registered({ id: 7, name: null })).toBe(false)
  expect(registered({ id: 7, name: 'Roof' })).toBe(true)
})

// The label is ours; the value came from the API and never is.
test('a value from the API cannot carry markup into the page', () => {
  expect(field('Name', '<img src=x onerror=alert(1)>'))
    .toContain('&lt;img src=x onerror=alert(1)&gt;')
  expect(linkField('Site', 'x', 'javascript:alert(1)')).not.toContain('<script')
  expect(field('Name', '')).toBe('')
  expect(linkField('Site', '', 'http://x')).toBe('')
})
