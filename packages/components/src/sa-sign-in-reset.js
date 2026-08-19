import { BASE } from '@solar-assistant/api'
import { signInStyles } from './sa-sign-in-form.js'
import { t } from './i18n.js'
import { escapeHtml } from './escape.js'

const ORIGIN = new URL(BASE).origin

// Default "forgot password" outlet for <sa-sign-in>. Posts the reset request
// and shows a confirmation. Navigates to # (empty) on back.
class SaSignInReset extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `<style>${signInStyles}</style><div class="view"></div>`
    this._verifyToken = ''
    this._onMessage = e => {
      if (e.origin !== ORIGIN || !e.data) return
      if (e.data.verification_token) {
        this._verifyToken = e.data.verification_token
        const iframe = this.shadowRoot.querySelector('.verify iframe')
        if (iframe) iframe.style.height = '0'
      } else if (e.data.verification_error) {
        const error = this.shadowRoot.querySelector('.error')
        if (error) error.textContent = t('bot_failed')
        this._resetVerify()
      }
    }
    window.addEventListener('message', this._onMessage)
    this._render()
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage)
  }

  _resetVerify() {
    this._verifyToken = ''
    const iframe = this.shadowRoot.querySelector('.verify iframe')
    if (iframe) {
      iframe.style.height = '70px'
      iframe.src = `${ORIGIN}/register/verify?t=${Date.now()}`
    }
  }

  _render() {
    const view = this.shadowRoot.querySelector('.view')
    view.innerHTML = `
      <div class="card"><div class="card-section">
        <form>
          <h2>${t('reset_password')}</h2>
          <p class="sub">${t('reset_sub')}</p>
          <input type="email" name="email" placeholder="${t('email')}" autocomplete="email" required />
          <div class="verify"><iframe src="${ORIGIN}/register/verify" title="Verification" style="border:0;width:100%;height:70px;"></iframe></div>
          <button type="submit">${t('send_reset_link')}</button>
          <button type="button" class="link back">${t('back_to_sign_in')}</button>
          <span class="error"></span>
        </form>
      </div></div>
    `
    view.querySelector('form').addEventListener('submit', e => this._submit(e))
    view.querySelector('.back').addEventListener('click', () => { location.hash = '' })
  }

  async _submit(e) {
    e.preventDefault()
    const form = e.target
    const btn = form.querySelector('button[type="submit"]')
    const error = form.querySelector('.error')
    const email = form.email.value.trim()
    btn.disabled = true
    error.textContent = ''

    try {
      const res = await fetch(`${BASE}/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          verification_token: this._verifyToken,
          organization_id: Number(this.getAttribute('organization-id')),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        error.textContent = body.error || t('connection_error')
        btn.disabled = false
        this._resetVerify()
        return
      }

      // Always show the same message — never reveal whether the email exists.
      const view = this.shadowRoot.querySelector('.view')
      view.innerHTML = `
        <div class="card"><div class="card-section">
          <div class="notice">
            <p>${t('reset_sent', { email: `<strong>${escapeHtml(email)}</strong>` })}</p>
            <p><button type="button" class="link back">${t('back_to_sign_in')}</button></p>
          </div>
        </div></div>
      `
      view.querySelector('.back').addEventListener('click', () => { location.hash = '' })
    } catch {
      error.textContent = t('connection_error')
      btn.disabled = false
    }
  }
}

customElements.define('sa-sign-in-reset', SaSignInReset)
