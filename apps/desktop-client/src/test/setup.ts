import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// import * as matchers from '@testing-library/jest-dom/matchers';

// Extend vitest's expect method with methods from react-testing-library
// Note: We need to install @testing-library/jest-dom for this to work perfectly, 
// but for now we might skip it if not installed.
// actually I didn't install jest-dom. I will skip extending expect for now to avoid errors.

afterEach(() => {
  cleanup();
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
