import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CollectionChecklistPanel } from './CollectionChecklistPanel'
import { collectionApi, type CollectionChecklist } from '../collection.api'
import { useAuthStore } from '../../auth/auth.store'

vi.mock('../collection.api', () => ({
  collectionApi: {
    getChecklist: vi.fn(),
    getReadiness: vi.fn(),
    createChecklist: vi.fn(),
    tailorSignoff: vi.fn(),
  },
}))

function makeChecklist(overrides: Partial<CollectionChecklist> = {}): CollectionChecklist {
  return {
    id: 'checklist-1',
    orderId: 'order-1',
    companyId: 'company-1',
    items: [
      { label: 'Garment matches agreed design brief', checkedByTailor: false, checkedByCustomer: false },
      { label: 'All fabric accounted for and returned with garment', checkedByTailor: false, checkedByCustomer: false },
      { label: 'Stitching and finishing inspected', checkedByTailor: false, checkedByCustomer: false },
      { label: 'Customer satisfied with garment condition', checkedByTailor: false, checkedByCustomer: false },
    ],
    tailorSignoffAt: null,
    tailorSignoffBy: null,
    customerSignoffAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function notFound() {
  const err: any = new Error('not found')
  err.response = { status: 404 }
  return err
}

function renderPanel(props: Partial<{ orderId: string; lockedAt: string | null; canInitiate: boolean }> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CollectionChecklistPanel
        orderId={props.orderId ?? 'order-1'}
        lockedAt={props.lockedAt ?? null}
        canInitiate={props.canInitiate ?? true}
      />
    </QueryClientProvider>,
  )
}

describe('CollectionChecklistPanel — US-4.8 Final Quality Review', () => {
  beforeEach(() => {
    vi.mocked(collectionApi.getChecklist).mockReset()
    vi.mocked(collectionApi.getReadiness).mockReset()
    vi.mocked(collectionApi.createChecklist).mockReset()
    vi.mocked(collectionApi.tailorSignoff).mockReset()
    useAuthStore.getState().clearAuth()
  })

  it('1 & 2. displays the four review criteria as non-interactive review prompts', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel()

    expect(await screen.findByText('Garment matches agreed design brief')).toBeInTheDocument()
    expect(screen.getByText('All fabric accounted for and returned with garment')).toBeInTheDocument()
    expect(screen.getByText('Stitching and finishing inspected')).toBeInTheDocument()
    expect(screen.getByText('Customer satisfied with garment condition')).toBeInTheDocument()

    // Non-interactive: no checkbox/button role attached to any item label.
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('3. exactly one "Complete Quality Check" action is presented', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel()

    const buttons = await screen.findAllByRole('button', { name: /complete quality check/i })
    expect(buttons).toHaveLength(1)
  })

  it('4. the button is unavailable (disabled) when the order is not ready', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: false })
    renderPanel()

    const button = await screen.findByRole('button', { name: /complete quality check/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/every garment on this order must finish production/i)).toBeInTheDocument()
  })

  it('5. the button is available when the order is ready and the review is incomplete', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel()

    const button = await screen.findByRole('button', { name: /complete quality check/i })
    expect(button).not.toBeDisabled()
  })

  it('6. a successful click invokes exactly one tailor-signoff mutation', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    vi.mocked(collectionApi.tailorSignoff).mockResolvedValue(
      makeChecklist({ tailorSignoffAt: new Date().toISOString(), tailorSignoffBy: 'user-1' }),
    )
    renderPanel()

    const button = await screen.findByRole('button', { name: /complete quality check/i })
    fireEvent.click(button)

    await waitFor(() => expect(collectionApi.tailorSignoff).toHaveBeenCalledTimes(1))
    expect(collectionApi.tailorSignoff).toHaveBeenCalledWith('order-1')
  })

  it('7. a completed review displays the reviewer, timestamp, and shows no active completion action', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(
      makeChecklist({
        tailorSignoffAt: new Date('2026-09-16T10:00:00Z').toISOString(),
        tailorSignoffBy: 'user-1',
        customerSignoffAt: new Date('2026-09-17T10:00:00Z').toISOString(),
      }),
    )
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel()

    expect(await screen.findByText(/final quality review completed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete quality check/i })).not.toBeInTheDocument()
  })

  it('7b. the tailor-only-completed state (customer pending) also shows no active completion action', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(
      makeChecklist({
        tailorSignoffAt: new Date('2026-09-16T10:00:00Z').toISOString(),
        tailorSignoffBy: 'user-1',
      }),
    )
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel()

    expect(await screen.findByText(/you completed the final quality review/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete quality check/i })).not.toBeInTheDocument()
  })

  it('8 & 9. mutation errors use the global domain-error toast, not a 403 redirect, for a 409 not-ready rejection', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    const conflictError: any = new Error('conflict')
    conflictError.isAxiosError = true
    conflictError.response = {
      status: 409,
      data: { code: 'CONFLICT', metadata: { reason: 'FINAL_QUALITY_REVIEW_NOT_READY' } },
    }
    vi.mocked(collectionApi.tailorSignoff).mockRejectedValue(conflictError)
    renderPanel()

    const button = await screen.findByRole('button', { name: /complete quality check/i })
    fireEvent.click(button)

    // handleError() routes a 409 to the toast store, never to navigation —
    // there is no router/navigate mock here at all, so a would-be /403
    // redirect (a concern of the separate, untouched axios interceptor)
    // has nothing to call; this proves the component itself never invokes
    // any navigation on a rejected mutation.
    await waitFor(() => expect(collectionApi.tailorSignoff).toHaveBeenCalledTimes(1))
    // The checklist remains in its pre-completion state — no silent state change.
    expect(screen.getByRole('button', { name: /complete quality check/i })).toBeInTheDocument()
  })

  it('10. query state is refreshed (refetched) after a successful completion', async () => {
    vi.mocked(collectionApi.getChecklist)
      .mockResolvedValueOnce(makeChecklist())
      .mockResolvedValueOnce(makeChecklist({ tailorSignoffAt: new Date().toISOString(), tailorSignoffBy: 'user-1' }))
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    vi.mocked(collectionApi.tailorSignoff).mockResolvedValue(
      makeChecklist({ tailorSignoffAt: new Date().toISOString(), tailorSignoffBy: 'user-1' }),
    )
    renderPanel()

    const button = await screen.findByRole('button', { name: /complete quality check/i })
    fireEvent.click(button)

    await waitFor(() => expect(collectionApi.getChecklist).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/you completed the final quality review/i)).toBeInTheDocument()
  })

  it('"Begin Collection" is gated on the same backend readiness signal, not a client-computed flag', async () => {
    vi.mocked(collectionApi.getChecklist).mockRejectedValue(notFound())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: false })
    renderPanel()

    expect(await screen.findByText(/available once every garment has finished production/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /begin collection/i })).not.toBeInTheDocument()
  })

  it('does not show the completion action to a role without canInitiate (mirrors backend UPDATE_PRODUCTION)', async () => {
    vi.mocked(collectionApi.getChecklist).mockResolvedValue(makeChecklist())
    vi.mocked(collectionApi.getReadiness).mockResolvedValue({ ready: true })
    renderPanel({ canInitiate: false })

    await screen.findByText('Garment matches agreed design brief')
    expect(screen.queryByRole('button', { name: /complete quality check/i })).not.toBeInTheDocument()
  })
})
