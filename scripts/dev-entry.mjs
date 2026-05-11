import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSupportedNodeVersion } from './node-version.mjs';

assertSupportedNodeVersion();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const children = [];

const spawnTask = (label, command, args, cwd = repoRoot, useShell = false) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: useShell,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}.`);
    }
  });

  children.push(child);
  return child;
};

const shutdown = () => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

spawnTask('launcher', process.execPath, [path.resolve(repoRoot, 'scripts/launcher/server.mjs')]);
spawnTask('studio', 'pnpm.cmd', ['-F', '@biz/assembly-portal', 'dev:framework'], repoRoot, process.platform === 'win32');
