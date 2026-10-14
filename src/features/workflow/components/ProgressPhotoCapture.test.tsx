import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ProgressPhotoCapture } from './ProgressPhotoCapture'
import { progressPhotoApi, type ProgressPhoto } from '../progress-photo.api'
import { useToastStore } from '../../../components/feedback/Toast'
import { queryClient } from '../../../query/queryClient'
import { keys } from '../../../query/keys'

vi.mock('../progress-photo.api', () => ({
  progressPhotoApi: {
    upload: vi.fn(),
    getForGarment: vi.fn(),
  },
  MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT: 3,
}))

function makePhoto(overrides: Partial<ProgressPhoto> = {}): ProgressPhoto {
  return {
    id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
    stageInstanceId: 'stage-1', stageId: 'cutting',
    cloudinaryPublicId: 'stitchfyn/progress-photos/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
    uploadedBy: 'user-1', uploadedAt: new Date().toISOString(), deviceCapturedAt: null,
    clientId: null, deviceId: null, note: null,
    ...overrides,
  }
}

function makeImageFile(name = 'progress.jpg', sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/jpeg' })
}

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

function render_() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressPhotoCapture garmentId="garment-1" stageId="cutting" />
    </QueryClientProvider>,
  )
}

describe('ProgressPhotoCapture', () => {
  beforeEach(() => {
    vi.mocked(progressPhotoApi.upload).mockReset()
    queryClient.clear()
  })

  it('1 & 2. renders a native camera-capable file input that opens directly on tap', () => {
    render_()
    const input = getFileInput()
    expect(input).toBeTruthy()
    expect(input.getAttribute('accept')).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
  })

  it('6. selecting an image starts the upload automatically — no separate confirmation step', async () => {
    vi.mocked(progressPhotoApi.upload).mockResolvedValue(makePhoto())
    render_()

    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })

    await waitFor(() => {
      expect(progressPhotoApi.upload).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('button', { name: /^upload$/i })).not.toBeInTheDocument()
  })

  it('7. an optional note typed before capture is sent with the upload', async () => {
    vi.mocked(progressPhotoApi.upload).mockResolvedValue(makePhoto())
    render_()

    fireEvent.change(screen.getByPlaceholderText(/note \(optional\)/i), { target: { value: 'Zipper installed.' } })
    const file = makeImageFile()
    fireEvent.change(getFileInput(), { target: { files: [file] } })

    await waitFor(() => {
      expect(progressPhotoApi.upload).toHaveBeenCalledWith(
        'garment-1',
        'cutting',
        file,
        'Zipper installed.',
        expect.objectContaining({ clientId: expect.any(String), deviceId: expect.any(String), deviceCapturedAt: expect.any(String) }),
      )
    })
  })

  it('taking a photo does not require a note — an empty note is not sent', async () => {
    vi.mocked(progressPhotoApi.upload).mockResolvedValue(makePhoto())
    render_()

    const file = makeImageFile()
    fireEvent.change(getFileInput(), { target: { files: [file] } })

    await waitFor(() => {
      expect(progressPhotoApi.upload).toHaveBeenCalledWith('garment-1', 'cutting', file, undefined, expect.anything())
    })
  })

  it('8. an oversized image is rejected client-side before any upload attempt', () => {
    const showToastSpy = vi.spyOn(useToastStore.getState(), 'showToast')
    render_()

    const oversized = makeImageFile('huge.jpg', 6 * 1024 * 1024)
    fireEvent.change(getFileInput(), { target: { files: [oversized] } })

    expect(progressPhotoApi.upload).not.toHaveBeenCalled()
    expect(showToastSpy).toHaveBeenCalledWith('Photo Too Large', expect.stringContaining('5MB'), 'error')
    showToastSpy.mockRestore()
  })

  it('9. a successful upload invalidates the garment\'s progress-photos query', async () => {
    vi.mocked(progressPhotoApi.upload).mockResolvedValue(makePhoto())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([])
    queryClient.setQueryData(keys.workflow.progressPhotos('garment-1'), [])
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render_()
    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.workflow.progressPhotos('garment-1') })
    })
    invalidateSpy.mockRestore()
  })

  it('11. a successful upload shows the global success toast', async () => {
    vi.mocked(progressPhotoApi.upload).mockResolvedValue(makePhoto())
    const showToastSpy = vi.spyOn(useToastStore.getState(), 'showToast')
    render_()

    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })

    await waitFor(() => {
      expect(showToastSpy).toHaveBeenCalledWith('Photo Added', expect.any(String))
    })
    showToastSpy.mockRestore()
  })

  it('11b. a failed upload (backend error) is surfaced via the global domain-error toast, not an inline alert', async () => {
    vi.mocked(progressPhotoApi.upload).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', metadata: { reason: 'PROGRESS_PHOTO_LIMIT_REACHED' } } },
    })
    const showToastSpy = vi.spyOn(useToastStore.getState(), 'showToast')
    render_()

    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })

    await waitFor(() => {
      expect(showToastSpy).toHaveBeenCalledWith('Photo Limit Reached', expect.any(String), 'error')
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    showToastSpy.mockRestore()
  })

  it('12. after a failed upload, the control returns to a ready state so the user can simply try again', async () => {
    vi.mocked(progressPhotoApi.upload).mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: {} } })
    render_()

    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })
    await waitFor(() => expect(progressPhotoApi.upload).toHaveBeenCalledTimes(1))

    // The button is usable again so staff can retry
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add progress photo/i })).not.toHaveAttribute('aria-disabled', 'true')
    })

    vi.mocked(progressPhotoApi.upload).mockResolvedValueOnce(makePhoto())
    fireEvent.change(getFileInput(), { target: { files: [makeImageFile('retry.jpg')] } })

    await waitFor(() => expect(progressPhotoApi.upload).toHaveBeenCalledTimes(2))
  })

  it('disables the control while an upload is in flight', async () => {
    let resolveUpload: (v: ProgressPhoto) => void
    vi.mocked(progressPhotoApi.upload).mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    render_()

    fireEvent.change(getFileInput(), { target: { files: [makeImageFile()] } })

    // The button is a <label>, so MUI marks it aria-disabled instead of disabled
    const button = await screen.findByRole('button', { name: /uploading/i })
    expect(button).toHaveAttribute('aria-disabled', 'true')

    resolveUpload!(makePhoto())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add progress photo/i })).not.toHaveAttribute('aria-disabled', 'true')
    })
  })
})
