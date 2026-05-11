<script setup lang="ts">
import { RouterView } from 'vue-router';
import AssemblyHeader from '@/components/AssemblyHeader.vue';
import ItsAside from '@/components/global/itsAside/index.vue';
</script>

<template>
  <div class="assembly-shell">
    <AssemblyHeader class="assembly-shell__header" />

    <div class="assembly-shell__body">
      <ItsAside class="assembly-shell__aside" />

      <main class="assembly-shell__main">
        <section class="assembly-shell__content">
          <RouterView />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.assembly-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fbff 0%, #edf4ff 42%, #f7faff 100%);
}

.assembly-shell__header {
  flex-shrink: 0;
}

.assembly-shell__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  padding-top: 4px;
}

.assembly-shell__aside {
  width: var(--sidebar-width, 216px);
  flex: 0 0 var(--sidebar-width, 216px);
  min-height: 0;
  transition: width 0.2s ease, flex-basis 0.2s ease;
}

.assembly-shell__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
	height: calc(100% - 16px);
  display: flex;
  flex-direction: column;
}

.assembly-shell__content {
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: none;
  border-top: none;
  border-right: none;
  background: transparent;
  box-shadow: none;
}

@media (max-width: 960px) {
  .assembly-shell__body {
    flex-direction: column;
  }

  .assembly-shell__aside {
    width: 100%;
    flex-basis: auto;
  }
}
</style>
