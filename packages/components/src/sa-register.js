import { BASE } from '@solar-assistant/api'
import { cardStyles } from './styles.js'
import { showErrors } from './form-utils.js'
import { t } from './i18n.js'

// The bot-verification page lives at the API origin (not under /api/v1). It runs
// a challenge in an iframe and postMessages back a single-use verification_token.
// We stay agnostic to what the challenge actually is — we just relay the token.
const ORIGIN = new URL(BASE).origin

function escapeHtml(s) {
  return s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
}

function makeTemplate() {
  return `
  <style>
    :host { display: block; font-family: inherit; }
    ${cardStyles}
    .fields { display: flex; flex-direction: column; gap: 16px; width: 300px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #111827; }
    input[type="email"], input[type="password"], input[type="text"] {
      padding: 10px 12px;
      border: 1px solid var(--sa-border, #e3e5e6);
      border-radius: var(--sa-radius, 6px);
      font-size: 14px;
      outline: none;
    }
    input:focus { border-color: var(--sa-primary, #f97316); }
    .hint { font-size: 13px; color: #6b7280; margin: 0; padding-left: 16px; }
    .hint li { margin: 2px 0; }
    .terms { display: flex; flex-direction: row; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
    .terms input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--sa-primary, #f97316); }
    .terms a { color: var(--sa-primary, #f97316); }
    button {
      width: 100%;
      padding: 10px 12px;
      background: var(--sa-primary, #f97316);
      color: #fff;
      border: none;
      border-radius: var(--sa-radius, 6px);
      font-size: 14px;
      cursor: pointer;
    }
    button:disabled { opacity: 0.6; cursor: default; }
    .error { color: #ef4444; font-size: 13px; }
    .field-error { color: #ef4444; font-size: 12px; }
    .verify { display: flex; justify-content: center; min-height: 0; margin-top: -8px; }
    .verify iframe { border: 0; width: 100%; height: 70px; }
    .notice { font-size: 14px; line-height: 1.5; color: #111827; }
    .notice a { color: var(--sa-primary, #f97316); }
  </style>
  <div class="card">
    <div class="card-section">
      <form>
        <div class="fields">
          <label>${t('email')} <input type="email" name="email" autocomplete="email" required /></label>
          <label>${t('first_name')} <input type="text" name="first_name" autocomplete="given-name" required /></label>
          <label>${t('last_name')} <input type="text" name="last_name" autocomplete="family-name" required /></label>
          <label>${t('password')} <input type="password" name="password" autocomplete="new-password" required /></label>
          <div>
            <p style="font-size:13px;color:#6b7280;margin:0 0 4px">${t('password_hint_intro')}</p>
            <ul class="hint">
              <li>${t('password_hint_length')}</li>
              <li>${t('password_hint_lower')}</li>
              <li>${t('password_hint_upper')}</li>
              <li>${t('password_hint_special')}</li>
            </ul>
          </div>
          <label class="terms">
            <input type="checkbox" name="accepted_terms" />
            ${t('accept_terms')} <a href="/terms" target="_blank">${t('terms_link')}</a>
          </label>
          <div class="verify">
            <iframe src="${ORIGIN}/register/verify" title="Verification"></iframe>
          </div>
          <span class="error"></span>
        </div>
      </form>
    </div>
    <div class="card-footer">
      <button type="submit" form="sa-register-form">${t('register')}</button>
    </div>
  </div>
`
}

class SaRegister extends HTMLElement {
  connectedCallback() {
    if (!this.getAttribute('organization-id')) {
      this.textContent = 'Error: organization-id attribute is required on <sa-register>.'
      return
    }

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()

    // Wire the button in card-footer to submit the form in card-section.
    const form = this.shadowRoot.querySelector('form')
    form.id = 'sa-register-form'
    this.shadowRoot.querySelector('button[type="submit"]').addEventListener('click', () => form.requestSubmit())

    // The verify iframe posts a single-use token when the challenge passes. When
    // no challenge is configured the page stays blank and posts nothing — the
    // API accepts an empty token in that case.
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

    form.addEventListener('submit', e => this._submit(e))
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage)
  }

  async _submit(e) {
    e.preventDefault()
    const form = e.target
    const btn = this.shadowRoot.querySelector('button[type="submit"]')
    const error = this.shadowRoot.querySelector('.error')

    btn.disabled = true
    error.textContent = ''
    this.shadowRoot.querySelectorAll('.field-error').forEach(el => el.remove())

    try {
      const res = await fetch(`${BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.value,
          first_name: form.first_name.value,
          last_name: form.last_name.value,
          password: form.password.value,
          accepted_terms: form.accepted_terms.checked,
          organization_id: Number(this.getAttribute('organization-id')),
          verification_token: this._verifyToken,
        }),
      })

      if (res.status === 201) {
        this._showConfirmation(form.email.value)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.status === 422 && data.errors) {
        error.textContent = showErrors(this.shadowRoot, data.errors)
      } else if (data.error) {
        error.textContent = data.error
      } else {
        error.textContent = t('register_error')
      }
      this._resetVerify()
    } catch {
      error.textContent = t('connection_error')
    } finally {
      btn.disabled = false
    }
  }

  _resetVerify() {
    this._verifyToken = ''
    const iframe = this.shadowRoot.querySelector('.verify iframe')
    if (iframe) {
      iframe.style.height = '70px'
      iframe.src = `${ORIGIN}/register/verify?t=${Date.now()}`
    }
  }

  _showConfirmation(email) {
    const signIn = this.getAttribute('sign-in') || '/sign_in'
    this.shadowRoot.querySelector('.card').innerHTML = `
      <div class="card-section">
        <div class="notice">
          <p>${t('account_created', { email: `<strong>${escapeHtml(email)}</strong>` })}</p>
          <p>${t('check_inbox', { link: `<a href="${signIn}">sign in</a>` })}</p>
        </div>
      </div>
    `
  }
}

customElements.define('sa-register', SaRegister)
