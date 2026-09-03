// Shared styles + helpers for the <sa-sites> family (router + outlet components).
import { apiClient, readToken, clearSession } from '@solar-assistant/api'
import { cardStyles } from './styles.js'
import { escapeHtml } from './escape.js'

export const sitesStyles = `
  :host { display: block; font-family: inherit; }
  :host([hidden]) { display: none; }   /* :host display:block otherwise beats [hidden] */
  :host(.embedded) .hide-android { display: none; }
  ${cardStyles}

  h1.title { margin: 0 0 16px; font-size: 24px; font-weight: 700; }
  .row { display: flex; align-items: center; justify-content: space-between; margin: 0 0 16px; }

  /* List */
  .sites-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .sites-table thead td { font-weight: 600; padding: 0 12px 10px 0; color: #374151; border-bottom: 1px solid var(--sa-border, #d1d5db); }
  .sites-table tbody tr { border-bottom: 1px solid var(--sa-border, #d1d5db); }
  .sites-table tbody tr:last-child { border-bottom: none; }
  .sites-table td { padding: 10px 12px 10px 0; vertical-align: middle; }
  .site-caption { font-weight: 500; }
  .site-hardware { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .site-owner { color: #374151; }
  td.buttons { text-align: right; white-space: nowrap; }
  .btn {
    padding: 5px 12px;
    border: none;
    border-radius: var(--sa-radius, 6px);
    font-size: 13px;
    cursor: pointer;
    background: var(--sa-primary, #f97316);
    color: #fff;
    text-decoration: none;
  }
  .btn:hover { opacity: 0.85; }

  /* Detail */
  .heading {
    font-weight: 600;
    font-size: 15px;
    margin: 20px 0 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .breadcrumb { color: #6b7280; }
  .breadcrumb a { font-weight: 700; color: var(--sa-primary, #f97316); cursor: pointer; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .form-field {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 5px 0;
    font-size: 14px;
  }
  .form-field label { min-width: 130px; color: #6b7280; font-size: 13px; flex-shrink: 0; }
  .form-value { color: #111827; }
  /* The dotted underline browsers already give abbr[title], for the same reason:
     a native tooltip has no affordance of its own. The help cursor that usually
     comes with this is nobody's default — measured — so it is not here. */
  time[title] { text-decoration: underline dotted; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead td { font-weight: 600; padding-bottom: 8px; color: #374151; }
  tbody td { padding: 6px 0; color: #111827; border-top: 1px solid var(--sa-border, #d1d5db); vertical-align: middle; }
  .role-select {
    padding: 6px 10px;
    border: 1px solid var(--sa-border, #e3e5e6);
    border-radius: var(--sa-radius, 6px);
    font-size: 13px;
    color: #111827;
    background: #fff;
    cursor: pointer;
  }
  .role-select:disabled { color: #6b7280; background: #f9fafb; cursor: default; }
  .role-radios { display: flex; flex-direction: column; gap: 6px; }
  .role-radios label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; cursor: pointer; }
  .reg-input, .invite-input {
    width: 100%; padding: 6px 10px;
    border: 1px solid var(--sa-border, #d1d5db);
    border-radius: var(--sa-radius, 6px);
    font-size: 13px; box-sizing: border-box;
  }
  .field-error { color: #ef4444; font-size: 12px; }
  .connect {
    display: inline-block; padding: 8px 14px;
    background: var(--sa-primary, #f97316); color: #fff; border: none;
    border-radius: var(--sa-radius, 6px); font-size: 13px; cursor: pointer; text-decoration: none;
  }
  .empty { color: #6b7280; font-size: 14px; }
  .error { color: #ef4444; font-size: 14px; }
`

export function field(label, value) {
  if (!value && value !== 0) return ''
  // The label is ours (a translated string, which may carry deliberate markup);
  // the value came from the API and never is.
  return `<div class="form-field"><label>${label}</label><div class="form-value">${escapeHtml(value)}</div></div>`
}

// A moment, as words, with the exact timestamp on hover. <time> carries the
// machine-readable value; `title` is the whole tooltip — a native one needs no
// library, is reachable by keyboard and screen reader, and costs nothing in a
// bundle every partner's portal loads.
export function timeField(label, iso) {
  if (!iso) return ''
  return `<div class="form-field"><label>${label}</label><div class="form-value">` +
    `<time datetime="${escapeHtml(iso)}" title="${escapeHtml(formatDate(iso))}">${escapeHtml(timeAgo(iso))}</time>` +
    `</div></div>`
}

// Loading placeholders. A page that draws its own shape straight away and fills
// it in reads as loading; one that appears a piece at a time reads as broken.
export function bar(w) {
  return `<span style="display:inline-block;width:${w}px;height:0.8em;background:#e5e7eb;border-radius:3px;vertical-align:middle"></span>`
}

export function skeletonField(labelWidth, valueWidth) {
  return `<div class="form-field"><label>${bar(labelWidth)}</label>` +
    `<div class="form-value">${bar(valueWidth)}</div></div>`
}

// A field whose value is a link out. Kept beside field() so the same rule holds:
// the label is ours, the text and the href came from the API and never are.
export function linkField(label, text, href) {
  if (!text) return ''
  return `<div class="form-field"><label>${label}</label><div class="form-value">` +
    `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>` +
    `</div></div>`
}

// Display name for a site — mirrors SACloud.Site.caption/1.
export function caption(site) {
  return site.name && site.name.length ? site.name : `Unregistered #${site.id}`
}

export function registered(site) {
  return !!(site.name && site.name.length)
}

// numeric:'auto' is what gives "yesterday" rather than "1 day ago".
const UNITS = [
  ['year', 31536000], ['month', 2592000], ['day', 86400],
  ['hour', 3600], ['minute', 60], ['second', 1],
]

export function timeAgo(iso) {
  if (!iso) return '—'
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
}

export function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString()
}

// A build is named by its day, not the moment it was cut, so the time is noise.
// Read in UTC so the day cannot shift backwards for a visitor behind it.
export function formatDay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { timeZone: 'UTC' })
}

// Returns an authenticated API client for an outlet element. The <sa-sites>
// router hands each outlet its client via `el.api`; when an outlet is used
// standalone it falls back to the stored token. Redirects to sign-in if there's
// no session, and returns null in that case.
export function resolveApi(el) {
  if (el.api) return el.api
  const token = readToken('sa_token')
  if (!token) {
    redirectToSignIn(el)
    return null
  }
  return apiClient(token)
}

// Where to come back to after signing in. The whole URL, not just the path: a
// link from a device carries its route and parameters in the fragment, and
// signing in is a full navigation that would otherwise drop them.
export function returnToHere() {
  return `${location.pathname}${location.search}${location.hash}`
}

// The device learns its own host from this token, so a link that came from one
// gets followed back. Returns false when there is nothing to follow.
export function followDeviceCallback(el, token) {
  const callback = el.getAttribute('callback')
  if (!callback || !token) return false
  window.location.href = `${callback}?token=${encodeURIComponent(token)}`
  return true
}

// Clears the session and sends the user to the sign-in page (used on a 401).
export function redirectToSignIn(el) {
  clearSession('sa_token')
  const signIn = el.getAttribute('sign-in') || '/sign_in'
  window.location.href = `${signIn}?return_to=${encodeURIComponent(returnToHere())}`
}
