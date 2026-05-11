import { defineStore } from 'pinia';
import { MICRO_APP_MAP, MICRO_APP_REGISTRY, type MicroAppRegistryItem } from '@/microAppRegistry';

interface MicroAppState {
  activated: string;
  microAppList: Record<string, MicroAppRegistryItem>;
  initialized: boolean;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const useMicroAppStore = defineStore('microAppStore', {
  state: (): MicroAppState => ({
    activated: '',
    microAppList: {},
    initialized: false,
  }),
  actions: {
    initializeRegistry() {
      if (this.initialized) {
        return;
      }

      this.microAppList = Object.fromEntries(
        MICRO_APP_REGISTRY.map((item) => [item.platformCode, clone(item)]),
      );
      this.initialized = true;
    },
    setActivated(platformCode: string) {
      this.activated = platformCode;
    },
  },
  getters: {
    microApps(state) {
      return MICRO_APP_REGISTRY.map((item) => state.microAppList[item.platformCode] || item);
    },
    activeApp(state) {
      return state.microAppList[state.activated] || MICRO_APP_MAP[state.activated] || null;
    },
  },
});
