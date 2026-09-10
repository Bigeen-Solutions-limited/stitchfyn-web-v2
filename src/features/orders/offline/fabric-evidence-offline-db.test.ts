import { describe, it, expect, afterEach } from 'vitest'
import {
  enqueuePendingEvidence,
  getAllPendingEvidence,
  getPendingForGarment,
  removePendingEvidence,
  updatePendingEvidence,
} from './fabric-evidence-offline-db'

function makeFile(name = 'fabric.jpg') {
  return new File([new Uint8Array(1024)], name, { type: 'image/jpeg' })
}

function clearDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('stitchfyn-fabric-evidence-queue')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

describe('fabric-evidence-offline-db', () => {
  afterEach(async () => {
    await clearDb()
  })

  it('persists a queued item and reads it back scoped to its garment', async () => {
    await enqueuePendingEvidence({
      id: 'client-1',
      garmentId: 'garment-A',
      deviceId: 'device-1',
      imageFile: makeFile(),
      deviceCapturedAt: '2026-09-10T10:00:00.000Z',
    })

    const forA = await getPendingForGarment('garment-A')
    expect(forA).toHaveLength(1)
    expect(forA[0].id).toBe('client-1')
    expect(forA[0].status).toBe('pending')
    expect(forA[0].attempts).toBe(0)

    const forB = await getPendingForGarment('garment-B')
    expect(forB).toHaveLength(0)
  })

  it('getAllPendingEvidence returns items across garments, oldest first', async () => {
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })
    await enqueuePendingEvidence({ id: 'c2', garmentId: 'garment-B', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })

    const all = await getAllPendingEvidence()
    expect(all.map((i) => i.id).sort()).toEqual(['c1', 'c2'])
  })

  it('updatePendingEvidence patches status/failure fields in place', async () => {
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })

    await updatePendingEvidence('c1', { status: 'failed', failureReason: 'validation', errorMessage: 'Invalid image' })

    const [item] = await getPendingForGarment('garment-A')
    expect(item.status).toBe('failed')
    expect(item.failureReason).toBe('validation')
    expect(item.errorMessage).toBe('Invalid image')
  })

  it('updatePendingEvidence on a nonexistent id is a harmless no-op', async () => {
    await expect(updatePendingEvidence('does-not-exist', { status: 'failed' })).resolves.toBeUndefined()
  })

  it('removePendingEvidence deletes the item', async () => {
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })
    await removePendingEvidence('c1')

    expect(await getPendingForGarment('garment-A')).toHaveLength(0)
  })

  it('the stored image bytes/type survive the IndexedDB round trip unmodified', async () => {
    // Checks size/type, not `.name` — Node's structuredClone (what
    // fake-indexeddb clones through) currently downgrades a cloned File to
    // a plain Blob, dropping its name; real browsers preserve File
    // identity fully. See src/test/setup.ts for the full explanation.
    const file = makeFile('proof.jpg')
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: file, deviceCapturedAt: new Date().toISOString() })

    const [item] = await getPendingForGarment('garment-A')
    expect(item.imageFile.size).toBe(file.size)
    expect(item.imageFile.type).toBe('image/jpeg')
  })

  it('surviving a simulated reload: a fresh read (no in-memory state) still finds the persisted item', async () => {
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })

    // Nothing here holds a reference to the write above — this call opens
    // a brand-new IndexedDB connection, the same as a page reload would.
    const reread = await getPendingForGarment('garment-A')
    expect(reread).toHaveLength(1)
  })
})
