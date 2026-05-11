import path from 'node:path';
import { createRequire } from 'node:module';
import { assertSupportedNodeVersion } from './node-version.mjs';
import {
  flattenPlanMenus,
  loadAppManifests,
  loadPageManifests,
  loadPlanManifests,
  repoRoot,
} from './manifest-lib.mjs';

assertSupportedNodeVersion();

const allowedSource = new Set(['core', 'sample', 'hybrid']);
const allowedStatus = new Set(['enabled', 'draft', 'deprecated', 'disabled']);
const allowedAppType = new Set(['host', 'micro', 'standalone']);
const allowedLoginPageType = new Set(['host-login', 'page-login']);
const allowedShellPackage = new Set(['@biz/itg-portal', '@biz/uoc-portal', '@biz/assembly-portal']);
const allowedOpenBehavior = new Set(['auto-tab', 'manual']);

const errors = [];

const require = createRequire(import.meta.url);

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const toAjv6CompatibleSchema = (schema) => {
  if (Array.isArray(schema)) {
    return schema.map(toAjv6CompatibleSchema);
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const next = {};

  Object.entries(schema).forEach(([key, value]) => {
    if (key === '$schema') {
      return;
    }

    if (key === '$defs') {
      next.definitions = toAjv6CompatibleSchema(value);
      return;
    }

    if (key === '$ref' && typeof value === 'string') {
      next[key] = value.replace('#/$defs/', '#/definitions/');
      return;
    }

    next[key] = toAjv6CompatibleSchema(value);
  });

  return next;
};

const loadAjv = () => {
  const ajvPackage = require('ajv/package.json');
  const AjvModule = require('ajv');
  const AjvConstructor = AjvModule.default || AjvModule;
  const major = Number(String(ajvPackage.version || '0').split('.')[0] || 0);
  return {
    AjvConstructor,
    major,
  };
};

const createAjv = () => {
  const { AjvConstructor, major } = loadAjv();

  if (major >= 8) {
    return {
      ajv: new AjvConstructor({
        allErrors: true,
        strict: false,
      }),
      normalizeSchema: (schema) => deepClone(schema),
    };
  }

  return {
    ajv: new AjvConstructor({
      allErrors: true,
      jsonPointers: true,
      schemaId: 'auto',
    }),
    normalizeSchema: (schema) => toAjv6CompatibleSchema(deepClone(schema)),
  };
};

const formatSchemaErrorPath = (error) => {
  const rawPath = error.instancePath || error.dataPath || '';
  const normalizedPath = String(rawPath).replace(/^\./, '').replace(/^\//, '').replace(/\//g, '.');
  return normalizedPath || '(root)';
};

const addError = (filePath, message) => {
  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  errors.push(`${relativePath}: ${message}`);
};

const assertRequiredString = (filePath, value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    addError(filePath, `missing required string field "${fieldName}"`);
  }
};

const pageRecords = loadPageManifests();
const planRecords = loadPlanManifests();
const appRecords = loadAppManifests();
const pageSchema = require(path.resolve(repoRoot, 'schemas/page.schema.json'));
const planSchema = require(path.resolve(repoRoot, 'schemas/plan.schema.json'));
const appSchema = require(path.resolve(repoRoot, 'schemas/app.schema.json'));

const validateSchemaRecords = (records, schema, schemaName) => {
  const { ajv, normalizeSchema } = createAjv();
  const validate = ajv.compile(normalizeSchema(schema));

  records.forEach(({ filePath, data }) => {
    const passed = validate(data);
    if (passed) {
      return;
    }

    (validate.errors || []).forEach((error) => {
      addError(filePath, `[${schemaName}] ${formatSchemaErrorPath(error)}: ${error.message}`);
    });
  });
};

validateSchemaRecords(pageRecords, pageSchema, 'page');
validateSchemaRecords(planRecords, planSchema, 'plan');
validateSchemaRecords(appRecords, appSchema, 'app');

const pageIdMap = new Map();
const pageNameMap = new Map();
const planIdMap = new Map();
const planNameMap = new Map();
const appIdMap = new Map();
const appNameMap = new Map();

for (const record of pageRecords) {
  const { filePath, data } = record;

  ['id', 'name', 'title', 'route', 'packageName', 'entry', 'source', 'status'].forEach((fieldName) =>
    assertRequiredString(filePath, data[fieldName], fieldName),
  );

  if (typeof data.id === 'string' && !data.id.startsWith('page:')) {
    addError(filePath, 'field "id" must start with "page:"');
  }
  if (typeof data.route === 'string' && !data.route.startsWith('/')) {
    addError(filePath, 'field "route" must start with "/"');
  }
  if (typeof data.packageName === 'string' && !data.packageName.startsWith('@biz/')) {
    addError(filePath, 'field "packageName" must start with "@biz/"');
  }
  if (typeof data.source === 'string' && !allowedSource.has(data.source)) {
    addError(filePath, `field "source" must be one of ${[...allowedSource].join(', ')}`);
  }
  if (typeof data.status === 'string' && !allowedStatus.has(data.status)) {
    addError(filePath, `field "status" must be one of ${[...allowedStatus].join(', ')}`);
  }

  if (pageIdMap.has(data.id)) {
    addError(filePath, `duplicate page id "${data.id}"`);
  } else {
    pageIdMap.set(data.id, record);
  }

  if (pageNameMap.has(data.name)) {
    addError(filePath, `duplicate page name "${data.name}"`);
  } else {
    pageNameMap.set(data.name, record);
  }
}

for (const record of planRecords) {
  const { filePath, data } = record;

  ['id', 'name', 'title', 'source', 'status'].forEach((fieldName) =>
    assertRequiredString(filePath, data[fieldName], fieldName),
  );

  if (typeof data.id === 'string' && !data.id.startsWith('plan:')) {
    addError(filePath, 'field "id" must start with "plan:"');
  }
  if (typeof data.source === 'string' && !allowedSource.has(data.source)) {
    addError(filePath, `field "source" must be one of ${[...allowedSource].join(', ')}`);
  }
  if (typeof data.status === 'string' && !allowedStatus.has(data.status)) {
    addError(filePath, `field "status" must be one of ${[...allowedStatus].join(', ')}`);
  }
  if (!Array.isArray(data.menus) || data.menus.length === 0) {
    addError(filePath, 'field "menus" must be a non-empty array');
  }

  if (planIdMap.has(data.id)) {
    addError(filePath, `duplicate plan id "${data.id}"`);
  } else {
    planIdMap.set(data.id, record);
  }

  if (planNameMap.has(data.name)) {
    addError(filePath, `duplicate plan name "${data.name}"`);
  } else {
    planNameMap.set(data.name, record);
  }

  const flatMenus = flattenPlanMenus(data.menus || []);
  const menuIdSet = new Set();

  for (const menu of flatMenus) {
    if (!menu.id || !menu.name || !menu.title || !menu.route) {
      addError(filePath, `menu node is missing required fields under plan "${data.id}"`);
      continue;
    }
    if (menuIdSet.has(menu.id)) {
      addError(filePath, `duplicate menu id "${menu.id}" inside plan "${data.id}"`);
    } else {
      menuIdSet.add(menu.id);
    }
    if (menu.pageId && !pageIdMap.has(menu.pageId)) {
      addError(filePath, `menu "${menu.id}" references missing pageId "${menu.pageId}"`);
    }
  }

  if (data.homePageId && !pageIdMap.has(data.homePageId)) {
    addError(filePath, `field "homePageId" references missing page "${data.homePageId}"`);
  }
}

for (const record of appRecords) {
  const { filePath, data } = record;

  ['id', 'name', 'title', 'appType', 'source', 'status', 'planId', 'loginPageType'].forEach((fieldName) =>
    assertRequiredString(filePath, data[fieldName], fieldName),
  );

  if (typeof data.id === 'string' && !data.id.startsWith('app:')) {
    addError(filePath, 'field "id" must start with "app:"');
  }
  if (typeof data.appType === 'string' && !allowedAppType.has(data.appType)) {
    addError(filePath, `field "appType" must be one of ${[...allowedAppType].join(', ')}`);
  }
  if (typeof data.source === 'string' && !allowedSource.has(data.source)) {
    addError(filePath, `field "source" must be one of ${[...allowedSource].join(', ')}`);
  }
  if (typeof data.status === 'string' && !allowedStatus.has(data.status)) {
    addError(filePath, `field "status" must be one of ${[...allowedStatus].join(', ')}`);
  }
  if (typeof data.loginPageType === 'string' && !allowedLoginPageType.has(data.loginPageType)) {
    addError(filePath, `field "loginPageType" must be one of ${[...allowedLoginPageType].join(', ')}`);
  }
  if (data.planId && !planIdMap.has(data.planId)) {
    addError(filePath, `field "planId" references missing plan "${data.planId}"`);
  }
  if (data.homePageId && !pageIdMap.has(data.homePageId)) {
    addError(filePath, `field "homePageId" references missing page "${data.homePageId}"`);
  }

  const runtime = data.runtime || {};
  ['shellPackage', 'devCommand', 'basePath', 'defaultRoute', 'openBehavior'].forEach((fieldName) =>
    assertRequiredString(filePath, runtime[fieldName], `runtime.${fieldName}`),
  );

  if (typeof runtime.devPort !== 'number' || Number.isNaN(runtime.devPort) || runtime.devPort <= 0) {
    addError(filePath, 'field "runtime.devPort" must be a positive number');
  }
  if (typeof runtime.basePath === 'string' && !runtime.basePath.startsWith('/')) {
    addError(filePath, 'field "runtime.basePath" must start with "/"');
  }
  if (typeof runtime.defaultRoute === 'string' && !runtime.defaultRoute.startsWith('/')) {
    addError(filePath, 'field "runtime.defaultRoute" must start with "/"');
  }
  if (typeof runtime.shellPackage === 'string' && !allowedShellPackage.has(runtime.shellPackage)) {
    addError(filePath, `field "runtime.shellPackage" must be one of ${[...allowedShellPackage].join(', ')}`);
  }
  if (typeof runtime.openBehavior === 'string' && !allowedOpenBehavior.has(runtime.openBehavior)) {
    addError(filePath, `field "runtime.openBehavior" must be one of ${[...allowedOpenBehavior].join(', ')}`);
  }

  if (data.appType === 'host' && runtime.hostAppId) {
    addError(filePath, 'host app must not declare "runtime.hostAppId"');
  }
  if (data.appType === 'micro' && !runtime.hostAppId) {
    addError(filePath, 'micro app must declare "runtime.hostAppId"');
  }
  if (data.appType === 'micro' && runtime.openBehavior !== 'manual') {
    addError(filePath, 'micro app must use "runtime.openBehavior" = "manual"');
  }
  if (data.appType === 'standalone' && runtime.openBehavior !== 'auto-tab') {
    addError(filePath, 'standalone app must use "runtime.openBehavior" = "auto-tab"');
  }
  if (runtime.hostAppId) {
    const hostRecord = appRecords.find((item) => item.data.id === runtime.hostAppId);
    if (!hostRecord) {
      addError(filePath, `field "runtime.hostAppId" references missing app "${runtime.hostAppId}"`);
    } else if (hostRecord.data.appType !== 'host') {
      addError(filePath, `field "runtime.hostAppId" must reference an app with appType "host"`);
    }
  }

  if (appIdMap.has(data.id)) {
    addError(filePath, `duplicate app id "${data.id}"`);
  } else {
    appIdMap.set(data.id, record);
  }

  if (appNameMap.has(data.name)) {
    addError(filePath, `duplicate app name "${data.name}"`);
  } else {
    appNameMap.set(data.name, record);
  }
}

if (errors.length) {
  console.error('Manifest validation failed:\n');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(
  `Manifest validation passed: ${pageRecords.length} pages, ${planRecords.length} plans, ${appRecords.length} apps.`,
);
