import { beforeEach, expect, test } from 'vitest'
import { clearSession, persistSession, readToken, sessionValid } from '@solar-assistant/api'

const HOUR = 60 * 60 * 1000
const soon = () => new Date(Date.now() + HOUR).toISOString()
const past = () => new Date(Date.now() - HOUR).toISOString()

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

test('a session is stored with an expiry that can be read back', () => {
  persistSession(localStorage, 'sa_token', 'tok', soon())
  expect(localStorage.getItem('sa_token')).toBe('tok')
  expect(sessionValid(localStorage, 'sa_token')).toBe(true)
})

// An expiry we cannot read is not an old API — every current build sends one —
// so it is a session written by something else, and is treated as over.
test('an unreadable expiry means the session is over', () => {
  for (const written of ['', 'not a date', 'null']) {
    localStorage.setItem('sa_token', 'tok')
    localStorage.setItem('sa_token_expires_at', written)
    expect(sessionValid(localStorage, 'sa_token')).toBe(false)
  }
})

test('a missing expiry on the way in becomes one on the way out', () => {
  persistSession(localStorage, 'sa_token', 'tok', null)
  expect(sessionValid(localStorage, 'sa_token')).toBe(true)
  expect(Date.parse(localStorage.getItem('sa_token_expires_at'))).toBeGreaterThan(Date.now())
})

test('a lapsed session is not valid', () => {
  persistSession(localStorage, 'sa_token', 'tok', past())
  expect(sessionValid(localStorage, 'sa_token')).toBe(false)
})

// Signing in without "keep me signed in" writes to sessionStorage, and that
// choice has to win over whatever an earlier sign-in left in localStorage.
test('a per-tab session takes precedence over a persisted one', () => {
  persistSession(localStorage, 'sa_token', 'persisted', soon())
  persistSession(sessionStorage, 'sa_token', 'per-tab', soon())
  expect(readToken('sa_token')).toBe('per-tab')
})

// Nothing else drops one: clearSession runs on sign-out and on a 401, so a token
// left by someone who never came back would otherwise sit there indefinitely.
test('a lapsed session is dropped as it is read', () => {
  persistSession(localStorage, 'sa_token', 'tok', past())
  expect(readToken('sa_token')).toBe(null)
  expect(localStorage.getItem('sa_token')).toBe(null)
  expect(localStorage.getItem('sa_token_expires_at')).toBe(null)
})

test('signing out clears both storages', () => {
  persistSession(localStorage, 'sa_token', 'a', soon())
  persistSession(sessionStorage, 'sa_token', 'b', soon())
  clearSession('sa_token')
  expect(readToken('sa_token')).toBe(null)
})
