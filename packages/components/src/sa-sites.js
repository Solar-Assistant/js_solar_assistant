import { apiClient, siteUrl, inviteRoles } from '@solar-assistant/api'
import { cardStyles } from './styles.js'

const template = `
  <style>
    :host { display: block; font-family: inherit; }
    :host(.embedded) .hide-android { display: none; }
    ${cardStyles}

    /* List */
    .sites-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .sites-table thead td { font-weight: 600; padding: 0 12px 10px 0; color: #374151; border-bottom: 1px solid var(--sa-border, #d1d5db); }
    .sites-table tbody tr { border-bottom: 1px solid var(--sa-border, #d1d5db); }
    .sites-table tbody tr:last-child { border-bottom: none; }
    .sites-table td { padding: 10px 12px 10px 0; vertical-align: middle; }
    .site-caption { font-weight: 500; }
    .site-hardware { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .site-owner { color: #374151; }
    td.buttons { text-align: right; white-space: nowrap; }
    .btn {
      padding: 5px 12px;
      border: 1px solid var(--sa-border, #d1d5db);
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      cursor: pointer;
      background: #fff;
      color: #374151;
    }
    .btn:hover { border-color: var(--sa-primary, #f97316); color: var(--sa-primary, #f97316); }

    /* Detail */
    .heading {
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .action-link { font-weight: 400; font-size: 13px; color: var(--sa-primary, #f97316); cursor: pointer; }
    .action-link:hover { text-decoration: underline; }
    .breadcrumb { color: #6b7280; }
    .breadcrumb a { font-weight: 700; }
    .breadcrumb a { color: var(--sa-primary, #f97316); cursor: pointer; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .form-field {
      display: flex;
      align-items: baseline;
      gap: 12px;
      padding: 5px 0;
      font-size: 14px;
    }
    .form-field label { min-width: 130px; color: #6b7280; font-size: 13px; flex-shrink: 0; }
    .form-value { color: #111827; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead td { font-weight: 600; padding-bottom: 8px; color: #374151; }
    tbody td { padding: 6px 0; color: #111827; border-top: 1px solid var(--sa-border, #d1d5db); vertical-align: middle; }
    td.user-actions { text-align: right; white-space: nowrap; }
    .role-radios { display: flex; flex-direction: column; gap: 6px; }
    .role-radios label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; cursor: pointer; }
    .role-label { font-size: 13px; color: #6b7280; text-transform: capitalize; }
    .role-select {
      padding: 6px 10px;
      border: 1px solid var(--sa-border, #e3e5e6);
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      color: #111827;
      background: #fff;
      cursor: pointer;
    }
    .role-select:disabled { color: #6b7280; background: #f9fafb; cursor: default; }
    .remove-btn {
      margin-left: 8px;
      padding: 3px 8px;
      font-size: 12px;
      border: 1px solid #fca5a5;
      border-radius: var(--sa-radius, 6px);
      background: #fff;
      color: #ef4444;
      cursor: pointer;
    }
    .remove-btn:hover { background: #fef2f2; }
    .invite-form {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: flex-end;
      padding-top: 12px;
      border-top: 1px solid var(--sa-border, #d1d5db);
      margin-top: 8px;
    }
    .invite-form input, .invite-form select {
      padding: 6px 10px;
      border: 1px solid var(--sa-border, #d1d5db);
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      color: #111827;
    }
    .invite-form input { flex: 1; min-width: 140px; }
    .invite-submit {
      padding: 6px 14px;
      background: var(--sa-primary, #f97316);
      color: #fff;
      border: none;
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      cursor: pointer;
    }
    .invite-cancel { font-size: 13px; color: #6b7280; cursor: pointer; padding: 6px 4px; }
    .invite-cancel:hover { color: #111827; }
    .connect {
      display: inline-block;
      padding: 8px 14px;
      background: var(--sa-primary, #f97316);
      color: #fff;
      border: none;
      border-radius: var(--sa-radius, 6px);
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
    }
    .empty { color: #6b7280; font-size: 14px; }
    .error { color: #ef4444; font-size: 14px; }
  </style>
  <div class="list"></div>
`


function field(label, value) {
  if (!value && value !== 0) return ''
  return `<div class="form-field"><label>${label}</label><div class="form-value">${value}</div></div>`
}

// Display name for a site — mirrors SACloud.Site.caption/1.
function caption(site) {
  return site.name && site.name.length ? site.name : `Unregistered #${site.id}`
}

function registered(site) {
  return !!(site.name && site.name.length)
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString()
}

class SaSites extends HTMLElement {
  connectedCallback() {
    const token = localStorage.getItem('sa_token')
    if (!token) {
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = `${signIn}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = template
    this._token = token
    this._api = apiClient(token)
    this._sites = []
    this._currentUser = null

    this._onHashChange = () => this._route()
    window.addEventListener('hashchange', this._onHashChange)

    this._api.get('/user').then(r => r.json()).then(u => { this._currentUser = u })
    this._route()
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._onHashChange)
  }

  async _route() {
    const hashStr = location.hash.slice(1)
    const [path, queryStr] = hashStr.split('?')
    const [id, action] = path.split('/')
    const params = new URLSearchParams(queryStr || '')

    if (id === 'register') {
      this._renderRegister(params.get('uid'))
    } else if (id) {
      if (!this._sites.length) await this._fetchSites()
      if (action === 'invite') this._renderInvite(id)
      else this._loadSite(id)
    } else {
      this._renderList()
    }
  }

  async _fetchSites() {
    const res = await this._api.get('/sites')
    if (res.status === 401) {
      localStorage.removeItem('sa_token')
      const signIn = this.getAttribute('sign-in') || '/sign_in'
      window.location.href = `${signIn}?return_to=${encodeURIComponent(location.pathname)}`
      return
    }
    this._sites = await res.json()
  }

  async _renderList() {
    const list = this.shadowRoot.querySelector('.list')
    list.innerHTML = ''

    if (!this._sites.length) await this._fetchSites()

    if (!this._sites.length) {
      list.innerHTML = '<p class="empty">No sites found.</p>'
      return
    }

    list.innerHTML = `
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700">Sites</h1>
      <div class="card"><div class="card-section">
        <table class="sites-table">
          <thead>
            <tr><td>Name</td><td>Owner</td><td></td></tr>
          </thead>
          <tbody>
            ${this._sites.map(site => {
              const ownerName = site.owner
                ? [site.owner.first_name, site.owner.last_name].filter(Boolean).join(' ')
                : ''
              return `
                <tr>
                  <td>
                    <div class="site-caption">${caption(site)}</div>
                    ${site.description ? `<div class="site-hardware">${site.description}</div>` : ''}
                  </td>
                  <td class="site-owner">${ownerName}</td>
                  <td class="buttons"><button class="btn" data-id="${site.id}">View</button></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div></div>
    `

    list.querySelectorAll('.btn').forEach(el => {
      el.addEventListener('click', () => { location.hash = el.dataset.id })
    })
  }

  async _loadSite(id) {
    const list = this.shadowRoot.querySelector('.list')
    list.innerHTML = ''

    try {
      const siteRes = await this._api.get(`/sites/${id}`)
      if (siteRes.status === 401) {
        localStorage.removeItem('sa_token')
        window.location.href = this.getAttribute('sign-in') || '/sign_in'
        return
      }
      if (!siteRes.ok) {
        list.innerHTML = '<p class="error">Failed to load site.</p>'
        return
      }
      const site = await siteRes.json()

      // Keep the cached list in sync so the index reflects fresh data.
      const idx = this._sites.findIndex(s => s.id == id)
      if (idx >= 0) this._sites[idx] = site
      else this._sites.push(site)

      // /sites/:id already embeds the user list — no separate /users call needed.
      const users = site.users || []
      const name = caption(site)
      const description = site.description
      const ownerName = site.owner
        ? [site.owner.first_name, site.owner.last_name].filter(Boolean).join(' ')
        : null

      list.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 16px">
          <h1 style="margin:0;font-size:24px;font-weight:700">
            <span class="breadcrumb hide-android"><a class="back">Sites</a> › </span>${name}
          </h1>
          ${siteUrl(site) ? `<a class="connect hide-android" href="${siteUrl(site)}" target="_blank">Connect →</a>` : ''}
        </div>

        <div class="card">
          <div class="card-section">
            ${field('Name', name)}
            ${field('Description', description)}
            ${field('Inverter', site.inverter)}
            ${field('Battery', site.battery)}
            ${field('Owner', ownerName)}
          </div>
        </div>

        ${registered(site) ? `
        <div class="heading">
          User access
          <button class="btn" data-invite="${id}">+ Invite user</button>
        </div>
        <div class="card">
          <div class="card-section">
            ${users.length ? `
              <table>
                <thead><tr><td>Name</td><td>Email</td><td>Role</td></tr></thead>
                <tbody>
                  ${users.map(u => `
                    <tr data-user-id="${u.id}">
                      <td>${[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td>${u.email}</td>
                      <td>
                        ${u.role === 'owner'
                          ? `<select class="role-select" disabled>
                               <option selected>Owner</option>
                             </select>`
                          : `<select class="role-select" data-user-id="${u.id}" data-original="${u.role}">
                               <option value="member" ${u.role === 'member' ? 'selected' : ''}>Viewer</option>
                               <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                               <option value="none">None</option>
                             </select>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="empty">No users.</p>'}
          </div>
          ${users.some(u => u.role !== 'owner') ? `
            <div class="card-footer">
              <button class="connect save-access">Save</button>
            </div>
          ` : ''}
        </div>
        ` : ''}

        ${site.local_ip || site.build_date || site.last_seen_at ? `
          <div class="heading">Device info</div>
          <div class="card">
            <div class="card-section">
              ${field('Local IP', site.local_ip)}
              ${field('Last seen', formatDate(site.last_seen_at))}
              ${field('Software build', formatDate(site.build_date))}
            </div>
          </div>
        ` : ''}
      `

      const root = list

      root.querySelector('.back').addEventListener('click', () => { location.hash = '' })
      root.querySelector('[data-invite]')?.addEventListener('click', () => { location.hash = `${id}/invite` })


      root.querySelector('.save-access')?.addEventListener('click', () => this._saveAccess(id, root))

    } catch {
      list.innerHTML = '<p class="error">Failed to load site.</p>'
    }
  }

  async _renderInvite(id) {
    const list = this.shadowRoot.querySelector('.list')
    const site = this._sites.find(s => s.id == id) || {}
    const name = caption(site)
    const roles = inviteRoles(site, this._currentUser)

    list.innerHTML = `
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:700">
        <span class="breadcrumb">
          <span class="hide-android"><a class="back-list">Sites</a> › </span>
          <a class="back-site">${name}</a> ›
          Invite user
        </span>
      </h1>
      <div class="card">
        <div class="card-section">
          <div class="form-field">
            <label>Email</label>
            <div style="flex:1">
              <input class="invite-email" type="email" placeholder="user@example.com" style="width:100%;padding:6px 10px;border:1px solid var(--sa-border,#d1d5db);border-radius:var(--sa-radius,6px);font-size:13px;box-sizing:border-box" />
              <span class="field-error" data-field="email" style="color:#ef4444;font-size:12px"></span>
            </div>
          </div>
          <div class="form-field">
            <label>First name</label>
            <div style="flex:1">
              <input class="invite-first" type="text" style="width:100%;padding:6px 10px;border:1px solid var(--sa-border,#d1d5db);border-radius:var(--sa-radius,6px);font-size:13px;box-sizing:border-box" />
              <span class="field-error" data-field="first_name" style="color:#ef4444;font-size:12px"></span>
            </div>
          </div>
          <div class="form-field">
            <label>Last name</label>
            <div style="flex:1">
              <input class="invite-last" type="text" style="width:100%;padding:6px 10px;border:1px solid var(--sa-border,#d1d5db);border-radius:var(--sa-radius,6px);font-size:13px;box-sizing:border-box" />
              <span class="field-error" data-field="last_name" style="color:#ef4444;font-size:12px"></span>
            </div>
          </div>
          <div class="form-field">
            <label>Role</label>
            <div class="role-radios">
              ${roles.map(val => [val, val === 'member' ? 'Viewer' : val.charAt(0).toUpperCase() + val.slice(1)]).map(([val,label]) => `
                <label>
                  <input type="radio" name="invite-role" value="${val}" ${val === 'member' ? 'checked' : ''} class="invite-role" />
                  ${label}
                </label>`).join('')}
            </div>
          </div>
        </div>
        <div class="card-footer">
          <button class="connect invite-submit">Invite</button>
        </div>
      </div>
    `

    list.querySelector('.back-list').addEventListener('click', () => { location.hash = '' })
    list.querySelector('.back-site').addEventListener('click', () => { location.hash = id })
    list.querySelector('.invite-submit').addEventListener('click', async () => {
      const email = list.querySelector('.invite-email').value.trim()
      list.querySelectorAll('.field-error').forEach(el => el.textContent = '')
      if (!email) {
        list.querySelector('.field-error[data-field="email"]').textContent = "can't be blank"
        return
      }
      const res = await this._api.post(`/sites/${id}/users`, {
        email,
        first_name: list.querySelector('.invite-first').value.trim(),
        last_name: list.querySelector('.invite-last').value.trim(),
        role: list.querySelector('.invite-role:checked')?.value || 'member',
      })
      if (res.ok) location.hash = id
      else {
        const body = await res.json()
        const all = { ...body?.errors, ...body?.errors?.user }
        list.querySelectorAll('.field-error').forEach(el => {
          const msgs = all[el.dataset.field]
          if (msgs) el.textContent = msgs[0]
        })
      }
    })
  }

  async _saveAccess(siteId, root) {
    const btn = root.querySelector('.save-access')
    if (btn) btn.disabled = true
    for (const select of root.querySelectorAll('.role-select')) {
      const userId = select.dataset.userId
      if (!userId) continue
      const role = select.value
      if (role === select.dataset.original) continue
      if (role === 'none') await this._api.delete(`/sites/${siteId}/users/${userId}`)
      else await this._api.patch(`/sites/${siteId}/users/${userId}`, { role })
    }
    this._loadSite(siteId)
  }

  _renderRegister(uid) {
    const list = this.shadowRoot.querySelector('.list')
    list.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 16px">
        <h1 style="margin:0;font-size:24px;font-weight:700">
          <span class="breadcrumb"><a class="back">Sites</a> › </span>Register site
        </h1>
      </div>
      <div class="card">
        <div class="card-section">
          <div class="form-field">
            <label>Name</label>
            <input class="reg-name" type="text" placeholder="my-site" />
            <span class="field-error" data-field="name" style="color:#ef4444;font-size:12px"></span>
          </div>
          <div class="form-field">
            <label>Description</label>
            <input class="reg-description" type="text" placeholder="My home system" />
          </div>
        </div>
        <div class="card-footer">
          <div class="buttons-right">
            <button class="btn btn-primary reg-submit">Register site</button>
          </div>
        </div>
      </div>
      <p class="error reg-error" style="display:none"></p>
    `

    list.querySelector('.back').addEventListener('click', () => { location.hash = '' })

    list.querySelector('.reg-submit').addEventListener('click', async () => {
      const name = list.querySelector('.reg-name').value.trim()
      const description = list.querySelector('.reg-description').value.trim()
      const errorEl = list.querySelector('.reg-error')
      const nameError = list.querySelector('.field-error[data-field="name"]')

      nameError.textContent = ''
      errorEl.style.display = 'none'

      const res = await this._api.post('/sites/register', { uid, name, description })

      if (res.ok) {
        const site = await res.json()
        const idx = this._sites.findIndex(s => s.id === site.id)
        if (idx >= 0) this._sites[idx] = site
        else this._sites.push(site)
        location.hash = site.id
      } else {
        const body = await res.json()
        if (body?.errors?.name) {
          nameError.textContent = body.errors.name[0]
        } else {
          errorEl.textContent = body?.error || 'Failed to register site.'
          errorEl.style.display = ''
        }
      }
    })
  }
}

customElements.define('sa-sites', SaSites)
