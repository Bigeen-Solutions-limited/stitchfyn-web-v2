import '@testing-library/jest-dom';
// jsdom has no IndexedDB, which the offline queues need
import 'fake-indexeddb/auto';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

// Use Node's File and Blob, because IndexedDB can't clone jsdom's versions (real browsers can)
(globalThis as any).Blob = NodeBlob;
(globalThis as any).File = NodeFile;

// jsdom has no Blob URLs, which photo previews need
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
