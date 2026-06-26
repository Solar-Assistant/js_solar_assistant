# Default example site

A complete, self-contained portal built from the SolarAssistant web components —
sign in, list sites, view a site, invite users, and manage the account. Copy this
folder, replace the placeholders below, and serve it as a static site.

```
index.html      redirects to /sign_in
sign_in.html    <sa-sign-in>
sites.html      <sa-sites>
user.html       <sa-user>
assets/
  style.css     your brand colours (CSS variables on :root)
  logo.svg      your logo (placeholder included)
```

## Replace these placeholders

| Placeholder | Where | What to put |
|---|---|---|
| `YOUR_ORG_ID` | `sign_in.html` (`organization-id`) | Your SolarAssistant organization id |
| `Your organization` | `alt="…"` on each logo | Your organization name |
| `assets/logo.svg` | — | Your logo |
| `--sa-primary` / `--sa-accent` | `assets/style.css` | Your brand colour and a soft tint |

The components load from the CDN, so there is no build step:

```html
<script type="module" src="https://cdn.solar-assistant.io/solar-assistant.js"></script>
```

## Serving

Pages use clean URLs (`/sign_in`, `/sites`, `/user`), so point your web server at
this folder and rewrite extensionless paths to the matching `.html` file. The
`/sites/:id` and `/sites/register` deep links should rewrite to `/sites#…` so the
`<sa-sites>` hash router lands on the right view.

See the [components guide](../../docs/components.md) and
[authentication](../../docs/authentication.md) for details.
