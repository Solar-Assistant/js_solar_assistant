import { BASE } from '@solar-assistant/api'
import { cardStyles } from './styles.js'

const template = `
  <style>
    :host { display: block; font-family: inherit; }
    ${cardStyles}
    form { display: flex; flex-direction: column; gap: 12px; width: 280px; }
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
  </style>
  <div class="card"><div class="card-section">
    <form>
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Sign in</button>
      <span class="error"></span>
    </form>
  </div></div>
`

class SaSignIn extends HTMLElement {
  connectedCallback() {
    // Token handed off from the mobile app — via the URL hash (preferred, so it
    // isn't sent to the server) or the query string as a fallback. This is a
    // short-lived *session_token*, not a bearer token: it must be exchanged at
    // POST /sign_in for the real API token. A handoff token always takes
    // precedence over an existing session, so opening this with a fresh token
    // re-signs the user in rather than passing them through.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const sessionToken = hash.get('token') || query.get('token')
    const returnTo = hash.get('return_to') || query.get('return_to') || this.getAttribute('return-to') || '/sites'

    if (sessionToken) {
      this._exchange(sessionToken, returnTo)
      return
    }

    // Already signed in — redirect to return-to or default
    if (sessionStorage.getItem('sa_token')) {
      window.location.replace(returnTo)
      return
    }

    this._renderForm()
  }

  _renderForm() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = template
    this.shadowRoot.querySelector('form').addEventListener('submit', e => this._submit(e))
  }

  async _exchange(sessionToken, returnTo) {
    try {
      const res = await fetch(`${BASE}/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken }),
      })
      if (res.ok) {
        const { token } = await res.json()
        sessionStorage.setItem('sa_token', token)
        window.location.replace(returnTo)
        return
      }
    } catch {
      // fall through to the sign-in form
    }
    // Invalid or expired handoff token — show the normal sign-in form.
    this._renderForm()
  }

  async _submit(e) {
    e.preventDefault()
    const form = e.target
    const btn = form.querySelector('button')
    const error = form.querySelector('.error')
    const email = form.email.value
    const password = form.password.value

    btn.disabled = true
    error.textContent = ''

    try {
      const res = await fetch(`${BASE}/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const { token } = await res.json()
        sessionStorage.setItem('sa_token', token)
        const params = new URLSearchParams(window.location.search)
        const returnTo = params.get('return_to') || this.getAttribute('return-to') || '/sites'
        window.location.href = returnTo
      } else if (res.status === 412) {
        const { pending_token } = await res.json()
        sessionStorage.setItem('sa_pending_token', pending_token)
        error.textContent = 'Account pending confirmation. Please check your email.'
      } else {
        error.textContent = 'Invalid email or password.'
      }
    } catch {
      error.textContent = 'Connection error. Please try again.'
    } finally {
      btn.disabled = false
    }
  }
}

customElements.define('sa-sign-in', SaSignIn)
