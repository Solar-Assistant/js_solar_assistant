import { expect, test } from 'vitest'
import { accentBlockStyles, cardStyles } from '../src/styles.js'
import { sitesStyles } from '../src/sites-shared.js'

// The Connect button's label went invisible because `a, a:visited` in the shared
// card styles scored 0,1,1 and beat `.btn` at 0,1,0.
//
// Nothing that renders the page can catch that: getComputedStyle must report a
// link as though it had never been visited, so the rule is held to zero
// specificity instead, where nothing it is mixed with can lose to it.

const SHEETS = { cardStyles, sitesStyles, accentBlockStyles }

// The selector groups of a stylesheet, with at-rule blocks stepped over: what is
// inside @keyframes reads like a selector and is not one.
function selectorGroups(css) {
  const rules = css.replace(/@[\w-]+[^{]*\{(?:[^{}]*\{[^{}]*\})*?[^{}]*\}/g, '')
  return [...rules.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(([, group]) => group.trim())
}

// A selector nobody can reach by class, id, attribute or :host — so it applies
// wherever that element appears, and a component's own class has to be able to
// override it.
const unscoped = selector => !/[.#[]/.test(selector) && !selector.includes(':host')

test('a shared rule that reaches every element of a kind carries no weight', () => {
  const offenders = []

  for (const [name, css] of Object.entries(SHEETS)) {
    for (const group of selectorGroups(css)) {
      // :where() is the zero-specificity wrapper; what is inside it cannot beat
      // anything, so only what is left outside is worth weighing.
      for (const selector of group.replace(/:where\([^)]*\)/g, '').split(',')) {
        const trimmed = selector.trim()
        if (trimmed && unscoped(trimmed) && trimmed.includes(':')) {
          offenders.push(`${name}: ${group}`)
        }
      }
    }
  }

  expect(offenders).toEqual([])
})

// Colour comes from the host page through the --sa-* custom properties, which
// pierce shadow DOM. A hard-coded brand colour is a partner's portal painted in
// somebody else's.
test('the shared link and button colours come from the host page', () => {
  expect(cardStyles).toMatch(/:where\(a, a:visited\) \{ color: var\(--sa-primary/)
  expect(sitesStyles).toMatch(/\.btn \{[^}]*background: var\(--sa-primary/)
})
