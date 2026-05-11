export const filterByMockType = (records, mockType) => {
  if (mockType === 'all') {
    return records;
  }
  return records.filter((item) => item.source === mockType);
};

export const buildMenuTree = (menus) => {
  const menuMap = new Map();
  const roots = [];

  [...menus]
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

  menuMap.forEach((menu) => {
    if (menu.parentId && menuMap.has(menu.parentId)) {
      menuMap.get(menu.parentId).children.push(menu);
    } else {
      roots.push(menu);
    }
  });

  return roots;
};

export const getMenuDescendantIds = (menuIds, menus) => {
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

  return [...result];
};

export const collectPageIdsByMenuIds = (menuIds, menus) => {
  const allMenuIds = new Set(getMenuDescendantIds(menuIds, menus));
  return menus.filter((menu) => allMenuIds.has(menu.id) && menu.pageId).map((menu) => menu.pageId);
};

export const getPlanMenuIds = (plan, menus) => {
  if (!plan) {
    return [];
  }
  return getMenuDescendantIds(plan.menuIds || [], menus);
};

export const getPlanMenus = (plan, menus) => {
  const menuIds = new Set(getPlanMenuIds(plan, menus));
  return menus.filter((menu) => menuIds.has(menu.id));
};

export const getPlanMenuTree = (plan, menus) => buildMenuTree(getPlanMenus(plan, menus));

export const buildRouteNodes = (filteredMenus, filteredPages) => {
  const pageMap = new Map(filteredPages.map((page) => [page.id, page]));

  const buildNode = (menu) => {
    const page = pageMap.get(menu.pageId);
    const meta = {
      ...(menu.meta || {}),
      ...(page?.meta || {}),
      iconName: menu.iconName || page?.iconName || menu.meta?.iconName || '',
      title: menu.title || page?.title || menu.text || menu.name,
      menuAlive: page?.menuAlive || menu.meta?.menuAlive || menu.name,
    };

    if (menu.hide || page?.hide) {
      meta.hide = true;
    }

    const node = {
      name: menu.name,
      text: menu.text,
      router: menu.router,
      meta,
    };

    if (page?.component) {
      const normalizedComponent = String(page.component).replace(/^\/+/, '');
      node.component = `@/${normalizedComponent}`;
    }

    if (menu.children?.length) {
      node.children = menu.children.map(buildNode);
    }

    return node;
  };

  return buildMenuTree(filteredMenus).map(buildNode);
};
