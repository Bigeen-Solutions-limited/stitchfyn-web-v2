import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AxiosError } from 'axios'
import { apiClient } from '../../../infrastructure/http/axios.client'
import { useAuthStore } from '../../auth/auth.store'
import { enqueueStageUpdate, flushStageUpdates, getQueuedStageUpdates } from './stage-update-queue'

vi.mock('../../../infrastructure/http/axios.client', () => ({ apiClient: { post: vi.fn() } }))

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>

async function clearQueue() {
  for (const u of await getQueuedStageUpdates()) {
    post.mockResolvedValueOnce({ data: { succeeded: [{ clientId: u.id }], conflicts: [] } })
  }
  await flushStageUpdates()
  post.mockReset()
}

describe('stage update offline queue (LR-5)', () => {
  beforeEach(async () => {
    useAuthStore.setState({ accessToken: 'token' } as any)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    await clearQueue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replays queued updates in order through /sync/batch and removes them once accepted', async () => {
    const first = await enqueueStageUpdate({ garmentId: 'g1', orderId: 'o1', stageId: 'cutting' })
    const second = await enqueueStageUpdate({ garmentId: 'g1', orderId: 'o1', stageId: 'sewing' })
    post.mockResolvedValueOnce({ data: { succeeded: [{ clientId: first.id }, { clientId: second.id }], conflicts: [] } })

    const result = await flushStageUpdates()

    expect(post).toHaveBeenCalledWith('/sync/batch', expect.objectContaining({
      deviceId: expect.any(String),
      actions: [
        expect.objectContaining({ clientId: first.id, type: 'advance_stage', garmentId: 'g1', payload: expect.objectContaining({ stageId: 'cutting' }) }),
        expect.objectContaining({ clientId: second.id, payload: expect.objectContaining({ stageId: 'sewing' }) }),
      ],
    }))
    expect(result?.synced.map((u) => u.stageId)).toEqual(['cutting', 'sewing'])
    expect(await getQueuedStageUpdates()).toHaveLength(0)
  })

  it('lets the server win on a conflict: the item is dropped and reported with the server reason', async () => {
    const update = await enqueueStageUpdate({ garmentId: 'g1', stageId: 'cutting' })
    post.mockResolvedValueOnce({
      data: { succeeded: [], conflicts: [{ clientId: update.id, message: 'Waiting for: Deposit' }] },
    })

    const result = await flushStageUpdates()

    expect(result?.conflicts).toEqual([{ update, message: 'Waiting for: Deposit' }])
    expect(await getQueuedStageUpdates()).toHaveLength(0)
  })

  it('keeps updates queued when the request never reaches the server', async () => {
    await enqueueStageUpdate({ garmentId: 'g1', stageId: 'cutting' })
    post.mockRejectedValueOnce(new AxiosError('Network Error'))

    expect(await flushStageUpdates()).toBeNull()
    expect(await getQueuedStageUpdates()).toHaveLength(1)
  })

  it('does not attempt a sync while the browser is offline', async () => {
    await enqueueStageUpdate({ garmentId: 'g1', stageId: 'cutting' })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    expect(await flushStageUpdates()).toBeNull()
    expect(post).not.toHaveBeenCalled()
    expect(await getQueuedStageUpdates()).toHaveLength(1)
  })
})
