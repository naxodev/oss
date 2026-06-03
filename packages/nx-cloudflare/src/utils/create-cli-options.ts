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
      // Repeat the flag per item (e.g. --route=a --route=b), which is how
      // wrangler/yargs expect array options rather than a comma-joined value.
      for (const item of value) {
        args.push(`--${arg}=${item.trim()}`);
      }
    } else if (typeof value === 'boolean') {
      args.push(value ? `--${arg}` : `--no-${arg}`);
    } else {
      args.push(`--${arg}=${value}`);
    }
  }

  return args;
}
