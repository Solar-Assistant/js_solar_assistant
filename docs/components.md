# Components guide

The `@solar-assistant/components` package ships three custom elements:
`<sa-sign-in>`, `<sa-sites>`, and `<sa-user>`, handling authentication,
site management, and user account display out of the box.

## Quick start

### 1. Include the script

Add the script to your page from the CDN. It registers the custom elements:

```html
<script type="module" src="https://cdn.solar-assistant.io/solar-assistant.js"></script>
```

In WordPress, add this to your theme header (via your theme's `functions.php` or
a header plugin). In Joomla, add it through a Custom HTML module assigned to the
header position. Nothing to build or host yourself.

### 2. Add the tags

Give each page one of the components. In WordPress, paste the tag into a Custom
HTML block on the relevant page. In Joomla, add it via a Custom HTML module or
directly in your article content.

```html
<!-- Sign-in page -->
<sa-sign-in organization-id="178" return-to="/sites"></sa-sign-in>

<!-- Sites page: list, detail, invite users, register devices -->
<sa-sites sign-in="/sign_in"></sa-sites>

<!-- Account page -->
<sa-user sign-in="/sign_in"></sa-user>
```

`<sa-sign-in>` authenticates and stores the session; `<sa-sites>` and `<sa-user>`
read that session and redirect to your sign-in page if the visitor is not signed
in yet.


## Theming

Branding is driven by CSS custom properties set on the host page. They pierce the
components' Shadow DOM, so you set them once (e.g. on `:root`) and every component
picks them up:

```css
:root {
  --sa-primary: #2f855a;             /* buttons, links, focus, accents */
  --sa-accent:  rgba(72,187,120,.1); /* soft tint */
  --sa-border:  #e3e5e6;             /* card / input borders */
  --sa-radius:  6px;                 /* corner rounding */
}
```

Only `--sa-primary` is really needed to match your brand; the rest have sensible
defaults.

## Authentication and API

All three components call the SolarAssistant API under the hood using the
`@solar-assistant/api` package. `<sa-sign-in>` signs the user in with
email/password and stores the API token in `localStorage`. The other components
read it and redirect to the sign-in page on a `401`. You can also transfer an
existing session from a native app or SSO flow by opening the sign-in page with
a short-lived token.

See [Authentication & auth transfer](authentication.md) for the full flow, the
mobile/WebView transfer, and token details.
