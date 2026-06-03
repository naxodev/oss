import { readFileSync } from 'fs';
import { join } from 'path';

function schemaProps(executor: 'serve' | 'deploy'): Record<string, unknown> {
  const raw = readFileSync(join(__dirname, executor, 'schema.json'), 'utf-8');
  return JSON.parse(raw).properties;
}

describe('executor schema contracts', () => {
  // Flags removed in Wrangler v4 (or part of the deprecated Workers Sites model)
  // must not be offered by the executors. See #116, #117, #125.
  const removedFromBoth = [
    'nodeCompat', // --node-compat: removed in Wrangler v4
    'latest', // --latest: removed; runtime version comes from compatibility_date
    'site', // Workers Sites: deprecated in favour of static assets
    'siteInclude',
    'siteExclude',
  ];

  describe('serve', () => {
    const props = schemaProps('serve');

    it.each([...removedFromBoth, 'localUpstream', 'upstreamProtocol'])(
      'no longer exposes the removed/legacy option "%s"',
      (option) => {
        expect(props).not.toHaveProperty(option);
      }
    );

    it('still exposes supported options', () => {
      expect(props).toHaveProperty('port');
      expect(props).toHaveProperty('localProtocol');
      expect(props).toHaveProperty('assets');
    });
  });

  describe('deploy', () => {
    const props = schemaProps('deploy');

    it.each(removedFromBoth)(
      'no longer exposes the removed/legacy option "%s"',
      (option) => {
        expect(props).not.toHaveProperty(option);
      }
    );

    it('exposes dryRun so the schema matches its type and docs (#119)', () => {
      expect(props).toHaveProperty('dryRun');
      expect((props.dryRun as { type: string }).type).toBe('boolean');
    });
  });
});
