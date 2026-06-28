export type SecretCommand = 'put' | 'bulk' | 'list' | 'delete';

export interface SecretExecutorSchema {
  /** The secret subcommand. Supplied by the target's configuration. */
  command: SecretCommand;
  /** The secret KEY. Required for `put`/`delete`; ignored for `bulk`/`list`. */
  name?: string;
  /** JSON file of secrets. Required for `bulk`; ignored for `put`/`delete`/`list`. */
  file?: string;
  /** Cloudflare environment -> `--env <env>`. */
  env?: string;
}
