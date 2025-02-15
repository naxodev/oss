import {
  uniq,
  runNxCommand,
  ensureNxProject,
  cleanup,
  readJson,
  updateFile,
} from '@nx/plugin/testing';

const workerapp = uniq('workerapp');

// describe('Next on Pages', () => {
//   beforeEach(() => {
//     ensureNxProject('@naxodev/nx-cloudflare', 'dist/packages/nx-cloudflare');
//
//     runNxCommand(`generate @nx/next:app --directory ${workerapp} --appDir`, {
//       env: { NX_ADD_PLUGINS: 'false' },
//     });
//   });
//
//   afterEach(() => cleanup());
//   it('should build a NextJS application with the next-on-pages script', async () => {
//     const projectJson = readJson(`${workerapp}/project.json`);
//
//     projectJson.targets.build = {
//       executor: '@naxodev/nx-cloudflare:next-build',
//       outputs: ['{options.outputPath}'],
//       defaultConfiguration: 'production',
//       options: {
//         outputPath: 'dist/e2e/examples/cloudflare-next-app',
//       },
//       configurations: {
//         development: {
//           outputPath: 'e2e/examples/cloudflare-next-app',
//         },
//         production: {},
//       },
//     };
//     updateFile(`${workerapp}/project.json`, JSON.stringify(projectJson));
//
//     const buildResults = runNxCommand(`build ${workerapp}`);
//     expect(buildResults).toContain(
//       `NX   Successfully ran target build for project ${workerapp}`
//     );
//   }, 120_000);
// });
