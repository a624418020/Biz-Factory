type AppManifest = {
  id: string;
  name: string;
  title: string;
  description?: string;
  appType: 'host' | 'micro' | 'standalone';
  status: string;
  runtime?: {
    devPort?: number;
    basePath?: string;
    defaultRoute?: string;
    shellPackage?: string;
    hostAppId?: string;
  };
};

const appManifestModules = import.meta.glob('../../manifests/apps/*.app.json', {
  eager: true,
  import: 'default',
}) as Record<string, AppManifest>;

const appManifestList = Object.values(appManifestModules);

export interface MicroAppRegistryItem {
  id: string;
  name: string;
  title: string;
  description: string;
  appType: 'micro';
  status: string;
  platformCode: string;
  platformUrl: string;
  defaultRoute: string;
  basePath: string;
  devPort: number;
  hostAppId: string;
}

const toPlatformCode = (basePath = '') => String(basePath || '').replace(/^\/+|\/+$/g, '');
const toPlatformUrl = (devPort = 0, basePath = '') =>
  `http://localhost:${Number(devPort || 0)}${basePath.endsWith('/') ? basePath.slice(0, -1) : basePath}/`;

export const MICRO_APP_REGISTRY: MicroAppRegistryItem[] = appManifestList
  .filter((item) => item.status === 'enabled' && item.appType === 'micro')
  .map((item) => {
    const devPort = Number(item.runtime?.devPort || 0);
    const basePath = item.runtime?.basePath || '/';
    return {
      id: item.id,
      name: item.name,
      title: item.title,
      description: item.description || '',
      appType: 'micro',
      status: item.status,
      platformCode: toPlatformCode(basePath),
      platformUrl: toPlatformUrl(devPort, basePath),
      defaultRoute: item.runtime?.defaultRoute || '/',
      basePath,
      devPort,
      hostAppId: item.runtime?.hostAppId || '',
    };
  });

export const MICRO_APP_MAP = Object.fromEntries(
  MICRO_APP_REGISTRY.map((item) => [item.platformCode, item]),
);

export const getMicroAppByCode = (platformCode = '') => MICRO_APP_MAP[platformCode] || null;
