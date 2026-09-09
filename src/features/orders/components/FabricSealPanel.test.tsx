import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FabricSealPanel } from './FabricSealPanel'
import { sealApi } from '../seal.api'
import type { Garment } from '../orders.api'

vi.mock('../seal.api', () => ({
  sealApi: {
    getGarmentSeal: vi.fn(),
    confirmFabric: vi.fn(),
  },
}))

// US-3.3: defaults to a garment with a recorded quantity — the normal case
// where the tailor already logged it at intake. Pass nulls to exercise the
// "not recorded yet" path.
function renderPanel(quantity: number | null = 5, quantityUnit: string | null = 'yards') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FabricSealPanel orderId="order-1" garmentId="garment-1" quantity={quantity} quantityUnit={quantityUnit} />
    </QueryClientProvider>,
  )
}

const NOT_FOUND = { response: { status: 404 } }

describe('FabricSealPanel', () => {
  beforeEach(() => {
    vi.mocked(sealApi.getGarmentSeal).mockReset()
    vi.mocked(sealApi.confirmFabric).mockReset()
  })

  it('shows a Confirm Fabric action when no seal exists yet', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockRejectedValue(NOT_FOUND)
    renderPanel()

    expect(await screen.findByRole('button', { name: /confirm fabric/i })).toBeInTheDocument()
  })

  it('does not show the confirm action once a seal already exists', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockResolvedValue({
      id: 's1', orderId: 'order-1', garmentId: 'garment-1', companyId: 'c1',
      verificationCode: 'ABC123', fabricPhotoId: null, quantityConfirmed: '5 yards',
      generatedAt: new Date().toISOString(), qrCodeDataUrl: 'data:image/png;base64,x',
    })
    renderPanel()

    expect(await screen.findByText('ABC123')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm fabric/i })).not.toBeInTheDocument()
  })

  it('opens the dialog showing the recorded quantity read-only, and confirms without re-entering it', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockRejectedValue(NOT_FOUND)
    vi.mocked(sealApi.confirmFabric).mockResolvedValue({
      id: 'garment-1', orderId: 'order-1', storeId: 's1', name: 'Gown', status: 'IN_PROGRESS',
    } satisfies Garment)
    renderPanel(5, 'yards')

    fireEvent.click(await screen.findByRole('button', { name: /confirm fabric/i }))

    expect(screen.getByText(/5 yards/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /quantity/i })).not.toBeInTheDocument()

    // Dialog's own submit button shares the same accessible name — take the last one (in the dialog)
    const dialogSubmit = screen.getAllByRole('button', { name: /confirm fabric/i }).at(-1)!
    expect(dialogSubmit).not.toBeDisabled() // quantity already recorded — nothing to type

    fireEvent.click(dialogSubmit)

    await waitFor(() => {
      expect(sealApi.confirmFabric).toHaveBeenCalledWith('garment-1')
    })
  })

  it('disables the dialog submit and shows guidance when no quantity was recorded at intake', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockRejectedValue(NOT_FOUND)
    renderPanel(null, null)

    fireEvent.click(await screen.findByRole('button', { name: /confirm fabric/i }))

    expect(screen.getByText(/no fabric quantity was recorded/i)).toBeInTheDocument()
    const dialogSubmit = screen.getAllByRole('button', { name: /confirm fabric/i }).at(-1)!
    expect(dialogSubmit).toBeDisabled()
  })

  it('disables the trigger immediately on success so a second confirm cannot be submitted', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockRejectedValue(NOT_FOUND)
    vi.mocked(sealApi.confirmFabric).mockResolvedValue({
      id: 'garment-1', orderId: 'order-1', storeId: 's1', name: 'Gown', status: 'IN_PROGRESS',
    } satisfies Garment)
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: /confirm fabric/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /confirm fabric/i }).at(-1)!)

    await waitFor(() => {
      expect(sealApi.confirmFabric).toHaveBeenCalledTimes(1)
    })
    // Dialog closes on success; the remaining trigger button must stay disabled
    // (mutation.isSuccess), not re-openable for a second submit.
    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /confirm fabric/i })
      expect(trigger).toBeDisabled()
    })
  })

  it('shows an error alert and keeps the dialog open when confirmFabric fails', async () => {
    vi.mocked(sealApi.getGarmentSeal).mockRejectedValue(NOT_FOUND)
    vi.mocked(sealApi.confirmFabric).mockRejectedValue(new Error('network error'))
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: /confirm fabric/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /confirm fabric/i }).at(-1)!)

    expect(await screen.findByText(/failed to confirm fabric/i)).toBeInTheDocument()
    // Dialog stays open on failure — recorded quantity is still shown
    expect(screen.getByText(/5 yards/i)).toBeInTheDocument()
  })
})
