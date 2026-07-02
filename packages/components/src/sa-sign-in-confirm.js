import { BASE } from '@solar-assistant/api'
import { signInStyles } from './sa-sign-in-form.js'
import { t } from './i18n.js'

function escapeHtml(s) {
  return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
}

// Default email-confirmation outlet for <sa-sign-in>. Reads `token` attribute
// set by the router, calls POST /api/v1/user/confirm, and shows result.
class SaSignInConfirm extends HTMLElement {
  static get observedAttributes() { return ['token'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `<style>${signInStyles}</style><div class="view"></div>`
    const token = this.getAttribute('token')
    if (token) this._confirm(token)
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'token' && newV && newV !== oldV && this.shadowRoot) this._confirm(newV)
  }

  async _confirm(token) {
    const view = this.shadowRoot.querySelector('.view')
    const signIn = this.getAttribute('return-to') || '/sign_in'

    try {
      const res = await fetch(`${BASE}/user/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        view.innerHTML = `
          <div class="card"><div class="card-section">
            <div class="notice">
              <p>${t('account_confirmed')}</p>
              <p><a href="${signIn}" class="link">${t('sign_in')}</a> ${t('to_continue')}</p>
            </div>
          </div></div>
        `
      } else {
        const data = await res.json().catch(() => ({}))
        view.innerHTML = `
          <div class="card"><div class="card-section">
            <div class="notice">
              <p class="error">${escapeHtml(data.error || t('confirm_error'))}</p>
              <p><a href="${signIn}" class="link">${t('back_to_sign_in')}</a></p>
            </div>
          </div></div>
        `
      }
    } catch {
      view.innerHTML = `
        <div class="card"><div class="card-section">
          <span class="error">${t('connection_error')}</span>
        </div></div>
      `
    }
  }
}

customElements.define('sa-sign-in-confirm', SaSignInConfirm)
