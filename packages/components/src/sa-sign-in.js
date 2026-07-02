import { BASE, persistSession, readToken } from '@solar-assistant/api'
import { setLocale } from './i18n.js'
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

const spinnerStyles = `
  :host { display: flex; justify-content: center; padding: 48px 0; }
  .spinner { width: 32px; height: 32px; border: 3px solid var(--sa-border, #e3e5e6); border-top-color: var(--sa-primary, #f97316); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
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
    // Takes precedence over hash routes.
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const sessionToken = hashParams.get('token') || query.get('token')
    if (sessionToken) {
      const returnTo = hashParams.get('return_to') || this._returnTo()
      this.shadowRoot.innerHTML = `<style>${spinnerStyles}</style><div class="spinner"></div>`
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

    // Default: sign-in form. Skip it if already signed in.
    if (readToken('sa_token')) { window.location.replace(this._returnTo()); return }
    this._show(this._tags.form)
  }

  _show(tag) {
    if (!this._mounted[tag]) {
      const el = document.createElement(tag)
      el.setAttribute('organization-id', this.getAttribute('organization-id'))
      el.setAttribute('return-to', this._returnTo())
      this.shadowRoot.appendChild(el)
      this._mounted[tag] = el
    }
    for (const [t, el] of Object.entries(this._mounted)) el.hidden = t !== tag
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
        window.location.replace(returnTo)
        return
      }
    } catch {
      // fall through to sign-in form
    }
    this._onHash = () => this._route()
    window.addEventListener('hashchange', this._onHash)
    this._mounted = {}
    this.shadowRoot.innerHTML = ''
    this._show(this._tags.form)
  }
}

customElements.define('sa-sign-in', SaSignIn)
