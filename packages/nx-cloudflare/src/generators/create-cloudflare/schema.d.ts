import type { PackageManager } from '@nx/devkit';
import type { C3Lang } from '../../utils/c3';

export interface Schema {
  /** The directory of the new application. */
  directory: string;
  /** The name of the application. */
  name?: string;
  /** Worker template, forwarded to C3 `--type`. */
  type?: string;
  /** Web framework, forwarded to C3 `--framework`. */
  framework?: string;
  /** Remote git template, forwarded to C3 `--template`. */
  template?: string;
  /** Language of the generated scaffold, forwarded to C3 `--lang`. */
  lang?: C3Lang;
  /** Override the pinned create-cloudflare version. */
  c3Version?: string;
  /** Raw passthrough flags for create-cloudflare. */
  c3Args?: string[];
  /** Add tags to the application (used for linting). */
  tags?: string;
  /** Skip formatting files. */
  skipFormat?: boolean;
  /** Write an explicit project.json instead of relying on target inference. */
  useProjectJson?: boolean;
}

export interface NormalizedSchema extends Schema {
  projectName: string;
  projectRoot: string;
  parsedTags: string[];
  packageManager: PackageManager;
  c3Version: string;
}
