import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createLocalAppRunnerPlugin } from '../../scripts/app-runtime/local-app-runner-plugin.mjs';
import { createManifestStore } from '../../scripts/app-runtime/manifest-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = fileURLToPath(new URL('.', import.meta.url));
const assemblyAppRoot = path.resolve(appRoot, '../assembly-portal');
const runnerTempDir = path.resolve(appRoot, '.app-runner');
const manifestStore = createManifestStore();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: env.VITE_APP_BASE_PATH || '/uoc-portal/',
    plugins: [
      vue(),
      createLocalAppRunnerPlugin({
        appRoot,
        runnerTempDir,
        defaultBaseName: 'uoc-portal',
        resolveTargetAppRoot: (app: any) => (app?.appType === 'standalone' ? assemblyAppRoot : appRoot),
        manifestStore,
      }),
    ],
    resolve: {
      alias: {
        '@/api': path.resolve(__dirname, 'src/api'),
        '@biz/common': path.resolve(__dirname, '../../packages/common'),
        '@itg': path.resolve(__dirname, '../itg-portal/src'),
        'element-plus': path.resolve(__dirname, 'node_modules/element-plus'),
        '@element-plus/icons-vue': path.resolve(__dirname, 'node_modules/@element-plus/icons-vue'),
        vue: path.resolve(__dirname, 'node_modules/vue'),
        'vue-router': path.resolve(__dirname, 'node_modules/vue-router'),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 8081,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/api/runtime': {
          target: 'http://127.0.0.1:8099',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: env.VITE_APP_BASEURL_ROOT,
          changeOrigin: true,
          secure: false,
        },
        '/hdmap-service': {
          target: env.VITE_APP_BASEURL_ROOT,
          changeOrigin: true,
          secure: false,
        },
        '/geoserver': {
          target: env.VITE_APP_GEOSERVER_URL || env.VITE_APP_BASEURL_ROOT || 'http://127.0.0.1:8080/geoserver',
          changeOrigin: true,
          secure: false,
          rewrite: (proxyPath: string) => proxyPath.replace(/^\/geoserver/, ''),
        },
        '/bucket-': {
          target: env.VITE_APP_BASEURL_ROOT,
          changeOrigin: true,
          secure: false,
        },
        '/tileserver': {
          target: env.VITE_APP_BASEURL_ROOT,
          changeOrigin: true,
          secure: false,
        },
        '/WS': {
          target: env.VITE_APP_BASEURL_WEBSOCKET,
          ws: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('mapbox-gl')) {
              return 'mapbox-gl';
            }

            if (id.includes('echarts')) {
              return 'echarts';
            }

            if (id.includes('element-plus') || id.includes('@element-plus')) {
              return 'element-plus';
            }

            if (id.includes('vue-router') || id.includes('/vue/')) {
              return 'vue-core';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
