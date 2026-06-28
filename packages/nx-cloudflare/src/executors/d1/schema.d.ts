export type D1Command = 'apply' | 'create' | 'list';

export interface D1ExecutorSchema {
  /** The D1 migrations subcommand. Supplied by the target's configuration. */
  command: D1Command;
  /** Map of D1 binding name to database_name. Baked in by inference. */
  databases: Record<string, string>;
  /**
   * Which D1 binding to target. Optional when the Worker has a single D1
   * database; required when it has more than one.
   */
  db?: string;
  /** `false` -> `--local` (default), `true` -> `--remote`. Ignored for `create`. */
  remote?: boolean;
  /** Cloudflare environment -> `--env <env>`. Ignored for `create`. */
  env?: string;
  /** Required for `create`: the migration message. */
  message?: string;
}
