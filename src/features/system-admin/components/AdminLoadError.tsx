interface Props {
  onRetry: () => void
}

// Shown when an admin page's data fails to load, so the page is never left blank
export function AdminLoadError({ onRetry }: Props) {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#475569' }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>This page couldn't load.</p>
      <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>Check your connection, or sign in again if your session has ended.</p>
      <button
        onClick={onRetry}
        style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
      >
        Try again
      </button>
    </div>
  )
}
