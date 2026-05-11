import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useWhiteList } from './whiteList';
import { validateRouter, correctRouterName } from './routerUtil';
import { registerRoutes } from './routeInfo';
import type { Router, RouteLocationNormalized } from './type';

const updateHtmlElement = (name: string) => {
  const htmlElement = document.getElementsByTagName('html')[0];
  htmlElement.setAttribute('data-route-name', name);
};

export const useRouterGuard = (router: Router) => {
  NProgress.configure({ showSpinner: false });

  const { validateWhiteList } = useWhiteList();

  router.beforeEach(async (to: RouteLocationNormalized, _: RouteLocationNormalized, next: any) => {
    NProgress.start();
    await registerRoutes(router);

    let resolvedName = to.name as string | undefined;
    if (!resolvedName) {
      resolvedName = correctRouterName(to.path) as string;
    }

    if (validateWhiteList(resolvedName)) {
      next();
      return;
    }

    if (resolvedName !== 'home' && !validateRouter(resolvedName)) {
      next('/');
      return;
    }

    if (!to.name && resolvedName) {
      next({ name: resolvedName });
      return;
    }

    if (resolvedName) {
      updateHtmlElement(resolvedName);
    }

    next();
  });

  router.afterEach(() => {
    NProgress.done();
  });
};
