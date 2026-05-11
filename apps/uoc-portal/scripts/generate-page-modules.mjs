import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGeneratePageModules } from '../../../scripts/app-runtime/generate-page-modules.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

runGeneratePageModules({
  appRoot,
  argv: process.argv.slice(2),
});
