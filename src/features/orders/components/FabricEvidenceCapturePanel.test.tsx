import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FabricEvidenceCapturePanel } from './FabricEvidenceCapturePanel'
import { fabricEvidenceApi, type FabricEvidencePhoto } from '../fabric-evidence.api'
import { sealApi } from '../seal.api'
import { getAllPendingEvidence } from '../offline/fabric-evidence-offline-db'
import { useAuthStore } from '../../auth/auth.store'

vi.mock('../fabric-evidence.api', () => ({
  fabricEvidenceApi: {
    uploadFabricEvidencePhoto: vi.fn(),
  },
}))

// Never imported by the component under test — mocked here purely to make
// the "no confirmation side effect" guarantee an explicit, regression-proof
// assertion rather than a structural accident of what happens to be wired up.
vi.mock('../seal.api', () => ({
  sealApi: {
    getGarmentSeal: vi.fn(),
    confirmFabric: vi.fn(),
  },
}))

function renderPanel(garmentId = 'garment-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FabricEvidenceCapturePanel garmentId={garmentId} />
    </QueryClientProvider>,
  )
}

function makeImageFile(name = 'fabric.jpg', sizeBytes = 1024): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type: 'image/jpeg' })
  return file
}

// A genuine server rejection (e.g. 500) — has `error.response`, so the
// component's offline-detection (`!error.response`) must NOT queue this;
// it belongs in the normal error state, same as before offline capture
// existed. A bare `new Error(...)` (no `.response`) is what now represents
// a connectivity failure — see the offline-queueing tests below.
function makeServerError(status: number, message = 'Upload failed.'): AxiosError<{ message?: string }> {
  return {
    isAxiosError: true,
    response: { status, data: { message } } as any,
    message,
    name: 'AxiosError',
    toJSON: () => ({}),
  } as AxiosError<{ message?: string }>
}

function getFileInput(): HTMLInputElement {
  // The input is visually hidden (MUI's <Button component="label"> pattern),
  // not inaccessible — queried directly since it has no accessible role.
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

// Offline capture & sync: every upload now carries an idempotency key
// (clientId/deviceId/deviceCapturedAt), including the normal online path —
// see fabric-evidence-sync-manager.ts / the panel's captureAttempt state.
// Existing call-site assertions below match on this shape rather than the
// bare (garmentId, file) pair the pre-offline version used.
const anyIdempotency = expect.objectContaining({
  clientId: expect.any(String),
  deviceId: expect.any(String),
  deviceCapturedAt: expect.any(String),
})

function clearOfflineDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('stitchfyn-fabric-evidence-queue')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

describe('FabricEvidenceCapturePanel', () => {
  beforeEach(() => {
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReset()
    vi.mocked(sealApi.confirmFabric).mockReset()
    vi.mocked(sealApi.getGarmentSeal).mockReset()
    useAuthStore.getState().clearAuth()
  })

  afterEach(async () => {
    await clearOfflineDb()
    vi.restoreAllMocks()
  })

  it('1 & 2. the capture control accepts images and hints the environment camera', () => {
    renderPanel()
    const input = getFileInput()
    expect(input).toBeTruthy()
    expect(input.getAttribute('accept')).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
  })

  it('3. selecting an image uploads it automatically, handing the raw File to the upload call — no base64 conversion, no Upload Photo tap', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-1', file, anyIdempotency)
    })
    // Same File reference, not a string — proves no FileReader/base64 step
    // sits between selection and upload.
    const [, uploadedArg] = vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mock.calls[0]
    expect(uploadedArg).toBeInstanceOf(File)
  })

  it('3b. no Upload Photo confirmation step exists in the normal flow', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    // US-3.1: selection alone is enough to trigger the upload call — there
    // is never a moment where an "Upload Photo" button exists to be
    // clicked, before or after the mutation resolves.
    expect(screen.queryByRole('button', { name: /^upload photo$/i })).not.toBeInTheDocument()
    await screen.findByText(/photo uploaded/i)
    expect(screen.queryByRole('button', { name: /^upload photo$/i })).not.toBeInTheDocument()
  })

  it('4 & 5. uploads to the correct garmentId (the API layer owns the multipart "image" field)', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-42', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel('garment-42')

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-42', file, anyIdempotency)
    })
  })

  it('6. a successful upload renders the success state', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    expect(await screen.findByText(/photo uploaded/i)).toBeInTheDocument()
  })

  it('7. a genuine server-rejected upload renders a failure state with a retry action', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(makeServerError(500))
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('7b. retry resubmits the same file without requiring recapture', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto)
      .mockRejectedValueOnce(makeServerError(500))
      .mockResolvedValueOnce({
        id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
      })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: /retry/i }))

    expect(await screen.findByText(/photo uploaded/i)).toBeInTheDocument()
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(2)
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenNthCalledWith(2, 'garment-1', file, anyIdempotency)

    // The retry replays the SAME idempotency key as the first attempt —
    // required so the server recognizes it as one submission, not two.
    const calls = vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mock.calls
    expect(calls[1][2]).toEqual(calls[0][2])
  })

  it('8. a duplicate submission while uploading is prevented', async () => {
    const file = makeImageFile()
    let resolveUpload: (v: FabricEvidencePhoto) => void
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReturnValue(
      new Promise((resolve) => { resolveUpload = resolve }),
    )
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })

    // Upload starts on selection alone — the only control visible during
    // the in-flight window is the disabled "Uploading…" indicator.
    const uploadingButton = await screen.findByRole('button', { name: /uploading/i })
    expect(uploadingButton).toBeDisabled()
    // The capture control itself is gone too (input unmounts outside 'idle'),
    // so a repeat tap on it can't re-trigger a selection mid-upload either.
    expect(screen.queryByRole('button', { name: /capture fabric photo/i })).not.toBeInTheDocument()

    // Clicking the disabled indicator must not fire a second call.
    fireEvent.click(uploadingButton)
    fireEvent.click(uploadingButton)

    resolveUpload!({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    await screen.findByText(/photo uploaded/i)

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(1)
  })

  it('9 & 10. two garments upload independently — no cross-attachment', async () => {
    const fileA = makeImageFile('a.jpg')
    const fileB = makeImageFile('b.jpg')
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockImplementation(async (garmentId, file) => {
      const name = (file as File).name
      return {
        id: `photo-${garmentId}`, garmentId, orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: `stitchfyn/fabric-evidence/${name}`,
        secureUrl: `https://res.cloudinary.com/mock/${name}`,
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
      }
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <div data-testid="panel-a"><FabricEvidenceCapturePanel garmentId="garment-A" /></div>
        <div data-testid="panel-b"><FabricEvidenceCapturePanel garmentId="garment-B" /></div>
      </QueryClientProvider>,
    )

    const panelA = container.querySelector('[data-testid="panel-a"]') as HTMLElement
    const panelB = container.querySelector('[data-testid="panel-b"]') as HTMLElement

    fireEvent.change(panelA.querySelector('input[type="file"]')!, { target: { files: [fileA] } })

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-A', fileA, anyIdempotency)
    })
    // Garment B's panel must still be in its idle state — untouched by A's upload.
    expect(panelB.querySelector('img[alt="Uploaded fabric evidence"]')).toBeNull()
    expect(panelA.querySelector('img[alt="Uploaded fabric evidence"]')).toBeTruthy()

    fireEvent.change(panelB.querySelector('input[type="file"]')!, { target: { files: [fileB] } })

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-B', fileB, anyIdempotency)
    })
    expect(panelB.querySelector('img[alt="Uploaded fabric evidence"]')).toBeTruthy()
    // A's own evidence list is unaffected by B's later upload.
    expect(panelA.querySelectorAll('img[alt="Uploaded fabric evidence"]')).toHaveLength(1)
  })

  it('11 & 12. no confirmation/Safety Seal call is ever made as a side effect of uploading', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    await screen.findByText(/photo uploaded/i)

    expect(sealApi.confirmFabric).not.toHaveBeenCalled()
    expect(sealApi.getGarmentSeal).not.toHaveBeenCalled()
  })

  it('rejects an oversized photo client-side without attempting an upload', () => {
    renderPanel()
    const oversized = makeImageFile('huge.jpg', 6 * 1024 * 1024)

    fireEvent.change(getFileInput(), { target: { files: [oversized] } })

    expect(screen.getByText(/5MB/)).toBeInTheDocument()
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
  })

  describe('Offline capture & synchronization', () => {
    it('a connectivity failure (no server response) persists the photo offline instead of showing a dead-end error', async () => {
      const file = makeImageFile()
      // No `.response` — the exact signal (axios sets this for a genuine
      // network failure/timeout) the component uses to distinguish
      // "we're offline" from "the server rejected this".
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))
      renderPanel('garment-offline-1')

      fireEvent.change(getFileInput(), { target: { files: [file] } })

      expect(await screen.findByText(/saved offline/i)).toBeInTheDocument()
      expect(screen.queryByText(/^upload failed/i)).not.toBeInTheDocument()

      const pending = await getAllPendingEvidence()
      expect(pending).toHaveLength(1)
      expect(pending[0].garmentId).toBe('garment-offline-1')
      // Not `.toBe(file)` — IndexedDB always clones, never preserves
      // reference identity, even in a real browser. Size/type surviving
      // the round trip is the correctness bar (see fabric-evidence-
      // offline-db.test.ts for the `.name`-specific test-environment note).
      expect(pending[0].imageFile.size).toBe(file.size)
      expect(pending[0].status).toBe('pending')
    })

    it('a pending offline capture survives remount (simulating reload) and is shown as saved offline', async () => {
      const file = makeImageFile()
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))
      const first = renderPanel('garment-offline-2')
      fireEvent.change(getFileInput(), { target: { files: [file] } })
      await screen.findByText(/saved offline/i)
      first.unmount()

      // A fresh mount reads from IndexedDB, not component state — this is
      // what "survives reload" actually means for a persisted queue.
      renderPanel('garment-offline-2')
      expect(await screen.findByText(/saved offline — pending sync/i)).toBeInTheDocument()
    })

    it('reconnecting (the browser online event) triggers synchronization once authenticated, and removes the item once the server acknowledges it', async () => {
      const file = makeImageFile()
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValueOnce(new Error('Network Error'))
      renderPanel('garment-offline-3')
      fireEvent.change(getFileInput(), { target: { files: [file] } })
      await screen.findByText(/saved offline/i)

      useAuthStore.getState().setAuth('fake-token', { id: 'user-1', email: 'u@test.com', fullName: 'U', role: 'MANAGER' } as any)
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValueOnce({
        id: 'photo-synced', garmentId: 'garment-offline-3', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
        clientId: 'ignored', deviceId: 'ignored', deviceCapturedAt: new Date().toISOString(),
      } as any)

      window.dispatchEvent(new Event('online'))

      await waitFor(async () => {
        expect(await getAllPendingEvidence()).toHaveLength(0)
      })
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(2)
    })

    it('a temporary sync failure keeps the item pending (not failed) for automatic retry', async () => {
      const file = makeImageFile()
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))
      renderPanel('garment-offline-4')
      fireEvent.change(getFileInput(), { target: { files: [file] } })
      await screen.findByText(/saved offline/i)

      useAuthStore.getState().setAuth('fake-token', { id: 'user-1', email: 'u@test.com', fullName: 'U', role: 'MANAGER' } as any)
      // Still failing the same way on reconnect (e.g. still offline).
      window.dispatchEvent(new Event('online'))
      await waitFor(async () => {
        const pending = await getAllPendingEvidence()
        expect(pending).toHaveLength(1)
        expect(pending[0].status).toBe('pending')
      })
    })

    it('a permanent server rejection (e.g. validation) on sync marks the item failed with a manual retry action, not silent loss', async () => {
      const file = makeImageFile()
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValueOnce(new Error('Network Error'))
      renderPanel('garment-offline-5')
      fireEvent.change(getFileInput(), { target: { files: [file] } })
      await screen.findByText(/saved offline/i)

      useAuthStore.getState().setAuth('fake-token', { id: 'user-1', email: 'u@test.com', fullName: 'U', role: 'MANAGER' } as any)
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValueOnce(makeServerError(400, 'Invalid image'))

      window.dispatchEvent(new Event('online'))

      expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
      const pending = await getAllPendingEvidence()
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('failed')

      // Manual retry succeeds.
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValueOnce({
        id: 'photo-retry', garmentId: 'garment-offline-5', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
        clientId: 'ignored', deviceId: 'ignored', deviceCapturedAt: new Date().toISOString(),
      } as any)
      fireEvent.click(screen.getByRole('button', { name: /retry/i }))

      await waitFor(async () => {
        expect(await getAllPendingEvidence()).toHaveLength(0)
      })
    })

    it('a local storage failure is surfaced as an error, not falsely claimed as safely queued', async () => {
      const offlineDb = await import('../offline/fabric-evidence-offline-db')
      vi.spyOn(offlineDb, 'enqueuePendingEvidence').mockRejectedValueOnce(new Error('QuotaExceededError'))
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))

      const file = makeImageFile()
      renderPanel('garment-offline-6')
      fireEvent.change(getFileInput(), { target: { files: [file] } })

      expect(await screen.findByText(/could not save this photo/i)).toBeInTheDocument()
      expect(screen.queryByText(/saved offline/i)).not.toBeInTheDocument()
    })

    it('without an authenticated session, reconnecting does not attempt to sync and the queued evidence is retained', async () => {
      const file = makeImageFile()
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))
      renderPanel('garment-offline-7')
      fireEvent.change(getFileInput(), { target: { files: [file] } })
      await screen.findByText(/saved offline/i)

      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockClear()
      // No setAuth() call here — session unavailable.
      window.dispatchEvent(new Event('online'))
      await new Promise((r) => setTimeout(r, 50))

      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
      const pending = await getAllPendingEvidence()
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending')
    })
  })
})
