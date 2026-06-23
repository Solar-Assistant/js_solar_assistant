# Authentication & token hand-off

How `<sa-sign-in>` establishes a session, and how to sign a user in from an
external context (a native mobile app, or a single-sign-on hand-off) without
asking for a password again.

## Normal sign-in

`<sa-sign-in>` POSTs the email/password to the Solar Assistant API, receives a
bearer token, and stores it in `sessionStorage` under `sa_token`:

```
POST https://solar-assistant.io/api/v1/sign_in   { email, password }
  ->  { token, user }
```

`<sa-sites>` and `<sa-user>` read `sa_token` for their API calls. A `401`
response clears the token and redirects to the page named by the component's
`sign-in` attribute (default `/sign_in`), preserving where the user was via a
`?return_to=` query param.

> The token lives in `sessionStorage`, so it's scoped to the browser tab and
> cleared when the tab closes.

## Token hand-off (mobile app / SSO)

When you already hold a bearer token elsewhere — typically a native app that
authenticated through the API — you don't want to prompt for a password again in
a WebView. Instead, mint a short-lived, **single-use** `session_token` and open
the sign-in page with it. `<sa-sign-in>` exchanges that for a real API token and
redirects to `return_to`.

### Step 1 — mint a hand-off token (server side, with your bearer)

```
POST https://solar-assistant.io/api/v1/session
  Authorization: Bearer <your-api-token>
  ->  { "session_token": "…" }
```

The API host is always `solar-assistant.io`, regardless of which branded site
you're handing off to.

### Step 2 — open the sign-in page with the token

```
https://your-site.example/sign_in?token=<session_token>&return_to=/user
```

`<sa-sign-in>` does the rest:

```
reads token (hash or query)
  ->  POST https://solar-assistant.io/api/v1/sign_in   { session_token }
  ->  { token }                       (the real, longer-lived API token)
  ->  sessionStorage.sa_token = token
  ->  redirect to return_to
```

### Where to put the token

| Channel | Example | Notes |
|---|---|---|
| URL **hash** | `/sign_in#token=…&return_to=/user` | **Preferred** — the hash is never sent to the server, so the token stays out of access logs. |
| URL **query** | `/sign_in?token=…&return_to=/user` | Fallback — works, but the token reaches the server and may appear in logs. |

`return_to` is normalized to start with `/`.

### Token types

Two different tokens are involved — don't confuse them:

| Token | Field name | Lifetime | Purpose |
|---|---|---|---|
| API token (bearer) | `token` | long-lived | Authenticates every API request (`Authorization: Bearer …`). Stored as `sa_token`. |
| Hand-off token | `session_token` | short-lived, **single-use** | Only used to bootstrap a browser session. Consumed (deleted) on exchange. |

Because the `session_token` is single-use and short-lived, mint a fresh one for
each hand-off. If it's missing, expired, or already used, `<sa-sign-in>` falls
back to showing the normal sign-in form.

### Precedence

A hand-off token always wins over an existing session: opening
`/sign_in?token=…` while already signed in re-signs the user in with the new
token rather than passing them straight through. This lets the app switch
accounts cleanly.
