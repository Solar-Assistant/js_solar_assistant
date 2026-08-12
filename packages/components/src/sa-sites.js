import { apiClient, readToken } from '@solar-assistant/api'
import './sa-sites-index.js'
import './sa-sites-show.js'
import './sa-sites-invite.js'
import './sa-sites-register.js'

// <sa-sites> is a hash router. It mounts one outlet per route, keeps them alive
// (toggling `hidden` so state/cache survives navigation), and hands each its API
// client and the route param. Each outlet is overridable by attribute, e.g.
// <sa-sites index="acme-fleet"> swaps just the list. Outlets talk back by setting
// location.hash, so a custom outlet needs no wiring beyond that.
//
//   route              outlet      param
//   (empty)            index       —
//   #<id>              show        site-id
//   #<id>/invite       invite      site-id
//   #<id>/reset_password  resetPassword  site-id
//   #local             local       —
//   #activate?uid=…    activate    uid
//   #register?uid=…    register    uid
const ROUTES = [
  { test: h => h === '',                outlet: 'index' },
  { test: h => /^\d+$/.test(h),         outlet: 'show',     param: 'site-id', value: h => h },
  { test: h => /^\d+\/invite$/.test(h), outlet: 'invite',   param: 'site-id', value: h => h.split('/')[0] },
  { test: h => /^\d+\/reset_password$/.test(h), outlet: 'resetPassword', param: 'site-id',
    value: h => h.split('/')[0] },
  { test: h => h === 'local',           outlet: 'local' },
  { test: h => /^activate(\?|$)/.test(h), outlet: 'activate', param: 'uid',
    value: () => new URLSearchParams((location.hash.split('?')[1] || '')).get('uid') || '' },
  { test: h => /^register(\?|$)/.test(h), outlet: 'register', param: 'uid',
    value: () => new URLSearchParams((location.hash.split('?')[1] || '')).get('uid') || '' },
]

class SaSites extends HTMLElement {
  connectedCallback() {
    const token = readToken('sa_token')
    if (!token) {
      window.location.href =
        `${this.getAttribute('sign-in') || '/sign_in'}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }

    this.style.display = 'block'   // outlets are light children; keep block flow
    this._api = apiClient(token)
    this._signIn = this.getAttribute('sign-in') || '/sign_in'
    this._tags = {
      index:    this.getAttribute('index')    || 'sa-sites-index',
      show:     this.getAttribute('show')     || 'sa-sites-show',
      invite:   this.getAttribute('invite')   || 'sa-sites-invite',
      register: this.getAttribute('register') || 'sa-sites-register',
      resetPassword: this.getAttribute('reset-password') || 'sa-sites-reset-password',
      local:    this.getAttribute('local')    || 'sa-sites-local',
      activate: this.getAttribute('activate') || 'sa-sites-activate',
    }
    this._mounted = {}

    // The current user is shared with outlets that need it (e.g. invite roles).
    this._currentUser = null
    this._api.get('/user').then(r => (r.ok ? r.json() : null)).then(u => {
      this._currentUser = u
      for (const el of Object.values(this._mounted)) el.currentUser = u
    })

    // The Android-embed script adds `embedded` to <sa-sites>; the outlets need it
    // too (their :host(.embedded) rule drives hide-android). Propagate it.
    this._classObserver = new MutationObserver(() => this._syncEmbedded())
    this._classObserver.observe(this, { attributes: true, attributeFilter: ['class'] })

    this._onHash = () => this._route()
    window.addEventListener('hashchange', this._onHash)
    this._route()
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._onHash)
    this._classObserver?.disconnect()
  }

  _syncEmbedded() {
    const embedded = this.classList.contains('embedded')
    for (const el of Object.values(this._mounted)) el.classList.toggle('embedded', embedded)
  }

  _route() {
    const hash = location.hash.slice(1)
    const r = ROUTES.find(route => route.test(hash))
    if (!r) return
    const el = this._mount(this._tags[r.outlet])
    if (r.param) el.setAttribute(r.param, r.value(hash))
    for (const m of Object.values(this._mounted)) m.hidden = m !== el
  }

  _mount(tag) {
    if (!this._mounted[tag]) {
      const el = document.createElement(tag)
      el.api = this._api
      el.currentUser = this._currentUser
      el.organization = this.getAttribute('organization') || ''
      el.setAttribute('sign-in', this._signIn)
      el.classList.toggle('embedded', this.classList.contains('embedded'))
      this.appendChild(el)
      this._mounted[tag] = el
    }
    return this._mounted[tag]
  }
}

customElements.define('sa-sites', SaSites)
