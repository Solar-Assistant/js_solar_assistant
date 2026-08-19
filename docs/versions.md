# Versions and pinning

Three URLs serve the same two files. Which one you use decides who chooses the
moment your site's copy changes.

| URL | Changes when | Use it if |
|---|---|---|
| `…/js/solar-assistant.js` | every release | you want whatever is newest and do not mind it arriving unannounced |
| `…/js/v1/solar-assistant.js` | every release within version 1 | **most sites.** Fixes and new components arrive; a breaking change does not |
| `…/js/1.2.0/solar-assistant.js` | never | you want to decide when your site's code changes, or you need an integrity hash |

`solar-assistant-api.js` is published at all three in the same way.

Both files share one version number — they are built and released together, so
`1.2.0` of one always goes with `1.2.0` of the other. Versions are semantic: the
major changes only for something that can break a page that was working.

The plain `…/js/solar-assistant.js` URL is what the examples throughout these
docs use, because it is the shortest thing that works. For a site you are going
to leave running, `…/js/v1/…` is the better default and the change is one line.

## Pinning to an exact version

A pinned URL is never rewritten, so the code your page runs is the code you
tested — until you change the number yourself. That is also the cost: you will
not receive fixes, including security fixes, unless somebody watches for
releases and bumps it. It is the right trade when a page is reviewed before it
changes, and the wrong one when nobody is watching.

```html
<script type="module" src="https://cdn.solar-assistant.io/js/1.2.0/solar-assistant.js"></script>
```

## Adding an integrity hash

Because a pinned URL never changes, its content can be described by a hash, and
the browser can refuse to run anything else. This is [Subresource
Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity),
and it means a change to the file at our end — however it came about — stops
your page rather than running on it.

```html
<script type="module"
        src="https://cdn.solar-assistant.io/js/1.2.0/solar-assistant.js"
        integrity="sha384-REPLACE_WITH_THE_HASH_FOR_THIS_VERSION"></script>
```

Get the hash for a version by taking it from the file itself, once:

```bash
curl -s https://cdn.solar-assistant.io/js/1.2.0/solar-assistant.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

Two things to know:

- **Only on a pinned URL.** An `integrity` attribute on `…/js/v1/…` or the plain
  URL will work until the next release and then break the page, because those
  URLs are meant to change and the hash says they must not.
- **`solar-assistant-api.js` also needs `crossorigin="anonymous"`.** A module
  script is always fetched with CORS, so `solar-assistant.js` needs nothing
  extra, but the plain API script is not a module and a browser will refuse to
  check its integrity without that attribute. The CDN answers any origin, so
  adding it is all there is to it.

## What this does not cover

Integrity protects the delivery of our file to your page. It does nothing about
anything else running on the same page: an analytics tag, a chat widget, or an
XSS hole in your own code can read whatever your page can read, including a
signed-in customer's session. Pinning is worth doing and is not a
substitute for the rest of the page being trustworthy.
