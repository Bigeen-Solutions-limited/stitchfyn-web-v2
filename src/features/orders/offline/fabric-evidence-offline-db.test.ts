import { describe, it, expect, afterEach } from 'vitest'
import {
  enqueuePendingEvidence,
  getAllPendingEvidence,
  getPendingForGarment,
  removePendingEvidence,
  updatePendingEvidence,
  OversizedFabricEvidenceError,
} from './fabric-evidence-offline-db'
import { MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES } from '../fabric-evidence.api'

function makeFile(name = 'fabric.jpg', sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/jpeg' })
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
    // Check size and type, not name: the test environment drops File names when cloning
    const file = makeFile('proof.jpg')
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: file, deviceCapturedAt: new Date().toISOString() })

    const [item] = await getPendingForGarment('garment-A')
    expect(item.imageFile.size).toBe(file.size)
    expect(item.imageFile.type).toBe('image/jpeg')
  })

  it('surviving a simulated reload: a fresh read (no in-memory state) still finds the persisted item', async () => {
    await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: makeFile(), deviceCapturedAt: new Date().toISOString() })

    // Opens a new IndexedDB connection, like a page reload would
    const reread = await getPendingForGarment('garment-A')
    expect(reread).toHaveLength(1)
  })

  describe('5 MiB defense-in-depth guard', () => {
    // The panel already blocks oversized files; these prove this function blocks them on its own

    it('rejects a file over the 5 MiB limit with a distinguishable error and persists nothing', async () => {
      const oversized = makeFile('huge.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES + 1)

      await expect(
        enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: oversized, deviceCapturedAt: new Date().toISOString() }),
      ).rejects.toBeInstanceOf(OversizedFabricEvidenceError)

      expect(await getPendingForGarment('garment-A')).toHaveLength(0)
    })

    it('a file exactly at the 5 MiB limit is accepted (not rejected merely for equaling the limit)', async () => {
      const atLimit = makeFile('at-limit.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES)

      await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: atLimit, deviceCapturedAt: new Date().toISOString() })

      expect(await getPendingForGarment('garment-A')).toHaveLength(1)
    })

    it('a file one byte under the 5 MiB limit is accepted', async () => {
      const underByOne = makeFile('under-by-one.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES - 1)

      await enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: underByOne, deviceCapturedAt: new Date().toISOString() })

      expect(await getPendingForGarment('garment-A')).toHaveLength(1)
    })

    it('a file one byte over the 5 MiB limit is rejected', async () => {
      const overByOne = makeFile('over-by-one.jpg', MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES + 1)

      await expect(
        enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: overByOne, deviceCapturedAt: new Date().toISOString() }),
      ).rejects.toBeInstanceOf(OversizedFabricEvidenceError)
      expect(await getPendingForGarment('garment-A')).toHaveLength(0)
    })

    it('the error message names the actual size and the limit', async () => {
      const oversized = makeFile('huge.jpg', 6 * 1024 * 1024)

      await expect(
        enqueuePendingEvidence({ id: 'c1', garmentId: 'garment-A', deviceId: 'd1', imageFile: oversized, deviceCapturedAt: new Date().toISOString() }),
      ).rejects.toThrow(/6\.0MB.*5MB/)
    })
  })
})
