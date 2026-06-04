import { createCliOptions } from './create-cli-options';

describe('createCliOptions', () => {
  it('renders a string option as --key=value', () => {
    expect(createCliOptions({ name: 'my-worker' })).toEqual([
      '--name=my-worker',
    ]);
  });

  it('kebab-cases camelCase keys', () => {
    expect(createCliOptions({ compatibilityDate: '2026-01-01' })).toEqual([
      '--compatibility-date=2026-01-01',
    ]);
  });

  it('renders a numeric option, including 0', () => {
    expect(createCliOptions({ port: 8787 })).toEqual(['--port=8787']);
    expect(createCliOptions({ port: 0 })).toEqual(['--port=0']);
  });

  it('renders a true boolean as a bare --flag', () => {
    expect(createCliOptions({ minify: true })).toEqual(['--minify']);
  });

  it('omits a false boolean rather than synthesizing --no-flag', () => {
    // Wrangler accepts --no-<flag>, but the schemas default several booleans
    // (noBundle, remote, dryRun, keepVars...) to false, which Nx injects. A
    // bare false must not emit a no-op negation like --no-no-bundle.
    expect(createCliOptions({ minify: false })).toEqual([]);
  });

  it('does not emit negated flags for injected false defaults', () => {
    const serveDefaults = {
      noBundle: false,
      remote: false,
      testScheduled: false,
      localProtocol: 'http',
      logLevel: 'log',
      port: 8787,
    };
    const args = createCliOptions(serveDefaults);
    expect(args.some((a) => a.startsWith('--no-'))).toBe(false);
    expect(args).toContain('--local-protocol=http');
    expect(args).toContain('--port=8787');
  });

  it('renders an array as repeated flags rather than a comma-joined value', () => {
    expect(
      createCliOptions({ routes: ['a.example.com', 'b.example.com'] })
    ).toEqual(['--routes=a.example.com', '--routes=b.example.com']);
  });

  it('trims array values', () => {
    expect(createCliOptions({ routes: [' a ', ' b '] })).toEqual([
      '--routes=a',
      '--routes=b',
    ]);
  });

  it('omits an empty array entirely', () => {
    expect(createCliOptions({ routes: [] })).toEqual([]);
  });

  it('emits one flag per key, in order, for a multi-key object', () => {
    expect(createCliOptions({ name: 'w', minify: true, port: 8787 })).toEqual([
      '--name=w',
      '--minify',
      '--port=8787',
    ]);
  });

  it('drops undefined and null values', () => {
    expect(createCliOptions({ name: undefined, env: null })).toEqual([]);
  });

  it('preserves an explicit empty string value', () => {
    expect(createCliOptions({ name: '' })).toEqual(['--name=']);
  });
});
