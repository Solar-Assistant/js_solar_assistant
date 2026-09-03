export const BASE = 'https://solar-assistant.io/api/v1'

// Returns an API client bound to a bearer token.
// All methods return a Response (call .json() to parse). A 401 means the token
// is expired — redirect to sign-in. See docs/api.md for the full reference.

const PAGINATION_KEYS = new Set(['limit', 'offset'])

function buildQuery(params) {
  if (!params || Object.keys(params).length === 0) return ''
  const q = new URLSearchParams()
  const terms = []
  for (const [k, v] of Object.entries(params)) {
    if (PAGINATION_KEYS.has(k)) {
      q.set(k, v)
    } else if (k === 'search') {
      terms.unshift(String(v))
    } else {
      terms.push(`${k}:${v}`)
    }
  }
  if (terms.length) q.set('q', terms.join(' '))
  const qs = q.toString()
  return qs ? `?${qs}` : ''
}

export function apiClient(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  return {
    get:    (path, params) => fetch(`${BASE}${path}${buildQuery(params)}`, { headers }),
    post:   (path, body) =>   fetch(`${BASE}${path}`, { method: 'POST',   headers, body: JSON.stringify(body) }),
    patch:  (path, body) =>   fetch(`${BASE}${path}`, { method: 'PATCH',  headers, body: JSON.stringify(body) }),
    delete: path =>           fetch(`${BASE}${path}`, { method: 'DELETE', headers }),
  }
}

// Returns the role options available when inviting a user to a site.
// Roles: 'viewer' (Viewer), 'admin' (Admin), 'owner' (transfers ownership, only if current user is owner).
// The API used to read back 'member' for a viewer and now reads back 'viewer'. Writes accept either —
// anything that isn't 'admin' or 'owner' is a viewer — so send 'viewer' and normalize on read.
export function inviteRoles(site, currentUser) {
  const base = ['viewer', 'admin']
  if (currentUser && site.owner?.id === currentUser.id) return [...base, 'owner']
  return base
}

// A role as read from the API, mapped onto the values above. Older deployments return
// 'member' where newer ones return 'viewer'; everything downstream should compare against
// this rather than against a raw response value.
export function normalizeRole(role) {
  return role === 'member' ? 'viewer' : role
}

// How long a session is assumed to last when the API returns no expiry we can
// read. Short, because the point is to bound a session we know nothing about —
// every current build returns expires_at, so this should never be reached.
const FALLBACK_SESSION_MS = 24 * 60 * 60 * 1000

// Milliseconds since the epoch, or null if there is nothing usable to read.
// Absent, empty and unparseable all have to come out the same, because all
// three mean the same thing: we cannot tell when this session ends.
function expiryOf(expiresAt) {
  const at = expiresAt ? new Date(expiresAt).getTime() : NaN
  return Number.isNaN(at) ? null : at
}

// The expiry is normalised on the way in, so a session in storage always carries
// one this can read back. An unreadable expiry is therefore not "an old API" but
// a session written by something else, and is treated as over.
export function persistSession(storage, key, token, expiresAt) {
  const expiry = expiryOf(expiresAt) ?? Date.now() + FALLBACK_SESSION_MS
  storage.setItem(key, token)
  storage.setItem(`${key}_expires_at`, new Date(expiry).toISOString())
}

export function sessionValid(storage, key) {
  if (!storage.getItem(key)) return false
  const expiry = expiryOf(storage.getItem(`${key}_expires_at`))
  if (expiry === null) return false
  return Date.now() < expiry
}

// Returns a valid token from sessionStorage or localStorage, or null if neither
// holds a live session. sessionStorage is checked first so a per-session sign-in
// ("keep me signed in" unchecked) takes precedence over a stale persisted one.
//
// A lapsed session is dropped as it is found. Nothing else does this: clearSession
// runs on sign-out and on a 401, so a token belonging to someone who signed in
// once and never came back would otherwise sit in localStorage indefinitely.
export function readToken(key) {
  let token = null
  for (const storage of [sessionStorage, localStorage]) {
    if (sessionValid(storage, key)) {
      token ??= storage.getItem(key)
    } else {
      storage.removeItem(key)
      storage.removeItem(`${key}_expires_at`)
    }
  }
  return token
}

// Removes the token and its expiry from both storages.
export function clearSession(key) {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(key)
    storage.removeItem(`${key}_expires_at`)
  }
}

// The address the API reports for a site, or null when it has none yet — an
// unnamed site has no host to be at. Never assembled here: a partner's sites
// live on their own domain, which only the server knows.
export function siteUrl(site) {
  return site.url || null
}
