export interface Schema {
  /** The target Worker project to configure. */
  project: string;
  /** Enable Workers observability (`observability.enabled = true`). */
  observability?: boolean;
  /** Enable Smart Placement (`placement.mode = "smart"`). */
  smartPlacement?: boolean;
  /** Skip formatting files. */
  skipFormat?: boolean;
}
