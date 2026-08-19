# API reference

The `@solar-assistant/api` client is a thin wrapper over the SolarAssistant
REST API. Use it to build your own UI instead of (or alongside) the
[components](components.md).

This page covers the JS client. For the REST API itself — every endpoint,
parameter, and response — see the canonical sources:

- **OpenAPI spec:** [solar-assistant.io/openapi.yaml](https://solar-assistant.io/openapi.yaml) (machine-readable)
- **Cloud API guide:** [solar-assistant.io/help/integration/cloud-api](https://solar-assistant.io/help/integration/cloud-api) (including proxy pass-through metrics and the WebSocket stream)

## Example usage

```js
import { apiClient, persistSession } from '@solar-assistant/api'

// Login
const res = await fetch('https://solar-assistant.io/api/v1/sign_in', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, organization_id }),
})
const { token, expires_at } = await res.json()
persistSession(localStorage, 'sa_cloud', token, expires_at)

// Create client
const api = apiClient(token)

// Get sites
const sites = await (await api.get('/sites')).json()
console.log(sites)
```

For the auth transfer flow (passing a session from a mobile or external app), see
[Authentication](authentication.md).

## Persisting the session

After a successful login, persist the token and its expiry with `persistSession`.
Pass the storage you want: `localStorage` to keep the user signed in across
browser restarts, or `sessionStorage` to drop the session when the tab closes —
that choice is how a "keep me signed in" checkbox is implemented.

```js
import { persistSession, readToken, clearSession } from '@solar-assistant/api'

const storage = rememberMe ? localStorage : sessionStorage
persistSession(storage, 'sa_cloud', token, expires_at)
```

On your sign-in page, use `readToken` to check for an existing, unexpired session
— it looks in both `sessionStorage` and `localStorage` — and redirect away if the
user is already signed in:

```js
if (readToken('sa_cloud')) {
  window.location.href = '/sites'
}
```

A `401` response from any API call means the token has expired. Clear it and
redirect to sign-in:

```js
if (res.status === 401) {
  clearSession('sa_cloud')
  window.location.href = '/sign_in'
}
```

> **Interoperating with the components.** The built-in components (`<sa-sign-in>`,
> `<sa-sites>`, `<sa-user>`) store the session under `'sa_token'`. If you want to
> read that session from your own code — for example to call the API on a page that
> also embeds `<sa-sites>` — use `readToken('sa_token')`.

## Client reference

### `apiClient(token)`

Returns a client bound to a bearer token. Every method returns a `fetch`
`Response` — call `.json()` to parse the body. A `401` means the token is
expired; redirect to sign-in.

| Method | Signature |
|---|---|
| `get` | `get(path, params?)` |
| `post` | `post(path, body)` |
| `patch` | `patch(path, body)` |
| `delete` | `delete(path)` |

### Query parameters (`get`)

The `params` object is encoded the same way as the Go and Python clients:

| Key | Encoding |
|---|---|
| `limit`, `offset` | top-level query params (`?limit=X&offset=Y`) |
| `search` | bare term in `?q=` (server-side prefix + full-text match) |
| any other key | `key:value` filter joined into `?q=` |

```js
api.get('/sites', { inverter: 'srne', limit: 50 })
//  -> /sites?q=inverter:srne&limit=50
```

## Session helpers

These manage the token in browser storage under a key you choose (e.g.
`'sa_cloud'`); each stores the expiry under `<key>_expires_at`.

### `persistSession(storage, key, token, expiresAt)`

Writes `token` and `expiresAt` to the given `Storage` (`localStorage` or
`sessionStorage`). The expiry is normalised to an ISO timestamp on the way in, so
a stored session always carries one the helpers below can read back. Pass the
`expires_at` from the sign-in response; if it is missing or unreadable a short
fallback is stored instead, because a session with no known end is one you cannot
tell has finished.

### `sessionValid(storage, key)`

Returns `true` if `storage` holds a token whose expiry is still in the future, and
`false` otherwise — including when there is no readable expiry at all. Treat it as
a shortcut that saves a doomed request, not as authority: the token is checked by
the API on every call, and the browser's clock is not ours.

### `readToken(key)`

Returns a valid token from `sessionStorage` or `localStorage` (sessionStorage
first), or `null` if neither holds a live session. Use this for the "am I signed
in?" check when you offer a "keep me signed in" option, since the token may live
in either storage.

A session that has lapsed is removed from storage as it is found, so a token does
not outlive its session waiting for something to provoke a `401`.

### `clearSession(key)`

Removes the token and its expiry from **both** `sessionStorage` and
`localStorage`. Use it on sign-out and on a `401`.

## Helpers

### `siteUrl(site)`

Returns the URL of a site's SolarAssistant dashboard:

```
https://<name>.<region>.solar-assistant.io
```

where `region` is the first segment of the `proxy` field (e.g. `eu` from
`eu-aws-1`). Returns `null` if the site has no `name` or `proxy`.

### `showErrors(root, errors)`

Injects field-level validation errors into a form inside a shadow root.
`errors` is the `{ field: [messages] }` object from a `422` API response.
For each field key it finds the matching `<input name="field">`, creates a
`.field-error` span, and inserts it after the input (or its containing `<label>`).
Returns a string of any leftover errors whose field name had no matching input,
suitable for a catch-all error paragraph.

```js
const SA = 'https://cdn.solar-assistant.io/js/solar-assistant.js'
const { showErrors } = await import(SA)

// inside an outlet's _submit:
const body = await res.json()
const leftover = showErrors(this.shadowRoot, body.errors)
if (leftover) errorEl.textContent = leftover
```

### `inviteRoles(site, currentUser)`

Returns the role options available when inviting a user:
`['viewer', 'admin']`, plus `'owner'` when the current user owns the site
(transferring ownership).

### `normalizeRole(role)`

Maps a role read from the API onto the values above. Older deployments return
`'member'` for a viewer where newer ones return `'viewer'`; this returns
`'viewer'` for both and passes anything else through. Compare against this
rather than against a raw `role` from a response.

Writes are unaffected either way — the API treats anything that isn't `'admin'`
or `'owner'` as a viewer — so an older portal sending `'member'` keeps working.
