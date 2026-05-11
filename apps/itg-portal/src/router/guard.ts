import type { Router } from 'vue-router';
import { useWhiteList } from './whiteList';
import { MICRO_APP_REGISTRY } from '@/microAppRegistry';
import { useMicroAppStore } from '@/stores/microAppStore';

const { validateWhiteList } = useWhiteList();

let routesRegistered = false;

const registerMicroAppRoutes = (router: Router) => {
  if (routesRegistered) {
    return;
  }

  MICRO_APP_REGISTRY.forEach((item) => {
    if (router.hasRoute(item.platformCode)) {
      return;
    }

    router.addRoute({
      path: `${item.basePath}/:page(.*)*`,
      name: item.platformCode,
      component: () => import('@/views/microPlatform/index.vue'),
      props: {
        platformCode: item.platformCode,
      },
      meta: {
        requiresAuth: true,
        title: item.title,
      },
    });
  });

  routesRegistered = true;
};

export const useRouterGuard = (router: Router) => {
  registerMicroAppRoutes(router);

  router.beforeEach((to, _, next) => {
    if (validateWhiteList(String(to.name || ''))) {
      next();
      return;
    }

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      next('/login');
      return;
    }

    const store = useMicroAppStore();
    store.initializeRegistry();

    if (typeof to.name === 'string' && store.microAppList[to.name]) {
      store.setActivated(to.name);
    }

    next();
  });
};
