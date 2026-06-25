export type SecretCommand = 'put' | 'bulk' | 'list' | 'delete';

export interface SecretExecutorSchema {
  /** Baked in by inference. */
  command: SecretCommand;
  /** The secret KEY. Required for `put`/`delete`. */
  name?: string;
  /** JSON file of secrets. Required for `bulk`. */
  file?: string;
  /** Cloudflare environment -> `--env <env>`. */
  env?: string;
}
