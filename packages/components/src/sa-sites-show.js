import { siteUrl, normalizeRole } from '@solar-assistant/api'
import { sitesStyles, field, caption, registered, resolveApi, redirectToSignIn, formatDay, linkField, timeField, bar, skeletonField } from './sites-shared.js'
import { t } from './i18n.js'
import { escapeHtml } from './escape.js'
import { showErrors } from './form-utils.js'

// Default detail outlet for <sa-sites>. Reads the `site-id` route param (the
// router updates it on navigation, like useParams), loads /sites/:id, and shows
// the site, its user-access table, and device info. Swap with
// <sa-sites show="your-detail">; a custom detail just reads `site-id`.
class SaSitesShow extends HTMLElement {
  static get observedAttributes() { return ['site-id'] }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `<style>${sitesStyles}
        .rename-link { margin-left: 10px; cursor: pointer; font-size: 13px; }
        form.rename { display: flex; align-items: center; gap: 8px; }
      </style><div class="view"></div>`
    }
    this._api = resolveApi(this)
    const id = this.getAttribute('site-id')
    if (this._api && id) this._load(id)
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'site-id' && newV && newV !== oldV && this.shadowRoot && this._api) {
      this._load(newV)
    }
  }

  async _load(id) {
    const view = this.shadowRoot.querySelector('.view')
    view.innerHTML = `
      <div class="row">
        <h1 class="title"><span class="breadcrumb hide-android"><a class="back">${t('sites')}</a> › </span>${bar(140)}</h1>
      </div>
      <div class="card"><div class="card-section">
        ${skeletonField(60, 130)}${skeletonField(72, 180)}${skeletonField(54, 110)}${skeletonField(52, 95)}${skeletonField(46, 140)}
      </div></div>
    `
    view.querySelector('.back')?.addEventListener('click', () => { location.hash = '' })

    try {
      const res = await this._api.get(`/sites/${id}`)
      if (res.status === 401) return redirectToSignIn(this)
      if (!res.ok) { view.innerHTML = `<p class="error">${t('failed_load_site')}</p>`; return }
      const site = await res.json()

      const users = site.users || []
      const name = caption(site)
      const ownerName = site.owner
        ? [site.owner.first_name, site.owner.last_name].filter(Boolean).join(' ')
        : null

      view.innerHTML = `
        <div class="row">
          <h1 class="title"><span class="breadcrumb hide-android"><a class="back">${t('sites')}</a> › </span>${escapeHtml(name)}</h1>
          ${siteUrl(site) ? `<a class="btn hide-android" href="${escapeHtml(siteUrl(site))}" target="_blank">${t('connect')}</a>` : ''}
        </div>

        <div class="card"><div class="card-section">
          <div class="form-field" data-name-field>
            <label>${t('name')}</label>
            <div class="form-value">
              ${escapeHtml(name)}
              ${registered(site) ? `<a class="rename-link" data-rename>${t('rename')}</a>` : ''}
            </div>
          </div>
          ${field(t('description'), site.description)}
          ${field(t('inverter'), site.inverter)}
          ${field(t('battery'), site.battery)}
          ${field(t('owner'), ownerName)}
        </div></div>

        ${registered(site) ? `
        <div class="heading">
          ${t('user_access')}
          <button class="btn" data-invite>${t('invite_user')}</button>
        </div>
        <div class="card">
          <div class="card-section">
            ${users.length ? `
              <table>
                <thead><tr><td>${t('name')}</td><td>${t('email')}</td><td>${t('role')}</td></tr></thead>
                <tbody>
                  ${users.map(u => ({ ...u, role: normalizeRole(u.role) })).map(u => `
                    <tr data-user-id="${u.id}">
                      <td>${escapeHtml([u.first_name, u.last_name].filter(Boolean).join(' ')) || '—'}</td>
                      <td>${escapeHtml(u.email)}</td>
                      <td>
                        ${u.role === 'owner'
                          ? `<select class="role-select" disabled><option selected>${t('role_owner')}</option></select>`
                          : `<select class="role-select" data-user-id="${u.id}" data-original="${escapeHtml(u.role)}">
                               <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>${t('role_viewer')}</option>
                               <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('role_admin')}</option>
                               <option value="none">${t('role_none')}</option>
                             </select>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `<p class="empty">${t('no_users')}</p>`}
          </div>
          ${users.some(u => u.role !== 'owner') ? `
            <div class="card-footer"><button class="connect save-access">${t('save')}</button></div>
          ` : ''}
        </div>
        ` : ''}

        ${site.local_ip || site.build_date || site.last_seen_at ? `
          <div class="heading">${t('device_info')}</div>
          <div class="card"><div class="card-section">
            ${linkField(t('local_ip'), site.local_ip, `http://${site.local_ip}`)}
            ${timeField(t('last_seen'), site.last_seen_at)}
            ${field(t('software_build'), formatDay(site.build_date))}
          </div></div>
        ` : ''}
      `

      view.querySelector('.back').addEventListener('click', () => { location.hash = '' })
      view.querySelector('[data-invite]')?.addEventListener('click', () => { location.hash = `${id}/invite` })
      view.querySelector('.save-access')?.addEventListener('click', () => this._saveAccess(id, view))
      view.querySelector('[data-rename]')?.addEventListener('click', () => this._editName(id, site, view))
    } catch {
      view.innerHTML = `<p class="error">${t('failed_load_site')}</p>`
    }
  }

  _editName(id, site, view) {
    const cell = view.querySelector('[data-name-field] .form-value')
    cell.innerHTML = `
      <form class="rename">
        <input name="name" value="${escapeHtml(site.name)}" autocomplete="off" />
        <button class="btn" type="submit" data-rename-save>${t('save')}</button>
        <a class="rename-link" data-rename-cancel>${t('cancel')}</a>
        <span class="error rename-error"></span>
      </form>
    `
    const form = cell.querySelector('form')
    form.addEventListener('submit', e => { e.preventDefault(); this._saveName(id, form) })
    cell.querySelector('[data-rename-save]').addEventListener('click', e => { e.preventDefault(); this._saveName(id, form) })
    cell.querySelector('[data-rename-cancel]').addEventListener('click', () => this._load(id))
  }

  async _saveName(id, form) {
    const error = form.querySelector('.rename-error')
    error.textContent = ''
    // Not form.name: that is the form's own name attribute, which shadows the control.
    const name = form.querySelector('[name="name"]').value.trim()
    const res = await this._api.patch(`/sites/${id}/name`, { name })
    if (res.status === 401) return redirectToSignIn(this)
    const body = await res.json().catch(() => ({}))

    // The device only learns a new host by re-activating. Its own activate page,
    // reached through the proxy under the new name, does that without a callback.
    if (res.ok) {
      window.location.href = `${body.url}/configuration/activate`
      return
    }
    error.textContent = body.errors ? showErrors(form, body.errors) : (body.error || t('failed_rename'))
  }

  async _saveAccess(siteId, view) {
    const btn = view.querySelector('.save-access')
    if (btn) btn.disabled = true
    for (const select of view.querySelectorAll('.role-select')) {
      const userId = select.dataset.userId
      if (!userId) continue
      const role = select.value
      if (role === select.dataset.original) continue
      if (role === 'none') await this._api.delete(`/sites/${siteId}/users/${userId}`)
      else await this._api.patch(`/sites/${siteId}/users/${userId}`, { role })
    }
    this._load(siteId)
  }
}

customElements.define('sa-sites-show', SaSitesShow)
