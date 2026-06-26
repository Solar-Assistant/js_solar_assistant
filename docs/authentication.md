# Authentication

The SolarAssistant API uses bearer tokens. A user signs in with email and password,
receives a token, and that token is included in every subsequent API request. The
token is stored in `localStorage` under `sa_token`, shared across tabs, and
persists until the user signs out.

```
POST https://solar-assistant.io/api/v1/sign_in   { email, password, organization_id }
  ->  { token, user }
```

`<sa-sign-in>` handles this flow for you. If you are using the API client directly,
call this endpoint yourself and store the token.

When a request returns `401`, the token has expired. Clear it and redirect the user
to your sign-in page. `<sa-sites>` and `<sa-user>` do this automatically via their
`sign-in` attribute.

```html
<sa-sites sign-in="/sign_in"></sa-sites>
```

## Auth transfer - from mobile or external app

If a user is already signed into your app and you provide a link to your website,
that link should open authenticated. Asking them to sign in again is a poor
experience. Auth transfer solves this: your app mints a short-lived, single-use
`session_token` and passes it to the sign-in page, which exchanges it for a real
session. The user lands on your website already signed in.

### Step 1 — mint a transfer token (from your mobile or external app)

```
POST https://solar-assistant.io/api/v1/session
  Authorization: Bearer <your-api-token>
  ->  { "session_token": "…" }
```

The API host is always `solar-assistant.io`, regardless of which branded site
you're handing off to. Note that `session_token` is short-lived and single-use —
it is only for bootstrapping a session and is consumed on exchange. Mint a fresh
one for each transfer.

### Step 2 — construct the sign-in URL with the token

```
https://your-site.example/sign_in?token=<session_token>&return_to=/user
```

Your sign-in page reads the token and exchanges it for a long-lived API token:

```
reads token (hash or query)
  ->  POST https://solar-assistant.io/api/v1/sign_in   { session_token }
  ->  { token }
  ->  localStorage.sa_token = token
  ->  redirect to return_to
```

`<sa-sign-in>` handles this exchange automatically. If you are using the API
client directly, perform these steps yourself. If the `session_token` is missing,
expired, or already used, fall back to showing the normal sign-in form.
