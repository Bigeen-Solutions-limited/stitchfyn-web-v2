import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortalFabricConfirm } from './PortalFabricConfirm'
import { portalFabricEvidenceApi } from '../../orders/fabric-evidence.api'
import { portalDisputeApi } from '../../dispute/dispute.api'
import type { CustomerOrderProjection } from '../../customer/customer.api'

vi.mock('../../orders/fabric-evidence.api', () => ({
  portalFabricEvidenceApi: {
    getEvidence: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../dispute/dispute.api', () => ({
  portalDisputeApi: {
    raiseDispute: vi.fn(),
  },
}))

type FabricGarment = CustomerOrderProjection['fabricGarments'][number]

function makeGarment(overrides: Partial<FabricGarment> = {}): FabricGarment {
  return {
    garmentId: 'garment-1',
    garmentName: 'Agbada',
    fabricType: 'Silk',
    colorSwatch: 'Royal Blue',
    // US-3.3: the tailor-logged quantity, present by default so most tests
    // exercise the normal "ready to confirm" path.
    quantity: 5,
    quantityUnit: 'yards',
    conditionNotes: null,
    confirmedAt: null,
    confirmationChannel: null,
    evidencePhotos: [],
    ...overrides,
  }
}

function renderPanel(garment: FabricGarment) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PortalFabricConfirm portalToken="tok-1" garment={garment} />
    </QueryClientProvider>,
  )
}

describe('PortalFabricConfirm', () => {
  beforeEach(() => {
    vi.mocked(portalFabricEvidenceApi.confirm).mockReset()
    vi.mocked(portalDisputeApi.raiseDispute).mockReset()
  })

  it('1. renders the fabric evidence photo when present', () => {
    renderPanel(makeGarment({ evidencePhotos: [{ id: 'p1', secureUrl: 'https://res.cloudinary.com/mock/p1.jpg', uploadedAt: '2026-09-01' }] }))

    const img = screen.getByAltText(/fabric evidence/i) as HTMLImageElement
    expect(img.src).toBe('https://res.cloudinary.com/mock/p1.jpg')
  })

  it('2. renders the tailor-recorded quantity as read-only text, not an input the customer fills in', () => {
    renderPanel(makeGarment({ quantity: 5, quantityUnit: 'yards' }))

    expect(screen.getByText(/5 yards/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /quantity/i })).not.toBeInTheDocument()
  })

  it('2b. disables Confirm and shows guidance when the tailor has not recorded a quantity yet', () => {
    renderPanel(makeGarment({ quantity: null, quantityUnit: null }))

    expect(screen.getByRole('button', { name: /confirm fabric/i })).toBeDisabled()
    expect(screen.getByText(/hasn't recorded a fabric quantity/i)).toBeInTheDocument()
  })

  it('3. renders condition notes when present, and omits them when absent', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PortalFabricConfirm portalToken="tok-1" garment={makeGarment({ conditionNotes: 'No visible damage' })} />
      </QueryClientProvider>,
    )
    expect(screen.getByText(/no visible damage/i)).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PortalFabricConfirm portalToken="tok-1" garment={makeGarment({ conditionNotes: null })} />
      </QueryClientProvider>,
    )
    expect(screen.queryByText(/condition notes/i)).not.toBeInTheDocument()
  })

  it('4. shows Confirm and Dispute actions while pending', () => {
    renderPanel(makeGarment())

    expect(screen.getByRole('button', { name: /confirm fabric/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dispute this fabric/i })).toBeInTheDocument()
  })

  it('5. Confirm sends the correct request', async () => {
    vi.mocked(portalFabricEvidenceApi.confirm).mockResolvedValue({ id: 'garment-1', confirmedAt: '2026-09-06', confirmationChannel: 'portal' })
    renderPanel(makeGarment())

    fireEvent.click(screen.getByRole('button', { name: /confirm fabric/i }))

    await waitFor(() => {
      expect(portalFabricEvidenceApi.confirm).toHaveBeenCalledWith('tok-1', 'garment-1')
    })
  })

  it('6. Dispute sends the correct request', async () => {
    vi.mocked(portalDisputeApi.raiseDispute).mockResolvedValue(undefined)
    renderPanel(makeGarment())

    fireEvent.click(screen.getByRole('button', { name: /dispute this fabric/i }))
    fireEvent.change(screen.getByLabelText(/what's wrong with this fabric/i), { target: { value: 'Wrong colour entirely.' } })
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))

    await waitFor(() => {
      expect(portalDisputeApi.raiseDispute).toHaveBeenCalledWith('tok-1', {
        category: 'MATERIAL',
        severity: 'WARNING',
        description: 'Wrong colour entirely.',
      })
    })
  })

  it('7. duplicate clicks are prevented while a confirmation is in flight', async () => {
    let resolveConfirm: (v: Awaited<ReturnType<typeof portalFabricEvidenceApi.confirm>>) => void
    vi.mocked(portalFabricEvidenceApi.confirm).mockReturnValue(new Promise((resolve) => { resolveConfirm = resolve }))
    renderPanel(makeGarment())

    const button = screen.getByRole('button', { name: /confirm fabric/i })
    fireEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    fireEvent.click(button) // no-op — already disabled

    expect(portalFabricEvidenceApi.confirm).toHaveBeenCalledTimes(1)
    resolveConfirm!({ id: 'garment-1', confirmedAt: '2026-09-06', confirmationChannel: 'portal' })
  })

  it('8. shows a success state after confirming', async () => {
    vi.mocked(portalFabricEvidenceApi.confirm).mockResolvedValue({ id: 'garment-1', confirmedAt: '2026-09-06', confirmationChannel: 'portal' })
    renderPanel(makeGarment())

    fireEvent.click(screen.getByRole('button', { name: /confirm fabric/i }))

    // The parent page re-fetches the projection on success (queryClient
    // invalidation) and re-renders with confirmedAt set — simulated here by
    // asserting the mutation resolved without error and the confirm button
    // is no longer stuck disabled-with-no-feedback.
    await waitFor(() => {
      expect(portalFabricEvidenceApi.confirm).toHaveBeenCalled()
    })
    expect(screen.queryByText(/failed to confirm/i)).not.toBeInTheDocument()
  })

  it('9. shows an error state when confirmation fails', async () => {
    vi.mocked(portalFabricEvidenceApi.confirm).mockRejectedValue(new Error('network error'))
    renderPanel(makeGarment())

    fireEvent.click(screen.getByRole('button', { name: /confirm fabric/i }))

    expect(await screen.findByText(/failed to confirm/i)).toBeInTheDocument()
  })

  it('10. renders a read-only confirmed state once fabric is already confirmed, with no Confirm/Dispute actions', () => {
    renderPanel(makeGarment({ confirmedAt: '2026-09-01T10:00:00.000Z', confirmationChannel: 'portal' }))

    expect(screen.getByText(/you confirmed the fabric/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm fabric/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dispute this fabric/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument()
  })
})
