<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { type MenuProps } from 'element-plus';
import StudioSidebar from '@biz/common/components/global/studioSidebar/index.vue';
import { useData } from './useData';

interface ItsAsideProps {
  subtitle: string;
  width?: string;
  remainProps?: MenuProps;
}

withDefaults(defineProps<ItsAsideProps>(), {
  subtitle: '',
  width: '220px',
});

const route = useRoute();
const { menuList } = useData();
const activePath = computed(() => route.path);
</script>

<template>
  <StudioSidebar :menus="menuList || []" :active-path="activePath" title="导航" />
</template>
