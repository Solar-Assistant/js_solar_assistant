# API reference

The `@solar-assistant/api` client is a thin wrapper over the Solar Assistant
REST API. Use it to build your own UI instead of (or alongside) the
[components](../README.md).

```js
import { apiClient, siteUrl, inviteRoles } from '@solar-assistant/api'

const api = apiClient(sessionStorage.getItem('sa_token'))
const sites = await (await api.get('/sites')).json()
```

## Client

### `apiClient(token)`

Returns a client bound to a bearer token (stored in `sessionStorage` as
`sa_token` after sign-in). Every method returns a `fetch` `Response` — call
`.json()` to parse the body. A `401` means the token is expired; redirect to
sign-in.

| Method | Signature |
|---|---|
| `get` | `get(path, params?)` |
| `post` | `post(path, body)` |
| `patch` | `patch(path, body)` |
| `delete` | `delete(path)` |

### Base URL

Environment-aware:

- Development (`import.meta.env.DEV`): `http://localhost:3000/api/v1`
- Production: `https://solar-assistant.io/api/v1`

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

## Endpoints

### `GET /user`

Returns the current authenticated user.
Fields: `id`, `email`, `first_name`, `last_name`, `locale`, `phone_number`.

### `GET /sites`

Returns the sites the user has access to.
Supported filter keys: `name`, `inverter`, `battery`,
`inverter_params_output_power`, `last_seen_after`, `build_date_after`, `limit`,
`offset`, `search`.
Fields: `id`, `name`, `description`, `inverter`, `battery`, `board`, `local_ip`,
`build_date`, `last_seen_at`, `proxy`, `owner { id, email, first_name, last_name }`.

### `GET /sites/:id`

Returns a single site, including its `users` array (same shape as
`GET /sites/:id/users`), so a detail view needs only this one call.

### `GET /sites/:id/users`

Returns users with access to the site.
Fields: `id`, `email`, `first_name`, `last_name`, `role` (`owner` | `admin` |
`member`). Note: `member` is displayed as **Viewer** in the UI.

### `POST /sites/:id/users`

Invite a user to the site. Creates the account if the email isn't found.
Body: `{ email, first_name, last_name, role }` where `role` is `member` (Viewer)
or `admin` (Admin).

### `PATCH /sites/:id/users/:user_id`

Update a user's role. Body: `{ role }` (`member` | `admin`).

### `DELETE /sites/:id/users/:user_id`

Remove a user from the site.

### `POST /sites/:id/authorize`

Returns a short-lived token and connection details for a site's WebSocket.
Response: `{ host, site_id, site_name, site_key, token, local_ip }`.

### `POST /session` and `POST /sign_in`

Used for the token hand-off flow — see
[Authentication & token hand-off](authentication.md).

## Helpers

### `siteUrl(site)`

Returns the URL of a site's Solar Assistant dashboard:

```
https://<name>.<region>.solar-assistant.io
```

where `region` is the first segment of the `proxy` field (e.g. `eu` from
`eu-aws-1`). Returns `null` if the site has no `name` or `proxy`.

### `inviteRoles(site, currentUser)`

Returns the role options available when inviting a user:
`['member', 'admin']`, plus `'owner'` when the current user owns the site
(transferring ownership).
