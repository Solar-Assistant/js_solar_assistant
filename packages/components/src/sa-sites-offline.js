import { sitesStyles, resolveApi, redirectToSignIn, field, linkField, caption, timeField, skeletonField } from './sites-shared.js'
import { escapeHtml } from './escape.js'
import { t } from './i18n.js'

// How long the cloud caches a probe for one site. The countdown runs from the
// server's status_at, not from our request, or it would claim a check that is
// already up to a minute old.
const PROBE_EVERY = 60

// The reachable two are normally followed rather than shown; they only render
// if a site has no url to send the visitor to.
const STATUS_LABEL = {
  connected: 'offline_connected',
  http_error: 'offline_http_error',
  disconnected: 'offline_disconnected',
  proxy_unreachable: 'offline_proxy_unreachable',
  timeout: 'offline_timeout',
  not_found: 'offline_not_found',
}

function makeTemplate() {
  return `
  <style>
    :host { display: block; font-family: inherit; }
    ${sitesStyles}
    .card { max-width: 760px; margin-inline: auto; }
    .centred { text-align: center; }
    .device-icon svg { width: 96px; height: 96px; opacity: .3; }
    .device-icon .cross { fill: #ffffff; }
    .lead { font-size: 18px; margin: 12px 0 0; }
    .dot::before {
      content: ''; display: inline-block; width: 8px; height: 8px;
      border-radius: 50%; margin-right: 7px; vertical-align: middle;
    }
    .dot.positive::before { background: oklch(62% 0.200 143); }
    .dot.forward::before { background: oklch(62% 0.200 265); animation: pulse 1.4s ease-in-out infinite; }
    .dot.negative::before { background: oklch(62% 0.200 32); }
    .dot.caution::before { background: oklch(90% 0.185 95); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    @media (prefers-reduced-motion: reduce) { .dot.pending::before { animation: none; } }
    [hidden] { display: none; }
  </style>
  <div class="card">
    <div class="card-section centred">
      <div class="device-icon">
        <svg viewBox="0 0 48 48" role="img" aria-label="${t('device_offline')}">
          <linearGradient id="offline-cloud" x1="14.242" x2="30.172" y1="8.358" y2="38.695" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f44f5a"/>
            <stop offset=".443" stop-color="#ee3d4a"/>
            <stop offset="1" stop-color="#e52030"/>
          </linearGradient>
          <path fill="url(#offline-cloud)" d="M48,26c0,6.63-5.37,12-12,12c-1.8,0-24.66,0-26.5,0C4.25,38,0,33.75,0,28.5c0-4.54,3.18-8.34,7.45-9.28C9.15,12.21,15.46,7,23,7c5.51,0,10.36,2.78,13.24,7.01C42.76,14.13,48,19.45,48,26z"/>
          <path class="cross" d="M30.01,28.889L26.121,25l3.889-3.889c0.195-0.195,0.195-0.512,0-0.707l-1.414-1.414c-0.195-0.195-0.512-0.195-0.707,0L24,22.879l-3.889-3.889c-0.195-0.195-0.512-0.195-0.707,0l-1.414,1.414c-0.195,0.195-0.195,0.512,0,0.707L21.879,25l-3.889,3.889c-0.195,0.195-0.195,0.512,0,0.707l1.414,1.414c0.195,0.195,0.512,0.195,0.707,0L24,27.121l3.889,3.889c0.195,0.195,0.512,0.195,0.707,0l1.414-1.414C30.206,29.401,30.206,29.084,30.01,28.889z"/>
        </svg>
      </div>
      <p class="lead">${t('device_not_connected')}</p>
    </div>
    <div class="card-section" id="facts" hidden></div>
    <div class="card-section error" id="error" hidden></div>
  </div>
  <div id="probes" hidden></div>
`
}

class SaSitesOffline extends HTMLElement {
  static get observedAttributes() { return ['host'] }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = makeTemplate()
    this._skeleton()
    this._api = resolveApi(this)
    if (this._api) this._load()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'host' && oldValue !== newValue && this._api) this._load()
  }

  disconnectedCallback() {
    clearTimeout(this._timer)
    clearInterval(this._ticker)
  }

  // Drawn before anything is known, so the card has its full shape from the
  // first frame and fills in, rather than appearing a row at a time.
  _skeleton() {
    const facts = this.shadowRoot.getElementById('facts')
    facts.innerHTML = skeletonField(30, 150) + skeletonField(44, 90) +
      skeletonField(62, 110) + skeletonField(104, 96)
    facts.hidden = false
  }

  _fail(message) {
    this.shadowRoot.getElementById('facts').hidden = true
    const error = this.shadowRoot.getElementById('error')
    error.textContent = message
    error.hidden = false
  }

  // The site's name is the first label of the host, the same derivation the
  // cloud makes from this redirect.
  _name() {
    const host = this.getAttribute('host')
    if (!host) return null
    try {
      return new URL(host.includes('://') ? host : `https://${host}`).hostname.split('.')[0]
    } catch {
      return null
    }
  }

  async _load() {
    clearTimeout(this._timer)
    const name = this._name()
    if (!name) return this._fail(t('site_unavailable'))

    if (!this._site) {
      const listed = await this._api.get('/sites', { name })
      if (listed.status === 401) return redirectToSignIn(this)
      if (!listed.ok) return this._fail(t('site_unavailable'))
      this._site = (await listed.json()).find(s => s.name === name)
      if (!this._site) return this._fail(t('site_unavailable'))
    }

    // Paint what we already know before asking the cloud to probe the device.
    // That call reaches out over the network and can take seconds; showing the
    // facts with a pulsing Pending says the check is under way rather than
    // leaving the visitor at a blank card wondering whether anything happened.
    this._render()
    this._check()
  }

  async _check() {
    // Keep the address the proxy sent us intact. The cloud needs the original
    // URI to distinguish the host the visitor actually tried from the site's
    // current URL (notably after a region or partner-domain move).
    const res = await this._api.put(`/sites/${this._site.id}/offline`, {
      uri: this.getAttribute('host'),
    })
    if (res.status === 401) return redirectToSignIn(this)
    // The site went away between resolving it and probing it. Nothing is left to
    // re-probe, so say so and stop: a countdown here would fail again forever.
    if (res.status === 404) return this._settle({ status: 'not_found' })
    // A failed check leaves the facts and the Pending dot standing; there is
    // nothing useful to say beyond "still trying", so try again on the usual beat.
    if (!res.ok) {
      this._timer = setTimeout(() => this._check(), PROBE_EVERY * 1000)
      return
    }

    const report = await res.json()
    // `reachable`, never the status: the device also answered on http_error, and
    // sending the visitor to its own error beats us insisting it is unreachable.
    if (report.reachable && this._site.url) {
      window.location.href = this._site.url
      return
    }
    this._settle(report)
    this._countdown(report.status_at)
  }

  // The probe wins if it has already answered: being on the same network as the
  // device is a more useful thing to tell someone than how the cloud failed.
  _settle(report) {
    if (this._local) return
    const el = this.shadowRoot.getElementById('status')
    if (!el) return
    const label = STATUS_LABEL[report.status]
    el.className = 'dot negative'
    el.textContent = label ? t(label) : t('offline_pending')
  }

  _render() {
    const site = this._site
    const facts = this.shadowRoot.getElementById('facts')

    facts.innerHTML = [
      // Its own page in this portal, not site.url — we have just said the device
      // is unreachable, so linking the visitor at it would be a dead end.
      `<div class="form-field"><label>${t('site')}</label><div class="form-value">` +
        `${escapeHtml(caption(site))} ` +
        `<a href="/sites#${encodeURIComponent(site.id)}" title="${t('open_site')}">\u29C9</a>` +
        `</div></div>`,
      `<div class="form-field"><label>${t('status')}</label><div class="form-value">` +
        `<span class="dot forward" id="status">${t('offline_pending')}</span></div></div>`,
      timeField(t('last_seen'), site.last_seen_at),
      // The device's own configuration page, asking it to diagnose its internet
      // connection — the reason a visitor is on this page at all.
      linkField(t('local_network_ip'), site.local_ip,
        `http://${site.local_ip}/configuration?diagnose_internet=true`),
      // Hidden until a check has actually happened: while one is in flight there
      // is no "again" to count down to, and an empty labelled row reads as broken.
      `<div class="form-field" id="next" hidden><label>${t('checking_again')}</label>` +
        `<div class="form-value" id="countdown"></div></div>`,
    ].join('')
    facts.hidden = false
    this.shadowRoot.getElementById('error').hidden = true

    this._probeLocally(site)
  }

  // The cloud says the site is unreachable from outside; if the browser can
  // still load an asset from it, the visitor is on the same network as it is.
  _probeLocally(site) {
    if (!site.local_ip) return
    const probes = this.shadowRoot.getElementById('probes')
    probes.innerHTML = ''
    const img = document.createElement('img')
    img.onload = () => {
      this._local = true
      const status = this.shadowRoot.getElementById('status')
      if (!status) return
      status.className = 'dot caution'
      status.textContent = t('local_network_only')
    }
    img.src = `http://${site.local_ip}/api/v1/discover.svg?run=${Date.now()}`
    probes.appendChild(img)
  }

  // Counted from the server's own last check, so a visitor arriving mid-cache
  // is told how long is actually left rather than a fresh minute.
  _countdown(statusAt) {
    clearInterval(this._ticker)
    const checked = statusAt ? new Date(statusAt).getTime() : Date.now()
    const el = this.shadowRoot.getElementById('countdown')
    const row = this.shadowRoot.getElementById('next')
    if (row) row.hidden = false

    const tick = () => {
      const left = Math.max(0, Math.ceil((checked + PROBE_EVERY * 1000 - Date.now()) / 1000))
      if (el) el.textContent = t('checking_in_seconds', { seconds: left })
      if (left <= 0) {
        clearInterval(this._ticker)
        this._timer = setTimeout(() => this._load(), 500)
      }
    }
    tick()
    this._ticker = setInterval(tick, 1000)
  }
}

customElements.define('sa-sites-offline', SaSitesOffline)
