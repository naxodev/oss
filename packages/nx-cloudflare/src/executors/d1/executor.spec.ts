import { describe, it, expect } from 'bun:test';
import { buildD1Args, resolveDatabase } from './executor';

describe('resolveDatabase', () => {
  it('returns the only database when --db is omitted', () => {
    expect(resolveDatabase({ DB: 'my-db' })).toBe('my-db');
  });

  it('resolves the named binding when --db is given', () => {
    expect(
      resolveDatabase({ DB: 'app-db', ANALYTICS: 'analytics-db' }, 'ANALYTICS')
    ).toBe('analytics-db');
  });

  it('throws listing valid bindings when --db is unknown', () => {
    expect(() =>
      resolveDatabase({ DB: 'app-db', ANALYTICS: 'analytics-db' }, 'NOPE')
    ).toThrow('Unknown --db=NOPE. Valid: DB, ANALYTICS');
  });

  it('throws naming the databases when multiple and no --db', () => {
    expect(() =>
      resolveDatabase({ DB: 'app-db', ANALYTICS: 'analytics-db' })
    ).toThrow(
      'This Worker has 2 D1 databases (DB, ANALYTICS); pass --db=<binding>.'
    );
  });
});

describe('buildD1Args', () => {
  it('builds a local apply by default', () => {
    expect(
      buildD1Args({ command: 'apply', databases: { DB: 'my-db' } }, 'my-db')
    ).toEqual(['d1', 'migrations', 'apply', 'my-db', '--local']);
  });

  it('builds a remote apply when remote is true', () => {
    expect(
      buildD1Args(
        { command: 'apply', databases: { DB: 'my-db' }, remote: true },
        'my-db'
      )
    ).toEqual(['d1', 'migrations', 'apply', 'my-db', '--remote']);
  });

  it('threads --env for list', () => {
    expect(
      buildD1Args(
        { command: 'list', databases: { DB: 'my-db' }, env: 'staging' },
        'my-db'
      )
    ).toEqual([
      'd1',
      'migrations',
      'list',
      'my-db',
      '--local',
      '--env',
      'staging',
    ]);
  });

  it('builds create with the message and no local/remote flag', () => {
    expect(
      buildD1Args(
        { command: 'create', databases: { DB: 'my-db' }, message: 'add_users' },
        'my-db'
      )
    ).toEqual(['d1', 'migrations', 'create', 'my-db', 'add_users']);
  });

  it('throws when create has no message', () => {
    expect(() =>
      buildD1Args({ command: 'create', databases: { DB: 'my-db' } }, 'my-db')
    ).toThrow('The `message` option is required');
  });

  it('ignores remote and env for create', () => {
    expect(
      buildD1Args(
        {
          command: 'create',
          databases: { DB: 'my-db' },
          remote: true,
          env: 'production',
          message: 'add_users',
        },
        'my-db'
      )
    ).toEqual(['d1', 'migrations', 'create', 'my-db', 'add_users']);
  });
});
