import { describe, it, expect } from 'bun:test';
import { buildC3Command } from './c3';

describe('buildC3Command', () => {
  const base = {
    packageManager: 'pnpm' as const,
    c3Version: '2.5.0',
    directory: '/tmp/scaffold',
  };

  it('routes a worker `type` to C3 --type with the controlled flags', () => {
    const { command, args } = buildC3Command({ ...base, type: 'hello-world' });

    expect(command).toBe('pnpm');
    expect(args).toEqual(
      expect.arrayContaining([
        'create',
        'cloudflare@2.5.0',
        '/tmp/scaffold',
        '--type=hello-world',
        '--accept-defaults',
        '--no-auto-update',
        '--no-git',
        '--no-deploy',
        '--no-open',
      ])
    );
  });

  it('routes a `framework` to C3 --framework', () => {
    const { args } = buildC3Command({ ...base, framework: 'react' });

    expect(args).toContain('--framework=react');
    expect(args).not.toContain('--type=react');
  });

  it('routes a remote `template` to C3 --template', () => {
    const { args } = buildC3Command({
      ...base,
      template: 'cloudflare/workers-sdk/templates/worker-router',
    });

    expect(args).toContain(
      '--template=cloudflare/workers-sdk/templates/worker-router'
    );
  });

  it('maps `lang` to --lang when provided and omits it otherwise', () => {
    expect(
      buildC3Command({ ...base, type: 'hello-world', lang: 'js' }).args
    ).toContain('--lang=js');

    expect(
      buildC3Command({ ...base, type: 'hello-world' }).args.some((a) =>
        a.startsWith('--lang')
      )
    ).toBe(false);
  });

  it('inserts a `--` separator for npm so flags reach C3, not npm', () => {
    const { command, args } = buildC3Command({
      ...base,
      packageManager: 'npm',
      type: 'hello-world',
    });

    expect(command).toBe('npm');
    const sep = args.indexOf('--');
    expect(sep).toBeGreaterThan(-1);
    expect(args.slice(0, sep)).toEqual(['create', 'cloudflare@2.5.0']);
    expect(args.slice(sep + 1)).toEqual(
      expect.arrayContaining(['/tmp/scaffold', '--type=hello-world'])
    );
  });

  it('does not add a `--` separator for pnpm', () => {
    const { args } = buildC3Command({ ...base, type: 'hello-world' });
    expect(args).not.toContain('--');
  });

  it('appends raw c3Args passthrough', () => {
    const { args } = buildC3Command({
      ...base,
      type: 'hello-world',
      c3Args: ['--experimental', '--foo=bar'],
    });

    expect(args).toEqual(
      expect.arrayContaining(['--experimental', '--foo=bar'])
    );
  });

  it('rejects c3Args that try to override a controlled flag', () => {
    expect(() =>
      buildC3Command({ ...base, type: 'hello-world', c3Args: ['--git'] })
    ).toThrow(/controlled by the generator/i);

    expect(() =>
      buildC3Command({
        ...base,
        type: 'hello-world',
        c3Args: ['--auto-update'],
      })
    ).toThrow(/controlled by the generator/i);
  });

  it('throws when no selection (type/framework/template) is provided', () => {
    expect(() => buildC3Command({ ...base })).toThrow(
      /exactly one of `type`, `framework`, or `template`/i
    );
  });

  it('throws when more than one selection is provided', () => {
    expect(() =>
      buildC3Command({ ...base, type: 'hello-world', framework: 'react' })
    ).toThrow(/exactly one of `type`, `framework`, or `template`/i);
  });
});
