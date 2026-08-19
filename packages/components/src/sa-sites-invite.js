import { inviteRoles } from '@solar-assistant/api'
import { sitesStyles, caption, resolveApi, redirectToSignIn } from './sites-shared.js'
import { showErrors } from './form-utils.js'
import { t } from './i18n.js'
import { escapeHtml } from './escape.js'

// Default invite outlet for <sa-sites>. Reads the `site-id` param, loads the site
// (for its name and to decide which roles can be granted), and posts an invite.
class SaSitesInvite extends HTMLElement {
  static get observedAttributes() { return ['site-id'] }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `<style>${sitesStyles}</style><div class="view"></div>`
    }
    this._api = resolveApi(this)
    const id = this.getAttribute('site-id')
    if (this._api && id) this._render(id)
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'site-id' && newV && newV !== oldV && this.shadowRoot && this._api) {
      this._render(newV)
    }
  }

  async _render(id) {
    const view = this.shadowRoot.querySelector('.view')

    const res = await this._api.get(`/sites/${id}`)
    if (res.status === 401) return redirectToSignIn(this)
    const site = res.ok ? await res.json() : { id }
    const name = caption(site)
    const roles = inviteRoles(site, this.currentUser)
    const roleLabel = { viewer: t('role_viewer'), admin: t('role_admin') }

    view.innerHTML = `
      <h1 class="title">
        <span class="breadcrumb">
          <span class="hide-android"><a class="back-list">${t('sites')}</a> › </span>
          <a class="back-site">${escapeHtml(name)}</a> › ${t('invite_user')}
        </span>
      </h1>
      <div class="card">
        <div class="card-section">
          <div class="form-field">
            <label>${t('email')}</label>
            <input class="invite-input" name="email" type="email" placeholder="user@example.com" />
          </div>
          <div class="form-field">
            <label>${t('first_name')}</label>
            <input class="invite-input" name="first_name" type="text" />
          </div>
          <div class="form-field">
            <label>${t('last_name')}</label>
            <input class="invite-input" name="last_name" type="text" />
          </div>
          <div class="form-field">
            <label>${t('role')}</label>
            <div class="role-radios">
              ${roles.map(val => [val, roleLabel[val] ?? val]).map(([val, label]) => `
                <label>
                  <input type="radio" name="invite-role" value="${val}" ${val === 'viewer' ? 'checked' : ''} class="invite-role" />
                  ${label}
                </label>`).join('')}
            </div>
          </div>
        </div>
        <div class="card-footer"><button class="connect invite-submit">${t('invite')}</button></div>
      </div>
    `

    view.querySelector('.back-list').addEventListener('click', () => { location.hash = '' })
    view.querySelector('.back-site').addEventListener('click', () => { location.hash = id })
    view.querySelector('.invite-submit').addEventListener('click', () => this._submit(id, view))
  }

  async _submit(id, view) {
    const email = view.querySelector('[name="email"]').value.trim()
    view.querySelectorAll('.field-error').forEach(el => el.remove())

    if (!email) {
      showErrors(view, { email: [t('cant_be_blank')] })
      return
    }

    const res = await this._api.post(`/sites/${id}/users`, {
      email,
      first_name: view.querySelector('[name="first_name"]').value.trim(),
      last_name:  view.querySelector('[name="last_name"]').value.trim(),
      role: view.querySelector('.invite-role:checked')?.value || 'viewer',
    })

    if (res.ok) {
      location.hash = id
    } else {
      const body = await res.json()
      const errors = { ...body?.errors, ...body?.errors?.user }
      showErrors(view, errors)
    }
  }
}

customElements.define('sa-sites-invite', SaSitesInvite)
