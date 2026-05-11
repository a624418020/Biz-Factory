import type { RouteRecordRaw } from 'vue-router';
import type { Router, RouteLocationNormalized } from 'vue-router';

type RouteRaw = RouteRecordRaw & Record<string, any>;

interface Meta {
  menuAlive: string;
  iconName?: string;
  iconComponent?: string;
  title?: string;
  hide?: boolean;
  [propName: string]: any;
}
interface Menu {
  name: string;
  text: string;
  router: string;
  meta: Meta;
  children?: Menu[];
}

export type { RouteRaw, RouteRecordRaw, Router, RouteLocationNormalized, Meta, Menu };
