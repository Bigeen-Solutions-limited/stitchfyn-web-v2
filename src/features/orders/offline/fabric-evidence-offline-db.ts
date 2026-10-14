// Stores fabric photos taken offline in IndexedDB until they can be uploaded; never stores tokens or other data.

import { MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES } from '../fabric-evidence.api';

const DB_NAME = 'stitchfyn-fabric-evidence-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending';
const GARMENT_INDEX = 'garmentId';

// A file over the 5 MB limit, kept separate from storage failures so the message can say which
export class OversizedFabricEvidenceError extends Error {
  public readonly sizeBytes: number;

  constructor(sizeBytes: number) {
    super(
      `Image is ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB — exceeds the ` +
        `${MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit and cannot be queued offline.`,
    );
    this.sizeBytes = sizeBytes;
    this.name = 'OversizedFabricEvidenceError';
  }
}

export type PendingFabricEvidenceStatus = 'pending' | 'syncing' | 'failed';
export type PendingFabricEvidenceFailureReason = 'network' | 'authorization' | 'validation' | 'unknown';

export interface PendingFabricEvidenceRecord {
  // Also the idempotency key sent to the server
  id: string;
  garmentId: string;
  deviceId: string;
  imageFile: File;
  // When the photo was taken, as reported by the device
  deviceCapturedAt: string;
  status: PendingFabricEvidenceStatus;
  failureReason?: PendingFabricEvidenceFailureReason;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(GARMENT_INDEX, 'garmentId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open fabric evidence offline queue'));
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

// Saves a new photo for later upload; throws on any failure so the app never claims it was saved when it wasn't
export async function enqueuePendingEvidence(
  record: Omit<PendingFabricEvidenceRecord, 'status' | 'attempts' | 'createdAt'>,
): Promise<void> {
  if (record.imageFile.size > MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES) {
    throw new OversizedFabricEvidenceError(record.imageFile.size);
  }

  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const full: PendingFabricEvidenceRecord = {
      ...record,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await promisifyRequest(store.put(full));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to persist offline fabric evidence'));
      tx.onabort = () => reject(tx.error ?? new Error('Storage write aborted (possibly quota exceeded)'));
    });
  } finally {
    db.close();
  }
}

export async function getPendingForGarment(garmentId: string): Promise<PendingFabricEvidenceRecord[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index(GARMENT_INDEX);
    const results = await promisifyRequest(index.getAll(garmentId));
    return (results as PendingFabricEvidenceRecord[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}

export async function getAllPendingEvidence(): Promise<PendingFabricEvidenceRecord[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const results = await promisifyRequest(tx.objectStore(STORE_NAME).getAll());
    return (results as PendingFabricEvidenceRecord[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}

export async function updatePendingEvidence(
  id: string,
  patch: Partial<Pick<PendingFabricEvidenceRecord, 'status' | 'failureReason' | 'errorMessage' | 'attempts'>>,
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const existing = (await promisifyRequest(store.get(id))) as PendingFabricEvidenceRecord | undefined;
    if (!existing) return;
    await promisifyRequest(store.put({ ...existing, ...patch }));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to update offline fabric evidence'));
    });
  } finally {
    db.close();
  }
}

export async function removePendingEvidence(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await promisifyRequest(tx.objectStore(STORE_NAME).delete(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to remove offline fabric evidence'));
    });
  } finally {
    db.close();
  }
}
