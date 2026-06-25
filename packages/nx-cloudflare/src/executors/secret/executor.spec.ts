import { describe, it, expect } from 'bun:test';
import { buildSecretArgs } from './executor';

describe('buildSecretArgs', () => {
  it('builds put with the key name', () => {
    expect(buildSecretArgs({ command: 'put', name: 'API_KEY' })).toEqual([
      'secret',
      'put',
      'API_KEY',
    ]);
  });

  it('builds delete with the key name and --env', () => {
    expect(
      buildSecretArgs({ command: 'delete', name: 'API_KEY', env: 'production' })
    ).toEqual(['secret', 'delete', 'API_KEY', '--env', 'production']);
  });

  it('builds bulk with the file path', () => {
    expect(buildSecretArgs({ command: 'bulk', file: 'secrets.json' })).toEqual([
      'secret',
      'bulk',
      'secrets.json',
    ]);
  });

  it('builds list with no positional arg', () => {
    expect(buildSecretArgs({ command: 'list' })).toEqual(['secret', 'list']);
  });

  it('throws when put has no name', () => {
    expect(() => buildSecretArgs({ command: 'put' })).toThrow(
      'The `name` option is required'
    );
  });

  it('throws when bulk has no file', () => {
    expect(() => buildSecretArgs({ command: 'bulk' })).toThrow(
      'The `file` option is required'
    );
  });
});
