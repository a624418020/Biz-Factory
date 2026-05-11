import fs from 'node:fs';
import path from 'node:path';
import { appsRoot, buildManifestRecords, packagesRoot, plansRoot } from '../manifest-lib.mjs';
import { ensurePagePackageScaffold } from '../page-package-scaffold.mjs';

const writeJsonFile = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const removeFileIfExists = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const sanitizeFileName = (value) => String(value || '').replace(/[^a-zA-Z0-9-_]+/g, '-');

const componentPathToManifestTarget = (componentPath, packageRoot) => {
  const normalized = String(componentPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const [packageFolder, ...rest] = normalized.split('/');
  const manifestPath = path.resolve(packageRoot, packageFolder, 'page.manifest.json');
  const relativeEntry = rest.length ? rest.join('/') : 'index.vue';
  return {
    manifestPath,
    packageName: `@biz/${packageFolder}`,
    entry: `src/${relativeEntry}`.replace(/\\/g, '/'),
  };
};

const buildPageManifestFromRecord = (page, packageRoot) => {
  const target = componentPathToManifestTarget(page.component || '', packageRoot);
  return {
    manifestPath: target.manifestPath,
    data: {
      id: page.id,
      name: page.name,
      title: page.title || page.text || page.name,
      route: page.router,
      packageName: target.packageName,
      entry: target.entry || 'src/index.vue',
      source: page.source || 'core',
      center: page.center || '',
      businessDomain: page.businessDomain || '',
      pageCategory: page.pageCategory || '',
      status: page.status || (page.enabled === false ? 'disabled' : 'enabled'),
      iconName: page.iconName || 'icon-menu2level',
      description: page.description || '',
      tags: page.tags || [],
      meta: {
        ...(page.meta || {}),
        menuAlive: page.menuAlive || page.name,
      },
    },
  };
};

const buildPlanTree = (menus, rootMenuIds) => {
  const menuMap = new Map(menus.map((menu) => [menu.id, { ...menu }]));
  const childMap = new Map();

  menus.forEach((menu) => {
    if (!menu.parentId) {
      return;
    }

    const list = childMap.get(menu.parentId) || [];
    list.push(menu);
    childMap.set(menu.parentId, list);
  });

  const toNode = (menu) => ({
    id: menu.id,
    name: menu.name,
    title: menu.title || menu.text || menu.name,
    route: menu.router,
    iconName: menu.iconName || 'icon-menu2level',
    pageId: menu.pageId || undefined,
    description: menu.description || '',
    meta: menu.meta || {},
    children: (childMap.get(menu.id) || [])
      .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
      .map(toNode),
  });

  return rootMenuIds
    .map((id) => menuMap.get(id))
    .filter(Boolean)
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .map(toNode);
};

export const persistManifestStore = (
  records,
  {
    packageRoot = packagesRoot,
    manifestPlansRoot = plansRoot,
    manifestAppsRoot = appsRoot,
  } = {},
) => {
  const nextPages = records.pages || [];
  const nextMenus = records.menus || [];
  const nextPlans = records.plans || [];
  const nextApps = records.apps || [];

  const pageManifestMap = new Map();
  nextPages.forEach((page) => {
    const { manifestPath, data } = buildPageManifestFromRecord(page, packageRoot);
    pageManifestMap.set(manifestPath, manifestPath);
    writeJsonFile(manifestPath, data);
    ensurePagePackageScaffold({
      manifestPath,
      manifest: data,
    });
  });

  fs.readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((entry) => {
      const manifestPath = path.resolve(packageRoot, entry.name, 'page.manifest.json');
      if (fs.existsSync(manifestPath) && !pageManifestMap.has(manifestPath)) {
        removeFileIfExists(manifestPath);
      }
    });

  const planManifestMap = new Map();
  nextPlans.forEach((plan) => {
    const fileName = `${sanitizeFileName(plan.name || plan.id.replace(/^plan:/, ''))}.plan.json`;
    const manifestPath = path.resolve(manifestPlansRoot, fileName);
    planManifestMap.set(manifestPath, manifestPath);
    writeJsonFile(manifestPath, {
      id: plan.id,
      name: plan.name,
      title: plan.text || plan.title || plan.name,
      source: plan.source || 'core',
      status: plan.status || (plan.enabled === false ? 'disabled' : 'enabled'),
      description: plan.description || '',
      homePageId: plan.homePageId || '',
      menus: buildPlanTree(nextMenus, plan.menuIds || []),
    });
  });

  if (fs.existsSync(manifestPlansRoot)) {
    fs.readdirSync(manifestPlansRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.plan.json'))
      .forEach((entry) => {
        const manifestPath = path.resolve(manifestPlansRoot, entry.name);
        if (!planManifestMap.has(manifestPath)) {
          removeFileIfExists(manifestPath);
        }
      });
  }

  const appManifestMap = new Map();
  nextApps.forEach((app) => {
    const fileName = `${sanitizeFileName(app.name || app.id.replace(/^app:/, ''))}.app.json`;
    const manifestPath = path.resolve(manifestAppsRoot, fileName);
    appManifestMap.set(manifestPath, manifestPath);
    writeJsonFile(manifestPath, {
      id: app.id,
      name: app.name,
      title: app.text || app.title || app.name,
      appType: app.appType || 'micro',
      source: app.source || 'core',
      status: app.status || (app.enabled === false ? 'disabled' : 'enabled'),
      description: app.description || '',
      planId: app.planId || '',
      loginPageType: app.loginPageType || (app.appType === 'standalone' ? 'page-login' : 'host-login'),
      homePageId: app.homePageId || '',
      build: app.build || {},
      runtime: app.runtime || {},
    });
  });

  if (fs.existsSync(manifestAppsRoot)) {
    fs.readdirSync(manifestAppsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.app.json'))
      .forEach((entry) => {
        const manifestPath = path.resolve(manifestAppsRoot, entry.name);
        if (!appManifestMap.has(manifestPath)) {
          removeFileIfExists(manifestPath);
        }
      });
  }
};

export const createManifestStore = (options = {}) => ({
  save: async ({ pages, menus, plans, apps }) => {
    if (!Array.isArray(pages) || !Array.isArray(menus) || !Array.isArray(plans) || !Array.isArray(apps)) {
      throw new Error('Manifest payload is incomplete.');
    }

    persistManifestStore({ pages, menus, plans, apps }, options);
  },
  reload: async () => buildManifestRecords(),
});
