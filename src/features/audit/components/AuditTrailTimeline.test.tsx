import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuditTrailTimeline } from './AuditTrailTimeline'
import { apiClient } from '../../../infrastructure/http/axios.client'
import type { AuditRecord } from '../types'

vi.mock('../../../infrastructure/http/axios.client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

function makeRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'rec-1',
    companyId: 'company-1',
    actorId: 'user-1',
    action: 'FABRIC_INTAKE_RECORDED',
    targetId: 'order-1',
    contextId: 'garment-1',
    metadata: {},
    occurredAt: '2026-09-10T09:00:00.000Z',
    witnessedAt: '2026-09-10T09:00:00.000Z',
    signature: 'abc123signature',
    ...overrides,
  }
}

function renderTimeline(props: { targetId?: string; contextId?: string; title?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditTrailTimeline {...props} />
    </QueryClientProvider>,
  )
}

describe('AuditTrailTimeline', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('1. requests the garment-scoped context route, not the order-wide target route, when contextId is provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [makeRecord()] })
    renderTimeline({ contextId: 'garment-1' })

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/audit/context/garment-1')
    })
    expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/audit/target/'))
  })

  it('2. falls back to the order-wide target route when only targetId is provided (existing behavior preserved)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
    renderTimeline({ targetId: 'order-1' })

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/audit/target/order-1')
    })
  })

  it('3. displays FABRIC_INTAKE_RECORDED with its quantity/unit metadata rendered', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        makeRecord({
          action: 'FABRIC_INTAKE_RECORDED',
          metadata: { fabricType: 'Silk', quantity: 5.5, quantityUnit: 'yards' },
        }),
      ],
    })
    renderTimeline({ contextId: 'garment-1' })

    expect(await screen.findByText(/fabric intake recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/^quantity: 5\.5$/i)).toBeInTheDocument()
    expect(screen.getByText(/quantity unit: yards/i)).toBeInTheDocument()
  })

  it('3b. shows stored photo URLs as links, hides internal ids, and names the actor', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        makeRecord({
          action: 'PROGRESS_PHOTO_RECORDED',
          actorId: 'user-1',
          actorName: 'Tunde Tailor',
          metadata: { progressPhotoId: 'p-1', secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/x.jpg' },
        }),
      ],
    })
    renderTimeline({ contextId: 'garment-1' })

    const link = await screen.findByRole('link', { name: /view photo/i })
    expect(link).toHaveAttribute('href', 'https://res.cloudinary.com/demo/image/upload/v1/x.jpg')
    expect(screen.queryByText(/res\.cloudinary\.com/)).not.toBeInTheDocument()
    expect(screen.queryByText(/p-1/)).not.toBeInTheDocument()
    expect(screen.getByText(/actor: tunde tailor/i)).toBeInTheDocument()
  })

  it('4. displays FABRIC_CONFIRMED when present, alongside the intake entry', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        makeRecord({ id: 'rec-1', action: 'FABRIC_INTAKE_RECORDED', witnessedAt: '2026-09-10T09:00:00.000Z' }),
        makeRecord({
          id: 'rec-2',
          action: 'FABRIC_CONFIRMED',
          witnessedAt: '2026-09-10T10:00:00.000Z',
          metadata: { quantity: 5.5, quantityUnit: 'yards', confirmationChannel: 'in_person' },
        }),
      ],
    })
    renderTimeline({ contextId: 'garment-1' })

    expect(await screen.findByText(/fabric intake recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/fabric confirmed/i)).toBeInTheDocument()
  })

  it('5. a custom title is shown for the garment-scoped view; the generic label is used when no title is given', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [makeRecord()] })
    renderTimeline({ contextId: 'garment-1', title: 'Material Audit Trail' })

    expect(await screen.findByText('Material Audit Trail')).toBeInTheDocument()
    expect(screen.queryByText('Immutable Audit Trail')).not.toBeInTheDocument()
  })

  it('6. multiple garments display their own history — no cross-contamination', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/audit/context/garment-A') {
        return { data: [makeRecord({ id: 'a-1', contextId: 'garment-A', metadata: { fabricType: 'Silk' } })] }
      }
      if (url === '/audit/context/garment-B') {
        return { data: [makeRecord({ id: 'b-1', contextId: 'garment-B', metadata: { fabricType: 'Velvet' } })] }
      }
      return { data: [] }
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <div data-testid="panel-a"><AuditTrailTimeline contextId="garment-A" /></div>
        <div data-testid="panel-b"><AuditTrailTimeline contextId="garment-B" /></div>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/audit/context/garment-A')
      expect(apiClient.get).toHaveBeenCalledWith('/audit/context/garment-B')
    })

    const panelA = container.querySelector('[data-testid="panel-a"]') as HTMLElement
    const panelB = container.querySelector('[data-testid="panel-b"]') as HTMLElement

    await waitFor(() => {
      expect(panelA.textContent).toContain('Silk')
      expect(panelB.textContent).toContain('Velvet')
    })
    // Each garment's panel shows only its own fabric
    expect(panelA.textContent).not.toContain('Velvet')
    expect(panelB.textContent).not.toContain('Silk')
  })

  it('7. loading state is shown before records arrive', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {})) // never resolves
    renderTimeline({ contextId: 'garment-1' })

    expect(screen.getByText(/synchronizing audit records/i)).toBeInTheDocument()
  })

  it('8. renders nothing when there are no records for this garment (empty state)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
    const { container } = renderTimeline({ contextId: 'garment-1' })

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled()
    })
    expect(container.textContent).not.toContain('Audit Trail')
  })

  it('9. renders nothing (same as empty) rather than throwing when the request fails — documents existing behavior', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network error'))
    const { container } = renderTimeline({ contextId: 'garment-1' })

    // Wait until loading has finished, not just until the request was made
    await waitFor(() => {
      expect(screen.queryByText(/synchronizing/i)).not.toBeInTheDocument()
    })
    expect(container.textContent).not.toContain('Audit Trail')
  })
})
