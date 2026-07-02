export interface ConfigurationGeneratorSchema {
  project: string;
  template?: 'worker' | 'spa' | 'fullstack';
  name?: string;
  main?: string;
  assetsDir?: string;
  compatibilityDate?: string;
  nodejsCompat?: boolean;
  skipFormat?: boolean;
}
