// Flushes the persistent fabric-evidence offline queue once connectivity
// (and an authenticated session) are actually available again.
//
// Deliberately NOT a general sync framework: this manager only knows about
// one thing — fabric_evidence_photos submissions via the existing
// fabricEvidenceApi.uploadFabricEvidencePhoto() multipart endpoint. No
// polling loop: it reacts to the browser's online event, to a component
// mounting (see useFabricEvidenceOfflineQueue), and to an explicit manual
// retry. navigator.onLine gates whether an attempt is even made (cheap,
// avoids a pointless request while visibly offline) but the actual
// request's success/failure — not navigator.onLine — is what's treated as
// authoritative, per the offline capture & synchronization requirements.
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
    // No response at all — connectivity loss, DNS failure, or our own
    // 15s upload timeout. This is exactly the case navigator.onLine can't
    // reliably predict (a flaky connection can report "online" while every
    // request still fails), so it's what actually drives "still offline."
    return { reason: 'network', permanent: false, abortFlush: true };
  }
  if (status === 401) {
    // Session-wide — every other queued item will fail the same way.
    return { reason: 'authorization', permanent: false, abortFlush: true };
  }
  if (status === 403 || status === 404 || status === 409 || status === 400 || status === 413 || status === 422) {
    // Specific to this item (capability/garment state/validation) — other
    // queued items (possibly other garments) may still succeed.
    return { reason: status === 403 ? 'authorization' : 'validation', permanent: true, abortFlush: false };
  }
  // Unrecognized/server error — treat as transient, try again later, but
  // don't assume every other item will fail the same way.
  return { reason: 'unknown', permanent: false, abortFlush: false };
}

/**
 * Attempts to flush every pending item. Safe to call repeatedly/concurrently
 * — re-entrant calls are no-ops while a flush is already running.
 */
export async function attemptFabricEvidenceSync(): Promise<void> {
  if (isSyncing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!useAuthStore.getState().accessToken) return; // wait for the user to (re)authenticate

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
      // Transient (network/auth/unknown) — leave it retryable, not "failed".
      await updatePendingEvidence(item.id, { status: 'pending' });
    }
    notify({ type: 'changed', garmentId: item.garmentId });
    if (reason === 'network' || reason === 'authorization') {
      // Every remaining item is about to fail the same way — stop hammering.
      throw new StopFlush();
    }
  }
}

class StopFlush extends Error {}

function extractMessage(error: AxiosError<{ message?: string }>): string {
  return error.response?.data?.message || error.message || 'Sync failed. It will retry automatically.';
}

/** Re-queues one failed item and immediately attempts to flush it. */
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
