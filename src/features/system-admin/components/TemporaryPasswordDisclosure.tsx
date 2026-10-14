import { useState } from 'react'

interface Props {
  password: string
  onDismiss: () => void
}

// Shows a one-time password once; it is never stored, and closing it is final
export function TemporaryPasswordDisclosure({ password, onDismiss }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          Temporary Password
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b' }}>
          Share this password with the user. Store it securely — it will not be shown again.
        </p>

        <div style={{
          backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
        }}>
          <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.05em', color: '#0f172a' }}>
            {password}
          </code>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
              backgroundColor: copied ? '#10b981' : 'white',
              color: copied ? 'white' : '#374151',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <p style={{
          margin: '0 0 24px', fontSize: '0.8rem', color: '#ef4444',
          padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px',
          border: '1px solid #fecaca',
        }}>
          ⚠ This password will not be shown again.
        </p>

        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
          }}
        >
          I've saved it — dismiss
        </button>
      </div>
    </div>
  )
}
