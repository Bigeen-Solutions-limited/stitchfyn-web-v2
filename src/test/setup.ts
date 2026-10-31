/// <reference types="node" />
// The /vitest entry registers the matchers and their types on Vitest's expect
import '@testing-library/jest-dom/vitest';
// jsdom has no IndexedDB, which the offline queues need
import 'fake-indexeddb/auto';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

// Use Node's File and Blob, because IndexedDB can't clone jsdom's versions (real browsers can)
(globalThis as any).Blob = NodeBlob;
(globalThis as any).File = NodeFile;

// Stub Blob URLs for photo previews. Always override: Vitest 5 supplies its own
// createObjectURL, but it only accepts jsdom Blobs, not the Node ones swapped in above
URL.createObjectURL = () => 'blob:mock-url';
URL.revokeObjectURL = () => {};
