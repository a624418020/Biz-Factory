import {
  APP_STORAGE_KEY,
  MENU_STORAGE_KEY,
  MOCK_STORAGE_VERSION,
  MOCK_STORAGE_VERSION_KEY,
  PAGE_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  ROUTE_CACHE_KEY,
} from './routeData.constants.js';
import {
  buildInitialRecords,
  enrichPageRecord,
  migrateStoredRecords,
  normalizeComponentPath,
} from './routeData.initialData.js';
import {
  buildMenuTree,
  buildRouteNodes,
  collectPageIdsByMenuIds,
  filterByMockType,
  getMenuDescendantIds,
  getPlanMenuIds,
  getPlanMenuTree,
  getPlanMenus,
} from './routeData.routeUtils.js';

const MANIFEST_STORE_ENDPOINT = '/__manifest_store/save';
const MANIFEST_RELOAD_ENDPOINT = '/__manifest_store/reload';

let currentRecords = buildInitialRecords();
let persistPromise = Promise.resolve();

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeRecords = (records) => migrateStoredRecords(records.pages, records.menus, records.plans, records.apps);

const updateCurrentRecords = (records) => {
  currentRecords = normalizeRecords(records);
  return currentRecords;
};

const persistManifestRecords = (records) => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return;
  }

  const payload = {
    version: MOCK_STORAGE_VERSION,
    ...records,
  };

  persistPromise = persistPromise
    .catch(() => undefined)
    .then(() =>
      fetch(MANIFEST_STORE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    )
    .then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Manifest save failed.');
      }
      return response.json().catch(() => ({}));
    })
    .catch((error) => {
      console.error('[manifest-store]', error);
    });
};

const reloadManifestRecords = async () => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return clone(currentRecords);
  }

  try {
    const response = await fetch(MANIFEST_RELOAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: MOCK_STORAGE_VERSION }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Manifest reload failed.');
    }

    return updateCurrentRecords({
      pages: result.pages || [],
      menus: result.menus || [],
      plans: result.plans || [],
      apps: result.apps || [],
    });
  } catch (error) {
    console.error('[manifest-reload]', error);
    return clone(currentRecords);
  }
};

export {
  APP_STORAGE_KEY,
  MENU_STORAGE_KEY,
  MOCK_STORAGE_VERSION,
  MOCK_STORAGE_VERSION_KEY,
  PAGE_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  ROUTE_CACHE_KEY,
  normalizeComponentPath,
  enrichPageRecord,
  filterByMockType,
  buildMenuTree,
  getMenuDescendantIds,
  collectPageIdsByMenuIds,
  getPlanMenuIds,
  getPlanMenus,
  getPlanMenuTree,
};

export const invalidateRouteCache = () => {
  sessionStorage.removeItem(ROUTE_CACHE_KEY);
};

export const resetMockStorage = () => {
  const records = updateCurrentRecords(buildInitialRecords());
  invalidateRouteCache();
  return records;
};

export const ensureMockStorage = () => clone(currentRecords);

export const refreshManifestRecords = async () => {
  const records = await reloadManifestRecords();
  invalidateRouteCache();
  return records;
};

export const getPageRecords = () => ensureMockStorage().pages;

export const savePageRecords = (pages) => {
  const normalizedPages = (pages || []).map((page) => enrichPageRecord(page));
  const records = updateCurrentRecords({
    ...currentRecords,
    pages: normalizedPages,
  });
  persistManifestRecords(records);
  return clone(records.pages);
};

export const getMenuRecords = () => ensureMockStorage().menus;

export const saveMenuRecords = (menus) => {
  const records = updateCurrentRecords({
    ...currentRecords,
    menus: menus || [],
  });
  persistManifestRecords(records);
  return clone(records.menus);
};

export const getPlanRecords = () => ensureMockStorage().plans;

export const savePlanRecords = (plans) => {
  const records = updateCurrentRecords({
    ...currentRecords,
    plans: plans || [],
  });
  persistManifestRecords(records);
  return clone(records.plans);
};

export const getAppRecords = () => ensureMockStorage().apps;

export const saveAppRecords = (apps) => {
  const records = updateCurrentRecords({
    ...currentRecords,
    apps: apps || [],
  });
  persistManifestRecords(records);
  return clone(records.apps);
};

export const buildPlanRouteTree = (planId) => {
  const { pages, menus, plans } = ensureMockStorage();
  const plan = plans.find((item) => item.id === planId || item.name === planId);
  if (!plan) {
    return [];
  }

  const selectedMenuIds = new Set(getPlanMenuIds(plan, menus));
  const selectedPageIds = new Set(collectPageIdsByMenuIds(plan.menuIds || [], menus));
  const filteredMenus = menus.filter((menu) => selectedMenuIds.has(menu.id));
  const filteredPages = pages.filter((page) => selectedPageIds.has(page.id));
  return buildRouteNodes(filteredMenus, filteredPages);
};

export const buildMockRouteTree = (mockType = 'uoc') => {
  const { pages, menus } = ensureMockStorage();
  const filteredPages = filterByMockType(pages, mockType);
  const filteredMenus = filterByMockType(menus, mockType);
  return buildRouteNodes(filteredMenus, filteredPages);
};
