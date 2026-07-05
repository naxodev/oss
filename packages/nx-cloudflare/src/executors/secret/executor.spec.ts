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

  it('threads --env for put', () => {
    expect(
      buildSecretArgs({ command: 'put', name: 'API_KEY', env: 'staging' })
    ).toEqual(['secret', 'put', 'API_KEY', '--env', 'staging']);
  });

  it('throws when put has no name', () => {
    expect(() => buildSecretArgs({ command: 'put' })).toThrow(
      'The `name` option is required'
    );
  });

  it('throws when delete has no name', () => {
    expect(() => buildSecretArgs({ command: 'delete' })).toThrow(
      'The `name` option is required'
    );
  });

  it('throws when bulk has no file', () => {
    expect(() => buildSecretArgs({ command: 'bulk' })).toThrow(
      'The `file` option is required'
    );
  });

  it('builds versioned put with the key name', () => {
    expect(
      buildSecretArgs({ command: 'put', name: 'API_KEY', versioned: true })
    ).toEqual(['versions', 'secret', 'put', 'API_KEY']);
  });

  it('builds versioned bulk with the file and --env', () => {
    expect(
      buildSecretArgs({
        command: 'bulk',
        file: 'secrets.json',
        env: 'production',
        versioned: true,
      })
    ).toEqual([
      'versions',
      'secret',
      'bulk',
      'secrets.json',
      '--env',
      'production',
    ]);
  });

  it('builds versioned list with no positional arg', () => {
    expect(buildSecretArgs({ command: 'list', versioned: true })).toEqual([
      'versions',
      'secret',
      'list',
    ]);
  });

  it('builds versioned delete with the key name', () => {
    expect(
      buildSecretArgs({ command: 'delete', name: 'API_KEY', versioned: true })
    ).toEqual(['versions', 'secret', 'delete', 'API_KEY']);
  });
});
