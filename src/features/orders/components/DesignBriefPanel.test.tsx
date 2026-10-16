import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DesignBriefPanel } from './DesignBriefPanel'
import { designBriefApi, type DesignBrief } from '../design-brief.api'

vi.mock('../design-brief.api', () => ({
  designBriefApi: {
    getBrief: vi.fn(),
    createBrief: vi.fn(),
    addSection: vi.fn(),
  },
}))

// Shaped like the API's camelCase GET /orders/:orderId/garments/:garmentId/design-brief response
function makeBrief(overrides: Partial<DesignBrief> = {}): DesignBrief {
  return {
    id: 'brief-1',
    garmentId: 'garment-1',
    orderId: 'order-1',
    briefType: 'basic',
    silhouette: 'A-line',
    neckline: 'Sweetheart',
    waistDetail: null,
    backFinish: null,
    additionalNotes: null,
    referenceImageIds: [],
    confirmedByCustomerAt: null,
    confirmedChannel: null,
    sectionVersions: [],
    createdAt: '2026-10-16T09:00:00.000Z',
    ...overrides,
  }
}

function renderPanel(garmentTier: 'STANDARD' | 'COMPLEX' | 'BESPOKE' = 'STANDARD') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DesignBriefPanel orderId="order-1" garmentId="garment-1" garmentTier={garmentTier} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('DesignBriefPanel', () => {
  beforeEach(() => {
    vi.mocked(designBriefApi.getBrief).mockReset()
  })

  it('shows "Design agreed" once the customer has confirmed the brief', async () => {
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(
      makeBrief({ confirmedByCustomerAt: '2026-10-16T10:00:00.000Z', confirmedChannel: 'portal' }),
    )
    renderPanel()

    expect(await screen.findByText('Design agreed')).toBeInTheDocument()
    expect(screen.queryByText('Awaiting customer confirmation')).not.toBeInTheDocument()
    expect(screen.getByText('A-line')).toBeInTheDocument()
  })

  it('shows "Awaiting customer confirmation" while the brief is unconfirmed', async () => {
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(makeBrief())
    renderPanel()

    expect(await screen.findByText('Awaiting customer confirmation')).toBeInTheDocument()
    expect(screen.queryByText('Design agreed')).not.toBeInTheDocument()
  })

  it('shows the detail log for a technical (Bespoke) brief', async () => {
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(
      makeBrief({
        briefType: 'technical',
        sectionVersions: [
          { versionNumber: 1, content: { label: 'Sleeve adjustment', notes: 'Bell sleeve' }, appendedAt: '2026-10-16T11:00:00.000Z' },
        ],
      }),
    )
    renderPanel('BESPOKE')

    expect(await screen.findByText('Detail Log')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('Sleeve adjustment')).toBeInTheDocument()
    expect(screen.getByText('Add detail')).toBeInTheDocument()
  })

  it('does not show a detail log for a basic brief', async () => {
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(makeBrief())
    renderPanel()

    await screen.findByText('Awaiting customer confirmation')
    expect(screen.queryByText('Detail Log')).not.toBeInTheDocument()
    expect(screen.queryByText('Add detail')).not.toBeInTheDocument()
  })

  it('refreshes the order when it sees the customer confirm, so the design flag clears', async () => {
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(makeBrief())
    const { queryClient } = renderPanel()
    await screen.findByText('Awaiting customer confirmation')

    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(designBriefApi.getBrief).mockResolvedValue(
      makeBrief({ confirmedByCustomerAt: '2026-10-16T10:00:00.000Z', confirmedChannel: 'portal' }),
    )
    await queryClient.refetchQueries({ queryKey: ['design-brief', 'order-1', 'garment-1'] })

    expect(await screen.findByText('Design agreed')).toBeInTheDocument()
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders', 'order-1'] }))
  })
})
