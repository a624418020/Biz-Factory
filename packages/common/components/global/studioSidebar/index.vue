<template>
  <aside :class="['studio-sidebar', collapsed ? 'is-collapsed' : '']">
    <div class="studio-sidebar__panel">
      <div class="studio-sidebar__brand">
        <p v-if="eyebrow" class="studio-sidebar__eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="studio-sidebar__subtitle">{{ subtitle }}</p>
      </div>

      <el-scrollbar class="studio-sidebar__scroll">
        <el-menu
          :default-active="activePath"
          class="studio-sidebar__menu"
          popper-class="studio-sidebar__menu-popper"
          :collapse="collapsed"
          :unique-opened="true"
        >
          <StudioSidebarItem
            v-for="item in menus"
            :key="item.id || item.name || item.router"
            :item="item"
          />
        </el-menu>
      </el-scrollbar>

      <button
        class="studio-sidebar__toggle"
        type="button"
        :title="collapsed ? '展开菜单' : '收起菜单'"
        @click="collapsed = !collapsed"
      >
        <span class="studio-sidebar__toggle-icon">{{ collapsed ? '›' : '‹' }}</span>
        <span class="studio-sidebar__toggle-text">{{ collapsed ? '展开' : '收起' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StudioSidebarItem from './item.vue';

withDefaults(
  defineProps<{
    menus?: Record<string, any>[];
    activePath?: string;
    title?: string;
    subtitle?: string;
    eyebrow?: string;
  }>(),
  {
    menus: () => [],
    activePath: '',
    title: '导航',
    subtitle: '',
    eyebrow: '',
  },
);

const collapsed = ref(false);
const sidebarWidth = computed(() => (collapsed.value ? '72px' : '216px'));
</script>

<style scoped lang="scss">
.studio-sidebar {
  --sidebar-width: v-bind(sidebarWidth);
  width: var(--sidebar-width);
  height: calc(100% - 16px);
  display: flex;
  flex-direction: column;
  background: transparent;
  color: #0f172a;
  transition: width 0.2s ease;
}

.studio-sidebar__panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 0 4px 0 rgba(200, 201, 204, 0.5);
  overflow: hidden;
}

.studio-sidebar__brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 8px;
}

.studio-sidebar__eyebrow {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b8def;
}

.studio-sidebar__brand h1 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.studio-sidebar__subtitle {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.studio-sidebar__scroll {
  flex: 1;
  min-height: 0;
  padding: 0 0 6px;
}

.studio-sidebar__toggle {
  margin: 0;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: 0.2s ease;
}

.studio-sidebar__toggle:hover {
  background: rgba(255, 255, 255, 0.45);
  color: #2563eb;
}

.studio-sidebar__toggle-icon {
  font-size: 14px;
  line-height: 1;
}

.studio-sidebar__toggle-text {
  font-size: 11px;
}

:deep(.studio-sidebar__menu),
:deep(.studio-sidebar__menu ul),
:deep(.studio-sidebar__menu li) {
  list-style: none;
}

:deep(.studio-sidebar__menu) {
  --el-menu-item-height: 34px;
  --el-menu-sub-item-height: 34px;
  --el-menu-active-color: #2563eb;
  --el-menu-icon-width: 16px;
  --el-menu-base-level-padding: 14px;
  --el-menu-bg-color: transparent;
  border-right: none;
  background: transparent;
}

:deep(.studio-sidebar__menu:not(.el-menu--collapse)) {
  width: 100%;
}

:deep(.studio-sidebar__menu .el-sub-menu),
:deep(.studio-sidebar__menu .el-menu-item) {
  margin-bottom: 2px;
}

:deep(.studio-sidebar__menu .el-sub-menu__title),
:deep(.studio-sidebar__menu .el-menu-item) {
  position: relative;
  min-width: 0;
  height: 34px;
  border-radius: 6px;
  color: #334155;
  font-size: 13px;
  border: 1px solid transparent;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

:deep(.studio-sidebar__menu .el-sub-menu__title) {
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-weight: 600;
}

:deep(.studio-sidebar__menu .el-sub-menu__title:hover),
:deep(.studio-sidebar__menu .el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.58);
  border-color: transparent;
  color: #0f172a;
}

:deep(.studio-sidebar__menu .el-sub-menu.is-active > .el-sub-menu__title) {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.52);
  border-color: transparent;
}

:deep(.studio-sidebar__menu .el-menu) {
  padding-top: 2px;
  background: transparent;
}

:deep(.studio-sidebar__menu .el-menu-item) {
  color: #475569;
}

:deep(.studio-sidebar__menu .el-menu-item.is-active) {
  background: #ffffff;
  color: #0f172a;
  font-weight: 600;
  border-color: transparent;
}

:deep(.studio-sidebar__menu > .el-menu-item.is-active),
:deep(.studio-sidebar__menu > .el-sub-menu.is-active > .el-sub-menu__title) {
  box-shadow:
    0 6px 18px rgba(148, 163, 184, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  transform: translateX(2px);
}

:deep(.studio-sidebar__menu .el-menu .el-menu-item.is-active) {
  box-shadow: none;
  transform: translateX(2px);
  color: #2563eb;
}

:deep(.studio-sidebar__menu .el-menu .el-sub-menu.is-active > .el-sub-menu__title) {
  box-shadow: none;
  transform: translateX(2px);
  color: #2563eb;
}

:deep(.studio-sidebar__menu .el-sub-menu__icon-arrow) {
  right: 12px;
  margin-top: 0;
  color: #94a3b8;
}

:deep(.studio-sidebar__menu .el-icon) {
  width: 12px;
  height: 12px;
  margin-right: 6px;
  color: #94a3b8;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.studio-sidebar__menu .iconfont-nav) {
  font-size: 12px;
}

:deep(.studio-sidebar__menu .el-menu-item.is-active .el-icon),
:deep(.studio-sidebar__menu .el-menu-item.is-active .iconfont-nav),
:deep(.studio-sidebar__menu .el-sub-menu.is-active > .el-sub-menu__title .el-icon),
:deep(.studio-sidebar__menu .el-sub-menu.is-active > .el-sub-menu__title .iconfont-nav) {
  color: #64748b;
}

.is-collapsed .studio-sidebar__brand h1,
.is-collapsed .studio-sidebar__subtitle,
.is-collapsed .studio-sidebar__eyebrow,
.is-collapsed .studio-sidebar__toggle-text {
  display: none;
}

@media (max-width: 960px) {
  .studio-sidebar {
    width: 100%;
    min-height: auto;
  }
}
</style>

<style lang="scss">
.studio-sidebar__menu-popper {
  --el-menu-item-height: 30px;
  --el-menu-base-level-padding: 8px;
  --el-menu-active-color: #2563eb;
  border: none !important;

  &.el-popper {
    transform: translateX(4px);
  }

  .el-menu--popup {
    padding: 6px;
    min-width: 160px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }

  .el-sub-menu .el-sub-menu__title {
    padding-right: 20px;
  }

  .el-sub-menu.is-active {
    background: rgba(239, 244, 255, 0.75);

    > .el-sub-menu__title {
      color: #2563eb;
    }
  }

  .el-menu-item {
    margin-bottom: 2px;
    height: 30px;
    border-radius: 6px;
    color: #334155;

    &.is-active,
    &:hover {
      background: rgba(239, 244, 255, 0.9);
      color: #2563eb;
    }
  }
}
</style>
