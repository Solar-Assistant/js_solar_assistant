import { cardStyles } from './styles.js'
import { resolveApi, redirectToSignIn, timeAgo } from './sites-shared.js'
import { t } from './i18n.js'

const POLL_MS = 5000

function makeTemplate() {
  return `
  <style>
    :host { display: block; font-family: inherit; }
    ${cardStyles}
    .heading { font-size: 22px; font-weight: 600; margin: 0 0 20px; }
    .row {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--sa-border, #e3e5e6);
    }
    .row:last-child { border-bottom: none; }
    .head { font-weight: 600; }
    .col { flex: 1 1 0; min-width: 0; }
    .col-status { flex: 0 0 90px; }
    /* Shown only once a device answers on this network. See _probe(). */
    .status { color: transparent; }
    .online .status { color: #16a34a; font-weight: 600; }
    .empty { color: #6b7280; padding: 10px 0; }
    .probes { display: none; }
    .help { margin-top: 24px; }
    .help p { margin: 0 0 8px; }
    .help .title { font-weight: 600; }
  </style>
  <h1 class="heading">${t('local_network_devices')}</h1>
  <div class="card"><div class="card-section">
    <div class="row head">
      <div class="col col-status">${t('status')}</div>
      <div class="col">${t('network_ip')}</div>
      <div class="col">${t('url')}</div>
      <div class="col">${t('connected')}</div>
    </div>
    <div id="rows"></div>
    <div class="empty" id="empty" hidden>${t('no_local_devices')}</div>
  </div></div>
  <div class="probes" id="probes"></div>
  <div class="card help"><div class="card-section">
    <p class="title">${t('not_seeing_your_device')}</p>
    <p>${t('local_discovery_explainer')}</p>
    <p>${t('local_discovery_hotspot_hint')}</p>
  </div></div>
`
}

class SaSitesLocal extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()

    this._api = resolveApi(this)
    if (!this._api) return

    this._rows = new Map()   // site id -> row element, kept across polls
    this._probes = new Map() // site id -> probe <img>
    this._run = 0
    this._load()
  }

  disconnectedCallback() {
    clearTimeout(this._timer)
  }

  async _load() {
    // Units on the network you are browsing from, not your own sites.
    const uid = this._uid()
    let res
    try {
      res = await this._api.get('/sites/local', uid ? { uid } : undefined)
    } catch {
      this._timer = setTimeout(() => this._load(), POLL_MS)
      return
    }
    if (res.status === 401) return redirectToSignIn(this)

    if (res.ok) this._render(await res.json())
    this._timer = setTimeout(() => this._load(), POLL_MS)
  }

  // The router passes uid from the hash; location.search is for a standalone mount.
  _uid() {
    return this.getAttribute('uid') || new URLSearchParams(location.search).get('uid')
  }

  _render(sites) {
    const container = this.shadowRoot.getElementById('rows')
    const seen = new Set()

    for (const site of sites) {
      seen.add(site.id)
      let row = this._rows.get(site.id)
      if (!row) {
        // Kept across polls so the class set by a probe survives.
        row = document.createElement('div')
        row.className = 'row'
        row.innerHTML = `
          <div class="col col-status"><span class="status">${t('online')}</span></div>
          <div class="col ip"></div>
          <div class="col url"></div>
          <div class="col seen"></div>`
        container.appendChild(row)
        this._rows.set(site.id, row)
      }

      const ip = row.querySelector('.ip')
      if (site.local_ip) {
        ip.innerHTML = ''
        const a = document.createElement('a')
        a.href = `http://${site.local_ip}`
        a.target = '_blank'
        a.rel = 'noreferrer'
        a.textContent = site.local_ip
        ip.appendChild(a)
      } else {
        ip.textContent = t('unknown')
      }

      // Where the unit can be reached from anywhere, once it has a name. The
      // server reports it: a partner's sites are on the partner's own domain.
      const url = row.querySelector('.url')
      url.innerHTML = ''
      const link = document.createElement('a')
      if (site.url) {
        link.href = site.url
        link.target = '_blank'
        link.rel = 'noreferrer'
        link.textContent = new URL(site.url).host
        url.appendChild(link)
      } else if (site.uid_match) {
        // Not reachable yet, and it is the unit this page was opened for — so
        // this is the row that can be given a name and a cloud address.
        link.href = `/sites/register?uid=${encodeURIComponent(this._uid())}`
        link.textContent = t('access_via_cloud')
        url.appendChild(link)
      }

      row.querySelector('.seen').textContent = timeAgo(site.last_seen_at)
    }

    for (const [id, row] of this._rows) {
      if (seen.has(id)) continue
      row.remove()
      this._rows.delete(id)
      this._probes.get(id)?.remove()
      this._probes.delete(id)
    }

    this.shadowRoot.getElementById('empty').hidden = sites.length > 0
    this._probe(sites)
  }

  // Only the browser can tell whether a device is reachable here, so each one is
  // asked for an image over the LAN. It loading is the proof; nothing else knows.
  _probe(sites) {
    const container = this.shadowRoot.getElementById('probes')
    this._run += 1

    for (const site of sites) {
      if (!site.local_ip) continue
      let img = this._probes.get(site.id)
      if (!img) {
        img = document.createElement('img')
        img.addEventListener('load', () => this._rows.get(site.id)?.classList.add('online'))
        img.addEventListener('error', () => this._rows.get(site.id)?.classList.remove('online'))
        container.appendChild(img)
        this._probes.set(site.id, img)
      }
      img.src = `http://${site.local_ip}/api/v1/discover.svg?run=${this._run}`
    }
  }
}

customElements.define('sa-sites-local', SaSitesLocal)
