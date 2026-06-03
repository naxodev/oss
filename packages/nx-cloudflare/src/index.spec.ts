import { applicationGenerator, libraryGenerator, initGenerator } from './index';

describe('@naxodev/nx-cloudflare public API', () => {
  it('exposes the generators for programmatic use', () => {
    expect(typeof applicationGenerator).toBe('function');
    expect(typeof libraryGenerator).toBe('function');
    expect(typeof initGenerator).toBe('function');
  });
});
