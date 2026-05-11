import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createLocalAppRunnerPlugin } from '../../scripts/app-runtime/local-app-runner-plugin.mjs';
import { createManifestStore } from '../../scripts/app-runtime/manifest-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = fileURLToPath(new URL('.', import.meta.url));
const uocAppRoot = path.resolve(appRoot, '../uoc-portal');
const runnerTempDir = path.resolve(appRoot, '.app-runner');
const manifestStore = createManifestStore();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: env.VITE_APP_BASE_PATH || '/assembly-portal/',
    plugins: [
      vue(),
      createLocalAppRunnerPlugin({
        appRoot,
        runnerTempDir,
        defaultBaseName: 'assembly-portal',
        resolveTargetAppRoot: (app: any) => (app?.appType === 'micro' ? uocAppRoot : appRoot),
        manifestStore,
      }),
    ],
    resolve: {
      alias: {
        '@/api': path.resolve(__dirname, 'src/api'),
        '@biz/common': path.resolve(__dirname, '../../packages/common'),
        'element-plus': path.resolve(__dirname, 'node_modules/element-plus'),
        '@element-plus/icons-vue': path.resolve(__dirname, 'node_modules/@element-plus/icons-vue'),
        vue: path.resolve(__dirname, 'node_modules/vue'),
        'vue-router': path.resolve(__dirname, 'node_modules/vue-router'),
        '@itg': path.resolve(__dirname, '../itg-portal/src'),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 8082,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/api/runtime': {
          target: 'http://127.0.0.1:8099',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
