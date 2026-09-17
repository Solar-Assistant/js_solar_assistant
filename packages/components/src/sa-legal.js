import { legalDocument } from '@solar-assistant/api'
import { t } from './i18n.js'

// Renders one of SolarAssistant's legal documents inside a partner's own page.
//
//   <sa-legal document="terms"></sa-legal>
//
// Deliberately light DOM, not shadow: the fragment ships without styles so it
// inherits the surrounding page's typography, which a shadow root would cut it
// off from. Fetched cross-origin from solar-assistant.io, because /api/v1 is not
// routed on a partner's own host, and it names its organization the same way
// <sa-register> and <sa-sign-in> do rather than leaving the hostname to imply it.
class SaLegal extends HTMLElement {
  static get observedAttributes() { return ['document', 'organization-id'] }

  connectedCallback() {
    // The document may be set after this element is in the DOM; the attribute
    // callback picks that up. Loading now would fetch an undefined path.
    if (this.getAttribute('document')) this._load()
  }

  // Said plainly at development time, as <sa-register> does, rather than left to
  // surface as a 404 from an API that cannot tell whose document to serve.
  _missingOrganization() {
    this.textContent = 'Error: organization-id attribute is required on <sa-legal>.'
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ((name === 'document' || name === 'organization-id') && oldValue !== newValue) this._load()
  }

  async _load() {
    const name = this.getAttribute('document')
    if (!name) return
    const organizationId = this.getAttribute('organization-id')
    if (!organizationId) return this._missingOrganization()

    let res
    try {
      res = await legalDocument(name, organizationId)
    } catch {
      return this._fail()
    }
    if (!res.ok) return this._fail()

    // Our own document from our own API, so the markup is trusted; it arrives
    // as a fragment with no scripts, styles or document chrome.
    this.innerHTML = await res.text()
  }

  _fail() {
    this.textContent = t('legal_unavailable')
  }
}

customElements.define('sa-legal', SaLegal)
