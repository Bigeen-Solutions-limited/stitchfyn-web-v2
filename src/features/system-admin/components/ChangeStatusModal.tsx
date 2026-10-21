import React, { useState } from 'react'
import type { CompanyRecord, CompanyStatus, ChangeCompanyStatusDTO } from '../types'
import { useChangeCompanyStatus } from '../hooks/useCompanies'
import { WarningAmberRounded as WarningIcon } from '@mui/icons-material';

interface Props {
  company: CompanyRecord
  initialStatus?: CompanyStatus
  onClose: () => void
}

const STATUS_LABELS: Record<CompanyStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
}

const ALLOWED_TARGETS: Record<CompanyStatus, CompanyStatus[]> = {
  TRIAL: ['ACTIVE', 'SUSPENDED'],
  ACTIVE: ['SUSPENDED', 'DEACTIVATED'],
  SUSPENDED: ['ACTIVE'],
  DEACTIVATED: ['ACTIVE'],
}

export function ChangeStatusModal({ company, initialStatus, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedStatus, setSelectedStatus] = useState<CompanyStatus>(
    initialStatus ?? ALLOWED_TARGETS[company.subscriptionStatus][0],
  )
  const [notes, setNotes] = useState('')
  const [confirmName, setConfirmName] = useState('')

  const changeStatus = useChangeCompanyStatus(company.id)
  const targets = ALLOWED_TARGETS[company.subscriptionStatus]

  const handleNext = () => {
    if (selectedStatus === 'DEACTIVATED') {
      setStep(2)
    } else {
      submit()
    }
  }

  const submit = () => {
    const dto: ChangeCompanyStatusDTO = { status: selectedStatus, notes: notes || undefined }
    changeStatus.mutate(dto, { onSuccess: onClose })
  }

  const isDeactivateStep2 = step === 2 && selectedStatus === 'DEACTIVATED'
  const canConfirmDeactivate = confirmName === company.companyName

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '32px',
        width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          Change Company Status
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b' }}>
          {company.companyName} · Current: <strong>{STATUS_LABELS[company.subscriptionStatus]}</strong>
        </p>

        {step === 1 && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>New Status</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {targets.map((s) => (
                  <label key={s} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                    borderRadius: '8px', border: `2px solid ${selectedStatus === s ? '#1e293b' : '#e2e8f0'}`,
                    cursor: 'pointer', backgroundColor: selectedStatus === s ? '#f8fafc' : 'white',
                  }}>
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={selectedStatus === s}
                      onChange={() => setSelectedStatus(s)}
                    />
                    <span style={{ fontWeight: 500, color: selectedStatus === s ? '#0f172a' : '#475569' }}>
                      {STATUS_LABELS[s]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Reason for status change..."
                style={inputStyle}
              />
            </div>

            {selectedStatus === 'DEACTIVATED' && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2',
                border: '1px solid #fecaca', marginBottom: '20px', fontSize: '0.8rem', color: '#991b1b',
              }}>
                <WarningIcon sx={{ fontSize: 16, verticalAlign: '-3px', mr: 0.5 }} aria-hidden />Deactivating will immediately block all users in this company. You will need to confirm.
              </div>
            )}
          </>
        )}

        {isDeactivateStep2 && (
          <>
            <div style={{
              padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fef2f2',
              border: '1px solid #fecaca', marginBottom: '20px',
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#991b1b', fontSize: '0.875rem' }}>
                This will permanently deactivate the company and block all users.
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>
                To confirm, type the company name exactly: <strong>{company.companyName}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Type company name to confirm</label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={company.companyName}
                style={{ ...inputStyle, borderColor: canConfirmDeactivate ? '#10b981' : '#e2e8f0' }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle} disabled={changeStatus.isPending}>
            Cancel
          </button>
          {step === 1 ? (
            <button onClick={handleNext} style={primaryBtnStyle} disabled={changeStatus.isPending}>
              {selectedStatus === 'DEACTIVATED' ? 'Next →' : 'Apply'}
            </button>
          ) : (
            <button
              onClick={submit}
              style={{ ...primaryBtnStyle, backgroundColor: '#dc2626' }}
              disabled={!canConfirmDeactivate || changeStatus.isPending}
            >
              {changeStatus.isPending ? 'Deactivating...' : 'Deactivate'}
            </button>
          )}
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

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: 'none',
  backgroundColor: '#1e293b', color: 'white', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: 600,
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  backgroundColor: 'white', color: '#374151', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: 500,
}
