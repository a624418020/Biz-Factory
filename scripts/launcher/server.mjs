import http from 'node:http';
import { assertSupportedNodeVersion } from '../node-version.mjs';
import { findRuntimeAppById, getEnabledApps, getHostAppForMicro, toRuntimeSummary } from './manifest-runtime.mjs';
import { ensureStarted, getAllRegistryStatuses, getRegistryStatus, stopRuntimeApp } from './process-registry.mjs';

assertSupportedNodeVersion();

const PORT = 8099;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
};

const normalizeBasePath = (basePath = '') => {
  const normalized = `/${String(basePath || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
};

const getPublicBasePath = (app) => String(app?.build?.basePath || app?.runtime?.basePath || '').trim();

const buildStandaloneOpenUrl = (app) =>
  `http://localhost:${app.runtime.devPort}${normalizeBasePath(getPublicBasePath(app))}${app.runtime.defaultRoute}`;

const buildHostLoginUrl = (hostApp) => `http://localhost:${hostApp.runtime.devPort}${hostApp.runtime.defaultRoute}`;

const buildTargetRoute = (microApp) => `${normalizeBasePath(microApp.runtime.basePath)}${microApp.runtime.defaultRoute}`;

const handleGetApps = async (res) => {
  const apps = getEnabledApps().map(({ data }) => data);
  const stateList = await getAllRegistryStatuses(apps);
  const stateMap = new Map(stateList.map((item) => [item.id, item.state]));

  sendJson(res, 200, {
    success: true,
    apps: apps.map((app) => ({
      ...toRuntimeSummary(app),
      runtimeState: stateMap.get(app.id),
    })),
  });
};

const handleGetStatus = async (res) => {
  const apps = getEnabledApps().map(({ data }) => data);
  const status = await getAllRegistryStatuses(apps);
  sendJson(res, 200, { success: true, status });
};

const handleStart = async (req, res) => {
  const body = JSON.parse((await readBody(req)) || '{}');
  const appId = String(body.appId || '');
  const target = String(body.target || '');

  const runtimeRecord = findRuntimeAppById(appId);
  if (!runtimeRecord) {
    sendJson(res, 404, { success: false, message: `Unknown appId "${appId}".` });
    return;
  }

  const app = runtimeRecord.data;

  if (target === 'standalone') {
    if (app.appType !== 'standalone') {
      sendJson(res, 400, { success: false, message: 'Only standalone apps can use standalone target.' });
      return;
    }

    const result = await ensureStarted(app);
    sendJson(res, 200, {
      success: true,
      app: toRuntimeSummary(app),
      runtimeState: result.status,
      openUrl: buildStandaloneOpenUrl(app),
      started: result.started,
    });
    return;
  }

  if (target === 'host') {
    if (app.appType !== 'host') {
      sendJson(res, 400, { success: false, message: 'Only host apps can use host target.' });
      return;
    }

    const result = await ensureStarted(app);
    sendJson(res, 200, {
      success: true,
      app: toRuntimeSummary(app),
      runtimeState: result.status,
      openUrl: buildHostLoginUrl(app),
      started: result.started,
    });
    return;
  }

  if (target === 'micro') {
    if (app.appType !== 'micro') {
      sendJson(res, 400, { success: false, message: 'Only micro apps can use micro target.' });
      return;
    }

    const hostRecord = getHostAppForMicro(app);
    if (!hostRecord) {
      sendJson(res, 400, { success: false, message: 'Micro app is missing a host app.' });
      return;
    }

    const hostApp = hostRecord.data;
    const appStart = await ensureStarted(app);
    const hostState = await getRegistryStatus(hostApp);

    sendJson(res, 200, {
      success: true,
      app: toRuntimeSummary(app),
      hostApp: toRuntimeSummary(hostApp),
      hostState,
      runtimeState: appStart.status,
      hostLoginUrl: buildHostLoginUrl(hostApp),
      targetRoute: buildTargetRoute(app),
      startedHost: false,
      startedApp: appStart.started,
    });
    return;
  }

  sendJson(res, 400, { success: false, message: 'Unsupported start target.' });
};

const handleStop = async (req, res) => {
  const body = JSON.parse((await readBody(req)) || '{}');
  const appId = String(body.appId || '');

  const runtimeRecord = findRuntimeAppById(appId);
  if (!runtimeRecord) {
    sendJson(res, 404, { success: false, message: `Unknown appId "${appId}".` });
    return;
  }

  const app = runtimeRecord.data;

  const runtimeState = await stopRuntimeApp(app);
  sendJson(res, 200, {
    success: true,
    app: toRuntimeSummary(app),
    runtimeState,
  });
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === 'GET' && req.url === '/api/runtime/apps') {
      await handleGetApps(res);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/runtime/status') {
      await handleGetStatus(res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/runtime/start') {
      await handleStart(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/runtime/stop') {
      await handleStop(req, res);
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/api/runtime/apps/')) {
      const appId = decodeURIComponent(req.url.split('/').pop() || '');
      const runtimeRecord = findRuntimeAppById(appId);
      if (!runtimeRecord) {
        sendJson(res, 404, { success: false, message: `Unknown appId "${appId}".` });
        return;
      }
      sendJson(res, 200, {
        success: true,
        app: toRuntimeSummary(runtimeRecord.data),
        runtimeState: await getRegistryStatus(runtimeRecord.data),
      });
      return;
    }

    sendJson(res, 404, { success: false, message: 'Not Found' });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message: error?.message || 'Launcher server failed.',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Launcher server listening on http://127.0.0.1:${PORT}`);
});
