export type D1Command = 'apply' | 'create' | 'list';

export interface D1ExecutorSchema {
  /** Baked in by inference. */
  command: D1Command;
  /** The D1 `database_name`. Baked in by inference. */
  database: string;
  /** `false` -> `--local` (default), `true` -> `--remote`. Ignored for `create`. */
  remote?: boolean;
  /** Cloudflare environment -> `--env <env>`. Ignored for `create`. */
  env?: string;
  /** Required for `create`: the migration message. */
  message?: string;
}
