<template>
  <el-sub-menu v-if="hasChildren" :index="branchIndex">
    <template #title>
      <el-icon v-if="iconComponent">
        <component :is="iconComponent" />
      </el-icon>
      <el-icon v-else-if="iconName" :class="['iconfont-nav', iconName]"></el-icon>
      <span>{{ item.text }}</span>
    </template>
    <StudioSidebarItem
      v-for="child in item.children"
      :key="child.id || child.name || child.router"
      :item="child"
    />
  </el-sub-menu>

  <el-menu-item v-else :index="leafIndex" @click="handleClick">
    <el-icon v-if="iconComponent">
      <component :is="iconComponent" />
    </el-icon>
    <el-icon v-else-if="iconName" :class="['iconfont-nav', iconName]"></el-icon>
    <span>{{ item.text }}</span>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Dish } from '@element-plus/icons-vue';

defineOptions({ name: 'StudioSidebarItem' });

const props = defineProps<{
  item: Record<string, any>;
}>();

const router = useRouter();
const hasChildren = computed(() => Array.isArray(props.item?.children) && props.item.children.length > 0);
const iconName = computed(() => props.item?.meta?.iconName || props.item?.iconName || '');
const iconComponentMap = {
  Dish,
} as const;
const iconComponentName = computed(() => String(props.item?.meta?.iconComponent || props.item?.iconComponent || '').trim());
const iconComponent = computed(() => {
  const name = iconComponentName.value as keyof typeof iconComponentMap;
  return name ? iconComponentMap[name] : null;
});
const leafIndex = computed(() => props.item?.router || props.item?.name || props.item?.id || '');
const branchIndex = computed(() => props.item?.name || props.item?.id || props.item?.router || '');

const handleClick = () => {
  const target = String(props.item?.router || '').trim();
  if (!target) return;
  router.push(target.startsWith('/') ? target : `/${target}`);
};
</script>
