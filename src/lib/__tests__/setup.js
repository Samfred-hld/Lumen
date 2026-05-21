import '@testing-library/jest-dom';
import 'vitest-axe/extend-expect';

// Polyfill ResizeObserver for jsdom (required by Radix UI components)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) { this._callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
