import { useRouteMap } from './routeInfo';
import { mapTree } from 'xe-utils';
import type { RouteRaw, Meta, Menu } from './type';
import { GENERATED_PAGE_MODULES } from './generatedPageModules';

const log = (payload: unknown, level: 'error' | 'warning' | 'info' = 'info') => {
  const logger = level === 'warning' ? console.warn : level === 'error' ? console.error : console.info;
  logger(payload);
};

// 相对于当前目录的src文件夹的path
const SRC_ROOT_PATH = '../';
const PAGE_MODULES = GENERATED_PAGE_MODULES;

/**
 * 路由在本地存储的name
 */
export const ROUTE_STORAGE_NAME = `routes_uoc_portal`;

/**
 * @description: 是否存在某个路由
 * @param {string} routeName
 * @return {*}
 */
export const validateRouter = (routeName: string): boolean => {
  const { routeMap } = useRouteMap();
  return routeMap.has(routeName);
};

/**
 * 修正路由名称(根据path找到路由name)
 * @param routeName
 * @returns
 */
export const correctRouterName = (path: string): string => {
  const { routeMap } = useRouteMap();
  const route = routeMap.get(path) ?? { name: '' };
  return route.name;
};

/**
 * 处理路由meta
 * 因为本地开发用的是配置数据，配置数据中没有metadata所以要处理
 * @param metadata 后端下发的json
 * @param meta 原始的meta对象
 * @returns
 */
const initMeta = (metadata: string | null | undefined, meta: Meta | null | undefined): Meta => {
  const _meta = metadata ?? '{}';
  if (_meta === '{}') {
    return meta ?? { menuAlive: '' };
  } else {
    return { menuAlive: '', ...JSON.parse(_meta) };
  }
};

/**
 * 路径重映射逻辑：将 mock.json 中的旧路径映射到新的业务包路径
 * @param url 
 * @returns 
 */
const remapComponentPath = (url: string) => {
  const normalizedUrl = String(url || '').replace(/\\/g, '/');
  const legacyPkgMatch = normalizedUrl.match(/page-[^/]+/);
  if (!legacyPkgMatch) {
    return normalizedUrl;
  }

  const pkgName = legacyPkgMatch[0];
  const hasExplicitVuePath = normalizedUrl.endsWith('.vue');
  if (hasExplicitVuePath) {
    const suffix = normalizedUrl.split(pkgName)[1] || '/index.vue';
    return `@/${pkgName}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
  }

  return `@/${pkgName}/index.vue`;
};

/**
 *
 * @param url 解析字符串组件
 * @returns
 */
export const parseStringComponent = (url: string) => {
  const remappedUrl = remapComponentPath(url);
  const keys = Object.keys(PAGE_MODULES);
  const normalizedUrl = remappedUrl.replace(/\\/g, '/');

  // 1. 业务包逻辑：如果路径包含 page-xxx
  const pkgMatch = normalizedUrl.match(/(page-[^/]+)/);
  if (pkgMatch) {
    const pkgName = pkgMatch[1];
    // 提取子路径：找到包名后的部分
    const subPathParts = normalizedUrl.split(pkgName);
    let subPath = subPathParts.length > 1 ? subPathParts[1].replace(/^\//, '') : 'index.vue';
    
    // 容错：如果 subPath 为空或者是 business 这种中间路径，兜底到 index.vue
    if (!subPath || subPath === 'index.vue') {
      subPath = 'index.vue';
    }

    // 构造搜索特征：packages/pkgName/src/subPath
    const targetPattern = `packages/${pkgName}/src/${subPath}`;
    
    // 在所有 glob 到的 keys 中寻找最匹配的
    // 兼容 Windows 反斜杠和相对路径差异
    const foundKey = keys.find(k => {
      const normalizedKey = k.replace(/\\/g, '/');
      return normalizedKey.includes(targetPattern);
    });

    if (foundKey) {
      return PAGE_MODULES[foundKey];
    }

    const fallbackKey = keys.find((k) => {
      const normalizedKey = k.replace(/\\/g, '/');
      return normalizedKey.includes(`packages/${pkgName}/src/index.vue`);
    });

    if (fallbackKey) {
      return PAGE_MODULES[fallbackKey];
    }
  }

  // 2. 普通页面逻辑：直接根据路径查找
  const localPath = normalizedUrl.replace('@/', SRC_ROOT_PATH);
  return PAGE_MODULES[localPath];
};

/**
 * 生成单个路由项
 * @param item
 * @returns
 */
const createRoute = (item: any): RouteRaw | null => {
  const { id = '', router, resourceCode, metadata, meta, component, componentsConfig, name } = item;
  // 优先线上，其次是本地
  const url = componentsConfig || component;

  // 检查路径是否符合规范
  if (url.indexOf('@') === -1) {
    log(
      {
        msg: '解析路由组件时，存在路径不符合规范情况，正确路径应该包含@，如：@/views/XXX.vue',
        error: item,
      },
      'error',
    );
    return null;
  }

  const parsedComponent = parseStringComponent(url);
  // 检查是否存在对应文件
  if (!parsedComponent) {
    log(
      {
        msg: '解析路由组件时，在系统中找不到可以对应的vue文件！',
        error: item,
      },
      'error',
    );
  }

  return {
    path: router,
    name: resourceCode || name, // 优先接口，其次是本地
    meta: { ...initMeta(metadata, meta), id },
    componentTxt: url,
    component: parsedComponent,
  };
};

/**
 * 格式化路由和菜单数据
 * @param sourceTree
 * @returns
 */
export const parseRouteMenuTree = (sourceTree: any) => {
  const routerList: RouteRaw[] = [];
  let menuTree = mapTree(sourceTree, (item) => {
    // 生成可以跳转的路由
    if ((item.resourceType == 2 && item.componentsConfig) || item.component) {
      const route = createRoute(item);
      if (route) routerList.push(route);
    }

    const meta = initMeta(item.metadata, item.meta);
    if (meta.hide) {
      return null;
    } else {
      return {
        router: item.router,
        name: item.resourceCode || item.name,
        text: item.text || item.name,
        meta,
      };
    }
  }) as Menu[];

  // 去掉空值null
  menuTree = mapTree(menuTree, (item) => {
    if (item?.children) {
      item.children = item.children.filter((v: any) => v);
    }
    return item;
  });
  menuTree = menuTree.filter((v: any) => v);
  return {
    menuTree,
    routerList,
  };
};
