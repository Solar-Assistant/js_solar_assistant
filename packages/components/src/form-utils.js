// Injects field-level error spans next to inputs whose `name` matches an API
// error key. Clears any previously injected spans first. Returns leftover
// errors (no matching input) as a string for the catch-all error element.
export function showErrors(root, errors) {
  root.querySelectorAll('.field-error').forEach(el => el.remove())
  const leftover = []
  for (const [field, msgs] of Object.entries(errors)) {
    const input = root.querySelector(`[name="${field}"]`)
    if (input) {
      const span = document.createElement('span')
      span.className = 'field-error'
      span.textContent = [].concat(msgs).join(', ')
      const anchor = input.closest('label') ?? input
      anchor.insertAdjacentElement('afterend', span)
    } else {
      leftover.push(`${field.replace(/_/g, ' ')} ${[].concat(msgs).join(', ')}`)
    }
  }
  return leftover.join('. ')
}
