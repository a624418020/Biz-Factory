import { createRouter, createWebHistory } from 'vue-router';
import { getBaseRoute } from './routeInfo';
import { useRouterGuard } from './guard';

const router = createRouter({
  history: createWebHistory(window.__MICRO_APP_BASE_ROUTE__ || import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 };
  },
  routes: getBaseRoute(),
});

// 路由守卫
useRouterGuard(router);

export default router;
