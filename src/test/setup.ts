import '@testing-library/jest-dom';

// jsdom does not implement the Blob URL APIs. Any component that previews a
// selected file (URL.createObjectURL) needs these stubbed globally rather
// than per-test — this is an environment gap, not a per-component concern.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
