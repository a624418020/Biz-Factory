import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBuildApp } from '../../../scripts/app-runtime/build-app.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

runBuildApp({
  appRoot,
  argv: process.argv.slice(2),
  defaultMockType: 'core',
  shellPackage: '@biz/uoc-portal',
});
