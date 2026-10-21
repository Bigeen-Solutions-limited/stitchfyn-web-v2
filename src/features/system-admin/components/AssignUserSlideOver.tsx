import React, { useState } from 'react'
import { useAssignUser } from '../hooks/useCompanies'
import type { AssignUserDTO, AssignableRole } from '../types'
import { Close as CloseIcon } from '@mui/icons-material';

interface Props {
  companyId: string
  onClose: () => void
  onSuccess?: (invite?: { inviteUrl: string; name: string; email: string }) => void
}

export function AssignUserSlideOver({ companyId, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AssignableRole>('MANAGER')
  const [ownerConflict, setOwnerConflict] = useState<string | null>(null)

  const assignUser = useAssignUser(companyId)

  const submit = (acknowledgeOwnerDowngrade = false) => {
    const dto: AssignUserDTO = {
      email: email.trim(),
      fullName: fullName.trim() || undefined,
      role,
      acknowledgeOwnerDowngrade,
    }

    assignUser.mutate(dto, {
      onSuccess: (data) => {
        onSuccess?.(data.inviteUrl ? { inviteUrl: data.inviteUrl, name: dto.fullName ?? dto.email, email: dto.email } : undefined)
        onClose()
      },
      onError: (error: any) => {
        if (error.response?.status === 409) {
          const msg = error.response?.data?.message ?? 'This company already has an owner.'
          setOwnerConflict(msg)
        }
      },
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 1300,
    }}>
      <div style={{
        backgroundColor: 'white', width: '400px', height: '100%',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Assign User
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }} aria-label="Close"><CloseIcon sx={{ fontSize: 20 }} /></button>
        </div>

        {ownerConflict && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d', fontSize: '0.85rem', color: '#92400e',
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{ownerConflict}</p>
            <p style={{ margin: '0 0 12px' }}>Continuing will downgrade the current owner to Manager.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setOwnerConflict(null); submit(true) }}
                style={{ ...btnStyle, backgroundColor: '#d97706', color: 'white', border: 'none' }}
                disabled={assignUser.isPending}
              >
                Confirm Downgrade
              </button>
              <button onClick={() => setOwnerConflict(null)} style={btnStyle}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Full Name <span style={{ color: '#94a3b8' }}>(required for new users)</span></label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)} style={inputStyle}>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="TAILOR">Tailor</option>
            <option value="FRONT_DESK">Front Desk</option>
          </select>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ ...btnStyle, flex: 1 }}>Cancel</button>
          <button
            onClick={() => submit(false)}
            disabled={!email || assignUser.isPending}
            style={{ ...btnStyle, flex: 2, backgroundColor: '#1e293b', color: 'white', border: 'none', fontWeight: 600 }}
          >
            {assignUser.isPending ? 'Assigning...' : 'Assign User'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.875rem',
}
