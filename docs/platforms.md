# Integrating with your platform

The components are two lines on a page: one script tag, then the tags you want. This document is
about getting those two lines into the site you already have — WordPress, Joomla, a Lovable app, a
hosted site builder — and about the handful of platforms where it is not that simple.

## What makes this easy everywhere

Three things, all of which mean there is nothing to configure:

- **No registration, no allowlist, no keys.** The API and the CDN both answer any origin. You do not
  tell us your domain and we do not need to know it.
- **No backend of yours.** The components call the API straight from the browser. A static site is
  enough; a site builder with no server-side code at all is enough.
- **Nothing to point anywhere.** The API address is baked into the bundle. There is no base URL to
  set, no environment to configure.

So on most platforms the whole integration is:

```html
<script type="module" src="https://cdn.solar-assistant.io/js/solar-assistant.js"></script>

<sa-sign-in organization-id="YOUR_ORG_ID" return-to="/sites"></sa-sign-in>
```

## Three things that break it

Worth knowing before you pick a platform, because each fails in a way that does not look like its
cause.

**1. The script tag must keep `type="module"`.** `solar-assistant.js` is an ES module. Some CMS
plugins and "insert code" boxes rewrite script tags and drop attributes they do not recognise. If
`type="module"` is lost the browser refuses the file and no element ever registers — the page looks
fine and simply has a blank space where sign-in should be. Check the rendered HTML, not the box you
typed into.

> There is a second file, `solar-assistant-api.js`, which is a plain script needing no `type` — but
> it is the **API client only and contains no components**. It is not a fallback for a stripped
> `type="module"`; it is for building your own interface. See the [API reference](api.md).

**2. Sandboxed embeds break sign-in.** Several hosted builders run custom HTML inside an `iframe` on
their own domain rather than yours. The session is stored per-origin, so a customer who signs in
inside that frame is not signed in anywhere else on your site, and a second embed on another page
will ask them to sign in again. If a platform's "embed HTML" produces an iframe, the components will
*render*, and the login will not *stick*.

**3. A stripped attribute does not look wrong.** `organization-id` is the one that matters. Some
editors sanitize unknown attributes off unknown elements. If it is removed, sign-in points at
nothing while the page still renders perfectly. If sign-in fails in a way you cannot explain, view
source and confirm the attribute survived with the right value.

## Platform notes

**Only the first row has been verified end to end.** The rest describe the expected route and the
specific thing to check; they have not been tested against a live install, and are marked so.

| Platform | Route | Tested |
|---|---|---|
| Static HTML, Astro, Vite, Next, any host | Script tag in the page or layout, tags where you want them. No build step. | Yes |
| WordPress | Script via your theme's footer, a header/footer plugin, or `wp_enqueue_script`. Tags in a **Custom HTML** block. | No |
| Joomla | Script via a template override. Tags in a **Custom HTML** module. | No |
| Lovable, v0, Bolt | Script into `index.html`. Tags used directly in your components. | No |
| Shopify | Script in `theme.liquid`. Tags in a section or page template. | No |
| Wix, Squarespace | Their HTML embed. **Check whether it is an iframe first** — see above. | No |

### WordPress

The tags go in a **Custom HTML** block — not the paragraph editor, which will escape them.

The script is the part that needs care. `wp_enqueue_script` does not add `type="module"` on its own;
you either add it with the `script_loader_tag` filter, use a header/footer plugin that inserts your
markup verbatim, or put the tag directly in the theme.

The likely source of trouble is optimisation plugins. Anything that combines, defers or minifies
scripts may rewrite the tag or move the module, and caching plugins will happily serve a page from
before your change. If it works logged in and not logged out, that is the cache.

### Joomla

Same shape: a **Custom HTML** module for the tags, and a template override to place the script.
Joomla's editor filtering is configurable and is stricter by default than WordPress's — if the tags
or the `organization-id` attribute disappear on save, that is the text filter, adjustable per user
group in Global Configuration.

### Lovable, v0, Bolt and other AI app builders

These generate React. Add the script to `index.html` and use the tags directly in your JSX.

One version difference matters. **React 19 supports custom elements properly.** React 18 and earlier
pass everything as string attributes and do not wire event listeners for custom events. That happens
to be fine here — these components take string attributes (`organization-id`, `return-to`,
`sign-in`) and drive their own flows — so they work on either. But if you want your own code to
respond to something a component does, on React 18 you need a `ref` and `addEventListener` rather
than an `onSomething` prop.

Because the API needs no keys and no backend, one prompt describing the portal plus the script tag
is usually enough to get a working result.

### Wix and Squarespace

Check the iframe question before committing to either. If their embed sandboxes your HTML on their
domain, sign-in will not persist across your site, and no amount of markup fixes that — it is a
property of where the code runs. Where a platform lets you add a script to the site `<head>` and
place elements in the page itself, it behaves like any other host.

## When the components are not the answer

If your platform mangles module scripts, sandboxes embeds, or you simply want your own markup, use
the [API client](api.md) instead. `solar-assistant-api.js` is a plain script with no module
requirement, exposes `SolarAssistant.apiClient` globally, and leaves the interface entirely to you.
You write more, and nothing about your platform can get in the way.
