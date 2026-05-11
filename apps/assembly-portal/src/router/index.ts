import { createRouter, createWebHistory } from 'vue-router';
import { getBaseRoute } from './routeInfo';
import { useRouterGuard } from './guard';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 };
  },
  routes: getBaseRoute(),
});

useRouterGuard(router);

export default router;
