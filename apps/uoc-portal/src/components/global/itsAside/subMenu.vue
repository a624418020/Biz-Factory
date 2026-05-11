<template>
  <!-- 有子菜单 -->
  <el-sub-menu :index="name" v-if="children?.length > 0">
    <template #title>
      <el-icon :class="['iconfont-nav', iconName]"></el-icon>
      <span>{{ label }}</span>
    </template>
    <template v-for="item in children" :key="item.id">
      <SubMenu
        :name="item.name"
        :label="item.text"
        :path="item.router"
        :iconName="item.meta?.iconName"
        :children="item.children ?? []"
      />
    </template>
  </el-sub-menu>

  <!-- 没有子菜单 -->
  <el-menu-item :index="name" v-else @click="routerChange(path)">
    <el-icon :class="['iconfont-nav', iconName]"></el-icon>
    <span>{{ label }}</span>
  </el-menu-item>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import SubMenu from './subMenu.vue';

interface ISubMenu {
  label: string;
  name: string;
  path: string;
  iconName?: string;
  children?: Record<string, any>[];
}

withDefaults(defineProps<ISubMenu>(), {
  children: () => [],
});

const router = useRouter();
const routerChange = (path: string) => {
  if (path.startsWith('/')) {
    router.push({ path });
  } else {
    router.push({ path: '/' + path });
  }
};
</script>
<style lang="scss" scoped>
@use './style/index.scss';
</style>
