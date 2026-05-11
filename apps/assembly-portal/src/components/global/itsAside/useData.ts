import { ref, watch } from 'vue';
import router from '@/router';
import type { Menu } from '@/router/type';
const menuCache = ref<null | Menu[]>(null);

export const registerMenus = (mapTree: Menu[]) => {
  menuCache.value = mapTree;
};

export const useData = () => {
  const activeMenu = ref('');

  const getDefaultMenu = (menuTree: Record<string, any>[]) => {
    if (menuTree.length === 0) {
      return null;
    }
    let stack = [menuTree[0]];
    while (stack.length) {
      const current = stack[0];
      const children = current?.children ?? [];
      if (children.length > 0) {
        stack = [children[0]];
      } else {
        return current;
      }
    }
    return null;
  };

  const addWatch = () => {
    watch(
      router.currentRoute,
      (route) => {
        // 没有路由默认展示第一个路由
				if (route.path === '/') {
          const defaultMenu = getDefaultMenu(menuCache.value ?? []);
          if (defaultMenu) {
            activeMenu.value = (defaultMenu.meta?.menuAlive ?? '') as string;
            router.push({ path: defaultMenu.router });
          } else {
            activeMenu.value = '';
          }
        } else {
          activeMenu.value = (route.meta?.menuAlive ?? '') as string;
					if(location.pathname!==route.href){
						history.replaceState({}, '', route.href);
					}
				}
      },
      { immediate: true },
    );
  };

  addWatch();

  return { menuList: menuCache, activeMenu };
};
