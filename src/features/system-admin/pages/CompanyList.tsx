import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanies } from '../hooks/useCompanies'
import type { CompanyStatus, SubscriptionTier } from '../types'
import { AdminLoadError } from '../components/AdminLoadError'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  TRIAL:       { bg: '#eff6ff', color: '#1d4ed8' },
  ACTIVE:      { bg: '#f0fdf4', color: '#15803d' },
  SUSPENDED:   { bg: '#fffbeb', color: '#b45309' },
  DEACTIVATED: { bg: '#fef2f2', color: '#991b1b' },
}

export function CompanyList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CompanyStatus | ''>('')
  const [tier, setTier] = useState<SubscriptionTier | ''>('')
  const [search, setSearch] = useState('')

  const { data: companies, isLoading, isError, refetch } = useCompanies({
    status: status || undefined,
    tier: tier || undefined,
    search: search || undefined,
  })

  if (isError) return <AdminLoadError onRetry={() => refetch()} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Companies</h1>
        <button
          onClick={() => navigate('/system-admin/companies/new')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600,
          }}
        >
          + Add Company
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: '240px' }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}>
          <option value="">All Statuses</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value as any)} style={inputStyle}>
          <option value="">All Plans</option>
          <option value="TRIAL">Trial</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
        </select>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Company Name', 'Owner Email', 'Plan', 'Status', 'Stores', 'Users', 'Created', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : !companies?.length ? (
              <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No companies found.</td></tr>
            ) : companies.map((c) => {
              const badge = STATUS_COLORS[c.subscriptionStatus] ?? STATUS_COLORS.TRIAL
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{c.companyName}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{c.ownerEmail ?? '—'}</td>
                  <td style={tdStyle}>{c.subscriptionTier}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                      backgroundColor: badge.bg, color: badge.color,
                      fontWeight: 600, fontSize: '0.75rem',
                    }}>
                      {c.subscriptionStatus}
                    </span>
                  </td>
                  <td style={tdStyle}>{c.storeCount}</td>
                  <td style={tdStyle}>{c.userCount}</td>
                  <td style={{ ...tdStyle, color: '#94a3b8' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => navigate(`/system-admin/companies/${c.id}`)}
                      style={{
                        padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
                        backgroundColor: 'white', color: '#374151', cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
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

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
}
