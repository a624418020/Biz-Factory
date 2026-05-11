import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..');
export const packagesRoot = path.resolve(repoRoot, 'packages');
export const manifestsRoot = path.resolve(repoRoot, 'apps', 'manifests');
export const plansRoot = path.resolve(manifestsRoot, 'plans');
export const appsRoot = path.resolve(manifestsRoot, 'apps');

export const readJsonFile = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const listDirectories = (rootPath) => {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.resolve(rootPath, entry.name));
};

const listJsonFiles = (rootPath) => {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.resolve(rootPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
};

export const loadPageManifests = () =>
  listDirectories(packagesRoot)
    .map((packageDir) => path.resolve(packageDir, 'page.manifest.json'))
    .filter((manifestPath) => fs.existsSync(manifestPath))
    .map((manifestPath) => ({
      filePath: manifestPath,
      data: readJsonFile(manifestPath),
    }));

export const loadPlanManifests = () =>
  listJsonFiles(plansRoot).map((manifestPath) => ({
    filePath: manifestPath,
    data: readJsonFile(manifestPath),
  }));

export const loadAppManifests = () =>
  listJsonFiles(appsRoot).map((manifestPath) => ({
    filePath: manifestPath,
    data: readJsonFile(manifestPath),
  }));

export const findPlanManifestById = (planId) =>
  loadPlanManifests().find(({ data }) => data.id === planId) || null;

export const findAppManifestByPlanId = (planId) =>
  loadAppManifests().find(({ data }) => data.planId === planId) || null;

export const findAppManifestByPlanIdAndShellPackage = (planId, shellPackage = '') =>
  loadAppManifests().find(
    ({ data }) => data.planId === planId && String(data.runtime?.shellPackage || '') === String(shellPackage || ''),
  ) || null;

export const flattenPlanMenus = (menus = []) => {
  const result = [];

  const visit = (node, parentId = '') => {
    result.push({
      ...node,
      parentId,
    });

    (node.children || []).forEach((child) => visit(child, node.id));
  };

  menus.forEach((menu) => visit(menu));
  return result;
};

const getDescendantMenuIds = (menuIds, menus) => {
  const seedIds = Array.isArray(menuIds) ? menuIds.filter(Boolean) : [menuIds].filter(Boolean);
  const result = new Set(seedIds);
  let changed = true;

  while (changed) {
    changed = false;
    menus.forEach((menu) => {
      if (menu.parentId && result.has(menu.parentId) && !result.has(menu.id)) {
        result.add(menu.id);
        changed = true;
      }
    });
  }

  return result;
};

const normalizeComponentPath = (component = '') => String(component || '').replace(/\\/g, '/').replace(/^\/+/, '');

const manifestEntryToComponent = (packageName = '', entry = '') => {
  const packageFolder = String(packageName || '').replace(/^@biz\//, '');
  const normalizedEntry = String(entry || 'src/index.vue').replace(/\\/g, '/');
  const relativeEntry = normalizedEntry.replace(/^src\//, '');
  return normalizeComponentPath(`${packageFolder}/${relativeEntry}`);
};

export const buildManifestRecords = () => {
  const pageRecords = loadPageManifests().map(({ data }) => ({
    id: data.id,
    name: data.name,
    text: data.title,
    router: data.route,
    component: manifestEntryToComponent(data.packageName, data.entry),
    source: data.source,
    title: data.title,
    menuAlive: data.meta?.menuAlive || data.name,
    center: data.center || '',
    businessDomain: data.businessDomain || '',
    pageCategory: data.pageCategory || '',
    status: data.status || 'enabled',
    hide: false,
    iconName: data.iconName || 'icon-menu2level',
    description: data.description || '',
    meta: {
      ...(data.meta || {}),
      title: data.title,
      menuAlive: data.meta?.menuAlive || data.name,
      iconName: data.iconName || 'icon-menu2level',
      description: data.description || '',
    },
  }));

  const planRecordsRaw = loadPlanManifests().map(({ data }) => data);
  const menuRecords = planRecordsRaw.flatMap((plan) =>
    flattenPlanMenus(plan.menus || []).map((menu) => ({
      id: menu.id,
      parentId: menu.parentId || '',
      name: menu.name,
      text: menu.title,
      router: menu.route,
      source: plan.source,
      pageId: menu.pageId || '',
      iconName: menu.iconName || 'icon-menu2level',
      title: menu.title,
      hide: false,
      sort: typeof menu.sort === 'number' ? menu.sort : 0,
      description: menu.description || '',
      meta: {
        ...(menu.meta || {}),
        iconName: menu.iconName || 'icon-menu2level',
        title: menu.title,
        description: menu.description || '',
      },
    })),
  );

  const planRecords = planRecordsRaw.map((plan) => ({
    id: plan.id,
    name: plan.name,
    text: plan.title,
    source: plan.source,
    description: plan.description || '',
    menuIds: (plan.menus || []).map((menu) => menu.id),
    enabled: plan.status !== 'disabled' && plan.status !== 'deprecated',
    homePageId: plan.homePageId || '',
    status: plan.status || 'enabled',
  }));

  const appRecords = loadAppManifests().map(({ data }) => ({
    id: data.id,
    name: data.name,
    text: data.title,
    appType: data.appType,
    loginPageType: data.loginPageType,
    source: data.source,
    description: data.description || '',
    planId: data.planId,
    homePageId: data.homePageId || '',
    enabled: data.status !== 'disabled' && data.status !== 'deprecated',
    status: data.status || 'enabled',
    build: data.build || {},
    runtime: data.runtime || {},
  }));

  return {
    pages: pageRecords,
    menus: menuRecords,
    plans: planRecords,
    apps: appRecords,
  };
};

export const buildSpecFromPlanId = (planId) => {
  const planManifest = findPlanManifestById(planId);
  if (!planManifest) {
    throw new Error(`Missing plan manifest for "${planId}".`);
  }

  const appManifest = findAppManifestByPlanId(planId);
  if (!appManifest) {
    throw new Error(`Missing app manifest bound to plan "${planId}".`);
  }

  const records = buildManifestRecords();
  const flatMenus = flattenPlanMenus(planManifest.data.menus || []);
  const selectedMenuIds = getDescendantMenuIds(
    (planManifest.data.menus || []).map((menu) => menu.id),
    flatMenus,
  );
  const selectedMenus = records.menus.filter((menu) => selectedMenuIds.has(menu.id));
  const selectedPageIds = new Set(selectedMenus.map((menu) => menu.pageId).filter(Boolean));
  const selectedPages = records.pages.filter((page) => selectedPageIds.has(page.id));
  const selectedPlan = records.plans.find((plan) => plan.id === planId);
  const selectedApp = records.apps.find((app) => app.planId === planId);

  if (!selectedPlan || !selectedApp) {
    throw new Error(`Failed to assemble runtime spec for "${planId}".`);
  }

  return {
    pages: selectedPages,
    menus: selectedMenus,
    plan: selectedPlan,
    app: {
      ...selectedApp,
      build: appManifest.data.build || {},
      runtime: appManifest.data.runtime || {},
    },
  };
};
