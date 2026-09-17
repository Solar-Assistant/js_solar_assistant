# Customizing components

The built-in components work out of the box, but every view inside `<sa-sites>`
is swappable. If the default site-detail page doesn't fit your portal, you can
replace just that view with your own component — the rest of the navigation,
authentication, and API wiring stays in place.

## Component structure

```
<sa-sites>                      ← hash router + auth guard
  <sa-sites-index>              ← site list          route: # (empty)
  <sa-sites-show>               ← site detail        route: #<id>
  <sa-sites-invite>             ← invite a user      route: #<id>/invite
  <sa-sites-reset-password>     ← site access token  route: #<id>/reset_password
  <sa-sites-local>              ← units on this LAN  route: #local?uid=…
  <sa-sites-activate>           ← ask for activation route: #activate?uid=…
  <sa-sites-register>           ← register a device  route: #register?uid=…
  <sa-sites-offline>            ← unreachable device route: #offline?host=…

<sa-sign-in>                    ← hash router for the whole auth surface
  <sa-sign-in-form>             ← email/password form         route: # (empty)
  <sa-sign-in-reset>            ← forgot password form        route: #password/request_reset
  <sa-sign-in-set-password>     ← set/reset password          route: #password/(set|reset)/<token>
  <sa-sign-in-confirm>          ← email confirmation          route: #confirm/<token>

<sa-register>                   ← create account (with bot verification)
<sa-user>                       ← account detail (read-only)
```

Both `<sa-sites>` and `<sa-sign-in>` are hash routers — their sub-views are
independent custom elements that can be swapped by attribute. `<sa-register>`
and `<sa-user>` are self-contained and are customised by replacing the whole
element with your own implementation.

### What each `<sa-sites>` outlet does and what it needs

| Outlet | API calls | Observed attribute | Navigates to |
|---|---|---|---|
| `sa-sites-index` | `GET /sites` | — | `#<id>` on row click |
| `sa-sites-show` | `GET /sites/:id`, `PATCH /sites/:id/name`, `PATCH /sites/:id/users/:uid`, `DELETE /sites/:id/users/:uid` | `site-id` | `#` (back), `#<id>/invite`, the device's own activate page after a rename |
| `sa-sites-invite` | `GET /sites/:id`, `POST /sites/:id/users` | `site-id` | `#<id>` on success/back |
| `sa-sites-register` | `POST /sites/register` | `uid` | `#<id>` on success |
| `sa-sites-reset-password` | `POST /sites/:id/authorize` | `site-id` | `#` (back) |
| `sa-sites-local` | `GET /sites/local` | — | — |
| `sa-sites-activate` | `POST /sites/request_activation` | `uid` | `#<id>` after sending |
| `sa-sites-offline` | `GET /sites?name=`, `PUT /sites/:id/offline` | `host` | the site's own address when it answers |

## Required paths

**Four pages, plus your own terms.** That is the whole contract. Solar Assistant
sends emails and deep links into these pages, so they have to exist on your
domain and carry the element shown.

| Path | Put this on it | Serves |
|---|---|---|
| `/sign_in` | `<sa-sign-in organization-id="…" return-to="/sites">` | signing in, forgot password, setting a password from an emailed link, confirming an email address |
| `/register` | `<sa-register organization-id="…" sign-in="/sign_in">` | creating an account |
| `/sites` | `<sa-sites sign-in="/sign_in">` | the site list, a site's detail, and inviting someone to a site |
| `/user` | `<sa-user sign-in="/sign_in">` | account details and signing out |
| `/terms` | your own terms — no element | linked from the register form |

**There is nothing else to create.** Everything beyond those pages is a fragment
handled by the element already on the page, which is why the list is this short
— four files, not a page per feature:

```
/sign_in#password/request_reset      /sites#<id>
/sign_in#password/reset/<token>      /sites#<id>/invite
/sign_in#password/set/<token>        /sites#register?uid=<uid>
/sign_in#confirm/<token>             /sites#<id>/reset_password
                                     /sites#local
                                     /sites#activate?uid=<uid>
```

Those are the URLs our emails and deep links actually use. **If you have seen
`/sign_in/password/reset` or `/sites/<id>` written as paths, they are not** —
earlier versions of this table listed them that way and they never worked,
because both elements route on the fragment and neither has ever read the path.

## Swapping an outlet

Both `<sa-sites>` and `<sa-sign-in>` delegate each view to an outlet component.
Pass your component's tag name as an attribute to swap it:

```html
<sa-sites show="acme-site-detail" sign-in="/sign_in"></sa-sites>
<sa-sign-in form="acme-login" organization-id="123"></sa-sign-in>
```

**`<sa-sites>` outlets:**

| Attribute | Default | Route | Description |
|---|---|---|---|
| `index` | `sa-sites-index` | `#` (empty) | Site list |
| `show` | `sa-sites-show` | `#<id>` | Site detail |
| `invite` | `sa-sites-invite` | `#<id>/invite` | Invite users |
| `register` | `sa-sites-register` | `#register?uid=…` | Register a device |
| `offline` | `sa-sites-offline` | `#offline?host=…` | A device that cannot be reached |
| `reset-password` | `sa-sites-reset-password` | `#<id>/reset_password` | A site access token |
| `local` | `sa-sites-local` | `#local?uid=…` | Units on this network |
| `activate` | `sa-sites-activate` | `#activate?uid=…` | Ask the installer to activate |

**`<sa-sign-in>` outlets:**

| Attribute | Default | Route | Description |
|---|---|---|---|
| `form` | `sa-sign-in-form` | `#` (empty) | Email/password sign-in |
| `reset` | `sa-sign-in-reset` | `#password/request_reset` | Forgot password |
| `set-password` | `sa-sign-in-set-password` | `#password/(reset\|set)/<token>` | Set/reset password |
| `confirm` | `sa-sign-in-confirm` | `#confirm/<token>` | Email confirmation |

Omit any attribute you don't need to customise — its default stays in place.

> **Custom `reset` outlet.** If you replace the forgot-password form, your element
> must embed the bot-verification iframe from `https://solar-assistant.io/register/verify`
> and include the `verification_token` it posts back in your `POST /password/reset`
> body. Pass an empty string if no challenge is configured. See `sa-sign-in-reset.js`
> for the reference implementation.

## What the router provides

The client, the user and the sign-in path arrive before your element is appended.
**The route param arrives after it** — so your element connects, and runs, before
it knows which site or device it is for.

| What | How it arrives | When |
|---|---|---|
| Authenticated API client | `el.api` (JS property) | before connecting |
| Signed-in user | `el.currentUser` (JS property) | before connecting, and again once it loads |
| Sign-in redirect URL | `sign-in` attribute | before connecting |
| Route param — `site-id`, `uid`, `callback`, `host` | attribute, updated on every navigation | **after connecting** |

## Outlet contract

Your element must:

1. Read `this.api` to call the Solar Assistant API — it is an authenticated `apiClient` instance.
2. Declare `static get observedAttributes() { return ['site-id'] }` and load from `attributeChangedCallback` — the router updates the attribute when the user navigates to a different site without unmounting. Two things follow from the param arriving after your element connects: don't skip the first change (`oldValue !== null` skips the only change the router makes, and the outlet never loads at all), and don't load in `connectedCallback` without checking the param is there yet (it isn't, so the request fails and paints an error over the real load a moment later).
3. Navigate by setting `location.hash`:
   - `location.hash = ''` → back to the site list
   - `location.hash = id` → open a site detail
   - `location.hash = id + '/invite'` → open the invite view
4. On a `401` from the API, redirect to the sign-in page: `window.location.href = this.getAttribute('sign-in')`.

## Minimal example — custom site detail

```js
class AcmeSiteDetail extends HTMLElement {
  static get observedAttributes() { return ['site-id'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `<div id="root"></div>`
    const id = this.getAttribute('site-id')
    if (this.api && id) this._load(id)
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'site-id' && newV !== oldV && this.shadowRoot) this._load(newV)
  }

  async _load(id) {
    const res = await this.api.get(`/sites/${id}`)
    if (res.status === 401) { window.location.href = this.getAttribute('sign-in'); return }
    const site = await res.json()

    this.shadowRoot.getElementById('root').innerHTML = `
      <button id="back">← Back to sites</button>
      <h1>${site.name || site.description || 'Site ' + id}</h1>
      <!-- your custom layout here -->
    `
    this.shadowRoot.getElementById('back').onclick = () => { location.hash = '' }
  }
}

customElements.define('acme-site-detail', AcmeSiteDetail)
```

Load your component alongside the SA bundle — order does not matter:

```html
<script type="module" src="https://cdn.solar-assistant.io/js/solar-assistant.js"></script>
<script type="module" src="/your-components.js"></script>
```

Then tell `<sa-sites>` to use it:

```html
<sa-sites show="acme-site-detail" sign-in="/sign_in"></sa-sites>
```

## Styling

Your component runs in its own shadow DOM, so host-page styles don't leak in.
You have two options:

**Use the SA CSS variables** — they are inherited into shadow DOM via custom properties:

```css
:host { font-family: inherit; }
button { background: var(--sa-primary, #f97316); border-radius: var(--sa-radius, 6px); }
```

**Reuse SA card styles** — `sitesStyles` and `cardStyles` are exported from the
bundle, so you can import them from the same CDN URL:

```js
const SA = 'https://cdn.solar-assistant.io/js/solar-assistant.js'
const { sitesStyles, cardStyles, showErrors, t } = await import(SA)

// inside your shadow DOM template:
`<style>${sitesStyles}</style>`
```

This gives you the same card, table, button, and form-field styles the default
outlets use. `showErrors` injects field-level API errors into your form (see the
[API reference](api.md)); `t` translates strings using the active locale (see
[Locale & translations](i18n.md)).
