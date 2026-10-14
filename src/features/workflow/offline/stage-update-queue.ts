// Stage completions made offline are saved here and sent through POST /sync/batch when back online; the server's decision is final.
import axios from 'axios';
import { apiClient } from '../../../infrastructure/http/axios.client';
import { useAuthStore } from '../../auth/auth.store';
import { getDeviceId } from '../../../lib/device-id';

const DB_NAME = 'stitchfyn-stage-update-queue';
const STORE_NAME = 'pending';

export interface QueuedStageUpdate {
  // Also the idempotency key sent to the server
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

export function isNetworkFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

let isFlushing = false;

// Sends every queued update in order as one batch; returns null if nothing was sent
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
      // Never reached the server or the session expired: keep everything for next time
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
    // The server's decision is final, so drop everything it answered
    for (const u of [...result.synced, ...result.conflicts.map((c) => c.update)]) {
      await removeStageUpdate(u.id);
    }
    return result;
  } finally {
    isFlushing = false;
  }
}
