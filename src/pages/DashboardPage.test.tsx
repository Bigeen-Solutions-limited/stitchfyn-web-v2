import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import { useAuthStore } from '../features/auth/auth.store'
import { onboardingApi } from '../features/onboarding/onboarding.api'

vi.mock('../features/onboarding/onboarding.api', () => ({ onboardingApi: { getStatus: vi.fn() } }))
vi.mock('../features/dashboard/analytics.api', () => ({
  analyticsApi: { getOverview: vi.fn().mockResolvedValue({ totalActiveOrders: 0, recentOrders: [] }) },
}))
// The dashboards themselves aren't under test here
vi.mock('./dashboard/AdminDashboard', () => ({ AdminDashboard: () => <div>Owner dashboard</div> }))

const status = (completedAt: string | null) => ({
  completedAt,
  companyName: 'Adire Atelier',
  steps: { business: false, workflow: false, staff: false },
  defaultStore: { id: 's', name: 'Adire Atelier', locationAddress: null, maxGarmentCapacity: 100, dailyCapacityHours: 8 },
})

function renderAs(role: string) {
  useAuthStore.setState({ user: { id: 'u', companyId: 'c', email: 'e', fullName: 'Ada', role, capabilities: [] } } as Partial<ReturnType<typeof useAuthStore.getState>>)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboarding" element={<div>Setup wizard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage first-run redirect', () => {
  beforeEach(() => vi.mocked(onboardingApi.getStatus).mockReset())

  it('sends an owner whose business is not set up to the setup wizard', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status(null))
    renderAs('OWNER')

    expect(await screen.findByText('Setup wizard')).toBeInTheDocument()
  })

  it('shows the dashboard once setup is finished', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue(status('2026-10-26T10:00:00Z'))
    renderAs('OWNER')

    expect(await screen.findByText('Owner dashboard')).toBeInTheDocument()
  })

  it("never asks a manager to set up the owner's business", async () => {
    renderAs('MANAGER')

    expect(await screen.findByText('Owner dashboard')).toBeInTheDocument()
    expect(onboardingApi.getStatus).not.toHaveBeenCalled()
  })
})
