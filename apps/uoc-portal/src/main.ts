import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

let app: any = null;

function mount() {
  app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(ElementPlus, { locale: zhCn });

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }

  app.mount('#uoc-sub-app');
}

function unmount() {
  if (app) {
    app.unmount();
    app = null;
  }
}

if (window.__MICRO_APP_ENVIRONMENT__) {
  // @ts-ignore
  window[`micro-app-${window.__MICRO_APP_NAME__}`] = { mount, unmount };
} else {
  mount();
}
