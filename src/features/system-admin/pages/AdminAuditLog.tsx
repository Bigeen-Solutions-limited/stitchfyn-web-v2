import React, { useState } from 'react'
import { useAdminAuditLog } from '../hooks/useAuditLog'
import { AdminLoadError } from '../components/AdminLoadError'

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  COMPANY_CREATED: { bg: '#f0fdf4', color: '#15803d' },
  COMPANY_STATUS_CHANGED: { bg: '#fefce8', color: '#a16207' },
  USER_SUSPENDED: { bg: '#fef2f2', color: '#dc2626' },
  USER_REINSTATED: { bg: '#f0fdf4', color: '#15803d' },
  USER_ROLE_CHANGED: { bg: '#eff6ff', color: '#1d4ed8' },
  USER_ACCESS_REVOKED: { bg: '#fff7ed', color: '#c2410c' },
  USER_ASSIGNED: { bg: '#faf5ff', color: '#7e22ce' },
  STORE_ADDED: { bg: '#f0fdf4', color: '#15803d' },
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_COLORS[action] ?? { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
      backgroundColor: style.bg, color: style.color,
      fontWeight: 600, fontSize: '0.75rem',
    }}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function StateCell({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span style={{ color: '#94a3b8' }}>—</span>
  return (
    <pre style={{ margin: 0, fontSize: '0.75rem', color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function AdminAuditLog() {
  const [page, setPage] = useState(1)
  const { data: entries, isLoading, isError, refetch } = useAdminAuditLog(page, 50)

  if (isError) return <AdminLoadError onRetry={() => refetch()} />

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
        Admin Audit Log
      </h1>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Time', 'Action', 'Target', 'Actor', 'Before → After', 'Notes'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : !entries?.length ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No audit entries yet.</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#64748b' }}>
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <ActionBadge action={e.action} />
                </td>
                <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>{e.targetType}</span><br />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{e.targetId.slice(0, 16)}…</span>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                  {e.actorId.slice(0, 16)}…
                </td>
                <td style={{ ...tdStyle, maxWidth: '240px' }}>
                  {e.previousState && <div><span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>BEFORE</span><StateCell value={e.previousState} /></div>}
                  {e.nextState && <div style={{ marginTop: e.previousState ? '4px' : 0 }}><span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>AFTER</span><StateCell value={e.nextState} /></div>}
                </td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.8rem' }}>{e.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={pageBtnStyle}
        >
          Previous
        </button>
        <span style={{ padding: '8px 12px', fontSize: '0.875rem', color: '#64748b' }}>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!entries || entries.length < 50}
          style={pageBtnStyle}
        >
          Next
        </button>
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

const pageBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  backgroundColor: 'white', color: '#374151', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: 500,
}
