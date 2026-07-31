import '@testing-library/jest-dom';

// Keep the suite output free of application log lines. Set unconditionally: a
// LOG_LEVEL inherited from the developer's shell would otherwise win.
process.env.LOG_LEVEL = 'silent';

// Some suites run in the `node` environment (route handlers, the GitHub client),
// so every browser-only shim has to be guarded.
const isBrowserLike = typeof window !== 'undefined';

if (isBrowserLike && !('ResizeObserver' in globalThis)) {
  class ResizeObserverMock implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock;
}

if (isBrowserLike && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  if (isBrowserLike) window.localStorage.clear();
});
