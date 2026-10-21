import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUsers'
import { useUpdateUserStatus, useRevokeAccess, useChangeUserRole } from '../hooks/useUsers'
import { AdminLoadError } from '../components/AdminLoadError'

const ROLES = ['OWNER', 'MANAGER', 'TAILOR'] as const

export function UserDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: user, isLoading, isError, refetch } = useUser(id)
  const updateStatus = useUpdateUserStatus()
  const revokeAccess = useRevokeAccess()
  const changeRole = useChangeUserRole()

  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeNotes, setRevokeNotes] = useState('')
  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  if (isError) return <AdminLoadError onRetry={() => refetch()} />
  if (isLoading) return <p style={{ color: '#94a3b8' }}>Loading...</p>
  if (!user) return <p style={{ color: '#94a3b8' }}>User not found.</p>

  return (
    <div style={{ maxWidth: '600px' }}>
      <button
        onClick={() => navigate('/system-admin/users')}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}
      >
        ← Users
      </button>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              {user.fullName}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{user.email}</p>
          </div>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
            backgroundColor: user.isActive ? '#f0fdf4' : '#fef2f2',
            color: user.isActive ? '#15803d' : '#dc2626',
            fontWeight: 700, fontSize: '0.8rem',
          }}>
            {user.isActive ? 'Active' : 'Suspended'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.875rem' }}>
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Company" value={user.companyName ?? 'None'} />
          <InfoRow label="Company ID" value={user.companyId ?? '—'} />
          <InfoRow label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {user.isActive ? (
          <button
            onClick={() => updateStatus.mutate({ userId: id, status: 'SUSPENDED' })}
            disabled={updateStatus.isPending}
            style={dangerBtnStyle}
          >
            {updateStatus.isPending ? 'Suspending...' : 'Suspend User'}
          </button>
        ) : (
          <button
            onClick={() => updateStatus.mutate({ userId: id, status: 'ACTIVE' })}
            disabled={updateStatus.isPending}
            style={{ ...primaryBtnStyle, backgroundColor: '#10b981' }}
          >
            {updateStatus.isPending ? 'Reinstating...' : 'Reinstate User'}
          </button>
        )}

        {user.companyId && (
          <button onClick={() => setRevokeOpen(true)} style={outlineBtnStyle}>
            Revoke Company Access
          </button>
        )}

        <button
          onClick={() => { setSelectedRole(user.role); setRoleOpen(true) }}
          style={outlineBtnStyle}
        >
          Change Role
        </button>
      </div>

      {roleOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', width: '360px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Change Role</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
              Changing {user.fullName}'s role will send them an email notification.
            </p>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', marginBottom: '16px', fontFamily: 'inherit' }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRoleOpen(false)} style={outlineBtnStyle}>Cancel</button>
              <button
                onClick={() => {
                  changeRole.mutate({ userId: id, role: selectedRole }, {
                    onSuccess: () => setRoleOpen(false),
                  })
                }}
                disabled={selectedRole === user.role || changeRole.isPending}
                style={primaryBtnStyle}
              >
                {changeRole.isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', width: '400px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }}>
              Revoke Company Access
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
              This removes {user.fullName} from {user.companyName}. Their account is not deleted.
            </p>
            <textarea
              placeholder="Reason for revocation (required)..."
              value={revokeNotes}
              onChange={(e) => setRevokeNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRevokeOpen(false)} style={outlineBtnStyle}>Cancel</button>
              <button
                onClick={() => {
                  if (!user.companyId) return
                  revokeAccess.mutate(
                    { userId: id, companyId: user.companyId, notes: revokeNotes },
                    {
                      onSuccess: () => {
                        setRevokeOpen(false)
                        navigate('/system-admin/users')
                      },
                    },
                  )
                }}
                disabled={!revokeNotes.trim() || revokeAccess.isPending}
                style={dangerBtnStyle}
              >
                {revokeAccess.isPending ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ color: '#374151', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: 'none',
  backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: 600,
}

const dangerBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  backgroundColor: '#dc2626',
}

const outlineBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  backgroundColor: 'white', color: '#374151', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: 500,
}
