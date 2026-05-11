import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDevApp } from '../../../scripts/app-runtime/run-app.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

runDevApp({
  appRoot,
  argv: process.argv.slice(2),
  defaultMockType: 'uoc',
  shellPackage: '@biz/uoc-portal',
});
