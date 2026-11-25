import { expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Job {
  permissions?: unknown;
  environment?: string;
  steps: { id?: string; run?: string }[];
}

function workflow(name: string) {
  return Bun.YAML.parse(
    readFileSync(`.github/workflows/${name}.yml`, 'utf8')
  ) as {
    on: Record<string, unknown>;
    permissions: unknown;
    jobs: Record<string, Job>;
  };
}

const production = workflow('publish');
const preview = workflow('preview');
const publisher = production.jobs['publish-production'];

it('keeps PR builds read-only and grants npm identity only to the production job', () => {
  expect(Object.keys(production.on).sort()).toEqual([
    'push',
    'workflow_dispatch',
  ]);
  expect(Object.keys(preview.on)).toEqual(['pull_request']);
  expect(publisher.environment).toBe('production');
  expect(publisher.permissions).toEqual({
    contents: 'read',
    'id-token': 'write',
  });
  for (const pipeline of [production, preview]) {
    expect(pipeline.permissions).toEqual({ contents: 'read' });
    for (const job of Object.values(pipeline.jobs)) {
      if (job !== publisher) {
        expect(job.permissions ?? pipeline.permissions).toEqual({
          contents: 'read',
        });
      }
    }
  }
});

it('passes release coordinates as data instead of inserting them into shell source', () => {
  for (const { run } of publisher.steps) {
    if (run) expect(run).not.toContain('${{');
  }
});

it.skipIf(process.platform === 'win32')(
  'derives publish coordinates only from supported release tags',
  () => {
    const script = publisher.steps.find((step) => step.id === 'meta')?.run;
    if (!script) throw new Error('Missing release resolver');
    const dir = mkdtempSync(join(tmpdir(), 'release-tag-'));
    const output = join(dir, 'output');
    const resolve = (tag: string) => {
      writeFileSync(output, '');
      return Bun.spawnSync(['bash', '-eu', '-o', 'pipefail', '-c', script], {
        env: { ...process.env, GITHUB_OUTPUT: output, RELEASE_TAG: tag },
      }).exitCode;
    };
    try {
      for (const [project, version, distTag] of [
        ['gonx', '5.0.1', 'latest'],
        ['nx-cloudflare', '8.1.0-rc.2', 'next'],
      ]) {
        const tag = `${project}@v${version}`;
        expect(resolve(tag)).toBe(0);
        expect(readFileSync(output, 'utf8').trim().split('\n')).toEqual([
          `tag=${tag}`,
          `project=${project}`,
          `version=${version}`,
          `dist_tag=${distTag}`,
        ]);
      }
      for (const tag of [
        'other@v1.0.0',
        'gonx@v01.0.0',
        'gonx@v1.0.0-01',
        'gonx@v1.0',
        'gonx@v1.2.3\nextra',
      ]) {
        expect(resolve(tag)).not.toBe(0);
        expect(readFileSync(output, 'utf8')).toBe('');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
);
