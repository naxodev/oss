// Public API for programmatic use of the plugin's generators. Executors and
// generators are also consumed via the executors.json / generators.json
// manifests; these exports allow composing the generators from other plugins.
export { createCloudflareGenerator } from './generators/create-cloudflare/generator';
// `application` is an alias of create-cloudflare (see generators.json); the
// export is kept for programmatic back-compat.
export { createCloudflareGenerator as applicationGenerator } from './generators/create-cloudflare/generator';
export { nxCloudflareWorkerLibraryGenerator as libraryGenerator } from './generators/library/generator';
export { initGenerator } from './generators/init/generator';
export { bindingGenerator } from './generators/binding/generator';

export type { Schema as CreateCloudflareGeneratorSchema } from './generators/create-cloudflare/schema';
export type { Schema as CloudflareApplicationGeneratorSchema } from './generators/create-cloudflare/schema';
export type { NxCloudflareLibraryGeneratorSchema } from './generators/library/schema';
export type { InitGeneratorSchema } from './generators/init/schema';
export type { Schema as BindingGeneratorSchema } from './generators/binding/schema';
export { configurationGenerator } from './generators/configuration/generator';
export type { ConfigurationGeneratorSchema } from './generators/configuration/schema';
