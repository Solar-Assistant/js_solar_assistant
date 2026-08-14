import { apiClient, readToken, clearSession } from '@solar-assistant/api'
import { cardStyles } from './styles.js'
import { t, locales, localeName, setLocale, currentLocale } from './i18n.js'

function makeTemplate() {
  return `
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
      padding: 5px 12px;
      border: none;
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      cursor: pointer;
      background: var(--sa-primary, #f97316);
      color: #fff;
      text-decoration: none;
    }
    .btn:hover { opacity: 0.85; }
    .heading-actions { display: flex; align-items: center; gap: 10px; }
    .locale-select {
      padding: 5px 10px;
      border: 1px solid var(--sa-border, #e3e5e6);
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      color: #111827;
      background: #fff;
      cursor: pointer;
    }
    :host(.embedded) .hide-android { display: none; }
  </style>
  <div class="heading-row hide-android">
    <h1 class="heading">${t('my_account')}</h1>
    <div class="heading-actions">
      <select class="locale-select" id="locale" aria-label="${t('language')}">${localeOptions()}</select>
      <button class="btn" id="sign-out">${t('sign_out')}</button>
    </div>
  </div>
  <div class="card"><div class="card-section">
    <div class="field"><div class="label">${t('first_name')}</div><div class="value" id="first-name"></div></div>
    <div class="field"><div class="label">${t('last_name')}</div><div class="value" id="last-name"></div></div>
    <div class="field"><div class="label">${t('email')}</div><div class="value" id="email"></div></div>
    <div class="field"><div class="label">${t('phone_number')}</div><div class="value" id="phone-number"></div></div>
  </div></div>
`
}

// Named in each language rather than in the current one: someone looking for their
// own language is scanning for the word they know, not for our translation of it.
//
// Selected from the locale in force rather than from the account's stored one. The
// two agree in the ordinary case — signing in applies the stored locale — and when
// they don't, the page is in one language and the account remembers another, so
// showing the account's would caption the screen with a language it isn't in.
function localeOptions() {
  const current = currentLocale()
  return locales()
    .map(code => ({ code, name: localeName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) =>
      `<option value="${code}"${code === current ? ' selected' : ''}>${name}</option>`,
    )
    .join('')
}

class SaUser extends HTMLElement {
  connectedCallback() {
    const token = readToken('sa_token')
    if (!token) {
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = `${signIn}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()
    this._api = apiClient(token)

    this._load()

    this.shadowRoot.getElementById('sign-out').addEventListener('click', () => {
      clearSession('sa_token')
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = signIn
    })

    this.shadowRoot.getElementById('locale').addEventListener('change', e => {
      this._changeLocale(e.target.value)
    })
  }

  async _changeLocale(code) {
    setLocale(code)
    // Saved against the account so the choice follows them to another browser and
    // to everything else that reads user.locale. Their own device is already
    // covered by setLocale, so a server that refuses is not worth stopping for.
    try {
      await this._api.patch('/user', { locale: code })
    } catch {}
    // The components read their locale once, at load, and the page around them is
    // the integrator's — which they may well serve per language. Reloading is the
    // one thing that gets both into the new language together.
    window.location.reload()
  }

  async _load() {
    const res = await this._api.get('/user')
    if (res.status === 401) {
      clearSession('sa_token')
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
