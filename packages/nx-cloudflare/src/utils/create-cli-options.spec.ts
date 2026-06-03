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

  it('renders a false boolean as --no-flag', () => {
    expect(createCliOptions({ minify: false })).toEqual(['--no-minify']);
  });

  it('renders an array as repeated flags rather than a comma-joined value', () => {
    expect(createCliOptions({ route: ['a.example.com', 'b.example.com'] })).toEqual(
      ['--route=a.example.com', '--route=b.example.com']
    );
  });

  it('trims array values', () => {
    expect(createCliOptions({ route: [' a ', ' b '] })).toEqual([
      '--route=a',
      '--route=b',
    ]);
  });

  it('omits an empty array entirely', () => {
    expect(createCliOptions({ route: [] })).toEqual([]);
  });

  it('drops undefined and null values', () => {
    expect(createCliOptions({ name: undefined, env: null })).toEqual([]);
  });

  it('preserves an explicit empty string value', () => {
    expect(createCliOptions({ name: '' })).toEqual(['--name=']);
  });
});
