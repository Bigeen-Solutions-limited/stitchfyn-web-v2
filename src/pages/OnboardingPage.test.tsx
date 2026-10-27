import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError, type AxiosResponse } from 'axios'
import { OnboardingPage } from './OnboardingPage'
import { onboardingApi, type OnboardingStatus } from '../features/onboarding/onboarding.api'
import { staffApi } from '../features/auth/staff.api'
import { workflowApi } from '../features/workflow/workflow.api'

vi.mock('../features/onboarding/onboarding.api', () => ({
  onboardingApi: { getStatus: vi.fn(), saveWorkshop: vi.fn(), complete: vi.fn() },
}))
vi.mock('../features/auth/staff.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/staff.api')>()),
  staffApi: { getStaff: vi.fn(), inviteStaff: vi.fn() },
}))
vi.mock('../features/workflow/workflow.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/workflow/workflow.api')>()),
  workflowApi: { getTemplates: vi.fn(), createTemplate: vi.fn() },
}))

const status = (steps: Partial<OnboardingStatus['steps']>, completedAt: string | null = null): OnboardingStatus => ({
  completedAt,
  companyName: 'Adire Atelier',
  steps: { workshop: false, workflow: false, staff: false, ...steps },
  defaultStore: { id: 'store-1', name: 'Adire Atelier', locationAddress: null, maxGarmentCapacity: 100, dailyCapacityHours: 8 },
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/orders/new" element={<div>New order form</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.getStatus).mockReset()
    vi.mocked(onboardingApi.saveWorkshop).mockReset()
    vi.mocked(onboardingApi.complete).mockReset()
    vi.mocked(staffApi.getStaff).mockReset().mockResolvedValue([])
    vi.mocked(staffApi.inviteStaff).mockReset()
    vi.mocked(workflowApi.getTemplates).mockReset().mockResolvedValue([])
  })

  it('starts a new owner at the workshop, showing the names admin set up as read-only', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({}))
    renderPage()

    const name = await screen.findByLabelText(/business name/i)
    expect(name).toHaveValue('Adire Atelier')
    expect(name).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/workshop name/i)).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/garments in production at once/i)).toHaveValue(100)
  })

  it('saves only the address and capacity, then moves on to production stages', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({}))
    vi.mocked(onboardingApi.saveWorkshop).mockResolvedValue(status({ workshop: true }))
    renderPage()

    fireEvent.change(await screen.findByLabelText(/workshop address/i), { target: { value: '12 Herbert Macaulay Way, Yaba' } })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() => expect(onboardingApi.saveWorkshop).toHaveBeenCalledWith({
      storeAddress: '12 Herbert Macaulay Way, Yaba', maxGarmentCapacity: 100, dailyCapacityHours: 8,
    }))
    expect(await screen.findByRole('button', { name: /use the standard stages/i })).toBeInTheDocument()
  })

  it('resumes at the first step that is not done', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({ workshop: true, workflow: true }))
    renderPage()

    expect(await screen.findByRole('button', { name: /send invite/i })).toBeInTheDocument()
  })

  it("won't continue past the team step until someone has been invited", async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({ workshop: true, workflow: true }))
    renderPage()

    expect(await screen.findByRole('button', { name: /^continue$/i })).toBeDisabled()
  })

  it('invites a team member to the default store and shows the link to share', async () => {
    vi.mocked(onboardingApi.getStatus)
      .mockResolvedValueOnce(status({ workshop: true, workflow: true }))
      .mockResolvedValue(status({ workshop: true, workflow: true, staff: true }))
    vi.mocked(staffApi.inviteStaff).mockResolvedValue({
      id: 'u-1', email: 'tunde@example.com', fullName: 'Tunde Bello', role: 'TAILOR', storeId: 'store-1',
      isActive: false, status: 'INVITED', lastLoginAt: null, removedAt: null, createdAt: '', inviteUrl: 'https://app.example/accept?t=abc',
    })
    renderPage()

    fireEvent.change(await screen.findByLabelText(/full name/i), { target: { value: 'Tunde Bello' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'tunde@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(staffApi.inviteStaff).toHaveBeenCalledWith({
      fullName: 'Tunde Bello', email: 'tunde@example.com', role: 'TAILOR', storeId: 'store-1',
    }))
    // The dialog shows the link in a read-only field to copy from
    expect(await screen.findByDisplayValue('https://app.example/accept?t=abc')).toBeInTheDocument()
  })

  it('finishes setup and opens the new order form', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({ workshop: true, workflow: true, staff: true }))
    vi.mocked(onboardingApi.complete).mockResolvedValue(status({ workshop: true, workflow: true, staff: true }, '2026-10-26T10:00:00Z'))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /finish and take your first order/i }))

    expect(await screen.findByText('New order form')).toBeInTheDocument()
  })

  it('names what is still missing when the server refuses to finish', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status({ workshop: true, workflow: true, staff: true }))
    const conflict = { status: 409, data: { code: 'CONFLICT', metadata: { missing: ['staff'] } } } as unknown as AxiosResponse
    vi.mocked(onboardingApi.complete).mockRejectedValue(new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, conflict))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /finish and take your first order/i }))

    expect(await screen.findByText(/still to do: at least one team member/i)).toBeInTheDocument()
  })
})
