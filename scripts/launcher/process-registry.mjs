import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { repoRoot } from '../manifest-lib.mjs';
import { isPortOpen, waitForPort } from './port-check.mjs';

const registry = new Map();
const logBuffer = new Map();
const MAX_LOG_LINES = 40;

const appendLog = (appId, chunk) => {
  const nextLines = `${chunk || ''}`.split(/\r?\n/).filter(Boolean);
  if (!nextLines.length) {
    return;
  }
  const current = logBuffer.get(appId) || [];
  const merged = [...current, ...nextLines].slice(-MAX_LOG_LINES);
  logBuffer.set(appId, merged);
};

export const getLastLogs = (appId) => (logBuffer.get(appId) || []).join('\n');

const normalizeBasePath = (basePath = '') => {
  const normalized = `/${String(basePath || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
};

const getPublicBasePath = (runtimeApp) =>
  String(runtimeApp?.build?.basePath || runtimeApp?.runtime?.basePath || '').trim();

const buildOpenUrl = (runtimeApp, port) =>
  `http://localhost:${port}${normalizeBasePath(getPublicBasePath(runtimeApp))}${runtimeApp.runtime.defaultRoute || '/'}`;

const buildResolvedDevCommand = (runtimeApp) => {
  const fallbackCommand = String(runtimeApp?.runtime?.devCommand || '').trim();
  const shellPackage = String(runtimeApp?.runtime?.shellPackage || '').trim();
  const planId = String(runtimeApp?.planId || '').trim();
  const devPort = Number(runtimeApp?.runtime?.devPort || 0);

  if (runtimeApp?.appType === 'host') {
    return fallbackCommand;
  }

  if (shellPackage && planId && devPort > 0) {
    return `pnpm -F ${shellPackage} dev -- ${planId} --port ${devPort}`;
  }

  return fallbackCommand;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPortToClose = async (port, { timeout = 10000, interval = 300 } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await isPortOpen(port))) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(interval);
  }
  return false;
};

const killProcessTree = (pid) => {
  if (!pid || pid <= 0) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
};

const getPidsByPort = (port) => {
  if (process.platform !== 'win32') {
    return [];
  }

  const script = [
    `$connections = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue`,
    'if (-not $connections) { return }',
    '$connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }',
  ].join('; ');

  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    cwd: repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });

  const stdout = String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => Number(String(line).trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return [...new Set(stdout)];
};

const killPortOwners = (port) => {
  const pids = getPidsByPort(port);
  pids.forEach((pid) => killProcessTree(pid));
  return pids;
};

export const getRegistryStatus = async (runtimeApp) => {
  const entry = registry.get(runtimeApp.id);
  const port = Number(runtimeApp.runtime.devPort);
  const running = await isPortOpen(port);
  return {
    appId: runtimeApp.id,
    running,
    port,
    startedAt: entry?.startedAt || null,
    pid: entry?.child?.pid || null,
    command: buildResolvedDevCommand(runtimeApp),
    openUrl: buildOpenUrl(runtimeApp, port),
    lastLogs: getLastLogs(runtimeApp.id),
  };
};

const spawnCommand = (command, cwd, envOverrides = {}) => {
  const child = spawn(command, {
    cwd,
    env: {
      ...process.env,
      ...envOverrides,
    },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  return child;
};

export const ensureStarted = async (runtimeApp) => {
  const port = Number(runtimeApp.runtime.devPort);
  if (await isPortOpen(port)) {
    return {
      started: false,
      status: await getRegistryStatus(runtimeApp),
    };
  }

  const command = buildResolvedDevCommand(runtimeApp);
  if (!command) {
    throw new Error(`Missing dev command for ${runtimeApp.id}.`);
  }

  const shellPackage = String(runtimeApp.runtime.shellPackage || '');
  const packageFolder = shellPackage.replace(/^@biz\//, '');
  const cwd = path.resolve(repoRoot, 'apps', packageFolder);
  const publicBasePath = String(runtimeApp?.build?.basePath || runtimeApp?.runtime?.basePath || '').trim();
  const child = spawnCommand(command, cwd, publicBasePath ? { VITE_APP_BASE_PATH: publicBasePath } : {});

  child.stdout?.on('data', (chunk) => appendLog(runtimeApp.id, chunk));
  child.stderr?.on('data', (chunk) => appendLog(runtimeApp.id, chunk));
  child.on('exit', (code) => {
    appendLog(runtimeApp.id, `process exited with code ${code ?? 0}`);
    registry.delete(runtimeApp.id);
  });

  registry.set(runtimeApp.id, {
    child,
    startedAt: Date.now(),
  });

  const ready = await waitForPort(port);
  if (!ready) {
    const lastLogs = getLastLogs(runtimeApp.id);
    registry.delete(runtimeApp.id);
    throw new Error(lastLogs || `${runtimeApp.id} failed to start.`);
  }

  return {
    started: true,
    status: await getRegistryStatus(runtimeApp),
  };
};

export const stopRuntimeApp = async (runtimeApp) => {
  const entry = registry.get(runtimeApp.id);
  const port = Number(runtimeApp.runtime.devPort);

  killProcessTree(entry?.child?.pid);
  killPortOwners(port);

  registry.delete(runtimeApp.id);

  const closed = await waitForPortToClose(port);
  if (!closed) {
    appendLog(runtimeApp.id, `failed to stop process listening on port ${port}`);
    throw new Error(`Port ${port} is still in use after stop attempt.`);
  }

  return {
    appId: runtimeApp.id,
    running: false,
    port,
    startedAt: null,
    pid: null,
    command: buildResolvedDevCommand(runtimeApp),
    openUrl: buildOpenUrl(runtimeApp, port),
    lastLogs: getLastLogs(runtimeApp.id),
  };
};

export const getAllRegistryStatuses = async (apps) =>
  Promise.all(
    apps.map(async (runtimeApp) => ({
      ...getRuntimeDescriptor(runtimeApp),
      state: await getRegistryStatus(runtimeApp),
    })),
  );

const getRuntimeDescriptor = (runtimeApp) => ({
  id: runtimeApp.id,
  title: runtimeApp.title,
  appType: runtimeApp.appType,
  status: runtimeApp.status,
  runtime: runtimeApp.runtime,
});
