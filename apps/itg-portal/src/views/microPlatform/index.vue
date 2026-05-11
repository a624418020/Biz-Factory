<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Oun from '@/views/microPlatform/oun.vue';
import { useMicroAppStore } from '@/stores/microAppStore';
import type { MicroAppRegistryItem } from '@/microAppRegistry';
import StudioHeader from '@biz/common/components/global/studioHeader/index.vue';

const props = defineProps<{
  platformCode?: string;
}>();

const route = useRoute();
const router = useRouter();
const store = useMicroAppStore();

store.initializeRegistry();

const resolvedPlatformCode = computed(
  () => props.platformCode || String(route.name || route.params.platformCode || ''),
);
const appData = computed(() => store.microAppList[resolvedPlatformCode.value] || null);
const microApps = computed(() => store.microApps);

watch(
  resolvedPlatformCode,
  (platformCode) => {
    if (platformCode) {
      store.setActivated(platformCode);
    }
  },
  { immediate: true },
);

const title = computed(() => appData.value?.title || '基座工作台');

const goHome = () => {
  router.push('/home');
};

const openMicroApp = (item: MicroAppRegistryItem) => {
  store.setActivated(item.platformCode);
  router.push(`${item.basePath}${item.defaultRoute}`);
};
</script>

<template>
  <div v-if="appData" class="host-shell">
    <StudioHeader class="host-shell__header" :title="title">
      <div class="host-shell__header-actions">
        <div class="host-shell__switcher">
          <button
            v-for="item in microApps"
            :key="item.platformCode"
            class="switch-chip"
            :class="{ active: item.platformCode === resolvedPlatformCode }"
            @click="openMicroApp(item)"
          >
            {{ item.title }}
          </button>
        </div>
        <el-button plain size="small" @click="goHome">返回基座首页</el-button>
      </div>
    </StudioHeader>

    <div class="host-shell__body">
      <section class="host-shell__stage">
        <Oun :app-data="appData" />
      </section>
    </div>
  </div>

  <div v-else class="empty-view">未找到对应的微应用配置。</div>
</template>

<style scoped lang="scss">
.host-shell {
  --host-shell-header-height: 48px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fbff 0%, #edf4ff 42%, #f7faff 100%);
}

.host-shell__header {
  height: var(--host-shell-header-height);
  flex-shrink: 0;
}

.host-shell__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.host-shell__switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.host-shell__body {
  height: calc(100vh - var(--host-shell-header-height));
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.switch-chip {
  height: 28px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  color: #334155;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    color 0.18s ease;
}

.switch-chip:hover {
  background: rgba(255, 255, 255, 0.92);
}

.switch-chip.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow:
    0 6px 18px rgba(148, 163, 184, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  transform: translateY(-1px);
}

.host-shell__stage {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 4px;
  background: transparent;
}

.empty-view {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  background: #f8fafc;
}

@media (max-width: 960px) {
  .host-shell__header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
