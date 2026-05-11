import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSupportedNodeVersion } from './node-version.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tempRoot = path.resolve(repoRoot, '.tmp-p0');

const require = createRequire(import.meta.url);

assertSupportedNodeVersion();

const runStep = (label, command, args, cwd) => {
  console.log(`\n[P0] ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const getViteBin = (appRoot) => {
  const vitePkgPath = require.resolve('vite/package.json', { paths: [appRoot] });
  return path.resolve(path.dirname(vitePkgPath), 'bin/vite.js');
};

const ensureCleanDir = (dirPath) => {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
};

ensureCleanDir(tempRoot);

runStep('Validate manifests', process.execPath, [path.resolve(repoRoot, 'scripts/validate-manifests.mjs')], repoRoot);

runStep(
  'Build uoc framework plan',
  process.execPath,
  [
    path.resolve(repoRoot, 'apps/uoc-portal/scripts/build-app.mjs'),
    'plan:framework-workbench',
    path.resolve(tempRoot, 'uoc-framework'),
  ],
  path.resolve(repoRoot, 'apps/uoc-portal'),
);

runStep(
  'Build assembly sample plan',
  process.execPath,
  [
    path.resolve(repoRoot, 'apps/assembly-portal/scripts/build-app.mjs'),
    'plan:standalone-showcase',
    path.resolve(tempRoot, 'assembly-sample'),
  ],
  path.resolve(repoRoot, 'apps/assembly-portal'),
);

runStep(
  'Build itg host',
  process.execPath,
  [getViteBin(path.resolve(repoRoot, 'apps/itg-portal')), 'build', '--outDir', path.resolve(tempRoot, 'itg-host')],
  path.resolve(repoRoot, 'apps/itg-portal'),
);

console.log('\n[P0] All checks passed.');
