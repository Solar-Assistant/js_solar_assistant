import { sitesStyles, resolveApi, redirectToSignIn, followDeviceCallback } from './sites-shared.js'
import { t } from './i18n.js'

// Read by the installer, not the customer, so it is not translated into theirs.
const MESSAGE = 'A customer opened this portal with an unactivated system that needs to be activated.'

// Remembered for the tab so a refresh shows the same result instead of asking again.
// An activated result is never stored: it redirects, and a refresh should mint a fresh token.
const SENT_KEY = uid => `sa_activation_requested:${uid}`

function makeTemplate() {
  return `
  <style>
    :host { display: block; font-family: inherit; }
    ${sitesStyles}
    .sent { color: #16a34a; font-weight: 600; margin: 0 0 8px; }
    .reassure { margin: 0 0 14px; }
    .error { color: #b91c1c; }
    a { cursor: pointer; }
    [hidden] { display: none; }
  </style>
  <div class="heading">
    <span class="breadcrumb">
      <span class="hide-android"><a class="back-list">${t('sites')}</a> › </span>
      ${t('activate_site')}
    </span>
  </div>
  <div class="card"><div class="card-section">
    <p id="working" hidden>${t('activation_requesting')}</p>
    <div id="done" hidden>
      <p class="sent" id="sent"></p>
      <p class="reassure" id="reassure" hidden></p>
      <p><a id="to-site" hidden>${t('activation_view_site')}</a></p>
    </div>
    <div class="error" id="error" hidden></div>
  </div></div>
`
}

class SaSitesActivate extends HTMLElement {
  static get observedAttributes() { return ['uid'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()

    this._api = resolveApi(this)
    if (!this._api) return

    this.shadowRoot.querySelector('.back-list').addEventListener('click', () => { location.hash = '' })
    // The router appends an outlet before it sets the route params, so there may
    // be nothing to load yet; attributeChangedCallback picks it up. Loading now
    // would fail and flash an error over the top of the real load.
    if (this.getAttribute('uid')) this._request()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Not `oldValue !== null`: the router sets the param after appending, so the
    // first set is the one that matters and skipping it never loads at all.
    if (name === 'uid' && oldValue !== newValue && this._api) this._request()
  }

  _fail(message) {
    this.shadowRoot.getElementById('working').hidden = true
    this.shadowRoot.getElementById('done').hidden = true
    const error = this.shadowRoot.getElementById('error')
    error.textContent = message
    error.hidden = false
  }

  async _request() {
    const uid = this.getAttribute('uid')
    if (!uid) return this._fail(t('activation_no_unit'))

    let remembered = null
    try { remembered = sessionStorage.getItem(SENT_KEY(uid)) } catch { /* private mode */ }
    if (remembered) return this._done(JSON.parse(remembered))

    this.shadowRoot.getElementById('working').hidden = false
    this.shadowRoot.getElementById('error').hidden = true

    const res = await this._api.post('/sites/request_activation', { uid, message: MESSAGE })
    if (res.status === 401) return redirectToSignIn(this)

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      return this._fail(
        res.status === 404 ? t('activation_no_unit')
          : res.status === 429 ? t('activation_too_many')
            : payload?.error?.message || t('activation_request_failed'))
    }

    const result = await res.json()
    if (result.status === 'activated') return this._activated(result)

    try { sessionStorage.setItem(SENT_KEY(uid), JSON.stringify(result)) } catch { /* private mode */ }
    this._done(result)
  }

  // A perpetual site has no activation to request, so the API hands back the
  // registration token instead and the device redeems it at its own callback.
  // This branch returns the usual site json, so `id` — the trial branch below
  // still answers with site_id.
  _activated({ token, id }) {
    if (followDeviceCallback(this, token)) return
    if (id) location.hash = String(id)
    else this._fail(t('activation_no_unit'))
  }

  // Can arrive either side of our own request finishing, so re-render.
  set currentUser(user) {
    this._currentUser = user
    if (this._result) this._reassure()
  }

  get currentUser() { return this._currentUser }

  _reassure() {
    const { trial_expires_at } = this._result
    const covered = trial_expires_at && new Date(trial_expires_at) > new Date()
    const reassure = this.shadowRoot.getElementById('reassure')
    const org = this._currentUser?.organization?.name
    if (covered) {
      reassure.textContent = org
        ? t('activation_unaffected', { org })
        : t('activation_unaffected_generic')
    }
    reassure.hidden = !covered
  }

  _done(result) {
    this._result = result
    const { site_id, site_name } = result
    this.shadowRoot.getElementById('sent').textContent = site_name
      ? t('activation_requested_for', { name: site_name })
      : t('activation_requested')

    this._reassure()

    const link = this.shadowRoot.getElementById('to-site')
    link.hidden = !site_id
    if (site_id) link.onclick = () => { location.hash = String(site_id) }

    this.shadowRoot.getElementById('working').hidden = true
    this.shadowRoot.getElementById('error').hidden = true
    this.shadowRoot.getElementById('done').hidden = false
  }
}

customElements.define('sa-sites-activate', SaSitesActivate)
