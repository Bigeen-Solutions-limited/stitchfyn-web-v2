interface Props {
  ownerEmail: string
  onDismiss: () => void
}

// The new owner sets their password from the emailed link, so no password is shown here
export function VerificationEmailSentNotice({ ownerEmail, onDismiss }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '32px',
        width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
          Company created
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b' }}>
          A verification email has been sent to the owner. They'll set their own password
          when they click the link — no credentials to share.
        </p>

        <div style={{
          backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px 16px',
          marginBottom: '20px',
        }}>
          <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#0f172a' }}>
            {ownerEmail}
          </code>
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
