// Public API for programmatic use of the plugin's generators. Executors and
// generators are also consumed via the executors.json / generators.json
// manifests; these exports allow composing the generators from other plugins.
export { applicationGenerator } from './generators/application/generator';
export { nxCloudflareWorkerLibraryGenerator as libraryGenerator } from './generators/library/generator';
export { initGenerator } from './generators/init/generator';

export type { Schema as CloudflareApplicationGeneratorSchema } from './generators/application/schema';
export type { NxCloudflareLibraryGeneratorSchema } from './generators/library/schema';
export type { InitGeneratorSchema } from './generators/init/schema';
