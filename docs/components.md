# Components guide

The `@solar-assistant/components` package ships four custom elements:
`<sa-sign-in>`, `<sa-register>`, `<sa-sites>`, and `<sa-user>`, handling
authentication, account creation, site management, and user account display
out of the box.

## Quick start

### 1. Include the script

Add the script to your page from the CDN. It registers the custom elements:

```html
<script type="module" src="https://cdn.solar-assistant.io/js/solar-assistant.js"></script>
```

Nothing to build or host yourself. That URL serves the newest release. To decide
for yourself when your page's copy of it changes, use a version-specific URL
instead — see [Versions and pinning](versions.md).

### 2. Add the tags

Give each page one of the components.

```html
<!-- Sign-in page -->
<sa-sign-in organization-id="123" return-to="/sites"></sa-sign-in>

<!-- Registration page -->
<sa-register organization-id="123" sign-in="/sign_in"></sa-register>

<!-- Sites page: list, detail, invite users, register devices -->
<sa-sites sign-in="/sign_in"></sa-sites>

<!-- Account page -->
<sa-user sign-in="/sign_in"></sa-user>
```

`<sa-sign-in>` authenticates and stores the session; `<sa-sites>` and `<sa-user>`
read that session and redirect to your sign-in page if the visitor is not signed
in yet.


## `<sa-register>`

Renders a complete account-creation form: email, first name, last name, password
(with requirements), terms acceptance, and bot verification. On success it shows a
confirmation message; the user receives an email with a link back to your sign-in
page to complete confirmation.

```html
<sa-register organization-id="123" sign-in="/sign_in"></sa-register>
```

| Attribute | Required | Description |
|---|---|---|
| `organization-id` | Yes | Your SolarAssistant organization ID. |
| `sign-in` | No | Path to your sign-in page. Linked from the post-registration confirmation message. Defaults to `/sign_in`. |

**Terms page.** The form links to `/terms` on your domain. You must serve a terms
and conditions page at that path — the component links to it in a new tab.

**Bot verification.** The form embeds a bot-verification challenge (Cloudflare
Turnstile) configured by SolarAssistant. If no challenge is configured on your
organization, the iframe stays blank and registration proceeds without a token.

**Confirmation email.** After registration the API sends a confirmation email with
a link to `/sign_in#confirm/<token>`. Your sign-in page (with `<sa-sign-in>`)
handles this automatically — the token is in the fragment, so no separate
confirmation page is needed.


## `<sa-sign-in>`

Handles the entire authentication surface on a single page using a hash router.
Place it on your `/sign_in` page; it shows the right view based on the URL hash:

| Hash | View |
|---|---|
| *(empty)* | Email/password sign-in form |
| `#password/request_reset` | Forgot-password form |
| `#password/reset/<token>` | Reset password (link from email) |
| `#password/set/<token>` | Set password (link from invitation email) |
| `#confirm/<token>` | Email confirmation (link from registration email) |

```html
<sa-sign-in organization-id="123" return-to="/sites"></sa-sign-in>
```

| Attribute | Required | Description |
|---|---|---|
| `organization-id` | Yes | Your SolarAssistant organization ID. |
| `return-to` | No | Where to redirect after a successful sign-in. Defaults to `/sites`. |

**Bot verification.** The forgot-password form embeds the same bot-verification
iframe as `<sa-register>`. If no challenge is configured on your organization the
iframe stays blank and the request proceeds without a token.

Auth transfer (signing in from a mobile app or external session) is also handled
here — see [Authentication](authentication.md).


## `<sa-sites>`

Shows the user's solar sites. Internally it is a hash router that handles the site
list, site detail, user-invite, and device-registration views on a single page.

```html
<sa-sites sign-in="/sign_in"></sa-sites>
```

| Attribute | Required | Description |
|---|---|---|
| `sign-in` | No | Sign-in page path, used for 401 redirects. Defaults to `/sign_in`. |

Each view inside `<sa-sites>` is swappable with your own component. See
[Customizing components](customizing.md).


## `<sa-user>`

Shows the signed-in user's account details (name, email, phone), a language
picker, and a sign-out button.

The picker lists every registered locale, each named in its own language, and
saves the choice to the user's SolarAssistant account so it follows them to their
next browser and to the rest of SolarAssistant. Changing it reloads the page — see
[Locale and translations](i18n.md#the-built-in-picker).

```html
<sa-user sign-in="/sign_in"></sa-user>
```

| Attribute | Required | Description |
|---|---|---|
| `sign-in` | No | Sign-in page path, used for 401 redirects and the sign-out destination. Defaults to `/sign_in`. |


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

All components call the SolarAssistant API under the hood using the
`@solar-assistant/api` package. `<sa-sign-in>` signs the user in with
email/password and stores the API token in `localStorage`. The other components
read it and redirect to the sign-in page on a `401`. You can also transfer an
existing session from a native app or SSO flow by opening the sign-in page with
a short-lived token.

See [Authentication & auth transfer](authentication.md) for the full flow, the
mobile/WebView transfer, and token details.


## Locale and translations

The components detect the user's locale automatically and display labels in the
right language. After sign-in the user's saved locale is applied and persisted for
subsequent visits.

See [Locale and translations](i18n.md) for how locale is determined, how to force
a locale, and how to add translations for a language that isn't supported yet.


## Customising outlets

Every view inside `<sa-sites>` is swappable — replace just the site-detail,
the list, or any other view with your own component. See
[Customizing components](customizing.md) for the outlet contract and a worked
example.
