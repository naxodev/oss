import type { PackageManager } from '@nx/devkit';
import type { C3Lang } from '../../utils/c3';

export interface Schema {
  directory: string;
  name?: string;
  /** Worker template, forwarded to C3 `--type`. */
  type?: string;
  /** Web framework, forwarded to C3 `--framework`. */
  framework?: string;
  /** Remote git template, forwarded to C3 `--template`. */
  template?: string;
  lang?: C3Lang;
  /** Override the pinned create-cloudflare version. */
  c3Version?: string;
  /** Raw passthrough flags for create-cloudflare. */
  c3Args?: string[];
  tags?: string;
  skipFormat?: boolean;
  useProjectJson?: boolean;
}

export interface NormalizedSchema extends Schema {
  projectName: string;
  projectRoot: string;
  parsedTags: string[];
  packageManager: PackageManager;
  c3Version: string;
}
