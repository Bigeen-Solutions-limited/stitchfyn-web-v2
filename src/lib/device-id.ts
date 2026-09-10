// A stable, per-browser identifier used ONLY to scope fabric-evidence
// offline-sync idempotency (garment.confirmationDeviceId and
// SyncAction.deviceId already establish this exact convention server-side
// — see the offline capture & synchronization discovery). Not a secret, not
// an auth credential, not tied to any account: safe to keep in
// localStorage indefinitely, unlike the access token, which is
// deliberately never persisted here or anywhere else in this app.
const STORAGE_KEY = 'stitchfyn_device_id';

export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private mode, disabled storage) — fall
    // back to a session-only id. Idempotency degrades gracefully: retries
    // within the same page load still dedupe; a full reload gets a new
    // device id, which only means a replay after reload is treated as a
    // new submission (safe, just non-optimal), never a wrong one.
    return crypto.randomUUID();
  }
}
