import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ALLOWED_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const normalizeFileName = (value) => String(value || 'app').replace(/[^a-zA-Z0-9-_]+/g, '-');

const createDevPort = (appId) =>
  9100 +
  ([...String(appId || 'app')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 300);

const isSafeSlug = (value) => /^[a-zA-Z0-9:_-]+$/.test(String(value || ''));

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    return ALLOWED_ORIGIN_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

const applyRunnerCors = (req, res) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const assertValidAppPayload = (app) => {
  if (!app || typeof app !== 'object') {
    throw new Error('Missing app payload.');
  }

  if (!isSafeSlug(app.id) || !isSafeSlug(app.name)) {
    throw new Error('App id or app name contains invalid characters.');
  }

  if (app.appType && !['micro', 'standalone'].includes(app.appType)) {
    throw new Error('Unsupported app type.');
  }
};

const assertValidPlanPayload = (plan) => {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Missing plan payload.');
  }

  if (!isSafeSlug(plan.id) || !isSafeSlug(plan.name)) {
    throw new Error('Plan id or plan name contains invalid characters.');
  }
};

const assertValidMenuPayloads = (menus) => {
  if (!Array.isArray(menus)) {
    throw new Error('Menus payload must be an array.');
  }

  menus.forEach((menu) => {
    if (!menu || typeof menu !== 'object' || !isSafeSlug(menu.id) || !isSafeSlug(menu.name)) {
      throw new Error('Menu payload contains invalid id or name.');
    }
    if (menu.parentId && !isSafeSlug(menu.parentId)) {
      throw new Error('Menu parentId contains invalid characters.');
    }
    if (menu.pageId && !isSafeSlug(menu.pageId)) {
      throw new Error('Menu pageId contains invalid characters.');
    }
  });
};

const assertValidPagePayloads = (pages) => {
  if (!Array.isArray(pages)) {
    throw new Error('Pages payload must be an array.');
  }

  pages.forEach((page) => {
    if (!page || typeof page !== 'object' || !isSafeSlug(page.id) || !isSafeSlug(page.name)) {
      throw new Error('Page payload contains invalid id or name.');
    }
  });
};

const readRunnerState = (statePath) => {
  try {
    if (!fs.existsSync(statePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
};

const writeRunnerState = (statePath, state) => {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
};

const removeRunnerState = (statePath) => {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
};

const findPortProcessId = (port) => {
  if (!port || Number.isNaN(Number(port))) {
    return 0;
  }

  const result = spawnSync('cmd.exe', ['/c', 'netstat -ano -p tcp'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) {
    return 0;
  }

  const lines = String(result.stdout || '').split(/\r?\n/);
  const matched = lines.find((line) => {
    const normalized = line.trim().replace(/\s+/g, ' ');
    return normalized.includes(`:${port} `) && normalized.includes('LISTENING');
  });

  if (!matched) {
    return 0;
  }

  const parts = matched.trim().split(/\s+/);
  return Number(parts[parts.length - 1] || 0);
};

const wait = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));

const waitForPort = async (port, timeout = 8000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    if (findPortProcessId(port)) {
      return true;
    }
    await wait(250);
  }

  return false;
};

export const createLocalAppRunnerPlugin = ({
  appRoot,
  runnerTempDir,
  defaultBaseName,
  resolveTargetAppRoot,
  manifestStore,
}) => {
  const repoRoot = path.resolve(appRoot, '..', '..');

  const ensureRunnerTempDir = () => {
    if (!fs.existsSync(runnerTempDir)) {
      fs.mkdirSync(runnerTempDir, { recursive: true });
    }
  };

  const getRunnerSpecPath = (app) => path.resolve(runnerTempDir, `${normalizeFileName(app.id || app.name)}.json`);
  const getRunnerStatePath = (app) =>
    path.resolve(runnerTempDir, `${normalizeFileName(app.id || app.name)}.runner.json`);
  const getRunnerCommandPath = (app) =>
    path.resolve(runnerTempDir, `${normalizeFileName(app.id || app.name)}.cmd`);
  const getAppBasePath = (app) => `/${String(app?.name || app?.id || defaultBaseName).replace(/^\/+|\/+$/g, '')}/`;
  const getRunnerUrl = (app, port) => `http://127.0.0.1:${port}${getAppBasePath(app)}`;
  const getTargetAppRoot = (app) => {
    const resolved = resolveTargetAppRoot ? resolveTargetAppRoot(app) : appRoot;
    const normalized = path.resolve(resolved);
    const relative = path.relative(repoRoot, normalized);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Resolved app root is outside the workspace.');
    }
    return normalized;
  };

  const getRunnerStatus = (app) => {
    ensureRunnerTempDir();
    const defaultPort = createDevPort(app.id || app.name);
    const statePath = getRunnerStatePath(app);
    const state = readRunnerState(statePath);

    if (!state) {
      return {
        running: false,
        port: defaultPort,
        url: getRunnerUrl(app, defaultPort),
      };
    }

    const activePid = findPortProcessId(Number(state.port || defaultPort));
    if (!activePid) {
      removeRunnerState(statePath);
      const fallbackPort = state.port || defaultPort;
      return {
        running: false,
        port: fallbackPort,
        url: state.url || getRunnerUrl(app, fallbackPort),
      };
    }

    return {
      ...state,
      pid: activePid,
      running: true,
    };
  };

  const stopRunner = (app) => {
    ensureRunnerTempDir();
    const defaultPort = createDevPort(app.id || app.name);
    const statePath = getRunnerStatePath(app);
    const state = readRunnerState(statePath);

    const pid = findPortProcessId(Number(state?.port || defaultPort));
    if (pid) {
      spawnSync('cmd.exe', ['/c', 'taskkill', '/PID', String(pid), '/T', '/F'], {
        encoding: 'utf8',
        windowsHide: true,
      });
    }

    removeRunnerState(statePath);
    const port = state?.port || defaultPort;
    return {
      running: false,
      port,
      url: state?.url || getRunnerUrl(app, port),
    };
  };

  return {
    name: 'local-app-runner',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__app_runner/') && !req.url?.startsWith('/__manifest_store/')) {
          return next();
        }

        if (!isAllowedOrigin(req.headers.origin)) {
          sendJson(res, 403, {
            success: false,
            message: 'Only localhost origins may use the local app runner.',
          });
          return;
        }

        applyRunnerCors(req, res);

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, message: 'Method Not Allowed' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const payload = JSON.parse(body || '{}');
          const { app, plan, menus, pages } = payload;

          if (req.url === '/__manifest_store/save') {
            if (!manifestStore?.save) {
              sendJson(res, 404, { success: false, message: 'Manifest store is not enabled.' });
              return;
            }

            assertValidPagePayloads(payload.pages);
            assertValidMenuPayloads(payload.menus);
            if (!Array.isArray(payload.plans) || !Array.isArray(payload.apps)) {
              throw new Error('Manifest payload is incomplete.');
            }

            await manifestStore.save(payload);
            sendJson(res, 200, { success: true, message: 'Manifest saved.' });
            return;
          }

          if (req.url === '/__manifest_store/reload') {
            if (!manifestStore?.reload) {
              sendJson(res, 404, { success: false, message: 'Manifest store is not enabled.' });
              return;
            }

            const records = await manifestStore.reload(payload);
            sendJson(res, 200, { success: true, ...records });
            return;
          }

          if (req.url === '/__app_runner/status') {
            assertValidAppPayload(app);
            sendJson(res, 200, { success: true, ...getRunnerStatus(app) });
            return;
          }

          if (req.url === '/__app_runner/stop') {
            assertValidAppPayload(app);
            sendJson(res, 200, {
              success: true,
              ...stopRunner(app),
              message: 'Local app runner stopped.',
            });
            return;
          }

          assertValidAppPayload(app);
          assertValidPlanPayload(plan);
          assertValidMenuPayloads(menus);
          assertValidPagePayloads(pages);

          ensureRunnerTempDir();
          const specPath = getRunnerSpecPath(app);
          const statePath = getRunnerStatePath(app);
          fs.writeFileSync(specPath, JSON.stringify({ app, plan, menus, pages }, null, 2), 'utf8');

          if (req.url === '/__app_runner/build') {
            const outDir = `dist-app-${normalizeFileName(app.name || app.id)}`;
            const targetAppRoot = getTargetAppRoot(app);
            const result = spawnSync(
              process.execPath,
              [path.resolve(targetAppRoot, 'scripts/build-app.mjs'), '--spec', specPath, outDir],
              {
                cwd: targetAppRoot,
                encoding: 'utf8',
                env: process.env,
                windowsHide: true,
              },
            );

            sendJson(res, result.status === 0 ? 200 : 500, {
              success: result.status === 0,
              outDir,
              message: result.status === 0 ? 'App build completed.' : 'App build failed.',
              output: `${result.stdout || ''}${result.stderr || ''}`,
            });
            return;
          }

          if (req.url === '/__app_runner/develop') {
            const targetAppRoot = getTargetAppRoot(app);
            const result = spawnSync(
              process.execPath,
              [path.resolve(targetAppRoot, 'scripts/create-dev-worktree.mjs'), '--spec', specPath],
              {
                cwd: targetAppRoot,
                encoding: 'utf8',
                env: process.env,
                windowsHide: true,
              },
            );

            const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
            let nextPayload = {};
            if (result.stdout) {
              try {
                nextPayload = JSON.parse(result.stdout);
              } catch {
                nextPayload = {};
              }
            }

            sendJson(res, result.status === 0 ? 200 : 500, {
              success: result.status === 0,
              message:
                result.status === 0
                  ? 'Development worktree is ready.'
                  : nextPayload.message || output || 'Failed to create development worktree.',
              output,
              ...nextPayload,
            });
            return;
          }

          if (req.url === '/__app_runner/dev') {
            const currentState = getRunnerStatus(app);
            if (currentState.running) {
              sendJson(res, 200, {
                success: true,
                ...currentState,
                message: 'Local app runner is already running.',
              });
              return;
            }

            const port = createDevPort(app.id || app.name);
            const commandPath = getRunnerCommandPath(app);
            const targetAppRoot = getTargetAppRoot(app);
            const runCommand = `"${process.execPath}" "${path.resolve(
              targetAppRoot,
              'scripts/run-app.mjs',
            )}" --spec "${specPath}" --port ${String(port)}`;
            const commandScript = [
              '@echo off',
              `title App Runner - ${app.name || app.id} - ${String(port)}`,
              `cd /d "${targetAppRoot}"`,
              'echo.',
              `echo Starting ${app.name || app.id} on port ${String(port)}`,
              `echo Command: ${runCommand}`,
              'echo.',
              runCommand,
              'echo.',
              'echo Runner exited with code %errorlevel%.',
              'pause',
            ].join('\r\n');

            fs.writeFileSync(commandPath, commandScript, 'utf8');

            const launcher = spawn('cmd.exe', ['/c', 'start', '', 'cmd.exe', '/k', commandPath], {
              cwd: targetAppRoot,
              stdio: 'ignore',
              env: process.env,
              detached: true,
              windowsHide: false,
            });
            launcher.unref();

            const ready = await waitForPort(port);
            if (!ready) {
              removeRunnerState(statePath);
              sendJson(res, 500, {
                success: false,
                running: false,
                port,
                url: getRunnerUrl(app, port),
                message: 'Local app runner failed to start. Check the spawned terminal window.',
              });
              return;
            }

            writeRunnerState(statePath, {
              appId: app.id || app.name,
              appName: app.name || app.id,
              port,
              url: getRunnerUrl(app, port),
              startedAt: Date.now(),
            });

            sendJson(res, 200, {
              success: true,
              running: true,
              port,
              url: getRunnerUrl(app, port),
              message: 'Local app runner started.',
            });
            return;
          }

          sendJson(res, 404, { success: false, message: 'Unknown local runner action.' });
        } catch (error) {
          sendJson(res, 500, {
            success: false,
            message: error?.message || 'Local app runner failed.',
          });
        }
      });
    },
  };
};
