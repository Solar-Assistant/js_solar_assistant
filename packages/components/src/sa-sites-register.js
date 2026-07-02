import { sitesStyles, resolveApi, redirectToSignIn } from './sites-shared.js'
import { showErrors } from './form-utils.js'
import { t } from './i18n.js'

// Default device-registration outlet for <sa-sites>. Reads the `uid` param
// (the device to claim) and posts /sites/register, then opens the new site.
class SaSitesRegister extends HTMLElement {
  static get observedAttributes() { return ['uid'] }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `<style>${sitesStyles}</style><div class="view"></div>`
    }
    this._api = resolveApi(this)
    if (this._api) this._render()
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'uid' && newV !== oldV && this.shadowRoot && this._api) this._render()
  }

  _render() {
    const view = this.shadowRoot.querySelector('.view')
    view.innerHTML = `
      <div class="row">
        <h1 class="title"><span class="breadcrumb"><a class="back">${t('sites')}</a> › </span>${t('register_site')}</h1>
      </div>
      <div class="card">
        <div class="card-section">
          <div class="form-field">
            <label>${t('name')}</label>
            <input class="invite-input" name="name" type="text" placeholder="my-site" />
          </div>
          <div class="form-field">
            <label>${t('description')}</label>
            <input class="invite-input" name="description" type="text" />
          </div>
        </div>
        <div class="card-footer"><button class="connect reg-submit">${t('register_site')}</button></div>
      </div>
      <p class="error reg-error" style="display:none"></p>
    `

    view.querySelector('.back').addEventListener('click', () => { location.hash = '' })
    view.querySelector('.reg-submit').addEventListener('click', () => this._submit(view))
  }

  async _submit(view) {
    const errorEl = view.querySelector('.reg-error')
    view.querySelectorAll('.field-error').forEach(el => el.remove())
    errorEl.style.display = 'none'

    const res = await this._api.post('/sites/register', {
      uid: this.getAttribute('uid'),
      name: view.querySelector('[name="name"]').value.trim(),
      description: view.querySelector('[name="description"]').value.trim(),
    })
    if (res.status === 401) return redirectToSignIn(this)

    if (res.ok) {
      const site = await res.json()
      location.hash = site.id
    } else {
      const body = await res.json()
      if (body?.errors) {
        const leftover = showErrors(view, body.errors)
        if (leftover) { errorEl.textContent = leftover; errorEl.style.display = '' }
      } else {
        errorEl.textContent = body?.error || t('failed_register')
        errorEl.style.display = ''
      }
    }
  }
}

customElements.define('sa-sites-register', SaSitesRegister)
