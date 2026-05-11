import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCreateDevWorktree } from '../../../scripts/app-runtime/create-dev-worktree.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

try {
  runCreateDevWorktree({
    appRoot,
    argv: process.argv.slice(2),
    sparseAppPath: 'apps/uoc-portal',
  });
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
