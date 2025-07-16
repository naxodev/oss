import { GeneratorSchema } from '../../utils';

export interface PresetGeneratorSchema extends GeneratorSchema {
  skipFormat?: boolean;
  type?: 'binary' | 'library' | 'go-blueprint';
  directory: string;
  name?: string;
  tags?: string;
  addGoDotWork?: boolean;
  // Go Blueprint specific options
  framework?:
    | 'chi'
    | 'gin'
    | 'fiber'
    | 'gorilla/mux'
    | 'httprouter'
    | 'standard-library'
    | 'echo';
  driver?:
    | 'mysql'
    | 'postgres'
    | 'sqlite'
    | 'mongo'
    | 'redis'
    | 'scylla'
    | 'none';
  git?: 'commit' | 'stage' | 'skip';
  feature?: string[];
}
