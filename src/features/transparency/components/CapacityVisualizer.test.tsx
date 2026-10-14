import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CapacityVisualizer } from './CapacityVisualizer'
import { useProjection } from '../hooks/useProjection'
import type { VisibilityBundle } from '../api/transparency.api'

vi.mock('../hooks/useProjection', () => ({
  useProjection: vi.fn(),
}))

// The real response for 75% utilisation (amber, "Heavy Load"), as returned by the server
const AMBER_BUNDLE: VisibilityBundle = {
  capacity: { status: 'HEAVY', utilization: 75 },
  trust: { status: 'VERIFIED' },
  forensics: { status: 'SEALED', lastSealAt: '2026-08-26T00:00:00.000Z' },
  uiHint: 'AMBER',
  displayStatus: 'Heavy Load',
  syncedAt: new Date().toISOString(),
}

// The real response when there is no data yet: grey, never a made-up green
const GRAY_BUNDLE: VisibilityBundle = {
  capacity: { status: 'UNKNOWN' },
  trust: { status: 'UNKNOWN' },
  forensics: { status: 'UNKNOWN', lastSealAt: '2026-08-26T00:00:00.000Z' },
  uiHint: 'GRAY',
  displayStatus: 'Insufficient Data',
  syncedAt: new Date().toISOString(),
}

describe('CapacityVisualizer', () => {
  it('renders the real flat AMBER payload without throwing and selects the AMBER color', () => {
    vi.mocked(useProjection).mockReturnValue({
      data: AMBER_BUNDLE,
      isLoading: false,
      isError: false,
      isStale: false,
    })

    render(<CapacityVisualizer />)

    const label = screen.getByText('HEAVY LOAD')
    expect(label).toBeInTheDocument()
    expect(getComputedStyle(label).color).toBe('rgb(245, 158, 11)') // #F59E0B (AMBER)
  })

  it('renders the real flat GRAY empty-state payload without throwing and does not fall through to green', () => {
    vi.mocked(useProjection).mockReturnValue({
      data: GRAY_BUNDLE,
      isLoading: false,
      isError: false,
      isStale: false,
    })

    render(<CapacityVisualizer />)

    const label = screen.getByText('INSUFFICIENT DATA')
    expect(label).toBeInTheDocument()
    const color = getComputedStyle(label).color
    expect(color).not.toBe('rgb(16, 185, 129)') // not #10B981 (GREEN/nominal)
    expect(color).toBe('rgb(156, 163, 175)') // #9CA3AF (grey, same as the stale treatment)
  })
})
