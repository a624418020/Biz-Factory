import { spawn } from 'node:child_process';
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
  let port = '8091';

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--spec') {
      specPath = rawArgs[index + 1] || '';
      index += 1;
    } else if (arg === '--port') {
      port = rawArgs[index + 1] || port;
      index += 1;
    } else if (arg.startsWith('plan:')) {
      planId = arg;
    }
  }

  return { planId, specPath, port };
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

const readPlanAppBasePath = (planId, shellPackage) => {
  if (!planId) {
    return '';
  }

  const appManifest =
    findAppManifestByPlanIdAndShellPackage(planId, shellPackage) || findAppManifestByPlanId(planId);
  return String(appManifest?.data?.build?.basePath || '').trim();
};

export const runDevApp = ({ appRoot, argv, defaultMockType = 'uoc', shellPackage = '' }) => {
  const require = createRequire(import.meta.url);
  const { planId, specPath, port } = parseCliArgs(argv);
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

  const generate = spawn(process.execPath, generateArgs, {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  });

  generate.on('exit', (code) => {
    if (code !== 0) {
      process.exit(code ?? 1);
    }

    const env = {
      ...process.env,
      VITE_APP_MOCK_TYPE: planId || specPath ? 'all' : process.env.VITE_APP_MOCK_TYPE || defaultMockType,
    };

    if (planId) {
      env.VITE_APP_PLAN_ID = planId;
    }
    if (specPath) {
      env.VITE_APP_PLAN_BUILD_SPEC = '1';
    }

    const explicitBasePath = String(process.env.VITE_APP_BASE_PATH || '').trim();
    const specAppName = readSpecAppName(specPath ? path.resolve(appRoot, specPath) : '');
    if (explicitBasePath) {
      env.VITE_APP_BASE_PATH = explicitBasePath;
    } else if (specAppName) {
      env.VITE_APP_BASE_PATH = `/${specAppName}/`;
    } else {
      const basePath = readPlanAppBasePath(planId, shellPackage);
      if (basePath) {
        env.VITE_APP_BASE_PATH = basePath;
      }
    }

    const child = spawn(process.execPath, [viteBin, 'dev', '--host', '0.0.0.0', '--port', port], {
      cwd: appRoot,
      env,
      stdio: 'inherit',
    });

    child.on('exit', (childCode) => {
      process.exit(childCode ?? 0);
    });
  });
};
