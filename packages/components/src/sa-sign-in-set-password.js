import { BASE, persistSession } from '@solar-assistant/api'
import { signInStyles } from './sa-sign-in-form.js'
import { showErrors } from './form-utils.js'
import { t } from './i18n.js'

// Default set/reset-password outlet for <sa-sign-in>. Receives `token` and
// `mode` ('set' | 'reset') attributes updated by the router on each navigation,
// and `site-id` when the invite mail named one.
class SaSignInSetPassword extends HTMLElement {
  static get observedAttributes() { return ['token', 'mode'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `<style>${signInStyles}</style><div class="view"></div>`
    this._render()
  }

  attributeChangedCallback(name, oldV, newV) {
    if ((name === 'token' || name === 'mode') && newV !== oldV && this.shadowRoot) {
      this._render()
    }
  }

  _render() {
    const mode = this.getAttribute('mode') || 'reset'
    const heading = t(mode === 'set' ? 'set_your_password' : 'reset_your_password')
    const action  = t(mode === 'set' ? 'set_password'      : 'reset_password_btn')
    const view = this.shadowRoot.querySelector('.view')
    view.innerHTML = `
      <div class="card"><div class="card-section">
        <form>
          <h2>${heading}</h2>
          <input type="password" name="password" placeholder="${t('new_password')}" autocomplete="new-password" required />
          <input type="password" name="confirm" placeholder="${t('confirm_password')}" autocomplete="new-password" required />
          <button type="submit">${action}</button>
          <span class="error"></span>
        </form>
      </div></div>
    `
    view.querySelector('form').addEventListener('submit', e => this._submit(e))
  }

  async _submit(e) {
    e.preventDefault()
    const form = e.target
    const btn = form.querySelector('button[type="submit"]')
    const error = form.querySelector('.error')
    const password = form.password.value
    const confirm = form.confirm.value
    error.textContent = ''
    form.querySelectorAll('.field-error').forEach(el => el.remove())

    if (password !== confirm) { error.textContent = t('passwords_no_match'); return }
    btn.disabled = true

    try {
      const token = this.getAttribute('token')
      const mode = this.getAttribute('mode') || 'reset'
      const path = mode === 'set'
        ? `/password/set/${encodeURIComponent(token)}`
        : `/password/reset/${encodeURIComponent(token)}`
      const res = await fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          organization_id: Number(this.getAttribute('organization-id')),
        }),
      })

      if (res.ok) {
        const { token: apiToken, expires_at } = await res.json()
        persistSession(localStorage, 'sa_token', apiToken, expires_at)
        const siteId = this.getAttribute('site-id')
        window.location.href = siteId
          ? `/sites#${encodeURIComponent(siteId)}`
          : (this.getAttribute('return-to') || '/sites')
        return
      }

      const body = await res.json().catch(() => ({}))
      error.textContent = body.errors
        ? showErrors(form, body.errors)
        : (body.error || t('set_password_error'))
    } catch {
      error.textContent = t('connection_error')
    } finally {
      btn.disabled = false
    }
  }
}

customElements.define('sa-sign-in-set-password', SaSignInSetPassword)
