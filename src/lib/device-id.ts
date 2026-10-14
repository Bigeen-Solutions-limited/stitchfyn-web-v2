// A per-browser id used to avoid saving retried uploads twice; not a secret, so localStorage is fine.
const STORAGE_KEY = 'stitchfyn_device_id';

export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // No localStorage (e.g. private mode): use an id for this page load only
    return crypto.randomUUID();
  }
}
