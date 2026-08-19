import { sitesStyles, caption, resolveApi, redirectToSignIn } from './sites-shared.js'
import { accentBlockStyles } from './styles.js'
import { t } from './i18n.js'
import { escapeHtml } from './escape.js'

const template = `<style>${sitesStyles}${accentBlockStyles}</style><div class="list"></div>`

// Default list outlet for <sa-sites>. Renders the user's sites and navigates to
// a site by setting location.hash. Swap it with <sa-sites index="your-list">;
// a custom list only needs to set `location.hash = id` to open a site.
class SaSitesIndex extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = template
    this._api = resolveApi(this)
    if (this._api) this._render()
  }

  async _render() {
    const list = this.shadowRoot.querySelector('.list')
    const bar = w => `<span style="display:inline-block;width:${w}px;height:0.8em;background:#e5e7eb;border-radius:3px;vertical-align:middle"></span>`
    const skeletonRow = (nw, ow) => `<tr><td>${bar(nw)}</td><td>${bar(ow)}</td><td></td></tr>`
    list.innerHTML = `
      <h1 class="title">${t('sites')}</h1>
      <div class="card"><div class="card-section">
        <table class="sites-table">
          <thead><tr><td>${t('name')}</td><td>${t('owner')}</td><td></td></tr></thead>
          <tbody>${skeletonRow(140, 90)}${skeletonRow(110, 100)}${skeletonRow(160, 80)}</tbody>
        </table>
      </div></div>
    `

    const res = await this._api.get('/sites')
    if (res.status === 401) return redirectToSignIn(this)
    const sites = await res.json()

    if (!sites.length) {
      list.innerHTML = `
        <h1 class="title">${t('sites')}</h1>
        <div class="accent-block">
          <p>${t('no_sites')}</p>
        </div>
      `
      return
    }

    list.innerHTML = `
      <h1 class="title">${t('sites')}</h1>
      <div class="card"><div class="card-section">
        <table class="sites-table">
          <thead><tr><td>${t('name')}</td><td>${t('owner')}</td><td></td></tr></thead>
          <tbody>
            ${sites.map(site => {
              const ownerName = site.owner
                ? [site.owner.first_name, site.owner.last_name].filter(Boolean).join(' ')
                : ''
              return `
                <tr>
                  <td>
                    <div class="site-caption">${escapeHtml(caption(site))}</div>
                    ${site.description ? `<div class="site-hardware">${escapeHtml(site.description)}</div>` : ''}
                  </td>
                  <td class="site-owner">${escapeHtml(ownerName)}</td>
                  <td class="buttons"><button class="btn" data-id="${site.id}">${t('view')}</button></td>
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
}

customElements.define('sa-sites-index', SaSitesIndex)
