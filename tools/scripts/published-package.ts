import { appendFileSync } from 'node:fs';
import { isPackagePublished, waitForPublishedPackage } from './npm-registry';

async function main(): Promise<void> {
  const mode = process.argv[2];
  const packageNames = process.env.NPM_PACKAGE_NAMES?.trim().split(/\s+/) ?? [];
  const version = process.env.NPM_PACKAGE_VERSION;
  if (
    !version ||
    packageNames.length === 0 ||
    !['check', 'verify'].includes(mode)
  ) {
    throw new Error(
      'Use check or verify with NPM_PACKAGE_NAMES and NPM_PACKAGE_VERSION'
    );
  }
  if (mode === 'check') {
    if (packageNames.length !== 1)
      throw new Error('Check requires exactly one package');
    const published = await isPackagePublished({
      packageName: packageNames[0],
      version,
    });
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `skip=${published}\n`);
    }
    console.log(
      `${packageNames[0]}@${version}: ${
        published
          ? 'already published; skip publishing'
          : 'not published (HTTP 404)'
      }`
    );
    return;
  }
  for (const packageName of packageNames) {
    await waitForPublishedPackage(
      { packageName, version },
      { onRetry: console.warn }
    );
    console.log(
      `Verified ${packageName}@${version} on the public npm registry`
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Package verification failed'
  );
  process.exitCode = 1;
});
