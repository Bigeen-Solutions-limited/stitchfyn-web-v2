import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCompany, useCompanyUsers, useCompanyStores } from '../hooks/useCompanies'
import { useUpdateUserStatus, useRevokeAccess } from '../hooks/useUsers'
import { ChangeStatusModal } from '../components/ChangeStatusModal'
import { AssignUserSlideOver } from '../components/AssignUserSlideOver'
import { AddStoreSlideOver } from '../components/AddStoreSlideOver'
import { InviteLinkDialog } from '../../auth/components/InviteLinkDialog'
import type { UserRecord } from '../types'
import { AdminLoadError } from '../components/AdminLoadError'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  TRIAL:       { bg: '#eff6ff', color: '#1d4ed8' },
  ACTIVE:      { bg: '#f0fdf4', color: '#15803d' },
  SUSPENDED:   { bg: '#fffbeb', color: '#b45309' },
  DEACTIVATED: { bg: '#fef2f2', color: '#991b1b' },
}

export function CompanyDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: company, isLoading, isError, refetch } = useCompany(id)
  const { data: users = [] } = useCompanyUsers(id)
  const { data: stores = [] } = useCompanyStores(id)

  const updateStatus = useUpdateUserStatus()
  const revokeAccess = useRevokeAccess()

  const [tab, setTab] = useState<'users' | 'stores'>('users')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignUser, setShowAssignUser] = useState(false)
  const [showAddStore, setShowAddStore] = useState(false)
  const [revokingUser, setRevokingUser] = useState<UserRecord | null>(null)
  const [revokeNotes, setRevokeNotes] = useState('')
  const [newUserInvite, setNewUserInvite] = useState<{ inviteUrl: string; name: string; email: string } | undefined>()

  if (isError) return <AdminLoadError onRetry={() => refetch()} />
  if (isLoading) return <p style={{ color: '#94a3b8' }}>Loading...</p>
  if (!company) return <p style={{ color: '#94a3b8' }}>Company not found.</p>

  const badge = STATUS_COLORS[company.subscriptionStatus] ?? STATUS_COLORS.TRIAL

  return (
    <div>
      <button
        onClick={() => navigate('/system-admin/companies')}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}
      >
        ← Companies
      </button>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        {/* Left — metadata */}
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
          padding: '24px', width: '280px', flexShrink: 0,
        }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            {company.companyName}
          </h2>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
            backgroundColor: badge.bg, color: badge.color, fontWeight: 600, fontSize: '0.75rem', marginBottom: '20px',
          }}>
            {company.subscriptionStatus}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#475569' }}>
            <MetaRow label="Plan" value={company.subscriptionTier} />
            <MetaRow label="Country" value={company.country} />
            <MetaRow label="Trial Ends" value={company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : '—'} />
            <MetaRow label="Deactivated" value={company.deactivatedAt ? new Date(company.deactivatedAt).toLocaleDateString() : '—'} />
            <MetaRow label="Created" value={company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'} />
            {company.internalNotes && (
              <div>
                <span style={{ fontWeight: 600, color: '#374151' }}>Notes</span>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>{company.internalNotes}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowStatusModal(true)}
            style={{
              marginTop: '20px', width: '100%', padding: '8px', borderRadius: '8px',
              border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#374151',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            Change Status
          </button>
        </div>

        {/* Right — tabs */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {(['users', 'stores'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  backgroundColor: tab === t ? '#1e293b' : '#f1f5f9',
                  color: tab === t ? 'white' : '#374151',
                  fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize',
                }}
              >
                {t} ({t === 'users' ? users.length : stores.length})
              </button>
            ))}
          </div>

          {tab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button onClick={() => setShowAssignUser(true)} style={actionBtnStyle}>
                  Assign User
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!users.length ? (
                    <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No users.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{u.fullName}</td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{u.email}</td>
                      <td style={tdStyle}>{u.role}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                          backgroundColor: u.isActive ? '#f0fdf4' : '#fef2f2',
                          color: u.isActive ? '#15803d' : '#dc2626',
                          fontWeight: 600, fontSize: '0.75rem',
                        }}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {u.isActive ? (
                            <button
                              onClick={() => updateStatus.mutate({ userId: u.id, status: 'SUSPENDED' })}
                              style={smallBtnStyle}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus.mutate({ userId: u.id, status: 'ACTIVE' })}
                              style={smallBtnStyle}
                            >
                              Reinstate
                            </button>
                          )}
                          <button
                            onClick={() => { setRevokingUser(u); setRevokeNotes('') }}
                            style={{ ...smallBtnStyle, color: '#dc2626', borderColor: '#fecaca' }}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'stores' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button onClick={() => setShowAddStore(true)} style={actionBtnStyle}>
                  Add Store
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {['Store Name', 'Created'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!stores.length ? (
                    <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No stores.</td></tr>
                  ) : stores.map((s) => (
                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{s.name}</td>
                      <td style={{ ...tdStyle, color: '#94a3b8' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Revoke access inline confirm */}
      {revokingUser && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', width: '400px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }}>
              Revoke {revokingUser.fullName}'s Access
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
              This removes them from the company but does not delete their account.
            </p>
            <textarea
              placeholder="Reason for revocation..."
              value={revokeNotes}
              onChange={(e) => setRevokeNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRevokingUser(null)} style={smallBtnStyle}>Cancel</button>
              <button
                onClick={() => {
                  revokeAccess.mutate(
                    { userId: revokingUser.id, companyId: id, notes: revokeNotes },
                    { onSuccess: () => setRevokingUser(null) },
                  )
                }}
                disabled={revokeAccess.isPending}
                style={{ ...smallBtnStyle, backgroundColor: '#dc2626', color: 'white', border: 'none', fontWeight: 600 }}
              >
                {revokeAccess.isPending ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && (
        <ChangeStatusModal company={company} onClose={() => setShowStatusModal(false)} />
      )}

      {showAssignUser && (
        <AssignUserSlideOver
          companyId={id}
          onClose={() => setShowAssignUser(false)}
          onSuccess={(invite) => { if (invite) setNewUserInvite(invite) }}
        />
      )}

      {showAddStore && <AddStoreSlideOver companyId={id} onClose={() => setShowAddStore(false)} />}

      {newUserInvite && (
        <InviteLinkDialog
          open
          inviteUrl={newUserInvite.inviteUrl}
          name={newUserInvite.name}
          email={newUserInvite.email}
          onClose={() => setNewUserInvite(undefined)}
        />
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
      <span style={{ color: '#64748b' }}>{value}</span>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem',
  fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px', fontSize: '0.85rem', color: '#374151',
}

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px', border: 'none',
  backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
  fontSize: '0.8rem', fontWeight: 600,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2e8f0',
  backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.78rem',
}
