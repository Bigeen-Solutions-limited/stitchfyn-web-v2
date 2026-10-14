import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FabricEvidenceCapturePanel } from './FabricEvidenceCapturePanel'
import { fabricEvidenceApi, MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES, type FabricEvidencePhoto } from '../fabric-evidence.api'
import { sealApi } from '../seal.api'
import { getAllPendingEvidence } from '../offline/fabric-evidence-offline-db'
import { useAuthStore } from '../../auth/auth.store'

vi.mock('../fabric-evidence.api', () => ({
  fabricEvidenceApi: {
    uploadFabricEvidencePhoto: vi.fn(),
  },
  // The real limit, so the panel and the offline store check the same value
  MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
}))

// Mocked only to assert that uploading never confirms the fabric
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

// A server rejection has a response, so it must show an error rather than queue offline
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
  // The input is visually hidden, not inaccessible, and has no role to query by
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

// Every upload, online or offline, carries an idempotency key
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
    // The same File object, so there is no base64 step before upload
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

    // Choosing a photo starts the upload; there is never an Upload button
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

    // The retry reuses the first attempt's key, so the server sees one submission
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

    const uploadingButton = await screen.findByRole('button', { name: /uploading/i })
    expect(uploadingButton).toBeDisabled()
    // The capture control is gone while uploading, so it can't trigger another upload
    expect(screen.queryByRole('button', { name: /capture fabric photo/i })).not.toBeInTheDocument()

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
    // Garment B is untouched by A's upload
    expect(panelB.querySelector('img[alt="Uploaded fabric evidence"]')).toBeNull()
    expect(panelA.querySelector('img[alt="Uploaded fabric evidence"]')).toBeTruthy()

    fireEvent.change(panelB.querySelector('input[type="file"]')!, { target: { files: [fileB] } })

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-B', fileB, anyIdempotency)
    })
    expect(panelB.querySelector('img[alt="Uploaded fabric evidence"]')).toBeTruthy()
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

  describe('5 MiB boundary semantics', () => {
    it('a file exactly at the 5 MiB limit is accepted (not rejected merely for equaling the limit)', async () => {
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
        id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
      })
      renderPanel()
      const atLimit = makeImageFile('at-limit.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES)

      fireEvent.change(getFileInput(), { target: { files: [atLimit] } })

      await waitFor(() => {
        expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-1', atLimit, anyIdempotency)
      })
      expect(screen.queryByText(/5MB/)).not.toBeInTheDocument()
    })

    it('a file one byte over the 5 MiB limit is rejected', () => {
      renderPanel()
      const overByOne = makeImageFile('over-by-one.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES + 1)

      fireEvent.change(getFileInput(), { target: { files: [overByOne] } })

      expect(screen.getByText(/5MB/)).toBeInTheDocument()
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
    })

    it('a file one byte under the 5 MiB limit is accepted', async () => {
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
        id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
      })
      renderPanel()
      const underByOne = makeImageFile('under-by-one.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES - 1)

      fireEvent.change(getFileInput(), { target: { files: [underByOne] } })

      await waitFor(() => {
        expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-1', underByOne, anyIdempotency)
      })
    })
  })

  describe('Offline capture & synchronization', () => {
    it('a connectivity failure (no server response) persists the photo offline instead of showing a dead-end error', async () => {
      const file = makeImageFile()
      // No response is how the panel tells "offline" apart from "rejected"
      vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('Network Error'))
      renderPanel('garment-offline-1')

      fireEvent.change(getFileInput(), { target: { files: [file] } })

      expect(await screen.findByText(/saved offline/i)).toBeInTheDocument()
      expect(screen.queryByText(/^upload failed/i)).not.toBeInTheDocument()

      const pending = await getAllPendingEvidence()
      expect(pending).toHaveLength(1)
      expect(pending[0].garmentId).toBe('garment-offline-1')
      // IndexedDB clones files, so compare size rather than identity
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

      // A fresh mount reads from IndexedDB, which is what surviving a reload means
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
      // No session, so nothing may sync
      window.dispatchEvent(new Event('online'))
      await new Promise((r) => setTimeout(r, 50))

      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
      const pending = await getAllPendingEvidence()
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending')
    })
  })
})
