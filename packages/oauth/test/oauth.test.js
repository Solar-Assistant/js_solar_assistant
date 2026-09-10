import { beforeEach, expect, test, vi } from 'vitest'
import { decodeIdToken, oauthClient } from '@solar-assistant/oauth'

const CLIENT_ID = 'test-client'
const REDIRECT_URI = 'http://localhost:8000/oauth/callback'

const client = () => oauthClient({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI, storage: sessionStorage })

const callbackUrl = params => `${REDIRECT_URI}?${new URLSearchParams(params)}`

const stateInFlight = () => JSON.parse(sessionStorage.getItem('sa_oauth_pkce')).state

const respondWith = (body, ok = true) =>
  vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 400, json: async () => body })

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

test('the authorize URL carries everything the server needs', async () => {
  const url = new URL(await client().authorizeUrl())

  expect(url.origin + url.pathname).toBe('https://solar-assistant.io/oauth/authorize')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('client_id')).toBe(CLIENT_ID)
  expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI)
  expect(url.searchParams.get('scope')).toBe('openid sites:read_single')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/)
})

// The verifier must never leave the browser until the exchange, so what goes in the URL is
// the digest and what stays behind is the secret it was derived from.
test('the challenge in the URL is not the verifier held back for the exchange', async () => {
  const url = new URL(await client().authorizeUrl())
  const { verifier } = JSON.parse(sessionStorage.getItem('sa_oauth_pkce'))

  expect(verifier).toMatch(/^[\w-]{43}$/)
  expect(url.searchParams.get('code_challenge')).not.toBe(verifier)
})

test('two authorizations never reuse a verifier or a state', async () => {
  const first = new URL(await client().authorizeUrl())
  const firstVerifier = JSON.parse(sessionStorage.getItem('sa_oauth_pkce')).verifier
  const second = new URL(await client().authorizeUrl())
  const secondVerifier = JSON.parse(sessionStorage.getItem('sa_oauth_pkce')).verifier

  expect(firstVerifier).not.toBe(secondVerifier)
  expect(first.searchParams.get('state')).not.toBe(second.searchParams.get('state'))
})

test('a page with no code in its URL is a normal load, not an error', async () => {
  expect(await client().complete('http://localhost:8000/')).toBe(null)
})

test('an authorization code is exchanged for tokens', async () => {
  const sa = client()
  await sa.authorizeUrl()
  const fetch = respondWith({ access_token: 'tok', scope: 'openid' })
  vi.stubGlobal('fetch', fetch)

  const tokens = await sa.complete(callbackUrl({ code: 'the-code', state: stateInFlight() }))

  expect(tokens.access_token).toBe('tok')
})

// This pins the CORS contract: a form-encoded POST with no added headers is a simple request,
// so no preflight is sent. OPTIONS on the token endpoint is not routed and answers 404.
test('the token request stays a simple request so no preflight is sent', async () => {
  const sa = client()
  await sa.authorizeUrl()
  const fetch = respondWith({ access_token: 'tok' })
  vi.stubGlobal('fetch', fetch)

  await sa.complete(callbackUrl({ code: 'the-code', state: stateInFlight() }))

  const [url, options] = fetch.mock.calls[0]
  expect(url).toBe('https://solar-assistant.io/oauth/token')
  expect(Object.keys(options.headers)).toEqual(['Content-Type'])
  expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
  expect(new URLSearchParams(options.body).get('code_verifier')).toMatch(/^[\w-]{43}$/)
})

test('a response carrying somebody else\'s state is refused', async () => {
  const sa = client()
  await sa.authorizeUrl()
  vi.stubGlobal('fetch', respondWith({ access_token: 'tok' }))

  await expect(sa.complete(callbackUrl({ code: 'the-code', state: 'not-ours' }))).rejects.toThrow(/State mismatch/)
})

// Landing on the callback with no authorization in flight is the bookmarked-URL case, and
// exchanging the code anyway would be exchanging one we never asked for.
test('a code arriving with nothing in flight is refused', async () => {
  await expect(client().complete(callbackUrl({ code: 'the-code', state: 'anything' })))
    .rejects.toThrow(/No authorization in progress/)
})

test('the state is spent once, so a replayed callback is refused', async () => {
  const sa = client()
  await sa.authorizeUrl()
  vi.stubGlobal('fetch', respondWith({ access_token: 'tok' }))
  const url = callbackUrl({ code: 'the-code', state: stateInFlight() })

  await sa.complete(url)

  await expect(sa.complete(url)).rejects.toThrow(/No authorization in progress/)
})

test('the server refusing the user is reported in their words', async () => {
  await expect(client().complete(callbackUrl({ error: 'access_denied', error_description: 'You said no' })))
    .rejects.toThrow('You said no')
})

test('a rejected exchange reports what the server said', async () => {
  const sa = client()
  await sa.authorizeUrl()
  vi.stubGlobal('fetch', respondWith({ error: 'Invalid: code_verifier' }, false))

  await expect(sa.complete(callbackUrl({ code: 'the-code', state: stateInFlight() })))
    .rejects.toThrow('Invalid: code_verifier')
})

test('an id_token reads back as its claims', () => {
  const payload = btoa(JSON.stringify({ sub: '1', email: 'a@b.c' })).replace(/=+$/, '')

  expect(decodeIdToken(`header.${payload}.signature`)).toEqual({ sub: '1', email: 'a@b.c' })
})

test('something that is not an id_token reads back as nothing', () => {
  for (const token of ['', 'not.a.jwt', 'onlyonepart']) expect(decodeIdToken(token)).toBe(null)
})

test('an application cannot be half configured', () => {
  expect(() => oauthClient({ redirectUri: REDIRECT_URI })).toThrow(/clientId/)
  expect(() => oauthClient({ clientId: CLIENT_ID })).toThrow(/redirectUri/)
})
