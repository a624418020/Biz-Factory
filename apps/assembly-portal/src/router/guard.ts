import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useWhiteList } from './whiteList';
import { validateRouter, correctRouterName } from './routerUtil';
import { registerRoutes } from './routeInfo';
import type { Router, RouteLocationNormalized } from './type';

const toLogin = () => {
  const baseUrl = String(import.meta.env.BASE_URL || '/');
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  window.location.href = `${normalizedBase || ''}/login`;
};

const updateHtmlElement = (name: string) => {
  const htmlElement = document.getElementsByTagName('html')[0];
  htmlElement.setAttribute('data-route-name', name);
};

const getToken = () => sessionStorage.getItem('token') || window.diyLocalStorage?.getItem('token');

export const useRouterGuard = (router: Router) => {
  NProgress.configure({ showSpinner: false });

  const { validateWhiteList } = useWhiteList();

  router.beforeEach(async (to: RouteLocationNormalized, _: RouteLocationNormalized, next: any) => {
    NProgress.start();
    await registerRoutes(router);

    let noMatchedTag = false;
    if (!to.name) {
      noMatchedTag = true;
      to.name = correctRouterName(to.path);
    }

    if (validateWhiteList(to.name as string)) {
      if (to.name === 'login' && getToken()) {
        next('/');
      } else {
        next();
      }
      return;
    }

    const token = getToken();
    if (!token) {
      toLogin();
      return;
    }

    if (validateRouter(to.name as string) === false && to.name !== 'home') {
      next('/');
      return;
    }

    if (noMatchedTag) {
      next({ name: to.name });
    } else {
      next();
    }

    updateHtmlElement(to.name as string);
  });

  router.afterEach(() => {
    NProgress.done();
  });
};
