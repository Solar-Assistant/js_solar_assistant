import { BASE, persistSession } from '@solar-assistant/api'
import { cardStyles } from './styles.js'
import { t, setLocale } from './i18n.js'

export const signInStyles = `
  :host { display: block; font-family: inherit; }
  :host([hidden]) { display: none; }
  ${cardStyles}
  /* 300px, the fixed width of the Turnstile widget the reset form embeds, and the
     same width registration uses, so every auth screen lines up. */
  form { display: flex; flex-direction: column; gap: 12px; width: 300px; }
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .sub { margin: 0; font-size: 13px; color: #6b7280; }
  input {
    padding: 10px 12px;
    border: 1px solid var(--sa-border, #e3e5e6);
    border-radius: var(--sa-radius, 6px);
    font-size: 14px;
    outline: none;
  }
  input:focus { border-color: var(--sa-primary, #f97316); }
  button {
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
  .field-error { color: #ef4444; font-size: 12px; margin-top: -4px; }
  .field-error:empty { display: none; }
  .remember { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; cursor: pointer; }
  .remember input { width: auto; margin: 0; accent-color: var(--sa-primary, #f97316); }
  .link {
    font-size: 13px; color: var(--sa-primary, #f97316);
    cursor: pointer; text-decoration: none;
    background: none; border: none; padding: 0; text-align: left;
  }
  .link:hover { text-decoration: underline; }
  .notice { width: 300px; font-size: 14px; line-height: 1.5; color: #111827; }
`

// Default sign-in outlet for <sa-sign-in>. Reads organization-id and return-to
// from attributes; navigates to #password/request_reset on "Forgot password".
// How often to ask whether the confirmation link has been clicked, and how long
// to keep asking. The ceiling matches @pending_login_ttl_sec in sa_cloud's
// APISessionsController: past it the token is refused and polling is pointless.
const POLL_MS = 3000
const PENDING_TTL_MS = 10 * 60 * 1000

class SaSignInForm extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `<style>${signInStyles}</style><div class="view"></div>`
    this._render()
  }

  _render() {
    const view = this.shadowRoot.querySelector('.view')
    view.innerHTML = `
      <div class="card"><div class="card-section">
        <form>
          <input type="email" name="email" placeholder="${t('email')}" autocomplete="email" required />
          <input type="password" name="password" placeholder="${t('password')}" autocomplete="current-password" required />
          <label class="remember"><input type="checkbox" name="remember" checked /> ${t('keep_signed_in')}</label>
          <button type="submit">${t('sign_in')}</button>
          <button type="button" class="link forgot">${t('forgot_password')}</button>
          <span class="error"></span>
        </form>
      </div></div>
    `
    view.querySelector('form').addEventListener('submit', e => this._submit(e))
    view.querySelector('.forgot').addEventListener('click', () => { location.hash = 'password/request_reset' })
  }

  disconnectedCallback() {
    this._stopPolling()
  }

  // Polls the sign-in endpoint with the pending token until the user clicks the
  // link in their email. The API answers 412 while the account is still
  // unconfirmed, 200 with a session once it is, and 401 once the token has
  // lapsed — it lives for ten minutes server-side, which is what bounds this.
  _awaitConfirmation(email, pendingToken, storage) {
    this._stopPolling()
    const deadline = Date.now() + PENDING_TTL_MS

    this._pollTimer = setInterval(async () => {
      if (!this.isConnected || Date.now() > deadline) {
        this._stopPolling()
        return
      }
      try {
        const res = await fetch(`${BASE}/sign_in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            pending_token: pendingToken,
            organization_id: Number(this.getAttribute('organization-id')),
          }),
        })
        if (res.ok) {
          this._stopPolling()
          const { token, expires_at, user } = await res.json()
          persistSession(storage, 'sa_token', token, expires_at)
          if (user?.locale) setLocale(user.locale)
          window.location.href = this.getAttribute('return-to') || '/sites'
        } else if (res.status === 401) {
          // The pending token has expired; the password is long gone from the
          // form by now, so there is nothing to do but ask them to start again.
          this._stopPolling()
          // Looked up now rather than captured: _render() may have replaced it.
          const error = this.shadowRoot.querySelector('.error')
          if (error) error.textContent = t('pending_expired')
        }
        // 412 is the expected answer while they have not clicked yet.
      } catch {
        // A dropped connection should not end the wait; the next tick retries.
      }
    }, POLL_MS)
  }

  _stopPolling() {
    clearInterval(this._pollTimer)
    this._pollTimer = null
  }

  async _submit(e) {
    e.preventDefault()
    const form = e.target
    const btn = form.querySelector('button[type="submit"]')
    const error = form.querySelector('.error')
    btn.disabled = true
    error.textContent = ''

    try {
      const res = await fetch(`${BASE}/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value,
          organization_id: Number(this.getAttribute('organization-id')),
        }),
      })

      const storage = form.remember.checked ? localStorage : sessionStorage

      if (res.ok) {
        const { token, expires_at, user } = await res.json()
        persistSession(storage, 'sa_token', token, expires_at)
        if (user?.locale) setLocale(user.locale)
        window.location.href = this.getAttribute('return-to') || '/sites'
      } else if (res.status === 412) {
        // The account exists but the address is unconfirmed, and the API has just
        // re-sent the confirmation email. The pending token is what completes the
        // sign-in once they click it, so wait for that here rather than making them
        // come back and type the password again.
        const { pending_token } = await res.json()
        error.textContent = t('pending_confirmation')
        this._awaitConfirmation(form.email.value, pending_token, storage)
      } else {
        error.textContent = t('invalid_credentials')
      }
    } catch {
      error.textContent = t('connection_error')
    } finally {
      btn.disabled = false
    }
  }
}

customElements.define('sa-sign-in-form', SaSignInForm)
