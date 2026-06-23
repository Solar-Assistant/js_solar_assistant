export const BASE = import.meta.env.DEV
  ? 'http://localhost:3000/api/v1'
  : 'https://solar-assistant.io/api/v1'

// Returns an API client bound to a bearer token.
// Token is stored in sessionStorage under 'sa_token' after sign-in.
//
//   const api = apiClient(sessionStorage.getItem('sa_token'))
//   const sites = await api.get('/sites')
//
// All methods return a Response (call .json() to parse). A 401 means the token
// is expired — redirect to sign-in.
//
// Full client, query-encoding, and endpoint reference:
//   https://github.com/Solar-Assistant/js_solar_assistant/blob/master/docs/api.md

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
// Roles: 'member' (Viewer), 'admin' (Admin), 'owner' (transfers ownership, only if current user is owner).
export function inviteRoles(site, currentUser) {
  const base = ['member', 'admin']
  if (currentUser && site.owner?.id === currentUser.id) return [...base, 'owner']
  return base
}

export function siteUrl(site) {
  if (!site.name || !site.proxy) return null
  const region = site.proxy.split('-')[0]
  return `https://${site.name}.${region}.solar-assistant.io`
}
