<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMicroAppStore } from '@/stores/microAppStore';

const router = useRouter();
const store = useMicroAppStore();

store.initializeRegistry();

const microApps = computed(() => store.microApps);

const openMicroApp = (platformCode: string, defaultRoute: string) => {
  store.setActivated(platformCode);
  router.push(`/${platformCode}${defaultRoute}`);
};
</script>

<template>
  <div class="host-home">
    <section class="hero-card">
      <div>
        <p class="eyebrow">ITG Host</p>
        <h1>基座门户</h1>
        <p class="summary">
          基座只负责登录、门户、头部切换和微应用容器。子应用列表直接来自启用中的微应用 manifest。
        </p>
      </div>
      <el-tag type="primary" effect="dark">micro-app host</el-tag>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>可用子应用</h2>
          <p>仅展示 `enabled` 且 `appType = micro` 的应用。</p>
        </div>
      </div>

      <div v-if="microApps.length" class="app-list">
        <button
          v-for="item in microApps"
          :key="item.id"
          class="app-row"
          type="button"
          @click="openMicroApp(item.platformCode, item.defaultRoute)"
        >
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description || item.name }}</p>
          </div>
          <el-tag>{{ item.platformCode }}</el-tag>
        </button>
      </div>

      <el-empty v-else description="当前没有可切换的微应用" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.host-home {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.panel {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 44px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: 34px;
  color: #0f172a;
}

.summary,
.panel-header p,
.app-row p {
  color: #475569;
  line-height: 1.8;
}

.panel {
  padding: 24px;
}

.panel-header {
  margin-bottom: 16px;
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.app-row {
  width: 100%;
  border: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.app-row strong {
  color: #0f172a;
}

@media (max-width: 960px) {
  .hero-card,
  .app-row {
    flex-direction: column;
  }
}
</style>
