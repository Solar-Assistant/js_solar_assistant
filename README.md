# SolarAssistant: Web Integration Kit

Most organizations pick one of the SolarAssistant ready-made portal templates and never write any
code, or open a GitHub account: choose a template on your organization's portal page and that is your
live portal, carrying your name, colours and logo, hosted by us.
[`Solar-Assistant/portal-minimal`](https://github.com/Solar-Assistant/portal-minimal) is the one you
get unless you pick another. We believe a custom web portal is an essential part of your solar
business: [read more on why we think so](docs/approach.md).

Some organizations use SolarAssistant as a data source instead, and give their customers a "Connect
SolarAssistant" button in a product of their own. The customer signs in to SolarAssistant, chooses
which of their sites to share, and your application receives a token for it. Nobody hands over a
password, and nobody pastes an API token into your app.
See [OAuth: Connect SolarAssistant](docs/oauth.md).

This repository is the three packages behind both: the web components, the API client, and the OAuth
client. The easiest way in is our CDN: one script tag on the page, nothing to install or build. Start
from a template and you are already using it; write your own pages and this is what you write them
with.

## Setup steps

All of these are on your organization's portal page, `https://solar-assistant.io/organizations/<id>/portal`.

1. **Preview it.** Click **Preview custom portal** and it is live immediately on `<your-org>.solar-power.live` — nothing to deploy and no DNS to set up. That first label comes from your organization's name; it is yours to change, and to clear again, right up until you publish.
2. **Publish it.** **Publish preview** makes it the portal your customers are sent to: from then on, the links we email them and the link from their SolarAssistant monitoring device both go there.
3. **Use your own domain** — optional. **Configure** next to Custom domain, enter it, and add the CNAME record it shows you. We check the record resolves before treating the domain as live.
4. **Bring your own code** — optional. Fork one of our templates, change what you like, and connect your repository on the same page. Your portal is then your own HTML, CSS and JavaScript, still hosted by us: choose a revision to stage, look at it on the staging address, and mark it live when you are happy.

<img src="docs/org-config.png" width="340" alt="Organization branding and configuration in SolarAssistant"> <img src="docs/site-view.png" width="340" alt="Site detail view in SolarAssistant">

## Choose your level of control

| | **Web Components** | **API Client** |
|---|---|---|
| **Package** | `@solar-assistant/components` | `@solar-assistant/api` |
| **Installation** | Place a `<script>` tag on any page. The elements self-register. Nothing to build or host. | Place a `<script>` tag on any page. `SolarAssistant.apiClient` is available globally. |
| **Example usage** | `<sa-sites sign-in="/sign_in"></sa-sites>` | `const api = SolarAssistant.apiClient(token)`<br>`const sites = await api.get('/sites').then(r => r.json())`<br>*… render sites from JSON data …* |
| **Customization** | CSS only: colors, borders, and corner radius via CSS variables. | Unlimited. You own the markup and styles. |
| **Guide** | [Components guide →](docs/components.md) | [API reference →](docs/api.md) |

Further reading: [Making monitoring feel part of your website](docs/platforms.md) · [Authentication & auth transfer](docs/authentication.md) · [OAuth: Connect SolarAssistant](docs/oauth.md) · [Versions and pinning](docs/versions.md) · [Customizing outlets](docs/customizing.md) · [Locale & translations](docs/i18n.md)

Both are framework-agnostic and ship from this repository. Pick per page, or mix them.

## Start from a working example

[**`Solar-Assistant/portal-minimal`**](https://github.com/Solar-Assistant/portal-minimal) is a
complete, ready-to-serve portal — sign in, list sites, view a site, invite users, and manage the
account — built entirely from the components. Fork it and your branding is substituted in as the
pages are served, so there are no placeholders to fill in. Its README covers the rest.

The script tag those pages carry:

```html
<script type="module" src="https://cdn.solar-assistant.io/js/solar-assistant.js"></script>
```

That URL always serves the newest release. For a site you are leaving running,
point at a major version — `…/js/v1/solar-assistant.js` — or pin an exact one.
See [Versions and pinning](docs/versions.md).

## Adding an OAuth "Connect SolarAssistant" to your app

`@solar-assistant/oauth` puts that button in your own product. Your users already run
SolarAssistant: they click it, choose which of their sites to share, and you receive a token for
that site. No passwords, and nobody pastes an API token into your app.

This is the third-party case rather than the portal one: the components and the API client above
are for a partner whose customers are their own and who sign in to SolarAssistant directly.

```js
const client = SolarAssistantOAuth.oauthClient({ clientId, redirectUri })
const tokens = await client.complete()                       // on load
location.assign(await client.authorizeUrl())                 // on your Connect button
```

The token then goes to the API client exactly as any other does. Applications are registered on
your organization's Applications page: [OAuth guide →](docs/oauth.md)

## Development

> Integrators don't need this section. Just include the script from the CDN
> above. This is for working on the components themselves.

An npm workspaces monorepo:

```
packages/
  api/         @solar-assistant/api         (no build step, plain ES module)
  components/  @solar-assistant/components   (imports @solar-assistant/api)
```

```bash
npm install
npm test
```

`npm test` runs the suite under [Vitest](https://vitest.dev) and happy-dom: the
pure functions, and the `<sa-sites>` router mounted with a stubbed `fetch`. Every
outlet takes its API client from `el.api`, so a replacement outlet is testable the
same way, with no network and no token. See
[Swapping an outlet](docs/customizing.md#swapping-an-outlet).

Two files are published to `cdn.solar-assistant.io/js/`:

- `solar-assistant.js` — ES module, components + API client, built from `packages/components/src/index.js`
- `solar-assistant-api.js` — IIFE, API client only, exposes `window.SolarAssistant`

Each release writes both files to three prefixes — `js/<version>/`, `js/v<major>/`
and `js/` — from a single build. [Versions and pinning](docs/versions.md) covers
what an integrator does with that.
