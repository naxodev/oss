import type { PackageManager } from '@nx/devkit';

export type C3Lang = 'ts' | 'js' | 'python';

export interface BuildC3CommandOptions {
  packageManager: PackageManager;
  c3Version: string;
  directory: string;
  type?: string;
  framework?: string;
  template?: string;
  lang?: C3Lang;
  c3Args?: string[];
}

export interface C3Command {
  command: string;
  args: string[];
}

// Flags the generator always owns: a monorepo manages git, deploys, and the
// browser; --no-auto-update forces the pinned C3 version instead of letting C3
// re-spawn @latest at runtime.
const CONTROLLED_FLAGS = [
  // Never block on a prompt: take defaults for anything not explicitly passed.
  '--accept-defaults',
  '--no-auto-update',
  '--no-git',
  '--no-deploy',
  '--no-open',
];

// Base names of the controlled flags, used to reject passthrough attempts to
// override them in either polarity (e.g. `--git` and `--no-git` both map to `git`).
const CONTROLLED_FLAG_NAMES = new Set(
  CONTROLLED_FLAGS.map((flag) => flag.replace(/^--(no-)?/, ''))
);

function assertNoControlledOverride(c3Args: string[]): void {
  for (const arg of c3Args) {
    const name = arg.replace(/^--(no-)?/, '').split('=')[0];
    if (CONTROLLED_FLAG_NAMES.has(name)) {
      throw new Error(
        `\`${arg}\` is controlled by the generator and cannot be passed via c3Args.`
      );
    }
  }
}

function selectionFlag(options: BuildC3CommandOptions): string {
  const selected = (
    [
      ['type', options.type],
      ['framework', options.framework],
      ['template', options.template],
    ] as const
  ).filter(([, value]) => value != null && value !== '');

  if (selected.length !== 1) {
    throw new Error(
      'Provide exactly one of `type`, `framework`, or `template` to scaffold a Cloudflare project ' +
        `(received ${selected.length}: ${
          selected.map(([k]) => k).join(', ') || 'none'
        }).`
    );
  }

  const [[kind, value]] = selected;
  return `--${kind}=${value}`;
}

export function buildC3Command(options: BuildC3CommandOptions): C3Command {
  const passthrough = options.c3Args ?? [];
  assertNoControlledOverride(passthrough);

  const c3Args = [
    options.directory,
    selectionFlag(options),
    ...(options.lang ? [`--lang=${options.lang}`] : []),
    ...CONTROLLED_FLAGS,
    ...passthrough,
  ];

  // npm forwards args to the created package only after a `--` separator;
  // yarn/pnpm/bun pass them through directly.
  const separator = options.packageManager === 'npm' ? ['--'] : [];

  return {
    command: options.packageManager,
    args: [
      'create',
      `cloudflare@${options.c3Version}`,
      ...separator,
      ...c3Args,
    ],
  };
}
