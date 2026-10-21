import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { VerifyEmailPage } from './VerifyEmailPage'
import { verifyEmailApi } from '../features/auth/auth.api'

vi.mock('../features/auth/auth.api', () => ({
  verifyEmailApi: vi.fn(),
}))

const VALID_PASSWORD = 'GoodPass1'

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<div>Login Page Stub</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillPasswords(password: string, confirm: string) {
  const inputs = document.querySelectorAll('input[type="password"]')
  fireEvent.change(inputs[0], { target: { value: password } })
  fireEvent.change(inputs[1], { target: { value: confirm } })
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.mocked(verifyEmailApi).mockReset()
  })

  it('shows an invalid-link message when no token is present in the URL', () => {
    renderPage('/verify-email')
    expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument()
  })

  it('reads the token from the URL and renders the password-setup form', () => {
    renderPage('/verify-email?token=abc123')
    expect(screen.getByRole('heading', { name: /set your password/i })).toBeInTheDocument()
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(2)
  })

  it('submits the token and new password to verifyEmailApi and redirects to /login on success', async () => {
    vi.mocked(verifyEmailApi).mockResolvedValue(undefined)
    renderPage('/verify-email?token=abc123')

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD)
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))

    await waitFor(() => {
      expect(verifyEmailApi).toHaveBeenCalledWith('abc123', VALID_PASSWORD)
    })
    await waitFor(() => {
      expect(screen.getByText('Login Page Stub')).toBeInTheDocument()
    })
  })

  it('shows a mismatch error and does not call the API when passwords differ', () => {
    renderPage('/verify-email?token=abc123')

    fillPasswords(VALID_PASSWORD, 'SomethingElse1')
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))

    expect(verifyEmailApi).not.toHaveBeenCalled()
  })

  it('shows an invalid/expired message when the API rejects with AUTHORIZATION_ERROR', async () => {
    vi.mocked(verifyEmailApi).mockRejectedValue({
      response: { data: { code: 'AUTHORIZATION_ERROR' } },
    })
    renderPage('/verify-email?token=abc123')

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD)
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    })
  })

  it('disables the submit button while a verification request is in flight (no duplicate submits)', async () => {
    let resolvePromise: () => void = () => {}
    vi.mocked(verifyEmailApi).mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePromise = resolve
      }),
    )
    renderPage('/verify-email?token=abc123')

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD)
    const button = screen.getByRole('button', { name: /set password/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    expect(verifyEmailApi).toHaveBeenCalledTimes(1)

    resolvePromise()
    await waitFor(() => {
      expect(screen.getByText('Login Page Stub')).toBeInTheDocument()
    })
  })
})
