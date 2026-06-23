// Shared styling for Solar Assistant web components.
// Each component renders into its own shadow root, so styles can't be shared
// via a stylesheet — they're exported as a string and interpolated into each
// component's <style> block. Branding is themed from the host page via the
// --sa-* custom properties (which pierce shadow DOM).

export const cardStyles = `
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
