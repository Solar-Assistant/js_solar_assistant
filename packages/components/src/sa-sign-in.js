import { BASE, apiClient, clearSession, persistSession, readToken } from '@solar-assistant/api'
import { t, setLocale } from './i18n.js'
import './sa-sign-in-form.js'
import './sa-sign-in-reset.js'
import './sa-sign-in-set-password.js'
import './sa-sign-in-confirm.js'

// <sa-sign-in> is a hash router for the whole auth surface:
//   (none)                       → form outlet (sign in)
//   #password/request_reset      → reset outlet (forgot password)
//   #password/reset/<token>      → set-password outlet, mode=reset
//   #password/set/<token>        → set-password outlet, mode=set
//
// Each outlet is overridable by attribute:
//   <sa-sign-in form="acme-sign-in" …>  swaps just the sign-in form
//
// Outlets receive organization-id, return-to as attributes. The set-password
// outlet also receives token and mode.
//
// It also handles `to_*` query parameters — a target to go and do once a session
// exists, rather than a page to return to. `to_site` is the only one so far; see
// _toSite and docs/authentication.md for the contract.

const spinnerStyles = `
  :host { display: flex; justify-content: center; padding: 48px 0; }
  .spinner { width: 32px; height: 32px; border: 3px solid var(--sa-border, #e3e5e6); border-top-color: var(--sa-primary, #f97316); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`

const noticeStyles = `
  :host { display: flex; justify-content: center; padding: 48px 0; }
  .notice { max-width: 320px; font-size: 14px; line-height: 1.5; color: #111827; text-align: center; }
  .notice a { color: var(--sa-primary, #f97316); }
`

class SaSignIn extends HTMLElement {
  connectedCallback() {
    if (!this.getAttribute('organization-id')) {
      this.textContent = 'Error: organization-id attribute is required on <sa-sign-in>.'
      return
    }

    this.attachShadow({ mode: 'open' })

    this._tags = {
      form:         this.getAttribute('form')         || 'sa-sign-in-form',
      reset:        this.getAttribute('reset')        || 'sa-sign-in-reset',
      setPassword:  this.getAttribute('set-password') || 'sa-sign-in-set-password',
      confirm:      this.getAttribute('confirm')      || 'sa-sign-in-confirm',
    }
    this._mounted = {}

    // Auth transfer: a session_token in the URL exchanges for a real token.
    // Takes precedence over hash routes and over any to_* target, which the
    // exchange then runs on the session it just created.
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const sessionToken = hashParams.get('token') || query.get('token')
    if (sessionToken) {
      const returnTo = hashParams.get('return_to') || this._returnTo()
      this._spinner()
      this._exchange(sessionToken, returnTo)
      return
    }

    this._onHash = () => this._route()
    window.addEventListener('hashchange', this._onHash)
    this._route()
  }

  disconnectedCallback() {
    if (this._onHash) window.removeEventListener('hashchange', this._onHash)
  }

  _returnTo() {
    const query = new URLSearchParams(window.location.search)
    return query.get('return_to') || this.getAttribute('return-to') || '/sites'
  }

  // The site a `to_site` parameter names, or null.
  //
  // A to_* parameter names a *target* to act on once signed in; it never supplies
  // a URL to follow. Two rules keep that safe as more of them appear:
  //
  //   - at most one per request. Several at once is ambiguous, and ambiguity on
  //     the auth page is the worst kind of precedence bug, so act on none.
  //   - an unrecognised one is ignored, falling through to an ordinary sign-in.
  //     The bundle is loaded from the CDN while pages are pinned to a revision
  //     and the redirect that produces these lives in another deployment again,
  //     so a page meeting a parameter its bundle predates is expected, not odd.
  _toSite() {
    const query = new URLSearchParams(window.location.search)
    const targets = [...query.keys()].filter(key => key.startsWith('to_'))
    if (targets.length !== 1 || targets[0] !== 'to_site') return null
    return query.get('to_site')
  }

  // Where an outlet sends the browser once it has a session. With a to_* target
  // that is this same URL: the reload arrives with a token, _route() runs the
  // target, and the outlets stay unaware of any of it.
  _afterSignIn() {
    return this._toSite() ? location.pathname + location.search : this._returnTo()
  }

  _route() {
    const hash = location.hash.slice(1)
    let m

    if (hash === 'password/request_reset') {
      this._show(this._tags.reset)
      return
    }
    if ((m = hash.match(/^password\/(reset|set)\/(.+)$/))) {
      const el = this._show(this._tags.setPassword)
      el.setAttribute('mode', m[1])
      el.setAttribute('token', m[2])
      return
    }
    if ((m = hash.match(/^confirm\/(.+)$/))) {
      const el = this._show(this._tags.confirm)
      el.setAttribute('token', m[1])
      return
    }

    // A to_* target replaces the plain return_to redirect: sign in first if we
    // have to, then act on the target rather than landing on a page.
    if (this._toSite()) {
      if (readToken('sa_token')) { this._authorizeSite(); return }
      this._show(this._tags.form)
      return
    }

    // Default: sign-in form. Skip it if already signed in.
    if (readToken('sa_token')) { window.location.replace(this._returnTo()); return }
    this._show(this._tags.form)
  }

  _show(tag) {
    if (!this._mounted[tag]) {
      const el = document.createElement(tag)
      el.setAttribute('organization-id', this.getAttribute('organization-id'))
      el.setAttribute('return-to', this._afterSignIn())
      this.shadowRoot.appendChild(el)
      this._mounted[tag] = el
    }
    for (const [name, el] of Object.entries(this._mounted)) el.hidden = name !== tag
    return this._mounted[tag]
  }

  async _exchange(sessionToken, returnTo) {
    try {
      const res = await fetch(`${BASE}/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken }),
      })
      if (res.ok) {
        const { token, expires_at, user } = await res.json()
        persistSession(localStorage, 'sa_token', token, expires_at)
        if (user?.locale) setLocale(user.locale)
        if (this._toSite()) { this._authorizeSite(); return }
        window.location.replace(returnTo)
        return
      }
    } catch {
      // fall through to sign-in form
    }
    this._fallBackToForm()
  }

  // Exchanges the session for permission to open one site, and hands the browser
  // to that site's /callback with the token it minted.
  //
  // The destination is built from the response, never from the parameter: the
  // parameter only says *which* site, and a value naming no site we can see
  // resolves to nothing rather than to a redirect.
  async _authorizeSite() {
    this._spinner()

    let target
    try {
      target = new URL(this._toSite())
    } catch {
      this._notice(t('site_unavailable'))
      return
    }

    const api = apiClient(readToken('sa_token'))

    try {
      // A site's name is the first label of its host, the same derivation the
      // cloud makes from this redirect. `name:` matches exactly — it is a filter,
      // not a search — and the listing is already scoped to what this user and
      // this organization may see.
      const name = target.hostname.split('.')[0]
      const listed = await api.get('/sites', { name })
      if (listed.status === 401) { this._sessionExpired(); return }

      const site = listed.ok ? (await listed.json()).find(s => s.name === name) : null
      if (!site) { this._notice(t('site_unavailable')); return }

      const res = await api.post(`/sites/${site.id}/authorize`, {})
      if (res.status === 401) { this._sessionExpired(); return }
      if (!res.ok) { this._notice(t('site_unavailable')); return }

      const { token, site_key, site_host } = await res.json()
      if (!site_host) { this._notice(t('site_unavailable')); return }

      const query = new URLSearchParams({
        token,
        key: site_key,
        return_to: `${target.pathname}${target.search}`,
      })
      window.location.replace(`https://${site_host}/callback?${query}`)
    } catch {
      this._notice(t('connection_error'))
    }
  }

  _spinner() {
    this.shadowRoot.innerHTML = `<style>${spinnerStyles}</style><div class="spinner"></div>`
  }

  // Nothing here names SolarAssistant: this renders on a partner's own domain,
  // to their customer.
  _notice(message) {
    const back = this.getAttribute('return-to') || '/sites'
    this.shadowRoot.innerHTML =
      `<style>${noticeStyles}</style>` +
      `<div class="notice">${message} <a href="${back}">${t('go_to_sites')}</a></div>`
  }

  // The stored token was refused, so drop it before offering the form again —
  // otherwise _route() sees a session, skips the form, and loops.
  _sessionExpired() {
    clearSession('sa_token')
    this._fallBackToForm()
  }

  _fallBackToForm() {
    if (!this._onHash) {
      this._onHash = () => this._route()
      window.addEventListener('hashchange', this._onHash)
    }
    this._mounted = {}
    this.shadowRoot.innerHTML = ''
    this._show(this._tags.form)
  }
}

customElements.define('sa-sign-in', SaSignIn)
