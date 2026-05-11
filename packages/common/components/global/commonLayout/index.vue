<template>
  <div class="layout__common-layout">
    <page-title v-if="showPageTitle" :title="pageTitleName" :back="back" />
    <slot name="tabs-slot"></slot>
    <div v-if="searchable" class="search-block">
      <el-form
        ref="formRef"
        class="search-form"
        inline
        :model="formModel"
        label-suffix=" :"
        :label-width="searchFormLabelWidth"
      >
        <slot name="search-form"></slot>
      </el-form>
      <div class="btn-wrap">
        <span
          v-if="showCollapse"
          class="collapse"
          :class="{ 'is-collapsed': collapse }"
          @click="collapseHandler"
        >
          {{ collapseTip }}
        </span>
        <el-button type="primary" :icon="Search" @click="handleSearch">{{ searchName }}</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">{{ refreshName }}</el-button>
        <slot name="search-button"></slot>
      </div>
    </div>
    <div class="table-content">
      <slot v-if="props.showTabs" name="table-tabs"></slot>
      <div v-if="props.showHeader" class="table-header">
        <span class="table-title"><slot name="table-title"></slot>{{ tableTitle }}</span>
        <div class="operating-button">
          <slot name="operating-button"></slot>
        </div>
      </div>
      <slot name="table-header"></slot>
      <div v-loading="contentLoading" class="content">
        <slot></slot>
      </div>
      <slot name="table-footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { Search, Refresh } from '@element-plus/icons-vue';
import { nextTick, ref } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  showPageTitle: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  loading: Boolean,
  contentLoading: Boolean,
  back: {
    type: Boolean,
    default: false,
  },
  formModel: {
    type: Object,
    default() {
      return {};
    },
  },
  searchFormLabelWidth: {
    type: String,
    default: 'auto',
  },
  tableTitle: {
    type: String,
    default: 'Basic Information',
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  searchName: {
    type: String,
    default: '查询',
  },
  refreshName: {
    type: String,
    default: '重置',
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  showTabs: {
    type: Boolean,
    default: false,
  },
  resetOnSearch: {
    type: Boolean,
    default: true,
  },
  showCollapse: Boolean,
  collapseTip: {
    type: String,
    default: 'Advanced',
  },
  collapse: Boolean,
});

const emits = defineEmits(['search', 'reset', 'update:collapse']);
const route = useRoute();
const pageTitleName = ref(props.title || route.meta.title);
const formRef = ref(null);

const handleSearch = () => {
  emits('search');
};

const handleRefresh = () => {
  formRef.value?.resetFields?.();
  emits('reset');
  if (props.resetOnSearch) {
    nextTick(() => {
      handleSearch();
    });
  }
};

const collapseHandler = () => {
  emits('update:collapse', !props.collapse);
};

defineExpose({
  handleRefresh,
});
</script>

<style lang="scss" scoped>
.layout__common-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.layout__common-layout > * + * {
  margin-top: 16px;
}

.search-block {
  display: flex;
  margin-top: 0;
  padding: 24px 24px 6px;
  justify-content: space-between;
  flex-shrink: 0;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 0 4px 0 rgba(200, 201, 204, 0.5);

  .search-form {
    flex: 1;
    overflow: hidden;
    white-space: normal;
  }

  .btn-wrap {
    flex-shrink: 0;

    .collapse {
      color: #3370ff;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      margin-right: 12px;

      &::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 5px;
        background-color: #3370ff;
        clip-path: polygon(50% 0, 100% 100%, 0 100%);
        transition: transform 0.1s ease;
      }

      &.is-collapsed::before {
        transform: rotate(180deg);
      }
    }
  }

  :deep(.el-form--inline) {
    .el-input,
    .el-select {
      width: 216px !important;
    }
  }
}

.table-content {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  gap: 16px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  padding: 16px 24px;
  box-shadow: 0 0 4px 0 rgba(200, 201, 204, 0.5);
  border-radius: 4px;

  .table-header {
    height: 32px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .table-title {
      font-size: 16px;
      color: #040814;
      line-height: 24px;
      flex-grow: 1;
    }
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    :deep(.el-pagination) {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;

      .el-pager {
        gap: 8px;
      }
    }
  }
}
</style>
