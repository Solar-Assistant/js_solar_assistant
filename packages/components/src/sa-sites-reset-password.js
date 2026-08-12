import { sitesStyles, resolveApi, redirectToSignIn } from './sites-shared.js'
import { t } from './i18n.js'

function makeTemplate() {
  return `
  <style>
    :host { display: block; font-family: inherit; }
    ${sitesStyles}
    .lead { font-size: 16px; margin-bottom: 12px; }
    .btn {
      padding: 6px 14px;
      border: none;
      border-radius: var(--sa-radius, 6px);
      font-size: 14px;
      cursor: pointer;
      background: var(--sa-primary, #475569);
      color: #fff;
    }
    .btn:hover { opacity: 0.85; }
    /* Selectable so it can still be copied without the clipboard API. */
    textarea {
      width: 100%;
      margin-top: 12px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
      border: 1px solid var(--sa-border, #e3e5e6);
      border-radius: var(--sa-radius, 6px);
      padding: 8px;
      resize: vertical;
    }
    .copied { margin-left: 10px; font-size: 14px; color: #16a34a; }
    .error { color: #b91c1c; }
    [hidden] { display: none; }
  </style>
  <div class="heading">
    <span class="breadcrumb">
      <span class="hide-android"><a class="back-list">${t('sites')}</a> › </span>
      <a class="back-site" id="site-name"></a> › ${t('reset_password')}
    </span>
  </div>
  <div class="card"><div class="card-section">
    <div id="body" hidden>
      <div class="lead">${t('site_reset_password_instruction')}</div>
      <button class="btn" id="copy">${t('copy_to_clipboard')}</button>
      <span class="copied" id="copied" hidden>${t('copied')}</span>
      <textarea id="token" rows="6" readonly></textarea>
    </div>
    <div class="error" id="error" hidden>${t('site_reset_password_unavailable')}</div>
  </div></div>
`
}

class SaSitesResetPassword extends HTMLElement {
  static get observedAttributes() { return ['site-id'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()

    this._api = resolveApi(this)
    if (!this._api) return

    this.shadowRoot.querySelector('.back-list').addEventListener('click', () => { location.hash = '' })
    this.shadowRoot.querySelector('.back-site')
      .addEventListener('click', () => { location.hash = this.getAttribute('site-id') || '' })
    this.shadowRoot.getElementById('copy').addEventListener('click', () => this._copy())

    this._load()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'site-id' && oldValue !== null && oldValue !== newValue && this._api) this._load()
  }

  async _load() {
    const id = this.getAttribute('site-id')
    if (!id) return

    const res = await this._api.post(`/sites/${id}/authorize`, {})
    if (res.status === 401) return redirectToSignIn(this)

    const body = this.shadowRoot.getElementById('body')
    const error = this.shadowRoot.getElementById('error')
    if (!res.ok) {
      body.hidden = true
      error.hidden = false
      return
    }

    const site = await res.json()
    this.shadowRoot.getElementById('site-name').textContent = site.site_name || `#${id}`
    this.shadowRoot.getElementById('token').value = site.token
    error.hidden = true
    body.hidden = false
  }

  async _copy() {
    const field = this.shadowRoot.getElementById('token')
    try {
      await navigator.clipboard.writeText(field.value)
    } catch {
      // Needs a secure context and permission; select the text so it can be copied by hand.
      field.focus()
      field.select()
      return
    }
    const note = this.shadowRoot.getElementById('copied')
    note.hidden = false
    clearTimeout(this._noteTimer)
    this._noteTimer = setTimeout(() => { note.hidden = true }, 2000)
  }

  disconnectedCallback() {
    clearTimeout(this._noteTimer)
  }
}

customElements.define('sa-sites-reset-password', SaSitesResetPassword)
