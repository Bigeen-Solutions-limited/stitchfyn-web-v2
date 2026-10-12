// LR-5: stage completions made while offline are persisted here and replayed
// through POST /sync/batch when connectivity returns.
//
// Same shape as the fabric-evidence offline queue (thin IndexedDB wrapper,
// no new dependency, no polling — flushes on the browser's `online` event
// and on app start). Conflict rule is deterministic: the SERVER WINS. Every
// item the server accepted or rejected is removed; a rejection is reported
// to the user with the server's reason. Only items that never reached the
// server (network failure, expired session) stay queued.
import axios from 'axios';
import { apiClient } from '../../../infrastructure/http/axios.client';
import { useAuthStore } from '../../auth/auth.store';
import { getDeviceId } from '../../../lib/device-id';

const DB_NAME = 'stitchfyn-stage-update-queue';
const STORE_NAME = 'pending';

export interface QueuedStageUpdate {
  /** Also the idempotency clientId sent to the server. */
  id: string;
  garmentId: string;
  orderId?: string;
  stageId: string;
  evidencePhotoUrls?: string[];
  deviceTimestamp: string;
}

export interface StageSyncConflict {
  update: QueuedStageUpdate;
  message: string;
}

export interface StageSyncResult {
  synced: QueuedStageUpdate[];
  conflicts: StageSyncConflict[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open stage update queue'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const request = fn(tx.objectStore(STORE_NAME));
    return await new Promise<T>((resolve, reject) => {
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error('Stage update queue write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Stage update queue write aborted (possibly quota exceeded)'));
    });
  } finally {
    db.close();
  }
}

export async function enqueueStageUpdate(
  update: Omit<QueuedStageUpdate, 'id' | 'deviceTimestamp'>,
): Promise<QueuedStageUpdate> {
  const record: QueuedStageUpdate = { ...update, id: crypto.randomUUID(), deviceTimestamp: new Date().toISOString() };
  await withStore('readwrite', (store) => store.put(record));
  return record;
}

export async function getQueuedStageUpdates(): Promise<QueuedStageUpdate[]> {
  const all = await withStore<QueuedStageUpdate[]>('readonly', (store) => store.getAll());
  return all.sort((a, b) => a.deviceTimestamp.localeCompare(b.deviceTimestamp));
}

async function removeStageUpdate(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

/** True when a request failed without ever reaching the server. */
export function isNetworkFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

let isFlushing = false;

/**
 * Sends every queued update in device order as one batch. Re-entrant calls
 * are no-ops. Returns null when nothing was attempted (offline, signed out,
 * empty queue, already flushing, or the request never reached the server).
 */
export async function flushStageUpdates(): Promise<StageSyncResult | null> {
  if (isFlushing) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  if (!useAuthStore.getState().accessToken) return null;

  isFlushing = true;
  try {
    const queued = await getQueuedStageUpdates();
    if (queued.length === 0) return null;

    let response;
    try {
      response = await apiClient.post<{
        succeeded: { clientId: string }[];
        conflicts: { clientId: string; message: string }[];
      }>('/sync/batch', {
        deviceId: getDeviceId(),
        actions: queued.map((u) => ({
          clientId: u.id,
          type: 'advance_stage',
          orderId: u.orderId,
          garmentId: u.garmentId,
          payload: { stageId: u.stageId, evidencePhotoUrls: u.evidencePhotoUrls },
          deviceTimestamp: u.deviceTimestamp,
        })),
      });
    } catch (error) {
      // Never reached the server, or the session expired: keep everything
      // queued for the next attempt.
      if (isNetworkFailure(error) || (axios.isAxiosError(error) && error.response?.status === 401)) return null;
      throw error;
    }

    const byId = new Map(queued.map((u) => [u.id, u]));
    const result: StageSyncResult = { synced: [], conflicts: [] };
    for (const s of response.data.succeeded) {
      const update = byId.get(s.clientId);
      if (update) result.synced.push(update);
    }
    for (const c of response.data.conflicts) {
      const update = byId.get(c.clientId);
      if (update) result.conflicts.push({ update, message: c.message });
    }
    // Server wins: whatever it decided is final for these items.
    for (const u of [...result.synced, ...result.conflicts.map((c) => c.update)]) {
      await removeStageUpdate(u.id);
    }
    return result;
  } finally {
    isFlushing = false;
  }
}
