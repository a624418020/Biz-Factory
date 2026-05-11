import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { findAppManifestByPlanId, findAppManifestByPlanIdAndShellPackage } from '../manifest-lib.mjs';
import { assertSupportedNodeVersion } from '../node-version.mjs';

assertSupportedNodeVersion();

const parseCliArgs = (argv) => {
  const rawArgs = argv.filter((arg) => arg && arg !== '--');
  let planId = '';
  let specPath = '';
  let outDir = '';

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--spec') {
      specPath = rawArgs[index + 1] || '';
      index += 1;
    } else if (arg.startsWith('plan:')) {
      planId = arg;
    } else if (!outDir) {
      outDir = arg;
    }
  }

  return { planId, specPath, outDir };
};

const readSpecAppName = (specPath) => {
  if (!specPath) {
    return '';
  }

  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    return String(spec?.app?.name || '').trim();
  } catch {
    return '';
  }
};

const readPlanAppBuildConfig = (planId, shellPackage) => {
  if (!planId) {
    return { appName: '', basePath: '', outDir: '' };
  }

  const appManifest =
    findAppManifestByPlanIdAndShellPackage(planId, shellPackage) || findAppManifestByPlanId(planId);
  if (!appManifest) {
    return { appName: '', basePath: '', outDir: '' };
  }

  return {
    appName: String(appManifest.data?.name || '').trim(),
    basePath: String(appManifest.data?.build?.basePath || '').trim(),
    outDir: String(appManifest.data?.build?.outDir || '').trim(),
  };
};

export const runBuildApp = ({ appRoot, argv, defaultMockType = 'core', shellPackage = '' }) => {
  const require = createRequire(import.meta.url);
  const { planId, specPath, outDir } = parseCliArgs(argv);
  const generateScript = path.resolve(appRoot, 'scripts/generate-page-modules.mjs');
  const vitePkgPath = require.resolve('vite/package.json', { paths: [appRoot] });
  const viteBin = path.resolve(path.dirname(vitePkgPath), 'bin/vite.js');

  const generateArgs = [generateScript];
  if (planId) {
    generateArgs.push(planId);
  }
  if (specPath) {
    generateArgs.push('--spec', specPath);
  }

  const generateResult = spawnSync(process.execPath, generateArgs, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (generateResult.status !== 0) {
    process.exit(generateResult.status ?? 1);
  }

  const buildEnv = {
    ...process.env,
    VITE_APP_MOCK_TYPE: planId || specPath ? 'all' : process.env.VITE_APP_MOCK_TYPE || defaultMockType,
  };
  const planAppBuildConfig = readPlanAppBuildConfig(planId, shellPackage);

  if (planId) {
    buildEnv.VITE_APP_PLAN_ID = planId;
  }
  if (specPath) {
    buildEnv.VITE_APP_PLAN_BUILD_SPEC = '1';
  }

  const explicitBasePath = String(process.env.VITE_APP_BASE_PATH || '').trim();
  const specAppName = readSpecAppName(specPath ? path.resolve(appRoot, specPath) : '');
  if (explicitBasePath) {
    buildEnv.VITE_APP_BASE_PATH = explicitBasePath;
  } else if (specAppName) {
    buildEnv.VITE_APP_BASE_PATH = `/${specAppName}/`;
  } else if (planAppBuildConfig.basePath) {
    buildEnv.VITE_APP_BASE_PATH = planAppBuildConfig.basePath;
  }

  const buildArgs = ['build'];
  const resolvedOutDir = outDir || planAppBuildConfig.outDir;
  if (resolvedOutDir) {
    buildArgs.push('--outDir', resolvedOutDir);
  }

  const buildResult = spawnSync(process.execPath, [viteBin, ...buildArgs], {
    cwd: appRoot,
    stdio: 'inherit',
    env: buildEnv,
  });

  process.exit(buildResult.status ?? 1);
};
