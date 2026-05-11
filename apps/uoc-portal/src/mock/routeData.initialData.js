const SOURCE_CENTER_MAP = {
  core: 'Framework Core',
  sample: 'Sample Solution',
  hybrid: 'Hybrid Delivery',
};

const DOMAIN_RULES = [
  { label: 'Studio Governance', keywords: ['app', 'menu', 'page', 'library', 'studio', 'scheme'] },
  { label: 'Operations Console', keywords: ['dashboard', 'monitor', 'ops', 'operation'] },
  { label: 'Customer Delivery', keywords: ['delivery', 'client', 'tenant', 'project'] },
];

const CATEGORY_RULES = [
  { label: 'Management', keywords: ['management', 'library', 'studio', 'scheme'] },
  { label: 'Dashboard', keywords: ['dashboard', 'monitor', 'board'] },
  { label: 'Workspace', keywords: ['workspace', 'console'] },
  { label: 'Detail', keywords: ['detail', 'info'] },
];

const pageManifestModules = import.meta.glob('../../../../packages/*/page.manifest.json', {
  eager: true,
  import: 'default',
});

const planManifestModules = import.meta.glob('../../../../apps/manifests/plans/*.plan.json', {
  eager: true,
  import: 'default',
});

const appManifestModules = import.meta.glob('../../../../apps/manifests/apps/*.app.json', {
  eager: true,
  import: 'default',
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const dedupeById = (records = []) => {
  const seen = new Set();
  return records.filter((record) => {
    const id = record?.id;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

const matchLabelByKeywords = (value, rules, fallback) => {
  const normalized = String(value || '').toLowerCase();
  const matched = rules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return matched?.label || fallback;
};

export const normalizeComponentPath = (component = '') => String(component || '').replace(/\\/g, '/').replace(/^\/+/, '');

const inferPageCenter = (page) => page.center || SOURCE_CENTER_MAP[page.source] || 'Shared Module';

const inferBusinessDomain = (page) => {
  if (page.businessDomain) {
    return page.businessDomain;
  }
  const lookup = [page.component, page.router, page.name, page.text].filter(Boolean).join(' ');
  return matchLabelByKeywords(lookup, DOMAIN_RULES, 'Studio Governance');
};

const inferPageCategory = (page) => {
  if (page.pageCategory) {
    return page.pageCategory;
  }
  const lookup = [page.component, page.router, page.name, page.text].filter(Boolean).join(' ');
  return matchLabelByKeywords(lookup, CATEGORY_RULES, 'Management');
};

const manifestEntryToComponent = (packageName = '', entry = '') => {
  const packageFolder = String(packageName || '').replace(/^@biz\//, '');
  const normalizedEntry = String(entry || 'src/index.vue').replace(/\\/g, '/');
  const relativeEntry = normalizedEntry.replace(/^src\//, '');
  return normalizeComponentPath(`${packageFolder}/${relativeEntry}`);
};

const normalizeMenuNode = (node, source, parentId = '', depthIndex = 0, result = []) => {
  const menuRecord = {
    id: node.id,
    parentId,
    name: node.name,
    text: node.title,
    router: node.route,
    source,
    pageId: node.pageId || '',
    iconName: node.iconName || 'icon-menu2level',
    title: node.title,
    hide: false,
    sort: typeof node.sort === 'number' ? node.sort : depthIndex,
    description: node.description || '',
    meta: {
      ...(node.meta || {}),
      iconName: node.iconName || 'icon-menu2level',
      title: node.title,
      description: node.description || '',
    },
  };

  result.push(menuRecord);
  (node.children || []).forEach((child, index) => normalizeMenuNode(child, source, node.id, index, result));
  return result;
};

const pageManifestList = Object.values(pageManifestModules).map((manifest) => clone(manifest));
const planManifestList = Object.values(planManifestModules).map((manifest) => clone(manifest));
const appManifestList = Object.values(appManifestModules).map((manifest) => clone(manifest));

const BUILTIN_PAGES = pageManifestList.map((pageManifest) => ({
  id: pageManifest.id,
  name: pageManifest.name,
  text: pageManifest.title,
  router: pageManifest.route,
  component: manifestEntryToComponent(pageManifest.packageName, pageManifest.entry),
  source: pageManifest.source,
  title: pageManifest.title,
  menuAlive: pageManifest.meta?.menuAlive || pageManifest.name,
  center: pageManifest.center || SOURCE_CENTER_MAP[pageManifest.source] || 'Shared Module',
  businessDomain: pageManifest.businessDomain || '',
  pageCategory: pageManifest.pageCategory || '',
  status: pageManifest.status || 'enabled',
  hide: false,
  iconName: pageManifest.iconName || 'icon-menu2level',
  description: pageManifest.description || '',
  meta: {
    ...(pageManifest.meta || {}),
    title: pageManifest.title,
    menuAlive: pageManifest.meta?.menuAlive || pageManifest.name,
    iconName: pageManifest.iconName || 'icon-menu2level',
    description: pageManifest.description || '',
  },
}));

const BUILTIN_MENUS = dedupeById(
  planManifestList.flatMap((planManifest) =>
    (planManifest.menus || []).flatMap((menu, index) => normalizeMenuNode(menu, planManifest.source, '', index)),
  ),
);

const BUILTIN_PLANS = planManifestList.map((planManifest) => ({
  id: planManifest.id,
  name: planManifest.name,
  text: planManifest.title,
  source: planManifest.source,
  description: planManifest.description || '',
  menuIds: (planManifest.menus || []).map((menu) => menu.id),
  enabled: planManifest.status !== 'disabled' && planManifest.status !== 'deprecated',
  homePageId: planManifest.homePageId || '',
  status: planManifest.status || 'enabled',
}));

const BUILTIN_APPS = appManifestList.map((appManifest) => ({
  id: appManifest.id,
  name: appManifest.name,
  text: appManifest.title,
  appType: appManifest.appType,
  loginPageType: appManifest.loginPageType,
  source: appManifest.source,
  description: appManifest.description || '',
  planId: appManifest.planId,
  homePageId: appManifest.homePageId || '',
  enabled: appManifest.status !== 'disabled' && appManifest.status !== 'deprecated',
  status: appManifest.status || 'enabled',
  build: appManifest.build || {},
  runtime: appManifest.runtime || {},
}));

export const enrichPageRecord = (page = {}, fallback = {}) => {
  const normalized = {
    ...fallback,
    ...page,
    component: normalizeComponentPath(page.component || fallback.component || ''),
  };

  return {
    ...normalized,
    center: inferPageCenter(normalized),
    businessDomain: inferBusinessDomain(normalized),
    pageCategory: inferPageCategory(normalized),
    status: normalized.status || 'enabled',
  };
};

export const buildInitialRecords = () => ({
  pages: BUILTIN_PAGES.map((page) => enrichPageRecord(clone(page))),
  menus: BUILTIN_MENUS.map((menu) => clone(menu)),
  plans: BUILTIN_PLANS.map((plan) => clone(plan)),
  apps: BUILTIN_APPS.map((app) => clone(app)),
});

export const migrateStoredRecords = (pages = [], menus = [], plans = [], apps = []) => {
  const initial = buildInitialRecords();
  const initialPageMap = new Map(initial.pages.map((page) => [page.id, page]));
  const initialMenuMap = new Map(initial.menus.map((menu) => [menu.id, menu]));
  const initialPlanMap = new Map(initial.plans.map((plan) => [plan.id, plan]));
  const initialAppMap = new Map(initial.apps.map((app) => [app.id, app]));

  const nextPages = pages
    .filter((page) => page?.id)
    .map((page) => enrichPageRecord(page, initialPageMap.get(page.id) || {}));

  const nextMenus = dedupeById(
    menus
      .filter((menu) => menu?.id)
    .map((menu) => {
      const fallback = initialMenuMap.get(menu.id) || {};
      return {
        ...fallback,
        ...menu,
        source: menu.source || fallback.source || 'core',
        pageId: menu.pageId || fallback.pageId || '',
      };
    }),
  );

  const rootMenuIdSet = new Set(nextMenus.filter((menu) => !menu.parentId).map((menu) => menu.id));

  const nextPlans = plans
    .filter((plan) => plan?.id)
    .map((plan) => {
      const fallback = initialPlanMap.get(plan.id) || {};
      const menuIds = Array.isArray(plan.menuIds)
        ? plan.menuIds.filter((id) => rootMenuIdSet.has(id))
        : fallback.menuIds || [];

      return {
        ...fallback,
        ...plan,
        source: plan.source || fallback.source || 'core',
        menuIds: [...new Set(menuIds)],
      };
    });

  const defaultPlanBySource = new Map();
  nextPlans.forEach((plan) => {
    if (!defaultPlanBySource.has(plan.source)) {
      defaultPlanBySource.set(plan.source, plan.id);
    }
  });

  const nextApps = apps
    .filter((app) => app?.id)
    .map((app) => {
      const fallback = initialAppMap.get(app.id) || {};
      const source = app.source || fallback.source || 'core';
      const appType = app.appType || fallback.appType || (source === 'hybrid' ? 'standalone' : 'micro');
      const planId = app.planId || fallback.planId || defaultPlanBySource.get(source) || defaultPlanBySource.get('core') || '';

      return {
        ...fallback,
        ...app,
        source,
        appType,
        loginPageType:
          app.loginPageType ||
          fallback.loginPageType ||
          (appType === 'standalone' ? 'page-login' : 'host-login'),
        planId,
      };
    });

  return {
    pages: nextPages,
    menus: nextMenus,
    plans: nextPlans,
    apps: nextApps,
  };
};
