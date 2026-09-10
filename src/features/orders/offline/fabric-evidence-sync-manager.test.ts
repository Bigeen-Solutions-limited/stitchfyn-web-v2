import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fabricEvidenceApi, type FabricEvidencePhoto } from '../fabric-evidence.api'
import { useAuthStore } from '../../auth/auth.store'
import { enqueuePendingEvidence, getAllPendingEvidence } from './fabric-evidence-offline-db'
import { attemptFabricEvidenceSync, retryFabricEvidenceItem, subscribeFabricEvidenceQueue } from './fabric-evidence-sync-manager'

vi.mock('../fabric-evidence.api', () => ({
  fabricEvidenceApi: {
    uploadFabricEvidencePhoto: vi.fn(),
  },
}))

function makeFile(name = 'fabric.jpg') {
  return new File([new Uint8Array(1024)], name, { type: 'image/jpeg' })
}

function makePhoto(overrides: Partial<FabricEvidencePhoto> = {}): FabricEvidencePhoto {
  return {
    id: 'photo-1', garmentId: 'garment-A', orderId: 'order-1', companyId: 'c1',
    cloudinaryPublicId: 'stitchfyn/fabric-evidence/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
    uploadedBy: 'user-1', uploadedAt: new Date().toISOString(),
    clientId: null, deviceId: null, deviceCapturedAt: null,
    ...overrides,
  }
}

function serverError(status: number): any {
  return { isAxiosError: true, response: { status, data: {} }, message: `HTTP ${status}` }
}

function networkError(): any {
  return { isAxiosError: true, response: undefined, message: 'Network Error' }
}

function clearDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('stitchfyn-fabric-evidence-queue')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

async function enqueue(id: string, garmentId = 'garment-A') {
  await enqueuePendingEvidence({
    id,
    garmentId,
    deviceId: 'device-1',
    imageFile: makeFile(),
    deviceCapturedAt: '2026-09-10T09:00:00.000Z',
  })
}

describe('fabric-evidence-sync-manager', () => {
  beforeEach(() => {
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReset()
    useAuthStore.getState().clearAuth()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(async () => {
    await clearDb()
  })

  it('does nothing while navigator.onLine is false (cheap pre-filter, not authoritative on its own)', async () => {
    await enqueue('c1')
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    await attemptFabricEvidenceSync()

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
    expect(await getAllPendingEvidence()).toHaveLength(1)
  })

  it('does nothing without an authenticated session, and does not delete the queued item', async () => {
    await enqueue('c1')
    // No setAuth() — accessToken stays null.

    await attemptFabricEvidenceSync()

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).not.toHaveBeenCalled()
    expect(await getAllPendingEvidence()).toHaveLength(1)
  })

  it('flushes a pending item and removes it once the server acknowledges it', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue(makePhoto({ id: 'photo-synced' }))

    await attemptFabricEvidenceSync()

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledWith(
      'garment-A',
      // Blob, not File — Node's structuredClone (what fake-indexeddb
      // clones through) downgrades a cloned File to a plain Blob; see
      // src/test/setup.ts. uploadFabricEvidencePhoto()'s real signature
      // already accepts File | Blob for exactly this reason.
      expect.any(Blob),
      { clientId: 'c1', deviceId: 'device-1', deviceCapturedAt: '2026-09-10T09:00:00.000Z' },
    )
    expect(await getAllPendingEvidence()).toHaveLength(0)
  })

  it('notifies subscribers with the synced photo, scoped by garmentId', async () => {
    await enqueue('c1', 'garment-notify')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    const photo = makePhoto({ id: 'photo-notify', garmentId: 'garment-notify' })
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue(photo)

    const events: any[] = []
    const unsubscribe = subscribeFabricEvidenceQueue((e) => events.push(e))
    try {
      await attemptFabricEvidenceSync()
    } finally {
      unsubscribe()
    }

    expect(events.some((e) => e.type === 'synced' && e.garmentId === 'garment-notify' && e.photo.id === 'photo-notify')).toBe(true)
  })

  it('a network-level failure leaves the item pending (retryable), not failed', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(networkError())

    await attemptFabricEvidenceSync()

    const [item] = await getAllPendingEvidence()
    expect(item.status).toBe('pending')
  })

  it('a network failure on one item stops the flush early instead of hammering the rest of the queue', async () => {
    await enqueue('c1', 'garment-A')
    await enqueue('c2', 'garment-B')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(networkError())

    await attemptFabricEvidenceSync()

    // Only the first item was even attempted.
    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(1)
  })

  it('a 401 (session-wide auth failure) leaves the item pending and stops the flush, rather than marking it permanently failed', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(serverError(401))

    await attemptFabricEvidenceSync()

    const [item] = await getAllPendingEvidence()
    expect(item.status).toBe('pending')
  })

  it('a 400/validation rejection marks the item failed (permanent) and does not block other items', async () => {
    await enqueue('c1', 'garment-A')
    await enqueue('c2', 'garment-B')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto)
      .mockRejectedValueOnce(serverError(400))
      .mockResolvedValueOnce(makePhoto({ id: 'photo-B', garmentId: 'garment-B' }))

    await attemptFabricEvidenceSync()

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(2)
    const remaining = await getAllPendingEvidence()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('c1')
    expect(remaining[0].status).toBe('failed')
    expect(remaining[0].failureReason).toBe('validation')
  })

  it('a 403 (item-specific authorization) marks the item failed with an authorization reason', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValue(serverError(403))

    await attemptFabricEvidenceSync()

    const [item] = await getAllPendingEvidence()
    expect(item.status).toBe('failed')
    expect(item.failureReason).toBe('authorization')
  })

  it('retryFabricEvidenceItem re-queues a failed item and immediately attempts to flush it', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockRejectedValueOnce(serverError(400))
    await attemptFabricEvidenceSync()
    expect((await getAllPendingEvidence())[0].status).toBe('failed')

    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValueOnce(makePhoto())
    await retryFabricEvidenceItem('c1', 'garment-A')

    expect(await getAllPendingEvidence()).toHaveLength(0)
  })

  it('replaying the same clientId after a successful sync does not upload twice (the item is gone once synced)', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockResolvedValue(makePhoto())

    await attemptFabricEvidenceSync()
    await attemptFabricEvidenceSync() // nothing left to flush

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(1)
  })

  it('concurrent attemptFabricEvidenceSync calls do not double-flush the same item', async () => {
    await enqueue('c1')
    useAuthStore.getState().setAuth('token', { id: 'u1', email: 'u@t.com', fullName: 'U', role: 'MANAGER' } as any)
    let resolveUpload: (p: FabricEvidencePhoto) => void
    vi.mocked(fabricEvidenceApi.uploadFabricEvidencePhoto).mockReturnValue(
      new Promise((resolve) => { resolveUpload = resolve }),
    )

    const first = attemptFabricEvidenceSync()
    const second = attemptFabricEvidenceSync() // re-entrant while first is mid-flight — must no-op
    resolveUpload!(makePhoto())
    await Promise.all([first, second])

    expect(fabricEvidenceApi.uploadFabricEvidencePhoto).toHaveBeenCalledTimes(1)
  })
})
