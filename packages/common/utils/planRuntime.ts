type RuntimeMeta = Record<string, any>;

type SourceTreeNode = {
  name?: string;
  text?: string;
  title?: string;
  router?: string;
  meta?: RuntimeMeta;
  component?: string;
  children?: SourceTreeNode[];
};

type RuntimeMenuNode = {
  name: string;
  text: string;
  router: string;
  meta: RuntimeMeta;
  children?: RuntimeMenuNode[];
};

type RuntimeRoute = {
  path: string;
  name: string;
  meta: RuntimeMeta;
  component: unknown;
};

type RuntimeBundle = {
  menuTree: RuntimeMenuNode[];
  routes: RuntimeRoute[];
  defaultRoutePath: string;
};

type BuildRuntimeOptions = {
  sourceTree: SourceTreeNode[];
  resolveComponent: (componentPath: string) => unknown;
};

const ensureArray = <T>(value: T[] | null | undefined) => (Array.isArray(value) ? value : []);

const normalizeMeta = (node: SourceTreeNode) => ({
  ...(node.meta || {}),
  title: node.meta?.title || node.title || node.text || node.name || '',
  menuAlive: node.meta?.menuAlive || node.name || '',
});

export const buildRuntimeFromSourceTree = ({ sourceTree, resolveComponent }: BuildRuntimeOptions): RuntimeBundle => {
  const routeList: RuntimeRoute[] = [];
  let defaultRoutePath = '';

  const buildNode = (node: SourceTreeNode): RuntimeMenuNode | null => {
    const meta = normalizeMeta(node);
    const children = ensureArray(node.children).map(buildNode).filter(Boolean) as RuntimeMenuNode[];

    if (node.component && node.router && node.name) {
      const component = resolveComponent(node.component);
      if (component) {
        routeList.push({
          path: node.router,
          name: node.name,
          meta,
          component,
        });
        if (!defaultRoutePath) {
          defaultRoutePath = node.router;
        }
      }
    }

    if (meta.hide) {
      return null;
    }

    return {
      name: node.name || '',
      text: node.text || node.title || node.name || '',
      router: node.router || '',
      meta,
      children,
    };
  };

  const menuTree = ensureArray(sourceTree).map(buildNode).filter(Boolean) as RuntimeMenuNode[];

  return {
    menuTree,
    routes: routeList,
    defaultRoutePath,
  };
};
