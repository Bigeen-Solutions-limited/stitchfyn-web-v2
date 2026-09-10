import '@testing-library/jest-dom';
// jsdom does not implement IndexedDB at all — needed by the fabric-evidence
// offline queue (fabric-evidence-offline-db.ts) and anything that exercises
// it. Same "environment gap, not a per-component concern" rationale as the
// Blob URL stubs below.
import 'fake-indexeddb/auto';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

// fake-indexeddb clones stored values with the platform's real
// `structuredClone`. jsdom's own File/Blob classes aren't recognized by
// Node's structuredClone (they don't carry Node's internal Blob brand), so
// a File round-tripped through IndexedDB under plain jsdom comes back as an
// empty `{}`. Node's own File/Blob ARE recognized, so tests that persist a
// captured photo (the fabric-evidence offline queue) use those instead.
// This is a test-environment gap only — real browsers structured-clone
// File/Blob into IndexedDB correctly; see the offline capture &
// synchronization discovery's "browser/device constraints" section for
// what still needs real-device verification.
(globalThis as any).Blob = NodeBlob;
(globalThis as any).File = NodeFile;

// jsdom does not implement the Blob URL APIs. Any component that previews a
// selected file (URL.createObjectURL) needs these stubbed globally rather
// than per-test — this is an environment gap, not a per-component concern.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
