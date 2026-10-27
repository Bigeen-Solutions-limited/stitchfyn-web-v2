import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllUsers } from '../hooks/useUsers'
import { AdminLoadError } from '../components/AdminLoadError'
import { AddSystemAdminSlideOver } from '../components/AddSystemAdminSlideOver'
import { InviteLinkDialog } from '../../auth/components/InviteLinkDialog'

export function UserList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [invite, setInvite] = useState<{ inviteUrl: string; name: string; email: string } | null>(null)

  const { data: users, isLoading, isError, refetch } = useAllUsers({ search: search || undefined })

  if (isError) return <AdminLoadError onRetry={() => refetch()} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>All Users</h1>
        <button onClick={() => setAdding(true)} style={{
          padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: 'white',
          cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
        }}>
          Add System Admin
        </button>
      </div>
      {adding && <AddSystemAdminSlideOver onClose={() => setAdding(false)} onInvited={setInvite} />}
      {invite && <InviteLinkDialog open inviteUrl={invite.inviteUrl} name={invite.name} email={invite.email} onClose={() => setInvite(null)} />}

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', minWidth: '280px', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Full Name', 'Email', 'Role', 'Company', 'Status', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : !users?.length ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{u.fullName}</td>
                <td style={{ ...tdStyle, color: '#64748b' }}>{u.email}</td>
                <td style={tdStyle}>{u.role}</td>
                <td style={{ ...tdStyle, color: '#64748b' }}>{u.companyName ?? '—'}</td>
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
                  <button
                    onClick={() => navigate(`/system-admin/users/${u.id}`)}
                    style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem',
  fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '0.875rem', color: '#374151',
}
