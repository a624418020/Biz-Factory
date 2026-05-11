import { parseStringComponent } from './routerUtil';
import { registerMenus } from '@/components/global/itsAside/useData';
import {
  buildMockRouteTree,
  buildPlanRouteTree,
  MOCK_STORAGE_VERSION,
  MOCK_STORAGE_VERSION_KEY,
} from '@/mock/routeData.js';
import { GENERATED_PLAN_ROUTE_TREE } from './generatedPlanRouteTree';
import type { RouteRaw } from './type';
import { buildRuntimeFromSourceTree } from '@biz/common/utils/planRuntime';

const log = (payload: unknown, level: 'error' | 'warning' | 'info' = 'info') => {
  const logger = level === 'warning' ? console.warn : level === 'error' ? console.error : console.info;
  logger(payload);
};

const routeInfoMapCache = new Map();
const PLAN_BUILD_ID = import.meta.env.VITE_APP_PLAN_ID || '';
const PLAN_BUILD_SPEC = import.meta.env.VITE_APP_PLAN_BUILD_SPEC === '1';

const ensureRouteStorageVersion = () => {
  localStorage.setItem(MOCK_STORAGE_VERSION_KEY, MOCK_STORAGE_VERSION);
};

const buildSourceTree = () => {
  if (PLAN_BUILD_SPEC) {
    return GENERATED_PLAN_ROUTE_TREE;
  }
  if (PLAN_BUILD_ID) {
    return buildPlanRouteTree(PLAN_BUILD_ID);
  }
  const mockType = import.meta.env.VITE_APP_MOCK_TYPE || 'core';
  return buildMockRouteTree(mockType);
};

const createStaticChildren = () => [
  {
    path: '/studio/apps',
    name: 'appManagement',
    meta: {
      title: '业务应用',
      menuAlive: 'appManagement',
    },
    component: () => import('../../../../packages/page-studio-apps/src/index.vue'),
  },
  {
    path: '/studio/pages',
    name: 'pageManagement',
    meta: {
      title: '页面能力库',
      menuAlive: 'pageManagement',
    },
    component: () => import('../../../../packages/page-studio-pages/src/index.vue'),
  },
  {
    path: '/studio/schemes',
    name: 'menuManagement',
    meta: {
      title: '导航方案',
      menuAlive: 'menuManagement',
    },
    component: () => import('../../../../packages/page-studio-schemes/src/index.vue'),
  },
];

const createRouteBundle = () => {
  ensureRouteStorageVersion();

  const runtimeBundle = buildRuntimeFromSourceTree({
    sourceTree: buildSourceTree(),
    resolveComponent: parseStringComponent,
  });
  const children = runtimeBundle.routes.length ? runtimeBundle.routes : createStaticChildren();
  const menuTree = runtimeBundle.menuTree;
  const defaultRoutePath = runtimeBundle.defaultRoutePath || children[0]?.path || '/studio/apps';
  registerMenus(menuTree);

  return {
    menuTree,
    routerList: children,
    defaultRoutePath,
  };
};

const ROUTE_BUNDLE = createRouteBundle();

export const getBaseRoute = () => [
  {
    path: '/login',
    name: 'login',
    meta: {
      title: '登录',
    },
    component: () => import('../../../../packages/page-login/src/index.vue'),
  },
  {
    path: '/home',
    redirect: '/',
  },
  {
    path: '/',
    name: 'home',
    redirect: ROUTE_BUNDLE.defaultRoutePath,
    meta: {
      title: '首页',
    },
    component: () => import('../components/rootLayout.vue'),
    children: ROUTE_BUNDLE.routerList,
  },
];

export const registerRoutes = async (_router?: unknown) => ROUTE_BUNDLE.routerList;

export const useRouteMap = () => {
  const setRouteMap = (routeList: RouteRaw[]) => {
    routeList.forEach((route) => {
      if (routeInfoMapCache.has(route.name)) {
        log(
          {
            msg: 'Detected duplicate route while initializing routes.',
            error: route,
          },
          'warning',
        );
      } else {
        routeInfoMapCache.set(route.name, route);
        routeInfoMapCache.set(route.path, route);
      }

      if (route.children?.length) {
        setRouteMap(route.children as RouteRaw[]);
      }
    });
  };

  if (routeInfoMapCache.size === 0) {
    setRouteMap(getBaseRoute());
  }

  return { setRouteMap, routeMap: routeInfoMapCache };
};
