import React, { useState } from 'react'
import { useAddStore } from '../hooks/useCompanies'
import { Close as CloseIcon } from '@mui/icons-material';

interface Props {
  companyId: string
  onClose: () => void
}

export function AddStoreSlideOver({ companyId, onClose }: Props) {
  const [storeName, setStoreName] = useState('')
  const [address, setAddress] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const addStore = useAddStore(companyId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addStore.mutate(
      { storeName, address: address || undefined, isDefault },
      { onSuccess: onClose },
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 1300,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'white', width: '360px', height: '100%',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', padding: '32px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Add Store
          </h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }} aria-label="Close"><CloseIcon sx={{ fontSize: 20 }} /></button>
        </div>

        <div>
          <label style={labelStyle}>Store Name *</label>
          <input
            required
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Main Branch"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Address (optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Lagos Street"
            style={inputStyle}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Set as default store
        </label>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onClose} style={{ ...btnStyle, flex: 1 }}>Cancel</button>
          <button
            type="submit"
            disabled={!storeName || addStore.isPending}
            style={{ ...btnStyle, flex: 2, backgroundColor: '#1e293b', color: 'white', border: 'none', fontWeight: 600 }}
          >
            {addStore.isPending ? 'Adding...' : 'Add Store'}
          </button>
        </div>
      </form>
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
