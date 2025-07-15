import { GeneratorSchema } from '../../utils/normalize-options';

export interface GoBlueprintGeneratorSchema extends GeneratorSchema {
  /** Database drivers to use */
  driver:
    | 'mysql'
    | 'postgres'
    | 'sqlite'
    | 'mongo'
    | 'redis'
    | 'scylla'
    | 'none';
  /** Advanced feature to use */
  feature?: string[];
  /** Framework to use */
  framework:
    | 'chi'
    | 'gin'
    | 'fiber'
    | 'gorilla/mux'
    | 'httprouter'
    | 'standard-library'
    | 'echo';
  /** Git to use */
  git: 'commit' | 'stage' | 'skip';
}
