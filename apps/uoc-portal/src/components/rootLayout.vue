<template>
  <div class="uoc-layout">
    <ItsAside subtitle="子应用壳"></ItsAside>
    <main class="uoc-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import ItsAside from '@/components/global/itsAside/index.vue';
</script>

<style scoped lang="scss">
.uoc-layout {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  padding-top: 4px;
  box-sizing: border-box;
}

.uoc-layout :deep(.studio-sidebar) {
  width: var(--sidebar-width, 216px);
  flex: 0 0 var(--sidebar-width, 216px);
  min-height: 0;
  transition: width 0.2s ease, flex-basis 0.2s ease;
}

.uoc-layout__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 0;
	padding-bottom: 16px;
}

@media (max-width: 960px) {
  .uoc-layout {
    flex-direction: column;
  }
}
</style>
