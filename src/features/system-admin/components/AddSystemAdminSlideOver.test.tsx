import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { AddSystemAdminSlideOver } from './AddSystemAdminSlideOver'
import { usersApi } from '../api/users.api'

vi.mock('../api/users.api', () => ({ usersApi: { inviteSystemAdmin: vi.fn() } }))

function renderSlideOver() {
  const onClose = vi.fn()
  const onInvited = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AddSystemAdminSlideOver onClose={onClose} onInvited={onInvited} />
    </QueryClientProvider>,
  )
  return { onClose, onInvited }
}

function fill(name: string, email: string) {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: name } })
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: email } })
}

describe('AddSystemAdminSlideOver', () => {
  // Braces matter: a function returned from beforeEach runs as a teardown, which would call the mock again
  beforeEach(() => {
    vi.mocked(usersApi.inviteSystemAdmin).mockReset()
  })

  it("can't be sent until both the name and email are filled in", () => {
    renderSlideOver()

    expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled()
    fill('Ada Admin', '')
    expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled()
  })

  it('invites the new admin and hands back the link to share', async () => {
    vi.mocked(usersApi.inviteSystemAdmin).mockResolvedValue({
      id: 'u-2', email: 'ada@stitchfyn.com', fullName: 'Ada Admin', inviteUrl: 'https://app.example/verify-email?token=abc',
    })
    const { onClose, onInvited } = renderSlideOver()

    fill('  Ada Admin ', ' ada@stitchfyn.com ')
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(onInvited).toHaveBeenCalledWith({
      inviteUrl: 'https://app.example/verify-email?token=abc', name: 'Ada Admin', email: 'ada@stitchfyn.com',
    }))
    expect(usersApi.inviteSystemAdmin).toHaveBeenCalledWith({ email: 'ada@stitchfyn.com', fullName: 'Ada Admin' })
    expect(onClose).toHaveBeenCalled()
  })

  it("shows why the server refused, and stays open", async () => {
    const conflict = { status: 409, data: { code: 'CONFLICT', message: 'Someone already has an account with this email' } } as unknown as AxiosResponse
    vi.mocked(usersApi.inviteSystemAdmin).mockRejectedValue(new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, conflict))
    const { onClose, onInvited } = renderSlideOver()

    fill('Ada Admin', 'ada@stitchfyn.com')
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onInvited).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
