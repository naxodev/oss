import { GeneratorSchema } from '../../utils';

export interface PresetGeneratorSchema extends GeneratorSchema {
  skipFormat?: boolean;
  type: 'binary' | 'library';
  directory: string;
}
