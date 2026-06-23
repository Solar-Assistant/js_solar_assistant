import { apiClient } from '@solar-assistant/api'
import { cardStyles } from './styles.js'

const template = `
  <style>
    :host { display: block; font-family: inherit; }
    ${cardStyles}
    .heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .heading {
      font-size: 22px;
      font-weight: 600;
      margin: 0;
    }
    .field { margin-bottom: 14px; }
    .label { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
    .value { font-size: 15px; color: #111827; }
    .btn {
      padding: 8px 16px;
      border: 1px solid var(--sa-border, #d1d5db);
      border-radius: var(--sa-radius, 6px);
      font-size: 14px;
      cursor: pointer;
      background: #fff;
      color: #374151;
    }
    .btn:hover { border-color: var(--sa-primary, #f97316); color: var(--sa-primary, #f97316); }
    :host(.embedded) .hide-android { display: none; }
  </style>
  <div class="heading-row hide-android">
    <h1 class="heading">My account</h1>
    <button class="btn" id="sign-out">Sign out</button>
  </div>
  <div class="card"><div class="card-section">
    <div class="field"><div class="label">First name</div><div class="value" id="first-name"></div></div>
    <div class="field"><div class="label">Last name</div><div class="value" id="last-name"></div></div>
    <div class="field"><div class="label">Email</div><div class="value" id="email"></div></div>
    <div class="field"><div class="label">Phone number</div><div class="value" id="phone-number"></div></div>
  </div></div>
`

class SaUser extends HTMLElement {
  connectedCallback() {
    const token = localStorage.getItem('sa_token')
    if (!token) {
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = `${signIn}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = template
    this._api = apiClient(token)

    this._load()

    this.shadowRoot.getElementById('sign-out').addEventListener('click', () => {
      localStorage.removeItem('sa_token')
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = signIn
    })
  }

  async _load() {
    const res = await this._api.get('/user')
    if (res.status === 401) {
      localStorage.removeItem('sa_token')
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = `${signIn}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }
    const user = await res.json()
    this.shadowRoot.getElementById('first-name').textContent = user.first_name || '—'
    this.shadowRoot.getElementById('last-name').textContent = user.last_name || '—'
    this.shadowRoot.getElementById('email').textContent = user.email || '—'
    this.shadowRoot.getElementById('phone-number').textContent = user.phone_number || '—'
  }
}

customElements.define('sa-user', SaUser)
