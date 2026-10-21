import React, { useState } from 'react'
import { useSystemAdminStats } from '../hooks/useStats'
import { ChangeStatusModal } from '../components/ChangeStatusModal'
import { useCompany } from '../hooks/useCompanies'
import { AdminLoadError } from '../components/AdminLoadError'

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '12px', padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', flex: 1,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

function SuspendButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)
  const { data: company } = useCompany(companyId)

  if (!company) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '4px 12px', borderRadius: '6px', border: 'none',
          backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer',
          fontSize: '0.8rem', fontWeight: 600,
        }}
      >
        Suspend
      </button>
      {open && (
        <ChangeStatusModal
          company={company}
          initialStatus="SUSPENDED"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function SystemAdminOverview() {
  const { data: stats, isLoading, isError, refetch } = useSystemAdminStats()

  const activeTrials = stats
    ? (stats.byStatus?.['TRIAL'] ?? 0)
    : 0

  if (isError) return <AdminLoadError onRetry={() => refetch()} />

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
        Platform Overview
      </h1>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <StatCard label="Total Companies" value={stats?.totalCompanies} />
        <StatCard label="Total Users" value={stats?.totalUsers} />
        <StatCard label="Total Stores" value={stats?.totalStores} />
        <StatCard label="Active Trials" value={activeTrials} />
      </div>

      <section>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
          Trials Expiring in 7 Days
        </h2>

        {isLoading ? (
          <p style={{ color: '#94a3b8' }}>Loading...</p>
        ) : !stats?.expiringTrials?.length ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No trials expiring in the next 7 days.</p>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['Company Name', 'Trial End Date', 'Days Remaining', 'Action'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.expiringTrials.map((t) => (
                  <tr key={t.companyId} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{t.companyName}</td>
                    <td style={tdStyle}>{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                        backgroundColor: t.daysRemaining <= 2 ? '#fef2f2' : '#fffbeb',
                        color: t.daysRemaining <= 2 ? '#dc2626' : '#d97706',
                        fontWeight: 600, fontSize: '0.8rem',
                      }}>
                        {t.daysRemaining}d
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <SuspendButton companyId={t.companyId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
