// Uploads photos saved offline when the browser comes back online, a screen opens, or staff tap retry; a failed request, not navigator.onLine, decides if we're still offline.
import type { AxiosError } from 'axios';
import { useAuthStore } from '../../auth/auth.store';
import { fabricEvidenceApi, type FabricEvidencePhoto } from '../fabric-evidence.api';
import {
  getAllPendingEvidence,
  removePendingEvidence,
  updatePendingEvidence,
  type PendingFabricEvidenceFailureReason,
  type PendingFabricEvidenceRecord,
} from './fabric-evidence-offline-db';

type QueueEvent =
  | { type: 'changed'; garmentId: string }
  | { type: 'synced'; garmentId: string; photo: FabricEvidencePhoto };

type Listener = (event: QueueEvent) => void;

const listeners = new Set<Listener>();
let isSyncing = false;

export function subscribeFabricEvidenceQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(event: QueueEvent) {
  listeners.forEach((l) => l(event));
}

function classifyFailure(error: AxiosError): { reason: PendingFabricEvidenceFailureReason; permanent: boolean; abortFlush: boolean } {
  const status = error.response?.status;
  if (!error.response) {
    // No response: still offline, even if the browser says otherwise
    return { reason: 'network', permanent: false, abortFlush: true };
  }
  if (status === 401) {
    // Every other item would fail the same way
    return { reason: 'authorization', permanent: false, abortFlush: true };
  }
  if (status === 403 || status === 404 || status === 409 || status === 400 || status === 413 || status === 422) {
    // A problem with this item only; others may still succeed
    return { reason: status === 403 ? 'authorization' : 'validation', permanent: true, abortFlush: false };
  }
  // Unknown server error: try again later without giving up on the rest
  return { reason: 'unknown', permanent: false, abortFlush: false };
}

// Uploads every saved photo; safe to call repeatedly, since overlapping calls do nothing
export async function attemptFabricEvidenceSync(): Promise<void> {
  if (isSyncing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!useAuthStore.getState().accessToken) return; // wait until the user signs in again

  isSyncing = true;
  try {
    const pending = await getAllPendingEvidence();
    for (const item of pending.filter((i) => i.status === 'pending')) {
      try {
        await syncOne(item);
      } catch (err) {
        if (err instanceof StopFlush) break;
        throw err;
      }
    }
  } finally {
    isSyncing = false;
  }
}

async function syncOne(item: PendingFabricEvidenceRecord): Promise<void> {
  await updatePendingEvidence(item.id, { status: 'syncing', attempts: item.attempts + 1 });
  notify({ type: 'changed', garmentId: item.garmentId });

  try {
    const photo = await fabricEvidenceApi.uploadFabricEvidencePhoto(item.garmentId, item.imageFile, {
      clientId: item.id,
      deviceId: item.deviceId,
      deviceCapturedAt: item.deviceCapturedAt,
    });
    await removePendingEvidence(item.id);
    notify({ type: 'synced', garmentId: item.garmentId, photo });
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    const { reason, permanent } = classifyFailure(axiosErr);
    if (permanent) {
      await updatePendingEvidence(item.id, {
        status: 'failed',
        failureReason: reason,
        errorMessage: extractMessage(axiosErr),
      });
    } else {
      // A temporary failure: leave it to retry rather than marking it failed
      await updatePendingEvidence(item.id, { status: 'pending' });
    }
    notify({ type: 'changed', garmentId: item.garmentId });
    if (reason === 'network' || reason === 'authorization') {
      // Stop: every remaining item would fail the same way
      throw new StopFlush();
    }
  }
}

class StopFlush extends Error {}

function extractMessage(error: AxiosError<{ message?: string }>): string {
  return error.response?.data?.message || error.message || 'Sync failed. It will retry automatically.';
}

// Re-queues one failed photo and tries to upload it straight away
export async function retryFabricEvidenceItem(id: string, garmentId: string): Promise<void> {
  await updatePendingEvidence(id, { status: 'pending' });
  notify({ type: 'changed', garmentId });
  await attemptFabricEvidenceSync();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void attemptFabricEvidenceSync();
  });
}
