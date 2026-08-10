# SolarAssistant: Web Integration Kit

Build a customer portal on SolarAssistant — sign in, their sites, their account — under your own
brand.

**You may not need this repository at all.** In SolarAssistant, open your organization's **Cloud
portal** page, connect GitHub and pick a ready-made template. That repository *is* your live portal,
carrying your name, colours and logo, with nothing to write and nothing to host.
[`Solar-Assistant/portal-minimal`](https://github.com/Solar-Assistant/portal-minimal) is the one to
start from.

This repository is what those templates are built out of, for when you want to go further:

| | |
|---|---|
| **Change the portal** | Fork a template and edit it. Connect the fork and it stays your live portal — still hosted by us. |
| **Add it to a site you already have** | Drop the components into WordPress, Joomla, Webflow or anything else you run. See [Integrating with your platform](docs/platforms.md). |
| **Build something new** | A **Lovable** app, any framework, or the API client with your own markup. |

All three use the same web components and the same API, so moving between them is not a rewrite.

We believe a custom web portal is an essential part of your solar business.
[Read more on why we think so](docs/approach.md).

## Prerequisites

Configure the **Cloud host** on your SolarAssistant organization to your domain. Every site linked to your organization will provide the end user with links to your domain instead of solar-assistant.io. These are registering a site (`/sites/register`) and viewing a site (`/sites/:id`).

<img src="docs/org-config.png" width="340" alt="Organization branding and configuration in SolarAssistant"> <img src="docs/site-view.png" width="340" alt="Site detail view in SolarAssistant">

## Choose your level of control

| | **Web Components** | **API Client** |
|---|---|---|
| **Package** | `@solar-assistant/components` | `@solar-assistant/api` |
| **Installation** | Place a `<script>` tag on any page. The elements self-register. No code to write. | Place a `<script>` tag on any page. `SolarAssistant.apiClient` is available globally. |
| **Example usage** | `<sa-sites sign-in="/sign_in"></sa-sites>` | `const api = SolarAssistant.apiClient(token)`<br>`const sites = await api.get('/sites').then(r => r.json())`<br>*… render sites from JSON data …* |
| **Customization** | CSS only: colors, borders, and corner radius via CSS variables. | Unlimited. You own the markup and styles. |
| **Guide** | [Components guide →](docs/components.md) | [API reference →](docs/api.md) |

Further reading: [Integrating with your platform](docs/platforms.md) · [Authentication & auth transfer](docs/authentication.md) · [Customizing outlets](docs/customizing.md) · [Locale & translations](docs/i18n.md)

Both are framework-agnostic and ship from this repository. Pick per page, or mix them.

## Start from a working example

[**`Solar-Assistant/portal-minimal`**](https://github.com/Solar-Assistant/portal-minimal) is a
complete, ready-to-serve portal — sign in, list sites, view a site, invite users, and manage the
account — built entirely from the components.

It is not a sample: it is the template Solar Assistant actually serves to organizations that have
not customised anything. Fork it and connect the fork on your organization's **Cloud portal** page,
and your portal is that repository — your own branding is substituted in as the pages are served, so
there are no placeholders to replace. Its README covers the rest.

The components load straight from the CDN, so there's no build step:

```html
<script type="module" src="https://cdn.solar-assistant.io/js/solar-assistant.js"></script>
```

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
```

Two files are published to `cdn.solar-assistant.io/js/`:

- `solar-assistant.js` — ES module, components + API client, built from `packages/components/src/index.js`
- `solar-assistant-api.js` — IIFE, API client only, exposes `window.SolarAssistant`
