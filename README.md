# Solar Assistant — Web Integration Kit

Solar Assistant gives every organization a ready-made **cloud web portal** out of
the box. This repository is for the other case: when you want to integrate Solar
Assistant — sign-in, your sites, user management — directly into a website you
already run (a custom site, **WordPress**, **Joomla**, Webflow, plain HTML, …)
instead of sending people to the default portal.

There are **two ways** to integrate Solar Assistant login and sites into your
website:

1. **Use our out-of-the-box components.** Drop a `<script>` tag and a couple of
   custom-element tags on a page — visitors sign in and manage their sites
   without leaving your site. Style them to match your brand with a few CSS
   variables. Fastest path; no code to write.
2. **Use our API to render your own HTML.** Talk to the Solar Assistant API with
   the included client and build the UI yourself, exactly the way you want it.
   Most control; you own the markup.

Both are framework-agnostic and ship from this repository — pick per page, or mix
them.

## What's in the box

| Package | What it is |
|---|---|
| `@solar-assistant/components` | Web Components: `<sa-sign-in>`, `<sa-sites>`, `<sa-user>` |
| `@solar-assistant/api` | `apiClient(token)` and helpers for talking to the Solar Assistant API directly |

The components are built on the standard Custom Elements API and Shadow DOM, so
they work in any page regardless of framework and won't collide with your
existing CSS.

## Quick start

### 1. Include the script

Add the script to your page from the CDN — it registers the custom elements:

```html
<script type="module" src="https://cdn.solar-assistant.io/solar-assistant.js"></script>
```

In WordPress/Joomla, add this to your theme header or via a "custom HTML / code
snippet" block. Nothing to build or host yourself.

### 2. Add the tags

Give each page one of the components:

```html
<!-- Sign-in page -->
<sa-sign-in return-to="/sites"></sa-sign-in>

<!-- Sites page: list, detail, invite users, register devices -->
<sa-sites sign-in="/sign_in"></sa-sites>

<!-- Account page -->
<sa-user sign-in="/sign_in"></sa-user>
```

That's it. `<sa-sign-in>` authenticates and stores the session; `<sa-sites>` and
`<sa-user>` read that session and redirect to your sign-in page if the visitor
isn't signed in yet.

## Components

All three are self-contained custom elements. They keep the signed-in API token
in `localStorage` under `sa_token` (shared across tabs, persists until sign-out).

### `<sa-sign-in>`

Renders the email/password sign-in form and handles the response.

| Attribute | Default | Purpose |
|---|---|---|
| `return-to` | `/sites` | Where to send the user after a successful sign-in. A `?return_to=` query param on the page URL overrides it. |

It also accepts an **auth transfer** from a mobile app / external flow — see
[Authentication](#authentication).

### `<sa-sites>`

Lists the sites the signed-in user can access, with a detail view (hardware,
owner, device info), user-access management, and device registration.

| Attribute | Default | Purpose |
|---|---|---|
| `sign-in` | `/sign_in` | Page to redirect to when the user isn't authenticated (or the token expired). |

`<sa-sites>` routes off the URL **hash**, so a single page serves every view:

| Hash | View |
|---|---|
| `#` | Sites list |
| `#123` | Site `123` detail |
| `#123/invite` | Invite a user to site `123` |
| `#register?uid=abc` | Register an unregistered device |

If you want clean deep links like `/sites/123`, redirect them to
`/sites#123` at your web server (e.g. nginx `rewrite`) — the component reads the
hash.

### `<sa-user>`

Shows the current user's account details (name, email, phone) with a sign-out
button.

| Attribute | Default | Purpose |
|---|---|---|
| `sign-in` | `/sign_in` | Where to redirect when not authenticated. |

## Theming

Branding is driven by CSS custom properties set on the host page. They pierce the
components' Shadow DOM, so you set them once (e.g. on `:root`) and every component
picks them up:

```css
:root {
  --sa-primary: #2f855a;            /* buttons, links, focus, accents */
  --sa-accent:  rgba(72,187,120,.1); /* soft tint */
  --sa-border:  #e3e5e6;            /* card / input borders */
  --sa-radius:  6px;               /* corner rounding */
}
```

Only `--sa-primary` is really needed to match your brand; the rest have sensible
defaults.

## Authentication

`<sa-sign-in>` signs the user in with email/password and stores the API token in
`localStorage`; the other components read it and redirect to the sign-in page
on a `401`. You can also transfer an existing session from a native app or SSO
flow by opening the sign-in page with a short-lived token.

See **[Authentication & auth transfer](docs/authentication.md)** for the full
flow, the mobile/WebView transfer, and token details.

## Using the API client directly

For custom UIs, talk to the API without the components:

```js
import { apiClient, siteUrl } from '@solar-assistant/api'

const api = apiClient(localStorage.getItem('sa_token'))

const sites = await (await api.get('/sites')).json()
const filtered = await (await api.get('/sites', { inverter: 'srne', limit: 50 })).json()

// Link to a site's Solar Assistant dashboard
const url = siteUrl(sites[0])   // https://<name>.<region>.solar-assistant.io
```

`apiClient(token)` returns `get/post/patch/delete` methods, each resolving to a
`fetch` `Response` (call `.json()` yourself). Query params follow the same
encoding as the Go and Python clients: `limit`/`offset` are top-level, `search`
is a bare term, and any other key becomes a `key:value` filter in `?q=`.

See the **[API reference](docs/api.md)** for the full client, query-encoding, and
endpoint documentation.

## Development

> Integrators don't need this section — just include the script from the CDN
> above. This is for working on the components themselves.

An npm workspaces monorepo:

```
packages/
  api/         @solar-assistant/api         (no build step — plain ES module)
  components/  @solar-assistant/components   (imports @solar-assistant/api)
```

```bash
npm install
```

The published `solar-assistant.js` is a single ES module bundled from
`packages/components/src/index.js` with Vite (library mode) and deployed to
`cdn.solar-assistant.io`.
