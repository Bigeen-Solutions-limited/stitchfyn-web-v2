import React, { useState } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'
import { useInviteSystemAdmin } from '../hooks/useUsers'
import { parseApiError } from '../../../lib/errors/parse-api-error'

interface Props {
  onClose: () => void
  onInvited: (invite: { inviteUrl: string; name: string; email: string }) => void
}

// Adds another platform administrator. They get full access to every company, so this sits behind a deliberate form,
// and the API records who invited whom in the admin audit log.
export function AddSystemAdminSlideOver({ onClose, onInvited }: Props) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const invite = useInviteSystemAdmin()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    invite.mutate(
      { email: email.trim(), fullName: fullName.trim() },
      {
        onSuccess: (created) => {
          onInvited({ inviteUrl: created.inviteUrl, name: created.fullName, email: created.email })
          onClose()
        },
      },
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 1300 }}>
      <form onSubmit={submit} style={{
        backgroundColor: 'white', width: '400px', height: '100%', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Add System Admin</h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }} aria-label="Close">
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
          A system admin can see and change every company on StitchFYN. They'll get an email with a link to set their password.
        </p>

        <div>
          <label htmlFor="sysadmin-name" style={labelStyle}>Full Name *</label>
          <input id="sysadmin-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label htmlFor="sysadmin-email" style={labelStyle}>Email Address *</label>
          <input id="sysadmin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>

        {invite.isError && (
          <div role="alert" style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.85rem', color: '#991b1b' }}>
            {parseApiError(invite.error).detail}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onClose} style={{ ...btnStyle, flex: 1 }}>Cancel</button>
          <button type="submit" disabled={!email || !fullName || invite.isPending}
            style={{ ...btnStyle, flex: 2, backgroundColor: '#1e293b', color: 'white', border: 'none', fontWeight: 600 }}>
            {invite.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.875rem',
}
