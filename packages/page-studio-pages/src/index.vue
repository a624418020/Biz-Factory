<template>
  <common-layout :form-model="searchForm" table-title="页面能力库" @search="handleSearch" @reset="handleReset">
    <template #search-form>
      <el-form-item label="页面名称" prop="text">
        <el-input v-model="searchForm.text" clearable placeholder="请输入页面名称" />
      </el-form-item>
      <el-form-item label="页面编码" prop="name">
        <el-input v-model="searchForm.name" clearable placeholder="请输入页面编码" />
      </el-form-item>
      <el-form-item label="所属中心" prop="center">
        <el-select v-model="searchForm.center" clearable placeholder="请选择所属中心" style="width: 180px">
          <el-option v-for="option in centerOptions" :key="option" :label="option" :value="option" />
        </el-select>
      </el-form-item>
      <el-form-item label="业务域" prop="businessDomain">
        <el-select
          v-model="searchForm.businessDomain"
          clearable
          filterable
          placeholder="请选择业务域"
          style="width: 180px"
        >
          <el-option v-for="option in domainOptions" :key="option" :label="option" :value="option" />
        </el-select>
      </el-form-item>
      <el-form-item label="页面分类" prop="pageCategory">
        <el-select v-model="searchForm.pageCategory" clearable placeholder="请选择页面分类" style="width: 180px">
          <el-option v-for="option in categoryOptions" :key="option" :label="option" :value="option" />
        </el-select>
      </el-form-item>
    </template>

    <template #operating-button>
      <el-button type="primary" @click="openCreate">新建页面</el-button>
      <el-button @click="handleResetStorage">从 manifest 重新加载</el-button>
    </template>

    <div class="summary-bar">
      <span>页面总数：{{ filteredPages.length }}</span>
      <span>中心数：{{ centerOptions.length }}</span>
      <span>已被菜单引用：{{ referencedPageIds.size }}</span>
      <span>新增页面时会根据页面编码和所属中心自动给出默认路由与组件路径。</span>
    </div>

    <el-table :data="filteredPages" border height="100%">
      <el-table-column prop="text" label="页面名称" min-width="170" />
      <el-table-column prop="center" label="所属中心" width="140" />
      <el-table-column prop="businessDomain" label="业务域" min-width="120" />
      <el-table-column prop="pageCategory" label="页面分类" width="110" />
      <el-table-column prop="source" label="来源" width="90" />
      <el-table-column prop="router" label="页面路由" min-width="220" />
      <el-table-column prop="component" label="组件路径" min-width="280" />
      <el-table-column label="引用菜单数" width="110" align="center">
        <template #default="{ row }">
          {{ pageReferenceCountMap.get(row.id) || 0 }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
            {{ row.status === 'enabled' ? '启用中' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="showReferenceMenus(row)">查看引用</el-button>
          <el-button link type="danger" @click="removePage(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </common-layout>

  <el-drawer v-model="drawerVisible" :title="editingId ? '编辑页面' : '新建页面'" size="760px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="页面名称" prop="text">
        <el-input v-model="form.text" placeholder="请输入页面名称" />
      </el-form-item>
      <el-form-item label="页面编码" prop="name">
        <el-input v-model="form.name" :disabled="Boolean(editingId)" placeholder="如 commandScreen" />
      </el-form-item>
      <el-form-item label="所属中心" prop="center">
        <el-input v-model="form.center" placeholder="如 Framework Core、Sample Solution、Shared Module" />
      </el-form-item>
      <el-form-item label="业务域" prop="businessDomain">
        <el-input v-model="form.businessDomain" placeholder="如 告警预警、系统配置、信息发布" />
      </el-form-item>
      <el-form-item label="页面分类" prop="pageCategory">
        <el-select v-model="form.pageCategory" placeholder="请选择页面分类">
          <el-option label="管理页" value="管理页" />
          <el-option label="列表页" value="列表页" />
          <el-option label="详情页" value="详情页" />
          <el-option label="配置页" value="配置页" />
          <el-option label="看板页" value="看板页" />
          <el-option label="统计页" value="统计页" />
          <el-option label="业务页" value="业务页" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-select v-model="form.source" placeholder="请选择来源">
          <el-option label="Framework Core" value="core" />
          <el-option label="Sample Solution" value="sample" />
          <el-option label="Hybrid Delivery" value="hybrid" />
        </el-select>
      </el-form-item>
      <el-form-item label="页面路由" prop="router">
        <el-input v-model="form.router" placeholder="默认根据页面编码和所属中心生成" />
      </el-form-item>
      <el-form-item label="组件路径" prop="component">
        <el-input v-model="form.component" placeholder="默认根据页面编码和所属中心生成" />
      </el-form-item>
      <el-form-item label="页面标题" prop="title">
        <el-input v-model="form.title" placeholder="用于浏览器标题或菜单展示" />
      </el-form-item>
      <el-form-item label="缓存标识" prop="menuAlive">
        <el-input v-model="form.menuAlive" placeholder="通常与页面编码保持一致" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio label="enabled">启用中</el-radio>
          <el-radio label="draft">草稿</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="页面说明" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="描述这个页面适合的场景" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存页面</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CommonLayout from '@biz/common/components/global/commonLayout/index.vue';
import {
  buildDefaultComponentPath,
  buildDefaultRoute,
} from '@biz/common/utils/page-defaults.js';
import {
  getMenuRecords,
  getPageRecords,
  invalidateRouteCache,
  refreshManifestRecords,
  savePageRecords,
} from '@/mock/routeData.js';

const createSearchForm = () => ({
  text: '',
  name: '',
  center: '',
  businessDomain: '',
  pageCategory: '',
});

const createDefaultForm = () => ({
  text: '',
  name: '',
  source: 'core',
  center: 'Framework Core',
  businessDomain: '',
  pageCategory: '业务页',
  router: '',
  component: '',
  title: '',
  menuAlive: '',
  status: 'enabled',
  description: '',
});

const searchForm = reactive(createSearchForm());
const drawerVisible = ref(false);
const formRef = ref();
const editingId = ref('');
const pages = ref(getPageRecords());
const menus = ref(getMenuRecords());
const form = ref(createDefaultForm());
const autoDerived = reactive({
  router: '',
  component: '',
  menuAlive: '',
});

const centerOptions = computed(() => [...new Set(pages.value.map((page) => page.center).filter(Boolean))]);
const domainOptions = computed(() => [...new Set(pages.value.map((page) => page.businessDomain).filter(Boolean))]);
const categoryOptions = computed(() => [...new Set(pages.value.map((page) => page.pageCategory).filter(Boolean))]);

const pageReferenceCountMap = computed(() => {
  const counts = new Map();
  menus.value.forEach((menu) => {
    if (menu.pageId) {
      counts.set(menu.pageId, (counts.get(menu.pageId) || 0) + 1);
    }
  });
  return counts;
});

const referencedPageIds = computed(() => new Set(menus.value.filter((menu) => menu.pageId).map((menu) => menu.pageId)));

const filteredPages = computed(() =>
  pages.value.filter((page) => {
    const textMatched = !searchForm.text || String(page.text || '').includes(searchForm.text);
    const nameMatched = !searchForm.name || String(page.name || '').includes(searchForm.name);
    const centerMatched = !searchForm.center || page.center === searchForm.center;
    const domainMatched = !searchForm.businessDomain || page.businessDomain === searchForm.businessDomain;
    const categoryMatched = !searchForm.pageCategory || page.pageCategory === searchForm.pageCategory;
    return textMatched && nameMatched && centerMatched && domainMatched && categoryMatched;
  }),
);

const rules = {
  text: [{ required: true, message: '请输入页面名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入页面编码', trigger: 'blur' }],
  center: [{ required: true, message: '请输入所属中心', trigger: 'blur' }],
  businessDomain: [{ required: true, message: '请输入业务域', trigger: 'blur' }],
  pageCategory: [{ required: true, message: '请选择页面分类', trigger: 'change' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
  router: [{ required: true, message: '请输入页面路由', trigger: 'blur' }],
  component: [{ required: true, message: '请输入组件路径', trigger: 'blur' }],
  title: [{ required: true, message: '请输入页面标题', trigger: 'blur' }],
};

const refreshData = () => {
  pages.value = getPageRecords();
  menus.value = getMenuRecords();
};

const handleSearch = () => refreshData();

const handleReset = () => {
  Object.assign(searchForm, createSearchForm());
  refreshData();
};

const handleResetStorage = async () => {
  const result = await refreshManifestRecords();
  pages.value = result.pages;
  menus.value = result.menus;
  ElMessage.success('页面能力库、导航方案、业务应用已从 manifest 重新加载。');
};

const syncDefaultFields = () => {
  if (editingId.value) {
    return;
  }

  const nextRoute = buildDefaultRoute(form.value.name, form.value.center);
  const nextComponent = buildDefaultComponentPath(form.value.name, form.value.center);
  const nextMenuAlive = form.value.name || '';

  if ((!form.value.router || form.value.router === autoDerived.router) && nextRoute) {
    form.value.router = nextRoute;
  }
  if ((!form.value.component || form.value.component === autoDerived.component) && nextComponent) {
    form.value.component = nextComponent;
  }
  if ((!form.value.menuAlive || form.value.menuAlive === autoDerived.menuAlive) && nextMenuAlive) {
    form.value.menuAlive = nextMenuAlive;
  }

  autoDerived.router = nextRoute;
  autoDerived.component = nextComponent;
  autoDerived.menuAlive = nextMenuAlive;
};

const openCreate = () => {
  editingId.value = '';
  form.value = createDefaultForm();
  autoDerived.router = '';
  autoDerived.component = '';
  autoDerived.menuAlive = '';
  drawerVisible.value = true;
};

const openEdit = (page) => {
  editingId.value = page.id;
  form.value = {
    text: page.text,
    name: page.name,
    source: page.source || 'core',
    center: page.center || 'Framework Core',
    businessDomain: page.businessDomain || '',
    pageCategory: page.pageCategory || '业务页',
    router: page.router || '',
    component: page.component || '',
    title: page.title || '',
    menuAlive: page.menuAlive || page.name,
    status: page.status || 'enabled',
    description: page.description || '',
  };
  autoDerived.router = page.router || '';
  autoDerived.component = page.component || '';
  autoDerived.menuAlive = page.menuAlive || page.name || '';
  drawerVisible.value = true;
};

const showReferenceMenus = (page) => {
  const names = menus.value
    .filter((menu) => menu.pageId === page.id)
    .map((menu) => `${menu.text}（${menu.router || menu.name}）`);

  if (!names.length) {
    ElMessage.info('当前页面还没有被任何菜单引用。');
    return;
  }

  ElMessageBox.alert(names.join('<br/>'), `${page.text} 的引用菜单`, {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '知道了',
  });
};

const removePage = async (page) => {
  const refCount = pageReferenceCountMap.value.get(page.id) || 0;
  if (refCount > 0) {
    ElMessage.warning('请先在导航方案里解除页面关联，再删除这个页面。');
    return;
  }

  await ElMessageBox.confirm(`确认删除页面“${page.text}”吗？`, '删除页面', {
    type: 'warning',
  });

  pages.value = pages.value.filter((item) => item.id !== page.id);
  savePageRecords(pages.value);
  invalidateRouteCache();
  ElMessage.success('页面已删除。');
};

const submit = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  const duplicated = pages.value.find((page) => page.name === form.value.name && page.id !== editingId.value);
  if (duplicated) {
    ElMessage.error('页面编码不能重复。');
    return;
  }

  const pageId = editingId.value || `page:${form.value.name}`;
  const payload = {
    id: pageId,
    text: form.value.text,
    name: form.value.name,
    source: form.value.source,
    center: form.value.center,
    businessDomain: form.value.businessDomain,
    pageCategory: form.value.pageCategory,
    router: form.value.router,
    component: form.value.component,
    title: form.value.title,
    menuAlive: form.value.menuAlive || form.value.name,
    description: form.value.description || '',
    status: form.value.status || 'enabled',
    hide: false,
    iconName: 'icon-menu2level',
    meta: {
      title: form.value.title,
      menuAlive: form.value.menuAlive || form.value.name,
      description: form.value.description || '',
      iconName: 'icon-menu2level',
    },
  };

  if (editingId.value) {
    pages.value = pages.value.map((page) => (page.id === editingId.value ? payload : page));
  } else {
    pages.value = [...pages.value, payload];
  }

  pages.value = savePageRecords(pages.value);
  invalidateRouteCache();
  drawerVisible.value = false;
  ElMessage.success('页面已保存。');
};

watch(
  () => [form.value.name, form.value.center],
  () => {
    syncDefaultFields();
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
