import fs from 'node:fs';
import path from 'node:path';
import { buildManifestRecords, buildSpecFromPlanId } from '../manifest-lib.mjs';
import { assertSupportedNodeVersion } from '../node-version.mjs';

assertSupportedNodeVersion();

const parseCliArgs = (argv) => {
  const rawArgs = argv.filter((arg) => arg && arg !== '--');
  let specPath = '';
  let planId = '';

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--spec') {
      specPath = rawArgs[index + 1] || '';
      index += 1;
    } else if (arg.startsWith('plan:')) {
      planId = arg;
    }
  }

  return { specPath, planId };
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

const fileExists = (generatedModulesFile, relativeImportPath) =>
  fs.existsSync(path.resolve(path.dirname(generatedModulesFile), relativeImportPath));

const toImportPath = (generatedModulesFile, componentPath) => {
  if (!componentPath) {
    return null;
  }

  if (componentPath.startsWith('page-')) {
    const [pkgName, ...rest] = componentPath.split('/');
    const subPath = rest.length ? rest.join('/') : 'index.vue';
    const directPath = `../../../../packages/${pkgName}/src/${subPath}`;
    if (fileExists(generatedModulesFile, directPath)) {
      return directPath;
    }

    const fallbackPath = `../../../../packages/${pkgName}/src/index.vue`;
    return fileExists(generatedModulesFile, fallbackPath) ? fallbackPath : null;
  }

  const localPath = `../views/${componentPath.replace(/^\/+/, '')}`;
  return fileExists(generatedModulesFile, localPath) ? localPath : null;
};

const buildRouteNodes = (menus, pages, rootMenuIds) => {
  const selectedMenuIds = getDescendantMenuIds(rootMenuIds, menus);
  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const filteredMenus = menus
    .filter((menu) => selectedMenuIds.has(menu.id))
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0));

  const menuMap = new Map(filteredMenus.map((menu) => [menu.id, { ...menu, children: [] }]));
  const roots = [];

  menuMap.forEach((menu) => {
    if (menu.parentId && menuMap.has(menu.parentId)) {
      menuMap.get(menu.parentId).children.push(menu);
    } else {
      roots.push(menu);
    }
  });

  const serializeNode = (menu) => {
    const page = pageMap.get(menu.pageId);
    const node = {
      name: menu.name,
      text: menu.text,
      router: menu.router,
      meta: {
        ...(menu.meta || {}),
        ...(page?.meta || {}),
        title: menu.title || page?.title || menu.text || menu.name,
        menuAlive: page?.menuAlive || menu.name,
        iconName: menu.iconName || page?.iconName || '',
      },
    };

    if (page?.component) {
      node.component = `@/${page.component}`;
    }

    if (menu.children?.length) {
      node.children = menu.children.map(serializeNode);
    }

    return node;
  };

  return roots.map(serializeNode);
};

const loadBuildInput = (appRoot, specPath, planId) => {
  const records = buildManifestRecords();

  if (specPath) {
    const spec = JSON.parse(fs.readFileSync(path.resolve(appRoot, specPath), 'utf8'));
    return {
      pages: spec.pages || [],
      allPages: records.pages || [],
      menus: spec.menus || [],
      plan: spec.plan || null,
      modeLabel: spec.app?.text || spec.plan?.text || path.basename(specPath),
    };
  }

  if (planId) {
    const spec = buildSpecFromPlanId(planId);
    return {
      pages: spec.pages || [],
      allPages: records.pages || [],
      menus: spec.menus || [],
      plan: spec.plan || null,
      modeLabel: spec.app?.text || spec.plan?.text || planId,
    };
  }

  return {
    pages: records.pages,
    allPages: records.pages,
    menus: records.menus,
    plan: null,
    modeLabel: 'framework-core',
  };
};

export const runGeneratePageModules = ({ appRoot, argv }) => {
  const { specPath, planId } = parseCliArgs(argv);
  const generatedModulesFile = path.resolve(appRoot, 'src/router/generatedPageModules.ts');
  const generatedRouteTreeFile = path.resolve(appRoot, 'src/router/generatedPlanRouteTree.ts');
  const input = loadBuildInput(appRoot, specPath, planId);

  // Keep the route tree plan-scoped, but emit a full page-module map.
  // Both assembly/uoc dev servers share the same generated file path, so
  // plan-specific module maps can overwrite each other and break route
  // resolution for another running plan. A full module map avoids that.
  const selectedComponents = (input.allPages || input.pages).map((page) => page.component);

  const modules = [...new Set(selectedComponents.filter(Boolean))]
    .map((component) => ({ component, importPath: toImportPath(generatedModulesFile, component) }))
    .filter((item) => item.importPath)
    .sort((left, right) => left.importPath.localeCompare(right.importPath));

  const routeTree = input.plan ? buildRouteNodes(input.menus, input.pages, input.plan.menuIds || []) : [];

  const modulesFileContent = `// Auto-generated by scripts/generate-page-modules.mjs
export const GENERATED_PAGE_MODULES = {
${modules.map(({ importPath }) => `  '${importPath}': () => import('${importPath}'),`).join('\n')}
};
`;

  const routeTreeFileContent = `// Auto-generated by scripts/generate-page-modules.mjs
export const GENERATED_PLAN_ROUTE_TREE = ${JSON.stringify(routeTree, null, 2)};
`;

  fs.writeFileSync(generatedModulesFile, modulesFileContent, 'utf8');
  fs.writeFileSync(generatedRouteTreeFile, routeTreeFileContent, 'utf8');
  console.log(`Generated framework page module map: ${modules.length} entries${input.plan ? ` for ${input.modeLabel}` : ''}`);
};
