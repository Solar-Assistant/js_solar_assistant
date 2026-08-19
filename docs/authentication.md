# Authentication

The SolarAssistant API uses bearer tokens. A user signs in with email and password,
receives a token, and that token is included in every subsequent API request. The token is stored in the
browser under `sa_token` — in `localStorage` to keep the user signed in across
restarts, or `sessionStorage` to drop it when the tab closes (a "keep me signed
in" choice). The response also includes an `expires_at` you can store to know
when the token lapses.

```
POST https://solar-assistant.io/api/v1/sign_in   { email, password, organization_id }
  ->  { token, expires_at, user: { id, email, first_name, last_name, locale, phone_number } }
```

`<sa-sign-in>` handles this flow for you. If you are using the API client directly,
call this endpoint yourself and store the token. The `user.locale` field is used to
apply the right language automatically — see [Locale and translations](i18n.md).

## Unconfirmed accounts

Signing in with an account whose email address has not been confirmed returns
`412` rather than a session, along with a `pending_token`. The API re-sends the
confirmation email at the same time.

```
POST /sign_in   { email, password, organization_id }
  ->  412  { error, next_step: "click_email_link", pending_token }
```

That token is how the sign-in finishes without asking for the password again.
Once the user clicks the link in their email, exchange it for a session:

```
POST /sign_in   { email, pending_token, organization_id }
  ->  412  while the address is still unconfirmed (the same pending_token comes back)
  ->  200  { token, expires_at, user }  once confirmed; the pending token is then spent
  ->  401  once the pending token has expired, ten minutes after it was issued
```

`<sa-sign-in>` polls this for you and signs the user in as soon as they click,
so they can leave the tab open and come back to it. If you are using the API
client directly, poll it yourself and stop on the `401`.

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
  ->  { token, expires_at, user: { locale, … } }
  ->  persistSession(localStorage, 'sa_token', token, expires_at)
  ->  redirect to return_to
```

`<sa-sign-in>` handles this exchange automatically. If you are using the API
client directly, perform these steps yourself. If the `session_token` is missing,
expired, or already used, fall back to showing the normal sign-in form.

## Opening a site - `to_site`

A site is served from its own host, and a visitor who arrives there without a
valid session is sent to your sign-in page to get one:

```
https://your-site.example/sign_in?to_site=https%3A%2F%2Fplant.us.solar-assistant.io%2Fdashboard
```

Signing a user in is not enough on its own. The site is a separate host with its
own session, so it has to be handed a token minted for it specifically. Once a
session exists, `<sa-sign-in>` resolves the site and does that exchange:

```
GET  /sites?q=name:plant            ->  [{ "id": 4821, "name": "plant", … }]
POST /sites/4821/authorize          ->  { token, site_key, site_host, … }
  ->  redirect to
      https://<site_host>/callback?token=<token>&key=<site_key>&return_to=<path>
```

The site's name is the first label of its host. The listing is scoped to what
the signed-in user may see, so a host naming no site they have access to simply
resolves to nothing, and the visitor is told the site is unavailable.

If there is no session yet the sign-in form is shown first, and the exchange
runs once they are signed in - the visitor never has to come back to the link.

### `to_*` parameters in general

`to_site` is the first of a family. A `to_*` parameter names a **target** to act
on once a session exists; it is not a page to return to, which is what
`return_to` is for. The distinction is worth keeping:

| parameter | value | meaning |
|---|---|---|
| `return_to` | a path within your portal | where to send the browser afterwards |
| `to_*` | identifies a target | what to go and do, then send them there |

The rule that makes this safe is that **a `to_*` never supplies a destination**.
It names something to look up; where the browser is finally sent comes back from
the API - above, `site_host` as returned, never the host that arrived in the URL.
Keep that property if you implement the flow yourself.

Two more, for forward compatibility: at most one `to_*` may be present, and an
unrecognised one is ignored rather than treated as an error - a page whose
components bundle predates a parameter falls back to an ordinary sign-in.

### `return_to` must stay on your own site

`<sa-sign-in>` will only follow a `return_to` that resolves to a path on the page's
own origin. A cross-origin value - `https://elsewhere.example/`, a scheme-relative
`//elsewhere.example/`, a `javascript:` URL, or even your own host over plain
`http` - is discarded, and the visitor goes to the `return-to` attribute or
`/sites` instead. A same-origin absolute URL is accepted and reduced to its path.

This matters because `return_to` is read from the URL, so anyone can put anything
in it, and it is followed immediately after the visitor has typed their password.
On your own branded domain a link onward to somewhere else is far more convincing
to your customers than the same link would be from a domain they don't know.

Nothing legitimate is lost: the one destination that really is on another origin
is the site a visitor was redirected from, and that arrives as `to_site` and is
resolved through the API rather than followed as given. If you implement sign-in
yourself, apply the same rule - and note that the `return-to` **attribute** is not
checked, because that is your own markup rather than something a visitor can set.
