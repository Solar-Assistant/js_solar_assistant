export const AUTH_SERVER = 'https://solar-assistant.io'

// The only scopes the authorization server issues. Anything else is dropped silently,
// so asking for more than this is a way to think you have access that you do not.
export const SCOPES = ['openid', 'sites:read_single']

const STORAGE_KEY = 'sa_oauth_pkce'

// Returns an OAuth client for one application. `redirectUri` must be registered on the
// application exactly, and the page must be served from that URI's own origin: the token
// endpoint builds its Access-Control-Allow-Origin from the registered redirect, not from
// the request's Origin header, so a page served elsewhere sends the request successfully
// and then cannot read the reply.
export function oauthClient({ clientId, redirectUri, authServer = AUTH_SERVER, storage = sessionStorage }) {
  if (!clientId) throw new Error('oauthClient: clientId is required')
  if (!redirectUri) throw new Error('oauthClient: redirectUri is required')

  return {
    authorizeUrl: scopes => authorizeUrl({ clientId, redirectUri, authServer, storage, scopes }),
    complete: url => complete({ clientId, redirectUri, authServer, storage, url }),
  }
}

// Builds the URL to send the user to, and stores the verifier and state it is bound to.
// Send them with `location.assign(await client.authorizeUrl())`.
async function authorizeUrl({ clientId, redirectUri, authServer, storage, scopes = SCOPES }) {
  const verifier = randomToken()
  const state = randomToken()

  storage.setItem(STORAGE_KEY, JSON.stringify({ verifier, state }))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: await challenge(verifier),
    code_challenge_method: 'S256',
  })

  return `${authServer}/oauth/authorize?${params}`
}

// Reads the authorization code off the current URL and exchanges it for tokens. Returns
// null when there is no code, so a page can call it unconditionally on load.
async function complete({ clientId, redirectUri, authServer, storage, url = window.location.href }) {
  const params = new URL(url).searchParams
  const code = params.get('code')
  const error = params.get('error')

  if (error) throw new Error(params.get('error_description') || error)
  if (!code) return null

  const pending = read(storage)
  storage.removeItem(STORAGE_KEY)

  if (!pending) throw new Error('No authorization in progress. Start again.')
  if (params.get('state') !== pending.state) throw new Error('State mismatch. The response is not the one we asked for.')

  // Form-encoded with no added headers on purpose: that makes this a simple request, so the
  // browser sends no preflight. OPTIONS on the token endpoint is not routed and would 404.
  const response = await fetch(`${authServer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: pending.verifier,
    }).toString(),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(describe(body) || `Token request failed (${response.status})`)

  return body
}

// The payload of an id_token, without verifying its signature. It came straight from the
// token endpoint over TLS, so it is safe to display; it is not evidence of anything you
// would not already believe from holding the access token.
export function decodeIdToken(token) {
  const payload = String(token).split('.')[1]
  if (!payload) return null

  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
  } catch {
    return null
  }
}

function read(storage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function describe(body) {
  if (!body) return null
  return body.error_description || body.error?.message || body.error || null
}

function randomToken() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

// crypto.subtle exists only in a secure context. That covers https and localhost, but not
// a page opened over http on a LAN address, where this throws rather than returning junk.
async function challenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}
