import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FabricEvidenceCapturePanel } from './FabricEvidenceCapturePanel'
import { fabricEvidenceApi, type FabricEvidencePhoto } from '../fabric-evidence.api'
import { sealApi } from '../seal.api'

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

function getFileInput(): HTMLInputElement {
  // The input is visually hidden (MUI's <Button component="label"> pattern),
  // not inaccessible — queried directly since it has no accessible role.
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('FabricEvidenceCapturePanel', () => {
  beforeEach(() => {
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReset()
    vi.mocked(sealApi.confirmFabric).mockReset()
    vi.mocked(sealApi.getGarmentSeal).mockReset()
  })

  it('1 & 2. the capture control accepts images and hints the environment camera', () => {
    renderPanel()
    const input = getFileInput()
    expect(input).toBeTruthy()
    expect(input.getAttribute('accept')).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
  })

  it('3. selecting an image hands the raw File to the upload call, not a base64 conversion', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue({
      id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-1', file)
    })
    // Same File reference, not a string — proves no FileReader/base64 step
    // sits between selection and upload.
    const [, uploadedArg] = vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mock.calls[0]
    expect(uploadedArg).toBeInstanceOf(File)
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
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-42', file)
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
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))

    expect(await screen.findByText(/photo uploaded/i)).toBeInTheDocument()
  })

  it('7. a failed upload renders a failure state with a retry action', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(new Error('network error'))
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('7b. retry resubmits the same file without requiring recapture', async () => {
    const file = makeImageFile()
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
        cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
        uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
      })
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))
    fireEvent.click(await screen.findByRole('button', { name: /retry/i }))

    expect(await screen.findByText(/photo uploaded/i)).toBeInTheDocument()
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(2)
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenNthCalledWith(2, 'garment-1', file)
  })

  it('8. a duplicate submission while uploading is prevented', async () => {
    const file = makeImageFile()
    let resolveUpload: (v: FabricEvidencePhoto) => void
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReturnValue(
      new Promise((resolve) => { resolveUpload = resolve }),
    )
    renderPanel()

    fireEvent.change(getFileInput(), { target: { files: [file] } })
    const uploadButton = await screen.findByRole('button', { name: /upload/i })
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
    })
    // Clicking again while pending must not fire a second call.
    fireEvent.click(screen.getByRole('button', { name: /uploading/i }))
    fireEvent.click(screen.getByRole('button', { name: /uploading/i }))

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
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockImplementation(async (garmentId, file) => ({
      id: `photo-${garmentId}`, garmentId, orderId: 'order-1', companyId: 'c1',
      cloudinaryPublicId: `stitchfyn/fabric-evidence/${file.name}`,
      secureUrl: `https://res.cloudinary.com/mock/${file.name}`,
      uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    }))

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
    fireEvent.click(screen.getAllByRole('button', { name: /upload photo/i })[0])

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-A', fileA)
    })
    // Garment B's panel must still be in its idle state — untouched by A's upload.
    expect(panelB.querySelector('img[alt="Uploaded fabric evidence"]')).toBeNull()
    expect(panelA.querySelector('img[alt="Uploaded fabric evidence"]')).toBeTruthy()

    fireEvent.change(panelB.querySelector('input[type="file"]')!, { target: { files: [fileB] } })
    fireEvent.click(screen.getAllByRole('button', { name: /upload photo/i })[0])

    await waitFor(() => {
      expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith('garment-B', fileB)
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
    fireEvent.click(await screen.findByRole('button', { name: /upload photo/i }))
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
})
