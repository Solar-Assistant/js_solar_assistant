# OAuth: Connect SolarAssistant

OAuth is for a **third party** integrating with sites that belong to somebody else. Your users
click "Connect SolarAssistant", authorise your application, and you receive a token for the site
they chose. You never see or store their password, and you never ask them to paste an API token.

If you are a partner building your own portal for your own customers, this is not the page you
want: your users sign in to SolarAssistant directly. See
[Authentication](authentication.md) instead.

## Registering an application

An application belongs to an organization. On your organization's page, open **Applications**, add
one, and record every redirect URI it may return to, including the one you develop against.

Two scopes exist, and the authorization server issues no others:

| Scope | The user is told |
|---|---|
| `openid` | View your basic profile information (such as name and email address). |
| `sites:read_single` | Read only access to the selected site and its associated monitoring data. |

With `sites:read_single`, the consent page asks the user to choose which one of their sites to
share. Your application does not choose, and cannot ask for a site by id.

## The flow

```js
import { oauthClient } from '@solar-assistant/oauth'

const client = oauthClient({
  clientId: 'your-application-id',
  redirectUri: 'https://your-app.example/oauth/callback',
})

// Somewhere on load, before you render anything that depends on being connected.
const tokens = await client.complete()

// On your Connect button.
location.assign(await client.authorizeUrl(['openid', 'sites:read_single']))
```

`complete()` returns `null` when the page was not reached through a redirect, so it is safe to
call on every load. When it does return, you have:

```json
{
  "access_token": "…",
  "expires_in": 86400,
  "scope": "openid sites:read_single",
  "scope_detail": { "sites:read_single": { "id": 19489 }, "openid": { "sub": 1 } },
  "id_token": "…"
}
```

`scope_detail` is where you learn **which** site was shared. Read the id from there rather than
remembering what you asked for.

Then spend the token:

```js
import { apiClient } from '@solar-assistant/api'

const api = apiClient(tokens.access_token)
const site = await api.get(`/sites/${tokens.scope_detail['sites:read_single'].id}`).then(r => r.json())
```

The OAuth package does not depend on the API package. If you have your own HTTP layer, send the
token as `Authorization: Bearer <access_token>` and ignore `@solar-assistant/api` entirely.

## Keeping the access: the part most integrations need

An access token lasts 24 hours and there is no refresh token. If your product is a dashboard
somebody comes back to next week, the token alone is not enough, and sending them through the
consent screen every day is not an integration.

The answer is to record the consent against your organization while you hold the token:

```js
const siteId = tokens.scope_detail['sites:read_single'].id
await api.post('/organization_sites', { site_id: siteId })
```

From then on the site is readable by your organization, and you read it with your **own**
non-expiring API token from your user page rather than with anything belonging to the user. This
is the shape most integrations want, and it is why the OAuth flow usually runs exactly once per
customer.

You send only `site_id`. The organization and the application come from the token itself, so a
token can only ever add a site to the organization that owns the application it belongs to.

**Understand what the user has agreed to before you call this.** The grant outlives the token
that created it. It makes the site readable by every member of your organization, present and
future, and today it can be removed only by SolarAssistant: there is no button for the site owner
and no API for you. Ask for it when the user has chosen an ongoing relationship with your product,
not on the way past.

Access reached this way is read only. It does not carry the admin rights the user may hold on
their own site.

## PKCE, and no client secret

The flow is the authorization code flow with PKCE, `S256` only. `authorizeUrl()` generates a
verifier and a `state`, keeps them in `sessionStorage`, and puts only the digest in the URL.
`complete()` checks the `state`, spends it, and sends the verifier with the exchange.

This means the package is safe in a browser: there is no client secret anywhere in it. A
confidential client that keeps a secret on a server is also supported by the authorization
server, but it is not what this package does, and a secret must never reach a page.

`crypto.subtle` exists only in a secure context, which means `https` or `localhost`. Serving your
development page over `http` on a LAN address will fail at the challenge rather than at the
network.

## Two constraints that look arbitrary

**The page must be served from the origin of a registered redirect URI.** The token endpoint sets
its `Access-Control-Allow-Origin` from the application's registered redirect URI, not from the
request's `Origin` header. Serve the page anywhere else and the exchange succeeds on the server
while the browser refuses to let you read the reply.

**The token request must stay form-encoded with no added headers.** That keeps it a simple
request, so no preflight is sent. `OPTIONS` on the token endpoint is not routed and answers 404,
so adding a JSON content type or an `Authorization` header to that one call breaks it with a CORS
error that says nothing about the cause. There is a test pinning this.

## Handling refusal

`complete()` throws rather than returning, for any of: the user declining, a `state` that does not
match, a code arriving with nothing in flight (someone bookmarked the callback), or the server
rejecting the exchange. Catch it and show `error.message`; the server's own wording is passed
through.

Tokens last 24 hours and there is no refresh token. When one lapses, either send the user through
the flow again or, for an ongoing integration, record the consent while you still hold the token:
see [Keeping the access](#keeping-the-access-the-part-most-integrations-need).

## A public client or a server-side one

Everything above is the **public client**: it runs in the page, holds no secret, and PKCE is what
proves the exchange belongs to whoever started it. That is what `@solar-assistant/oauth` does, and
it is the right choice for a single-page app, a static site, or anything where the code ships to
the browser.

A **server-side client** is the other shape, and it is probably yours if you have a backend. The
user is redirected the same way, but the code comes back to your server, which exchanges it using
the application's `client_secret` and keeps the token. The browser never sees a credential.

The package deliberately does not do this half: a client secret must never reach a page, and this
package is loaded into pages. The exchange is one form-encoded POST, so there is nothing to
import. `packages/oauth/example/server` is a complete, readable one to copy.

```
POST /oauth/token
  grant_type=authorization_code
  code=<the code>
  client_id=<your application id>
  client_secret=<your application secret>
  redirect_uri=<the same one you sent to /authorize>
```

Note that `client_secret` and `code_verifier` are alternatives rather than layers. The server
checks the secret if one is present and does not then check a verifier, so sending both gives you
no more than sending the secret alone.

## Running the examples

Both need a registered redirect URI, and both default to port 8000, so run one at a time.

```
node packages/oauth/example/browser/serve.js      # public client, PKCE, in the page
CLIENT_ID=… CLIENT_SECRET=… node packages/oauth/example/server/server.js
```

Register `http://localhost:8000/oauth/callback` on the application you test with.

The browser example opens at `http://localhost:8000/?client_id=<your application id>` and
remembers the id afterwards. It serves the repository so it imports the packages straight from
`src`, and answers every path with the page, so `/oauth/callback` comes back to it. The
server-side example takes its secret from the environment, never a file.
