<template>
  <common-layout :form-model="searchForm" table-title="导航方案" @search="handleSearch" @reset="handleReset">
    <template #search-form>
      <el-form-item label="方案名称" prop="text">
        <el-input v-model="searchForm.text" clearable placeholder="请输入方案名称" />
      </el-form-item>
      <el-form-item label="方案编码" prop="name">
        <el-input v-model="searchForm.name" clearable placeholder="请输入方案编码" />
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-select v-model="searchForm.source" clearable placeholder="请选择来源" style="width: 220px">
          <el-option label="Framework Core" value="core" />
          <el-option label="Sample Solution" value="sample" />
          <el-option label="Hybrid Delivery" value="hybrid" />
        </el-select>
      </el-form-item>
    </template>

    <template #operating-button>
      <el-button type="primary" @click="openPlanCreate">新建方案</el-button>
      <el-button @click="handleResetStorage">从 manifest 重新加载</el-button>
    </template>

    <div class="summary-bar">
      <span>方案总数：{{ filteredPlans.length }}</span>
      <span>方案像图纸，负责组织菜单结构；页面能力库先分好中心和业务域，再让方案来挑选。</span>
    </div>

    <el-table :data="filteredPlans" border height="100%">
      <el-table-column prop="text" label="方案名称" min-width="180" />
      <el-table-column prop="name" label="方案编码" min-width="180" />
      <el-table-column prop="source" label="来源" width="90" />
      <el-table-column label="一级菜单数" width="110" align="center">
        <template #default="{ row }">
          {{ row.menuIds?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column label="总菜单数" width="100" align="center">
        <template #default="{ row }">
          {{ getPlanMenus(row).length }}
        </template>
      </el-table-column>
      <el-table-column label="页面数" width="90" align="center">
        <template #default="{ row }">
          {{ getPlanPageCount(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="方案说明" min-width="260" />
      <el-table-column label="操作" width="360" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPlanDetail(row)">编排方案</el-button>
          <el-button link type="primary" @click="openPlanEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="copyPlan(row)">复制</el-button>
          <el-button link type="danger" @click="removePlan(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </common-layout>

  <el-drawer v-model="planDrawerVisible" :title="planEditingId ? '编辑方案' : '新建方案'" size="680px">
    <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-width="100px">
      <el-form-item label="方案名称" prop="text">
        <el-input v-model="planForm.text" placeholder="请输入方案名称" />
      </el-form-item>
      <el-form-item label="方案编码" prop="name">
        <el-input v-model="planForm.name" :disabled="Boolean(planEditingId)" placeholder="如 leaderPlan" />
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-select v-model="planForm.source" placeholder="请选择来源">
          <el-option label="Framework Core" value="core" />
          <el-option label="Sample Solution" value="sample" />
          <el-option label="Hybrid Delivery" value="hybrid" />
        </el-select>
      </el-form-item>
      <el-form-item label="方案说明" prop="description">
        <el-input v-model="planForm.description" type="textarea" :rows="4" placeholder="描述这套导航方案适合什么场景" />
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-switch v-model="planForm.enabled" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="planDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPlan">保存方案</el-button>
      </div>
    </template>
  </el-drawer>

  <el-drawer v-model="detailVisible" :title="currentPlan ? `方案编排：${currentPlan.text}` : '方案编排'" size="1240px">
    <template v-if="currentPlan">
      <div class="detail-toolbar">
        <div class="detail-summary">
          <span>来源：{{ currentPlan.source.toUpperCase() }}</span>
          <span>一级菜单：{{ currentPlan.menuIds?.length || 0 }}</span>
          <span>总菜单：{{ planMenus.length }}</span>
          <span>页面：{{ getPlanPageCount(currentPlan) }}</span>
        </div>
        <div class="detail-actions">
          <el-button type="primary" @click="openMenuCreate()">新增顶级菜单</el-button>
          <el-button @click="openRootSelector">选择顶级菜单</el-button>
        </div>
      </div>

      <div class="detail-layout">
        <div class="tree-panel">
          <div class="panel-title">方案菜单树</div>
          <el-tree
            ref="treeRef"
            node-key="id"
            default-expand-all
            :data="planMenuTree"
            :props="{ label: 'label', children: 'children' }"
            @node-click="handleMenuNodeClick"
          />
        </div>

        <div class="content-panel">
          <div v-if="selectedMenu" class="menu-detail">
            <div class="panel-title">菜单节点</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="菜单名称">{{ selectedMenu.text }}</el-descriptions-item>
              <el-descriptions-item label="菜单编码">{{ selectedMenu.name }}</el-descriptions-item>
              <el-descriptions-item label="菜单路由">{{ selectedMenu.router || '--' }}</el-descriptions-item>
              <el-descriptions-item label="关联页面">{{ selectedPageLabel }}</el-descriptions-item>
            </el-descriptions>

            <div v-if="selectedPageRecord" class="page-hint-card">
              <div class="hint-title">当前关联页面</div>
              <div class="hint-grid">
                <span>所属中心：{{ selectedPageRecord.center }}</span>
                <span>业务域：{{ selectedPageRecord.businessDomain }}</span>
                <span>页面分类：{{ selectedPageRecord.pageCategory }}</span>
                <span>组件路径：{{ selectedPageRecord.component }}</span>
              </div>
            </div>

            <div class="menu-actions">
              <el-button type="primary" @click="openMenuCreate(selectedMenu)">新增子菜单</el-button>
              <el-button @click="openMenuEdit(selectedMenu)">编辑菜单</el-button>
              <el-button type="danger" @click="removeMenu(selectedMenu)">删除菜单</el-button>
            </div>

            <el-table :data="childMenus" border height="260px">
              <el-table-column prop="text" label="子菜单名称" min-width="160" />
              <el-table-column prop="router" label="路由" min-width="180" />
              <el-table-column label="关联页面" min-width="220">
                <template #default="{ row }">
                  {{ pageLabelMap.get(row.pageId) || '--' }}
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-empty v-else description="请先选择一个菜单节点" />
        </div>
      </div>
    </template>
  </el-drawer>

  <el-drawer v-model="menuDrawerVisible" :title="menuEditingId ? '编辑菜单' : '新增菜单'" size="760px">
    <el-form ref="menuFormRef" :model="menuForm" :rules="menuRules" label-width="100px">
      <el-form-item label="上级菜单">
        <el-select v-model="menuForm.parentId" clearable placeholder="不选则作为顶级菜单">
          <el-option label="顶级菜单" value="" />
          <el-option v-for="option in parentOptions" :key="option.id" :label="option.label" :value="option.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="菜单名称" prop="text">
        <el-input v-model="menuForm.text" placeholder="请输入菜单名称" />
      </el-form-item>
      <el-form-item label="菜单编码" prop="name">
        <el-input v-model="menuForm.name" :disabled="Boolean(menuEditingId)" placeholder="如 commandDashboard" />
      </el-form-item>
      <el-form-item label="菜单路由" prop="router">
        <el-input v-model="menuForm.router" placeholder="如 /command/dashboard" />
      </el-form-item>
      <el-form-item label="关联页面" prop="pageId">
        <div class="page-selector-entry">
          <div class="page-selector-value">
            <span class="page-name">{{ selectedPagePreview.text || '暂未关联页面' }}</span>
            <span class="page-meta">{{ selectedPagePreview.meta }}</span>
            <span class="page-hint">选择页面后会自动带出菜单名称、菜单编码、路由和图标。</span>
          </div>
          <div class="page-selector-actions">
            <el-button type="primary" @click="openPageSelector">选择页面</el-button>
            <el-button v-if="menuForm.pageId" @click="clearSelectedPage">清空</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="图标编码" prop="iconName">
        <el-input v-model="menuForm.iconName" placeholder="如 icon-menu2level" />
      </el-form-item>
      <el-form-item label="节点说明" prop="description">
        <el-input v-model="menuForm.description" type="textarea" :rows="4" placeholder="描述这个菜单节点的用途" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="menuDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMenu">保存菜单</el-button>
      </div>
    </template>
  </el-drawer>

  <el-dialog v-model="rootSelectorVisible" title="选择方案顶级菜单" width="720px">
    <el-checkbox-group v-model="selectedRootMenuIds" class="root-selector">
      <el-checkbox v-for="menu in rootMenuOptions" :key="menu.id" :label="menu.id">
        {{ menu.text }}（{{ menu.router || menu.name }}）
      </el-checkbox>
    </el-checkbox-group>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="rootSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRootMenus">保存方案菜单</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="pageSelectorVisible" title="选择关联页面" width="1180px" class="page-selector-dialog">
    <div class="page-selector-toolbar">
      <el-input v-model="pageSearch.keyword" clearable placeholder="搜索页面名称、编码、路由、组件路径" />
      <el-select v-model="pageSearch.center" clearable filterable placeholder="所属中心" style="width: 150px">
        <el-option v-for="option in centerOptions" :key="option" :label="option" :value="option" />
      </el-select>
      <el-select v-model="pageSearch.businessDomain" clearable filterable placeholder="业务域" style="width: 160px">
        <el-option v-for="option in domainOptions" :key="option" :label="option" :value="option" />
      </el-select>
      <el-select v-model="pageSearch.pageCategory" clearable placeholder="页面分类" style="width: 140px">
        <el-option v-for="option in categoryOptions" :key="option" :label="option" :value="option" />
      </el-select>
      <el-select v-model="pageSearch.sourceMode" placeholder="显示范围" style="width: 170px">
        <el-option label="全部页面" value="all" />
        <el-option :label="`仅当前方案来源（${currentPlan?.source?.toUpperCase() || 'UOC'}）`" value="current" />
      </el-select>
    </div>

    <div class="page-selector-layout">
      <div class="page-table-panel">
        <div class="page-table-summary">
          <span>可选页面：{{ filteredSelectablePages.length }}</span>
          <span>先筛中心和业务域，再选页面会更顺手。</span>
        </div>
        <el-table
          class="page-selector-table"
          :data="filteredSelectablePages"
          border
          highlight-current-row
          height="100%"
          @current-change="handlePageRowChange"
        >
        <el-table-column label="页面名称" min-width="180">
          <template #default="{ row }">
            <div class="page-cell">
              <span>{{ row.text }}</span>
              <el-tag size="small" effect="plain">{{ row.center }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="businessDomain" label="业务域" width="120" />
        <el-table-column prop="pageCategory" label="页面分类" width="110" />
        <el-table-column prop="source" label="来源" width="90" />
        <el-table-column prop="router" label="路由" min-width="180" />
        </el-table>
      </div>

      <div class="page-preview">
        <div class="panel-title">页面预览信息</div>
        <div v-if="pageSelectionPreview" class="page-preview-body">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="页面名称">{{ pageSelectionPreview.text }}</el-descriptions-item>
            <el-descriptions-item label="页面编码">{{ pageSelectionPreview.name }}</el-descriptions-item>
            <el-descriptions-item label="所属中心">{{ pageSelectionPreview.center }}</el-descriptions-item>
            <el-descriptions-item label="业务域">{{ pageSelectionPreview.businessDomain }}</el-descriptions-item>
            <el-descriptions-item label="页面分类">{{ pageSelectionPreview.pageCategory }}</el-descriptions-item>
            <el-descriptions-item label="页面路由">{{ pageSelectionPreview.router }}</el-descriptions-item>
            <el-descriptions-item label="组件路径">{{ pageSelectionPreview.component }}</el-descriptions-item>
            <el-descriptions-item label="页面说明">
              {{ pageSelectionPreview.description || '暂无说明' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-empty v-else description="先从左侧选一个页面" />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="pageSelectorVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!pageSelectionPreview" @click="confirmPageSelection">确认关联</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CommonLayout from '@biz/common/components/global/commonLayout/index.vue';
import {
  collectPageIdsByMenuIds,
  getAppRecords,
  getMenuDescendantIds,
  getMenuRecords,
  getPageRecords,
  getPlanMenuIds,
  getPlanMenuTree as buildPlanMenuTree,
  getPlanRecords,
  invalidateRouteCache,
  refreshManifestRecords,
  saveAppRecords,
  saveMenuRecords,
  savePlanRecords,
} from '@/mock/routeData.js';

const createSearchForm = () => ({
  text: '',
  name: '',
  source: '',
});

const createPlanForm = () => ({
  text: '',
  name: '',
  source: 'core',
  description: '',
  enabled: true,
});

const createMenuForm = () => ({
  parentId: '',
  text: '',
  name: '',
  router: '',
  pageId: '',
  iconName: 'icon-menu2level',
  description: '',
});

const createPageSearch = () => ({
  keyword: '',
  center: '',
  businessDomain: '',
  pageCategory: '',
  sourceMode: 'all',
});

const searchForm = reactive(createSearchForm());
const plans = ref(getPlanRecords());
const menus = ref(getMenuRecords());
const pages = ref(getPageRecords());
const apps = ref(getAppRecords());

const planDrawerVisible = ref(false);
const menuDrawerVisible = ref(false);
const detailVisible = ref(false);
const rootSelectorVisible = ref(false);
const pageSelectorVisible = ref(false);

const planFormRef = ref();
const menuFormRef = ref();
const treeRef = ref();

const planEditingId = ref('');
const menuEditingId = ref('');
const currentPlanId = ref('');
const selectedMenuId = ref('');
const selectedPageCandidateId = ref('');

const planForm = ref(createPlanForm());
const menuForm = ref(createMenuForm());
const selectedRootMenuIds = ref([]);
const pageSearch = reactive(createPageSearch());

const filteredPlans = computed(() =>
  plans.value.filter((plan) => {
    const textMatched = !searchForm.text || String(plan.text || '').includes(searchForm.text);
    const nameMatched = !searchForm.name || String(plan.name || '').includes(searchForm.name);
    const sourceMatched = !searchForm.source || plan.source === searchForm.source;
    return textMatched && nameMatched && sourceMatched;
  }),
);

const currentPlan = computed(() => plans.value.find((plan) => plan.id === currentPlanId.value) || null);
const pageMap = computed(() => new Map(pages.value.map((page) => [page.id, page])));
const pageLabelMap = computed(
  () =>
    new Map(
      pages.value.map((page) => [
        page.id,
        `${page.text} / ${page.center || '--'} / ${page.businessDomain || '--'}`,
      ]),
    ),
);

const centerOptions = computed(() => [...new Set(pages.value.map((page) => page.center).filter(Boolean))]);
const domainOptions = computed(() => [...new Set(pages.value.map((page) => page.businessDomain).filter(Boolean))]);
const categoryOptions = computed(() => [...new Set(pages.value.map((page) => page.pageCategory).filter(Boolean))]);

const planMenus = computed(() => {
  if (!currentPlan.value) {
    return [];
  }
  const ids = new Set(getPlanMenuIds(currentPlan.value, menus.value));
  return menus.value.filter((menu) => ids.has(menu.id));
});

const planMenuTree = computed(() => {
  if (!currentPlan.value) {
    return [];
  }
  const appendLabel = (nodes) =>
    nodes.map((node) => ({
      ...node,
      label: node.text,
      children: node.children?.length ? appendLabel(node.children) : [],
    }));
  return appendLabel(buildPlanMenuTree(currentPlan.value, menus.value));
});

const selectedMenu = computed(() => planMenus.value.find((menu) => menu.id === selectedMenuId.value) || null);
const selectedPageRecord = computed(() => pageMap.value.get(selectedMenu.value?.pageId || '') || null);
const selectedPageLabel = computed(() => pageLabelMap.value.get(selectedMenu.value?.pageId || '') || '--');

const childMenus = computed(() => {
  if (!selectedMenu.value) {
    return [];
  }
  return planMenus.value.filter((menu) => menu.parentId === selectedMenu.value.id);
});

const rootMenuOptions = computed(() =>
  menus.value
    .filter((menu) => {
      if (menu.parentId) {
        return false;
      }
      if (currentPlan.value?.source === 'hybrid') {
        return true;
      }
      return menu.source === (currentPlan.value?.source || 'core');
    })
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0)),
);

const parentOptions = computed(() =>
  planMenus.value
    .filter((menu) => menu.id !== menuEditingId.value)
    .map((menu) => ({
      id: menu.id,
      label: `${menu.text} (${menu.router || menu.name})`,
    })),
);

const sortedSelectablePages = computed(() => {
  const currentSource = currentPlan.value?.source || 'core';
  return [...pages.value].sort((left, right) => {
    const leftScore = left.source === currentSource ? 0 : 1;
    const rightScore = right.source === currentSource ? 0 : 1;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return String(left.text || '').localeCompare(String(right.text || ''), 'zh-Hans-CN');
  });
});

const filteredSelectablePages = computed(() =>
  sortedSelectablePages.value.filter((page) => {
    const keyword = String(pageSearch.keyword || '').trim();
    const keywordMatched =
      !keyword ||
      [page.text, page.name, page.router, page.component]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(keyword.toLowerCase()));
    const centerMatched = !pageSearch.center || page.center === pageSearch.center;
    const domainMatched = !pageSearch.businessDomain || page.businessDomain === pageSearch.businessDomain;
    const categoryMatched = !pageSearch.pageCategory || page.pageCategory === pageSearch.pageCategory;
    const sourceMatched = pageSearch.sourceMode !== 'current' || page.source === (currentPlan.value?.source || 'core');
    return keywordMatched && centerMatched && domainMatched && categoryMatched && sourceMatched;
  }),
);

const pageSelectionPreview = computed(() => pageMap.value.get(selectedPageCandidateId.value) || null);

const selectedPagePreview = computed(() => {
  const page = pageMap.value.get(menuForm.value.pageId);
  if (!page) {
    return {
      text: '暂未关联页面',
      meta: '建议先按中心、业务域筛选后再挑选页面。',
    };
  }
  return {
    text: page.text,
    meta: `${page.center} / ${page.businessDomain} / ${page.pageCategory}`,
  };
});

const autoDerivedMenu = reactive({
  text: '',
  name: '',
  router: '',
  iconName: '',
  description: '',
});

const syncMenuDefaultsFromPage = (pageId) => {
  if (menuEditingId.value) {
    return;
  }

  const page = pageMap.value.get(pageId || '');
  if (!page) {
    return;
  }

  const nextText = page.text || '';
  const nextName = page.name || '';
  const nextRouter = page.router || '';
  const nextIconName = page.iconName || 'icon-menu2level';
  const nextDescription = page.description || '';

  if ((!menuForm.value.text || menuForm.value.text === autoDerivedMenu.text) && nextText) {
    menuForm.value.text = nextText;
  }
  if ((!menuForm.value.name || menuForm.value.name === autoDerivedMenu.name) && nextName) {
    menuForm.value.name = nextName;
  }
  if ((!menuForm.value.router || menuForm.value.router === autoDerivedMenu.router) && nextRouter) {
    menuForm.value.router = nextRouter;
  }
  if ((!menuForm.value.iconName || menuForm.value.iconName === autoDerivedMenu.iconName) && nextIconName) {
    menuForm.value.iconName = nextIconName;
  }
  if ((!menuForm.value.description || menuForm.value.description === autoDerivedMenu.description) && nextDescription) {
    menuForm.value.description = nextDescription;
  }

  autoDerivedMenu.text = nextText;
  autoDerivedMenu.name = nextName;
  autoDerivedMenu.router = nextRouter;
  autoDerivedMenu.iconName = nextIconName;
  autoDerivedMenu.description = nextDescription;
};

const planRules = {
  text: [{ required: true, message: '请输入方案名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入方案编码', trigger: 'blur' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
};

const menuRules = {
  text: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入菜单编码', trigger: 'blur' }],
};

const refreshData = () => {
  plans.value = getPlanRecords();
  menus.value = getMenuRecords();
  pages.value = getPageRecords();
  apps.value = getAppRecords();
};

const handleSearch = () => refreshData();

const handleReset = () => {
  Object.assign(searchForm, createSearchForm());
  refreshData();
};

const handleResetStorage = async () => {
  const result = await refreshManifestRecords();
  plans.value = result.plans;
  menus.value = result.menus;
  pages.value = result.pages;
  apps.value = result.apps;
  ElMessage.success('导航方案、业务应用、页面能力库已从 manifest 重新加载。');
};

const getPlanMenus = (plan) => {
  if (!plan) {
    return [];
  }
  const ids = new Set(getPlanMenuIds(plan, menus.value));
  return menus.value.filter((menu) => ids.has(menu.id));
};

const getPlanPageCount = (plan) => [...new Set(collectPageIdsByMenuIds(plan?.menuIds || [], menus.value))].length;

const openPlanCreate = () => {
  planEditingId.value = '';
  planForm.value = createPlanForm();
  planDrawerVisible.value = true;
};

const openPlanEdit = (plan) => {
  planEditingId.value = plan.id;
  planForm.value = {
    text: plan.text,
    name: plan.name,
    source: plan.source,
    description: plan.description || '',
    enabled: Boolean(plan.enabled),
  };
  planDrawerVisible.value = true;
};

const copyPlan = (plan) => {
  planEditingId.value = '';
  planForm.value = {
    text: `${plan.text}-副本`,
    name: `${plan.name}Copy`,
    source: plan.source,
    description: plan.description || '',
    enabled: Boolean(plan.enabled),
  };
  planDrawerVisible.value = true;
};

const submitPlan = async () => {
  const valid = await planFormRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  const duplicated = plans.value.find((plan) => plan.name === planForm.value.name && plan.id !== planEditingId.value);
  if (duplicated) {
    ElMessage.error('方案编码不能重复。');
    return;
  }

  const planId = planEditingId.value || `plan:${planForm.value.name}`;
  const current = plans.value.find((plan) => plan.id === planId);
  const payload = {
    id: planId,
    text: planForm.value.text,
    name: planForm.value.name,
    source: planForm.value.source,
    description: planForm.value.description || '',
    enabled: Boolean(planForm.value.enabled),
    menuIds: current?.menuIds || [],
  };

  if (planEditingId.value) {
    plans.value = plans.value.map((plan) => (plan.id === planId ? payload : plan));
  } else {
    plans.value = [...plans.value, payload];
  }

  savePlanRecords(plans.value);
  planDrawerVisible.value = false;
  ElMessage.success('导航方案已保存。');
};

const openPlanDetail = (plan) => {
  currentPlanId.value = plan.id;
  selectedMenuId.value = '';
  detailVisible.value = true;
  selectedMenuId.value = getPlanMenus(plan)[0]?.id || '';
};

const handleMenuNodeClick = (node) => {
  selectedMenuId.value = node.id;
};

const openMenuCreate = (parent = null) => {
  menuEditingId.value = '';
  menuForm.value = {
    ...createMenuForm(),
    parentId: parent?.id || '',
  };
  autoDerivedMenu.text = '';
  autoDerivedMenu.name = '';
  autoDerivedMenu.router = '';
  autoDerivedMenu.iconName = 'icon-menu2level';
  autoDerivedMenu.description = '';
  menuDrawerVisible.value = true;
};

const openMenuEdit = (menu) => {
  if (!menu) {
    return;
  }

  menuEditingId.value = menu.id;
  menuForm.value = {
    parentId: menu.parentId || '',
    text: menu.text,
    name: menu.name,
    router: menu.router || '',
    pageId: menu.pageId || '',
    iconName: menu.iconName || 'icon-menu2level',
    description: menu.description || '',
  };
  autoDerivedMenu.text = menu.text || '';
  autoDerivedMenu.name = menu.name || '';
  autoDerivedMenu.router = menu.router || '';
  autoDerivedMenu.iconName = menu.iconName || 'icon-menu2level';
  autoDerivedMenu.description = menu.description || '';
  menuDrawerVisible.value = true;
};

const ensureCurrentPlanIncludesMenu = (menuId, parentId = '') => {
  if (!currentPlan.value || parentId) {
    return;
  }
  if (currentPlan.value.menuIds.includes(menuId)) {
    return;
  }
  currentPlan.value.menuIds = [...currentPlan.value.menuIds, menuId];
  plans.value = plans.value.map((plan) => (plan.id === currentPlan.value.id ? { ...currentPlan.value } : plan));
  savePlanRecords(plans.value);
};

const keepPlanDetailContext = (menuId = '') => {
  if (!currentPlan.value) {
    return;
  }

  currentPlanId.value = currentPlan.value.id;
  detailVisible.value = true;
  selectedMenuId.value = menuId || selectedMenuId.value || getPlanMenus(currentPlan.value)[0]?.id || '';
};

const openPageSelector = () => {
  Object.assign(pageSearch, createPageSearch());
  selectedPageCandidateId.value = menuForm.value.pageId || filteredSelectablePages.value[0]?.id || '';
  pageSelectorVisible.value = true;
};

const handlePageRowChange = (row) => {
  selectedPageCandidateId.value = row?.id || '';
};

const confirmPageSelection = () => {
  if (!pageSelectionPreview.value) {
    return;
  }
  menuForm.value.pageId = pageSelectionPreview.value.id;
  syncMenuDefaultsFromPage(pageSelectionPreview.value.id);
  pageSelectorVisible.value = false;
};

const clearSelectedPage = () => {
  menuForm.value.pageId = '';
};

const sanitizeMenuIdPart = (value) => String(value || '').trim().replace(/[^a-zA-Z0-9:_-]+/g, '-');

const buildScopedMenuId = (planId, menuName) => {
  const normalizedPlanId = sanitizeMenuIdPart(String(planId || '').replace(/^plan:/, ''));
  const normalizedMenuName = sanitizeMenuIdPart(menuName);
  return `menu:${normalizedPlanId}:${normalizedMenuName}`;
};

watch(
  () => menuForm.value.pageId,
  (pageId) => {
    syncMenuDefaultsFromPage(pageId);
  },
);

const buildMenuSaveLog = (stage, extra = {}) => {
  const currentMenuName = String(menuForm.value.name || '').trim();
  const currentRouter = String(menuForm.value.router || '').trim();
  const currentPlanMenuRows = planMenus.value.filter((menu) => menu.id !== menuEditingId.value);
  const duplicateByName = currentPlanMenuRows
    .filter((menu) => menu.name === currentMenuName && menu.id !== menuEditingId.value)
    .map((menu) => ({
      id: menu.id,
      name: menu.name,
      text: menu.text,
      router: menu.router,
      parentId: menu.parentId,
      pageId: menu.pageId,
      source: menu.source,
    }));

  const duplicateByRouter = currentRouter
    ? currentPlanMenuRows
        .filter((menu) => menu.router === currentRouter && menu.id !== menuEditingId.value)
        .map((menu) => ({
          id: menu.id,
          name: menu.name,
          text: menu.text,
          router: menu.router,
          parentId: menu.parentId,
          pageId: menu.pageId,
          source: menu.source,
        }))
    : [];

  const globalDuplicateByName = menus.value
    .filter((menu) => menu.name === currentMenuName && menu.id !== menuEditingId.value)
    .map((menu) => ({
      id: menu.id,
      name: menu.name,
      text: menu.text,
      router: menu.router,
      parentId: menu.parentId,
      pageId: menu.pageId,
      source: menu.source,
    }));

  const globalDuplicateByRouter = currentRouter
    ? menus.value
        .filter((menu) => menu.router === currentRouter && menu.id !== menuEditingId.value)
        .map((menu) => ({
          id: menu.id,
          name: menu.name,
          text: menu.text,
          router: menu.router,
          parentId: menu.parentId,
          pageId: menu.pageId,
          source: menu.source,
        }))
    : [];

  // eslint-disable-next-line no-console
  console.log(`[menu-save:${stage}]`, {
    planId: currentPlan.value?.id || '',
    planName: currentPlan.value?.text || '',
    menuId: menuEditingId.value || menuForm.value.name || '',
    form: {
      parentId: menuForm.value.parentId || '',
      text: menuForm.value.text || '',
      name: currentMenuName,
      router: currentRouter,
      pageId: menuForm.value.pageId || '',
      iconName: menuForm.value.iconName || '',
      description: menuForm.value.description || '',
    },
    duplicates: {
      currentPlanByName: duplicateByName,
      currentPlanByRouter: duplicateByRouter,
      globalByName: globalDuplicateByName,
      globalByRouter: globalDuplicateByRouter,
    },
    totalMenus: menus.value.length,
    ...extra,
  });
};

const submitMenu = async () => {
  const valid = await menuFormRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  buildMenuSaveLog('validate');

  const duplicated = planMenus.value.find((menu) => menu.name === menuForm.value.name && menu.id !== menuEditingId.value);
  if (duplicated) {
    buildMenuSaveLog('duplicate-name', {
      conflictedMenu: {
        id: duplicated.id,
        name: duplicated.name,
        text: duplicated.text,
        router: duplicated.router,
        parentId: duplicated.parentId,
        pageId: duplicated.pageId,
        source: duplicated.source,
      },
    });
    ElMessage.error('菜单编码不能重复。');
    return;
  }

  const menuId = menuEditingId.value || buildScopedMenuId(currentPlan.value?.id || 'plan', menuForm.value.name);
  const existing = menus.value.find((menu) => menu.id === menuId);
  const siblingCount = menus.value.filter((menu) => menu.parentId === (menuForm.value.parentId || '')).length;
  const payload = {
    id: menuId,
    parentId: menuForm.value.parentId || '',
    source: currentPlan.value?.source || 'core',
    name: menuForm.value.name,
    text: menuForm.value.text,
    router: menuForm.value.router || '',
    pageId: menuForm.value.pageId || '',
    iconName: menuForm.value.iconName || 'icon-menu2level',
    title: menuForm.value.text,
    description: menuForm.value.description || '',
    hide: false,
    sort: existing?.sort ?? siblingCount,
    meta: {
      iconName: menuForm.value.iconName || 'icon-menu2level',
      title: menuForm.value.text,
      description: menuForm.value.description || '',
    },
  };

  buildMenuSaveLog('persist', {
    operation: menuEditingId.value ? 'update' : 'create',
    payload,
  });

  if (menuEditingId.value) {
    menus.value = menus.value.map((menu) => (menu.id === menuId ? payload : menu));
  } else {
    menus.value = [...menus.value, payload];
  }

  saveMenuRecords(menus.value);
  ensureCurrentPlanIncludesMenu(menuId, payload.parentId);
  invalidateRouteCache();
  keepPlanDetailContext(menuId);
  menuDrawerVisible.value = false;
  selectedMenuId.value = menuId;
  ElMessage.success('菜单已保存。');
};

const removeMenu = async (menu) => {
  if (!menu) {
    return;
  }

  await ElMessageBox.confirm(`确认删除菜单“${menu.text}”及其下级菜单吗？`, '删除菜单', {
    type: 'warning',
  });

  const deletedIds = getMenuDescendantIds(menu.id, menus.value);
  menus.value = menus.value.filter((item) => !deletedIds.includes(item.id));
  saveMenuRecords(menus.value);

  plans.value = plans.value.map((plan) => ({
    ...plan,
    menuIds: (plan.menuIds || []).filter((id) => !deletedIds.includes(id)),
  }));
  savePlanRecords(plans.value);

  apps.value = apps.value.map((app) => ({
    ...app,
    planId: plans.value.some((plan) => plan.id === app.planId) ? app.planId : '',
  }));
  saveAppRecords(apps.value);

  invalidateRouteCache();
  selectedMenuId.value = '';
  ElMessage.success('菜单已删除。');
};

const openRootSelector = () => {
  selectedRootMenuIds.value = [...(currentPlan.value?.menuIds || [])];
  rootSelectorVisible.value = true;
};

const saveRootMenus = () => {
  if (!currentPlan.value) {
    return;
  }

  plans.value = plans.value.map((plan) =>
    plan.id === currentPlan.value.id
      ? {
          ...plan,
          menuIds: [...selectedRootMenuIds.value],
        }
      : plan,
  );
  savePlanRecords(plans.value);
  rootSelectorVisible.value = false;
  selectedMenuId.value = selectedRootMenuIds.value[0] || '';
  ElMessage.success('方案菜单已更新。');
};

const removePlan = async (plan) => {
  const usedByApps = apps.value.filter((app) => app.planId === plan.id);
  if (usedByApps.length) {
    ElMessage.warning(`请先解除 ${usedByApps.length} 个业务应用对该方案的绑定，再删除。`);
    return;
  }

  await ElMessageBox.confirm(`确认删除方案“${plan.text}”吗？`, '删除方案', {
    type: 'warning',
  });

  plans.value = plans.value.filter((item) => item.id !== plan.id);
  savePlanRecords(plans.value);
  if (currentPlanId.value === plan.id) {
    detailVisible.value = false;
    currentPlanId.value = '';
    selectedMenuId.value = '';
  }
  ElMessage.success('方案已删除。');
};
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

.detail-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #606266;
}

.detail-actions {
  display: flex;
  gap: 12px;
}

.detail-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  min-height: 520px;
}

.tree-panel,
.content-panel,
.page-preview {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.tree-panel {
  padding: 16px;
}

.content-panel {
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.menu-actions {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}

.page-hint-card {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f6f8fb;
}

.hint-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.hint-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  color: #606266;
}

.page-selector-entry {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
}

.page-selector-value {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.page-name {
  color: #303133;
  font-weight: 500;
}

.page-meta {
  color: #909399;
  font-size: 13px;
  word-break: break-all;
}

.page-hint {
  color: #409eff;
  font-size: 12px;
}

.page-selector-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.page-selector-toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) repeat(4, 160px);
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.page-selector-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  height: min(68vh, 620px);
  min-height: 460px;
}

.page-table-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-table-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 4px 10px;
  color: #606266;
  font-size: 13px;
}

.page-selector-table {
  flex: 1;
  min-height: 0;
}

.page-preview {
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.page-preview-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.page-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-cell span {
  min-width: 0;
  word-break: break-all;
}

.root-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow: auto;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1440px) {
  .page-selector-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-selector-layout {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .page-table-panel {
    height: 420px;
  }

  .page-preview {
    max-height: 320px;
  }
}
</style>
