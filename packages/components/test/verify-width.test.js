import { afterEach, expect, test } from 'vitest'
import '../src/index.js'

// Cloudflare Turnstile draws a fixed 300×65 widget. In a narrower iframe it scrolls
// sideways, and that scrollbar eats the 70px height so it scrolls down too — which
// is what the reset form did at 280px while registration, at 300px, did not.
const TURNSTILE_WIDTH = 300

function declaredWidth(css, selector) {
  const escaped = selector.replace(/\./g, '\\.')
  const match = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{[^}]*?\\bwidth:\\s*(\\d+)px`))
  return match ? Number(match[1]) : null
}

afterEach(() => { document.body.innerHTML = '' })

test.each([
  ['sa-register', '<sa-register organization-id="1"></sa-register>', '.fields'],
  ['sa-sign-in-reset', '<sa-sign-in-reset></sa-sign-in-reset>', 'form'],
])('%s leaves the verification widget room for its fixed width', (_tag, html, container) => {
  document.body.innerHTML = html
  const el = document.body.firstElementChild

  expect(el.shadowRoot.querySelector('.verify iframe')).not.toBeNull()
  const css = [...el.shadowRoot.querySelectorAll('style')].map(s => s.textContent).join('\n')
  expect(declaredWidth(css, container)).toBeGreaterThanOrEqual(TURNSTILE_WIDTH)
})
