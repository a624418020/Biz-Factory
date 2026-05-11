<template>
  <div class="page-micro-view">
    <micro-app
      ref="microAppRef"
      style="width: 100%; height: 100%"
      :name="appData.name"
      :url="url"
      :baseroute="baseRoute"
      router-mode="native"
      :iframe-src="iframeSrc"
      iframe
      @mounted="onMountedApp"
      @error="onError"
    />
  </div>
  <div ref="loadingRef" class="loading-view" />
  <div v-if="errorInfo" class="error-view">
    <div>{{ errorInfo.message }}</div>
    <div>{{ errorInfo.name }}</div>
    <div>{{ errorInfo.platformUrl }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElLoading } from 'element-plus';
import type { MicroAppRegistryItem } from '@/microAppRegistry';

interface ErrorInfo {
  name: string;
  message: string;
  platformUrl: string;
}

const props = defineProps<{
  appData: MicroAppRegistryItem;
}>();

const microAppRef = ref();
const loadingRef = ref<HTMLElement | null>(null);
const loading = ref<ReturnType<typeof ElLoading.service> | null>(null);
const errorInfo = ref<ErrorInfo | null>(null);

const iframeSrc = `${location.origin}${import.meta.env.BASE_URL}empty.html`;
const baseRoute = computed(() => `${import.meta.env.BASE_URL}${props.appData.platformCode}/`);
const url = computed(() => props.appData.platformUrl);

const readSharedValue = (key: string) => sessionStorage.getItem(key) || localStorage.getItem(key) || '';

const syncSharedSession = () => {
  const token = readSharedValue('token');
  const userInfo = readSharedValue('userInfo');

  if (token) {
    sessionStorage.setItem('token', token);
  }
  if (userInfo) {
    sessionStorage.setItem('userInfo', userInfo);
  }

  sessionStorage.setItem('platformCode', props.appData.platformCode);
  sessionStorage.setItem('platform', JSON.stringify(props.appData));
  sessionStorage.setItem('localRoute', '0');
};

watch(
  () => props.appData,
  () => {
    syncSharedSession();
    errorInfo.value = null;
  },
  { immediate: true, deep: true },
);

const closeLoading = () => {
  if (loading.value) {
    loading.value.close();
    loading.value = null;
  }
  if (loadingRef.value) {
    loadingRef.value.style.display = 'none';
  }
};

const onMountedApp = () => {
  closeLoading();
};

const onError = (event: any) => {
  closeLoading();
  const errorName = String(event?.detail?.error || event?.detail || 'Micro app load error');
  errorInfo.value = {
    name: errorName,
    message: errorName.includes('Failed to fetch')
      ? '无法访问该微应用，请检查本地地址或服务状态。'
      : '微应用加载失败。',
    platformUrl: props.appData.platformUrl,
  };
};

onMounted(() => {
  if (loadingRef.value) {
    loading.value = ElLoading.service({
      target: loadingRef.value,
      lock: true,
      text: '加载中...',
      background: 'rgba(0, 0, 0, 0.3)',
    });
  }
});

onBeforeUnmount(() => {
  closeLoading();
});
</script>

<style scoped lang="scss">
.page-micro-view {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.page-micro-view :deep(micro-app) {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.page-micro-view :deep(.micro-app-body),
.page-micro-view :deep(.micro-app-container),
.page-micro-view :deep(.micro-app-slot),
.page-micro-view :deep(.micro-app-iframe),
.page-micro-view :deep(.micro-app-page) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.page-micro-view :deep(micro-app iframe) {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
}

.loading-view {
  position: fixed;
  inset: 0;
}

.error-view {
  position: fixed;
  left: 24px;
  right: 24px;
  bottom: 24px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.24);
}
</style>
