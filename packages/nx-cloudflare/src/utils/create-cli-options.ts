import { names } from '@nx/devkit';

type CliOptionValue = string | number | boolean | string[] | undefined | null;

export function createCliOptions<T extends Record<string, CliOptionValue>>(
  obj: T
): string[] {
  const args: string[] = [];

  for (const key in obj) {
    const value = obj[key];

    // Only drop unset values; false, 0 and "" are meaningful and preserved.
    if (value === undefined || value === null) {
      continue;
    }

    const arg = names(key).fileName; // kebab-case

    if (Array.isArray(value)) {
      // Repeat the flag per item (e.g. --routes=a --routes=b); wrangler treats
      // a comma-joined value as a single entry, so each item gets its own flag.
      for (const item of value) {
        args.push(`--${arg}=${item.trim()}`);
      }
    } else if (typeof value === 'boolean') {
      // Emit the flag only when true. Several schema booleans default to false
      // (and Nx injects those defaults), so synthesizing `--no-<flag>` here
      // would send unconditional no-op negations like `--no-no-bundle`.
      if (value) {
        args.push(`--${arg}`);
      }
    } else {
      args.push(`--${arg}=${value}`);
    }
  }

  return args;
}
