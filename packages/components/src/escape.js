// The components build their markup as strings and assign it with innerHTML, so
// every value that arrives from the API has to pass through here on the way in.
// A site's description, a member's name and an inverter model are all text some
// customer typed: to the portal they are attacker-controlled, and an innerHTML
// assignment will not run an injected <script> but will happily run the onerror
// handler on an injected <img>.
//
// Quotes are escaped along with the tag characters because several of these
// values land inside an attribute rather than between elements.
const ESCAPES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[<>&"']/g, c => ESCAPES[c])
}
