// Shared styling for Solar Assistant web components.
// Each component renders into its own shadow root, so styles can't be shared
// via a stylesheet — they're exported as a string and interpolated into each
// component's <style> block. Branding is themed from the host page via the
// --sa-* custom properties (which pierce shadow DOM).

export const cardStyles = `
  /* :visited repeats the same colour deliberately. A portal shows the same site
     list to everyone, so a purple row says only "you have been here before" —
     noise on a dashboard, and a small history leak on a shared screen.
     :where() keeps this at zero specificity: a bare a:visited scores higher than
     a class, so it would paint a button's label its own background colour.
     Author styles beat the browser's purple whatever the specificity. */
  :where(a, a:visited) { color: var(--sa-primary, #475569); }
  .card {
    background: #fff;
    border: 1px solid var(--sa-border, #e3e5e6);
    border-radius: var(--sa-radius, 6px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    margin-bottom: 16px;
    overflow: hidden;
  }
  .card-section { padding: 20px 24px; }
  .card-footer {
    padding: 14px 24px;
    border-top: 1px solid var(--sa-border, #e3e5e6);
    background: #f9fafb;
    display: flex;
    justify-content: flex-end;
  }
`

export const accentBlockStyles = `
  .accent-block {
    background: #eef2ff;
    border-radius: var(--sa-radius, 6px);
    padding: 32px 24px;
    text-align: center;
    color: #374151;
    font-size: 14px;
    line-height: 1.6;
  }
  .accent-block p { margin: 0 0 8px; }
  .accent-block p:last-child { margin: 0; }
  .accent-block a { color: var(--sa-primary, #f97316); }
`
