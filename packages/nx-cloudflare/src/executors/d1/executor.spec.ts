import { describe, it, expect } from 'bun:test';
import { buildD1Args } from './executor';

describe('buildD1Args', () => {
  it('builds a local apply by default', () => {
    expect(buildD1Args({ command: 'apply', database: 'my-db' })).toEqual([
      'd1',
      'migrations',
      'apply',
      'my-db',
      '--local',
    ]);
  });

  it('builds a remote apply when remote is true', () => {
    expect(
      buildD1Args({ command: 'apply', database: 'my-db', remote: true })
    ).toEqual(['d1', 'migrations', 'apply', 'my-db', '--remote']);
  });

  it('threads --env for apply/list', () => {
    expect(
      buildD1Args({ command: 'list', database: 'my-db', env: 'staging' })
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
      buildD1Args({
        command: 'create',
        database: 'my-db',
        message: 'add_users',
      })
    ).toEqual(['d1', 'migrations', 'create', 'my-db', 'add_users']);
  });

  it('throws when create has no message', () => {
    expect(() => buildD1Args({ command: 'create', database: 'my-db' })).toThrow(
      'The `message` option is required'
    );
  });
});
