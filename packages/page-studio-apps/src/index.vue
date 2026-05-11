<template>
  <common-layout
    :form-model="searchForm"
    table-title="应用管理"
    search-name="查询"
    refresh-name="重置"
    @search="handleSearch"
    @reset="handleReset"
  >
    <template #search-form>
      <el-form-item label="应用名称" prop="text">
        <el-input v-model="searchForm.text" clearable placeholder="请输入应用名称" />
      </el-form-item>
      <el-form-item label="应用编码" prop="name">
        <el-input v-model="searchForm.name" clearable placeholder="请输入应用编码" />
      </el-form-item>
      <el-form-item label="应用类型" prop="appType">
        <el-select v-model="searchForm.appType" clearable placeholder="请选择应用类型" style="width: 180px">
          <el-option label="基座应用" value="host" />
          <el-option label="子应用" value="micro" />
          <el-option label="独立应用" value="standalone" />
        </el-select>
      </el-form-item>
      <el-form-item label="导航方案" prop="planId">
        <el-select v-model="searchForm.planId" clearable filterable placeholder="请选择导航方案" style="width: 220px">
          <el-option v-for="plan in plans" :key="plan.id" :label="plan.text" :value="plan.id" />
        </el-select>
      </el-form-item>
    </template>

    <template #operating-button>
      <el-button type="primary" @click="openCreate">新建应用</el-button>
      <el-button @click="handleResetStorage">从 manifest 重新加载</el-button>
      <el-button @click="refreshRuntimeApps">刷新运行状态</el-button>
    </template>

    <div class="summary-bar">
      <span>应用总数：{{ filteredApps.length }}</span>
      <span>本地手动入口只有 `pnpm run dev`，其余启动统一从这里发起。</span>
    </div>

    <el-table :data="filteredApps" border height="100%">
      <el-table-column prop="text" label="应用名称" min-width="180" />
      <el-table-column prop="name" label="应用编码" min-width="160" />
      <el-table-column label="应用类型" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getAppTypeTagType(row.appType)">
            {{ getAppTypeLabel(row.appType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="登录入口" width="110" align="center">
        <template #default="{ row }">
          {{ getLoginLabel(row.loginPageType) }}
        </template>
      </el-table-column>
      <el-table-column label="绑定方案" min-width="180">
        <template #default="{ row }">
          {{ getPlanName(row.planId) }}
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="100" />
      <el-table-column label="菜单数" width="80" align="center">
        <template #default="{ row }">
          {{ getMenuCount(row) }}
        </template>
      </el-table-column>
      <el-table-column label="页面数" width="80" align="center">
        <template #default="{ row }">
          {{ getPageCount(row) }}
        </template>
      </el-table-column>
      <el-table-column label="运行状态" min-width="240">
        <template #default="{ row }">
          <div class="runner-cell">
            <el-tag :type="getRuntimeStatusTagType(row.id)" size="small">
              {{ getRuntimeStatusLabel(row.id) }}
            </el-tag>
            <span v-if="runtimeAppMap[row.id]?.runtimeState?.port" class="runner-port">
              端口 {{ runtimeAppMap[row.id].runtimeState.port }}
            </span>
            <el-link
              v-if="runtimeAppMap[row.id]?.runtimeState?.openUrl"
              :href="runtimeAppMap[row.id].runtimeState.openUrl"
              target="_blank"
              type="primary"
            >
              打开入口
            </el-link>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="应用说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="启用" width="80" align="center">
        <template #default="{ row }">
          {{ row.enabled ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="620" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
          <el-button
            v-if="row.appType === 'host'"
            link
            type="success"
            :loading="isAppActionLoading(row.id, 'host')"
            @click="triggerHostStart(row)"
          >
            启动基座
          </el-button>
          <el-button
            v-if="row.appType === 'standalone'"
            link
            type="success"
            :loading="isAppActionLoading(row.id, 'standalone')"
            @click="triggerStandaloneStart(row)"
          >
            启动独立应用
          </el-button>
          <el-button
            v-if="row.appType === 'micro'"
            link
            type="warning"
            :loading="isAppActionLoading(row.id, 'micro')"
            @click="triggerMicroStart(row)"
          >
            启动为子应用
          </el-button>
          <el-button
            v-if="row.appType !== 'host'"
            link
            type="primary"
            :loading="isAppActionLoading(row.id, 'develop')"
            @click="triggerDevelop(row)"
          >
            开发
          </el-button>
          <el-button
            v-if="row.appType !== 'host'"
            link
            type="primary"
            :loading="isAppActionLoading(row.id, 'build')"
            @click="triggerBuild(row)"
          >
            打包
          </el-button>
          <el-button
            link
            type="warning"
            :loading="isAppActionLoading(row.id, 'stop')"
            :disabled="!runtimeAppMap[row.id]?.runtimeState?.running"
            @click="triggerStop(row)"
          >
            关闭应用
          </el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.appType !== 'host'" link type="primary" @click="copyApp(row)">复制</el-button>
          <el-button v-if="row.appType !== 'host'" link type="danger" @click="removeApp(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </common-layout>

  <el-drawer v-model="drawerVisible" :title="editingId ? '编辑应用' : '新建应用'" size="720px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="应用名称" prop="text">
        <el-input v-model="form.text" placeholder="请输入应用名称" />
      </el-form-item>
      <el-form-item label="应用编码" prop="name">
        <el-input v-model="form.name" :disabled="Boolean(editingId)" placeholder="例如 sampleConsole" />
      </el-form-item>
      <el-form-item label="应用类型" prop="appType">
        <el-radio-group v-model="form.appType">
          <el-radio label="host">基座应用</el-radio>
          <el-radio label="micro">子应用</el-radio>
          <el-radio label="standalone">独立应用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="登录方式">
        <el-alert :title="getLoginAlertTitle(form.appType)" type="info" :closable="false" show-icon />
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-select v-model="form.source" placeholder="请选择来源">
          <el-option label="Framework Core" value="core" />
          <el-option label="Sample Solution" value="sample" />
          <el-option label="Hybrid Delivery" value="hybrid" />
        </el-select>
      </el-form-item>
      <el-form-item label="导航方案" prop="planId">
        <el-select v-model="form.planId" filterable placeholder="请选择导航方案">
          <el-option v-for="plan in selectablePlans" :key="plan.id" :label="plan.text" :value="plan.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="本地运行端口" prop="devPort">
        <el-input-number v-model="form.devPort" :min="1024" :max="65535" controls-position="right" />
      </el-form-item>
      <el-form-item label="默认路由" prop="defaultRoute">
        <el-input
          v-model="form.defaultRoute"
          clearable
          placeholder="可选；不填则自动取当前方案菜单树中的第一个页面"
        />
      </el-form-item>
      <el-form-item label="首页页面" prop="homePageId">
        <el-select v-model="form.homePageId" clearable filterable placeholder="可选默认首页">
          <el-option v-for="page in availablePages" :key="page.id" :label="page.text" :value="page.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="应用说明" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="描述这个应用的职责和用途" />
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-switch v-model="form.enabled" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApp">保存应用</el-button>
      </div>
    </template>
  </el-drawer>

  <el-drawer v-model="detailVisible" title="应用详情" size="960px">
    <template v-if="detailApp">
      <div class="detail-header">
        <div class="detail-card">
          <div class="detail-label">应用名称</div>
          <div class="detail-value">{{ detailApp.text }}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">应用类型</div>
          <div class="detail-value">{{ getAppTypeLabel(detailApp.appType) }}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">绑定方案</div>
          <div class="detail-value">{{ currentPlan?.text || '--' }}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">登录入口</div>
          <div class="detail-value">{{ getLoginLabel(detailApp.loginPageType) }}</div>
        </div>
      </div>

      <div v-if="detailRuntimeInfo" class="runtime-panel">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="壳子包">{{ detailRuntimeInfo.shellPackage || '--' }}</el-descriptions-item>
          <el-descriptions-item label="启动命令">{{ detailRuntimeInfo.devCommand || '--' }}</el-descriptions-item>
          <el-descriptions-item label="运行端口">{{ detailRuntimeInfo.devPort || '--' }}</el-descriptions-item>
          <el-descriptions-item label="访问前缀">{{ detailRuntimeInfo.basePath || '--' }}</el-descriptions-item>
          <el-descriptions-item label="默认路由">{{ detailRuntimeInfo.defaultRoute || '--' }}</el-descriptions-item>
          <el-descriptions-item label="打开方式">{{ detailRuntimeInfo.openBehavior || '--' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="detail-layout">
        <div class="detail-panel">
          <div class="panel-title">方案菜单</div>
          <el-tree
            class="menu-tree"
            node-key="id"
            default-expand-all
            :data="detailMenuTree"
            :props="{ label: 'label', children: 'children' }"
            @node-click="handleDetailMenuClick"
          />
        </div>

        <div class="detail-panel">
          <div class="panel-title">页面清单</div>
          <el-table :data="detailPages" border height="100%">
            <el-table-column prop="text" label="页面名称" min-width="160" />
            <el-table-column prop="router" label="页面路由" min-width="180" />
            <el-table-column prop="component" label="组件路径" min-width="240" />
          </el-table>
        </div>
      </div>

      <div v-if="selectedDetailMenu" class="menu-info">
        <div class="panel-title">当前菜单信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="菜单名称">{{ selectedDetailMenu.text }}</el-descriptions-item>
          <el-descriptions-item label="菜单编码">{{ selectedDetailMenu.name }}</el-descriptions-item>
          <el-descriptions-item label="菜单路由">{{ selectedDetailMenu.router || '--' }}</el-descriptions-item>
          <el-descriptions-item label="关联页面">
            {{ pageNameMap.get(selectedDetailMenu.pageId) || '--' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CommonLayout from '@biz/common/components/global/commonLayout/index.vue';
import {
  collectPageIdsByMenuIds,
  getAppRecords,
  getMenuRecords,
  getPageRecords,
  getPlanMenuIds,
  getPlanMenuTree,
  getPlanRecords,
  refreshManifestRecords,
  saveAppRecords,
} from '@/mock/routeData.js';

const RUNTIME_APPS_ENDPOINT = '/api/runtime/apps';
const RUNTIME_START_ENDPOINT = '/api/runtime/start';
const RUNTIME_STOP_ENDPOINT = '/api/runtime/stop';
const APP_RUNNER_BUILD_ENDPOINT = '/__app_runner/build';
const APP_RUNNER_DEVELOP_ENDPOINT = '/__app_runner/develop';

const DEFAULT_SOURCE = 'core';
const DEFAULT_APP_TYPE = 'micro';
const DEFAULT_DEV_PORT = 8085;

const APP_TYPE_LABEL_MAP = {
  host: '基座应用',
  micro: '子应用',
  standalone: '独立应用',
};

const APP_TYPE_TAG_MAP = {
  host: 'warning',
  micro: 'success',
  standalone: 'primary',
};

const searchForm = reactive({
  text: '',
  name: '',
  appType: '',
  planId: '',
});

const apps = ref([]);
const pages = ref([]);
const menus = ref([]);
const plans = ref([]);
const runtimeApps = ref([]);
const runtimeLoading = ref(false);
const runtimeActionLoading = ref({});

const drawerVisible = ref(false);
const detailVisible = ref(false);
const editingId = ref('');
const formRef = ref(null);
const form = ref(createDefaultForm());

const detailApp = ref(null);
const selectedDetailMenu = ref(null);

const rules = {
  text: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入应用编码', trigger: 'blur' }],
  appType: [{ required: true, message: '请选择应用类型', trigger: 'change' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
  planId: [{ required: true, message: '请选择导航方案', trigger: 'change' }],
  devPort: [{ required: true, message: '请填写本地运行端口', trigger: 'change' }],
};

function createDefaultForm() {
  return {
    text: '',
    name: '',
    appType: DEFAULT_APP_TYPE,
    source: DEFAULT_SOURCE,
    planId: '',
    devPort: DEFAULT_DEV_PORT,
    defaultRoute: '',
    homePageId: '',
    description: '',
    enabled: true,
  };
}

function loadRecords() {
  pages.value = getPageRecords();
  menus.value = getMenuRecords();
  plans.value = getPlanRecords();
  apps.value = getAppRecords();
}

const planMap = computed(() => new Map(plans.value.map((plan) => [plan.id, plan])));
const runtimeAppMap = computed(() => {
  const map = Object.create(null);
  runtimeApps.value.forEach((app) => {
    map[app.id] = app;
  });
  return map;
});

const pageNameMap = computed(() => new Map(pages.value.map((page) => [page.id, page.text])));

const filteredApps = computed(() =>
  apps.value.filter((app) => {
    const textMatched = !searchForm.text || String(app.text || '').includes(searchForm.text);
    const nameMatched = !searchForm.name || String(app.name || '').includes(searchForm.name);
    const typeMatched = !searchForm.appType || app.appType === searchForm.appType;
    const planMatched = !searchForm.planId || app.planId === searchForm.planId;
    return textMatched && nameMatched && typeMatched && planMatched;
  }),
);

const selectablePlans = computed(() => plans.value.filter((plan) => plan.enabled !== false));

const availablePages = computed(() => {
  const pageIds = new Set(collectPageIdsByMenuIds(getCurrentPlanMenuIds(form.value.planId), menus.value));
  return pages.value.filter((page) => pageIds.has(page.id));
});

const currentPlan = computed(() => {
  if (!detailApp.value?.planId) {
    return null;
  }
  return planMap.value.get(detailApp.value.planId) || null;
});

const detailMenuTree = computed(() => {
  if (!detailApp.value?.planId) {
    return [];
  }
  return normalizeDetailTree(getPlanMenuTree(detailApp.value.planId, menus.value));
});

const detailPages = computed(() => {
  if (!detailApp.value?.planId) {
    return [];
  }
  const pageIds = new Set(collectPageIdsByMenuIds(getCurrentPlanMenuIds(detailApp.value.planId), menus.value));
  return pages.value.filter((page) => pageIds.has(page.id));
});

const detailRuntimeInfo = computed(() => detailApp.value?.runtime || null);

watch(
  () => form.value.planId,
  (planId) => {
    if (!planId) {
      form.value.homePageId = '';
      return;
    }

    const pageIds = new Set(collectPageIdsByMenuIds(getCurrentPlanMenuIds(planId), menus.value));
    if (form.value.homePageId && !pageIds.has(form.value.homePageId)) {
      form.value.homePageId = '';
    }
  },
);

function getCurrentPlanMenuIds(planId) {
  const plan = plans.value.find((item) => item.id === planId);
  return getPlanMenuIds(plan, menus.value);
}

function getPlanRecord(planId) {
  return plans.value.find((item) => item.id === planId) || null;
}

function normalizeRoutePath(route = '') {
  const trimmed = String(route || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function findFirstRouteInTree(nodes = []) {
  for (const node of nodes) {
    if (node?.router) {
      return normalizeRoutePath(node.router);
    }
    const childRoute = findFirstRouteInTree(node?.children || []);
    if (childRoute) {
      return childRoute;
    }
  }
  return '';
}

function getPlanDefaultRoute(planId) {
  const tree = getPlanMenuTree(planId, menus.value);
  return findFirstRouteInTree(tree);
}

function buildRunnerPayload(app) {
  const plan = getPlanRecord(app.planId);
  if (!plan) {
    throw new Error('当前应用未绑定有效的导航方案。');
  }

  const selectedMenuIds = new Set(getCurrentPlanMenuIds(app.planId));
  const selectedMenus = menus.value.filter((menu) => selectedMenuIds.has(menu.id));
  const selectedPageIds = new Set(collectPageIdsByMenuIds([...selectedMenuIds], menus.value));
  const selectedPages = pages.value.filter((page) => selectedPageIds.has(page.id));

  return {
    app,
    plan,
    menus: selectedMenus,
    pages: selectedPages,
  };
}

function buildAppBasePath(appName = '') {
  const normalized = String(appName || '').trim().replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '/';
}

function getRuntimeTemplate(appType, planId, appName, devPort, defaultRouteInput = '') {
  const normalizedPort = Number(devPort) || DEFAULT_DEV_PORT;
  const normalizedDefaultRoute =
    appType === 'host'
      ? normalizeRoutePath(defaultRouteInput)
      : normalizeRoutePath(defaultRouteInput) || getPlanDefaultRoute(planId);

  if (appType === 'host') {
    return {
      loginPageType: 'host-login',
      build: {
        basePath: '/',
        outDir: 'dist-itg-host',
      },
      runtime: {
        shellPackage: '@biz/itg-portal',
        devCommand: 'pnpm -F @biz/itg-portal dev',
        devPort: normalizedPort,
        basePath: '/',
        defaultRoute: normalizedDefaultRoute || '/login',
        openBehavior: 'manual',
      },
    };
  }

  const shellPackage = appType === 'micro' ? '@biz/uoc-portal' : '@biz/assembly-portal';
  const runtimeBasePath = buildAppBasePath(appName);
  const planArg = planId || 'plan:framework-workbench';

  return {
    loginPageType: appType === 'standalone' ? 'page-login' : 'host-login',
    build: {
      basePath: `${runtimeBasePath}/`,
      outDir: appType === 'micro' ? `dist-${appName}-micro` : `dist-${appName}-standalone`,
    },
    runtime: {
      shellPackage,
      devCommand: `pnpm -F ${shellPackage} dev -- ${planArg} --port ${normalizedPort}`,
      devPort: normalizedPort,
      basePath: runtimeBasePath,
      defaultRoute: normalizedDefaultRoute || '/studio/apps',
      ...(appType === 'micro' ? { hostAppId: 'app:itg-host', openBehavior: 'manual' } : { openBehavior: 'auto-tab' }),
    },
  };
}

function getAppTypeLabel(appType) {
  return APP_TYPE_LABEL_MAP[appType] || appType || '--';
}

function getAppTypeTagType(appType) {
  return APP_TYPE_TAG_MAP[appType] || 'info';
}

function getLoginLabel(loginPageType) {
  return loginPageType === 'page-login' ? '应用登录' : '基座登录';
}

function getLoginAlertTitle(appType) {
  if (appType === 'host') {
    return '基座应用负责登录、门户、头部和微应用承载。';
  }
  if (appType === 'standalone') {
    return '独立应用会打开自己的页面入口。';
  }
  return '子应用只启动自身；基座请先手动启动，再从基座内访问。';
}

function getPlanName(planId) {
  return planMap.value.get(planId)?.text || planId || '--';
}

function getMenuCount(app) {
  return getCurrentPlanMenuIds(app.planId).length;
}

function getPageCount(app) {
  const pageIds = collectPageIdsByMenuIds(getCurrentPlanMenuIds(app.planId), menus.value);
  return pageIds.length;
}

function getRuntimeStatus(appId) {
  return runtimeAppMap.value[appId]?.runtimeState || null;
}

function getRuntimeStatusLabel(appId) {
  const state = getRuntimeStatus(appId);
  if (!state) {
    return runtimeLoading.value ? '刷新中' : '未读取';
  }
  if (state.running) {
    return '运行中';
  }
  if (state.starting) {
    return '启动中';
  }
  if (state.lastError) {
    return '启动失败';
  }
  return '未启动';
}

function getRuntimeStatusTagType(appId) {
  const state = getRuntimeStatus(appId);
  if (!state) {
    return 'info';
  }
  if (state.running) {
    return 'success';
  }
  if (state.starting) {
    return 'warning';
  }
  if (state.lastError) {
    return 'danger';
  }
  return 'info';
}

function setActionLoading(appId, action, loading) {
  const key = `${appId}:${action}`;
  runtimeActionLoading.value = {
    ...runtimeActionLoading.value,
    [key]: loading,
  };
}

function isAppActionLoading(appId, action) {
  return Boolean(runtimeActionLoading.value[`${appId}:${action}`]);
}

async function refreshRuntimeApps() {
  runtimeLoading.value = true;
  try {
    const response = await fetch(RUNTIME_APPS_ENDPOINT);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || '刷新运行状态失败');
    }
    runtimeApps.value = result.apps || [];
  } catch (error) {
    ElMessage.error(error.message || '刷新运行状态失败');
  } finally {
    runtimeLoading.value = false;
  }
}

async function runRuntimeStart(app, target) {
  const response = await fetch(RUNTIME_START_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: app.id, target }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || '启动失败');
  }
  return result;
}

async function runRuntimeStop(app) {
  const response = await fetch(RUNTIME_STOP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: app.id }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || '关闭失败');
  }
  return result;
}

async function runAppRunnerAction(endpoint, app) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRunnerPayload(app)),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || '执行失败');
  }
  return result;
}

function openNewTab(url) {
  if (!url) {
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function triggerHostStart(app) {
  setActionLoading(app.id, 'host', true);
  try {
    const result = await runRuntimeStart(app, 'host');
    await refreshRuntimeApps();
    ElMessage.success(result.started ? '基座已启动' : '基座已在运行');
    if (result.openUrl) {
      openNewTab(result.openUrl);
    }
  } catch (error) {
    ElMessage.error(error.message || '启动基座失败');
  } finally {
    setActionLoading(app.id, 'host', false);
  }
}

async function triggerStandaloneStart(app) {
  setActionLoading(app.id, 'standalone', true);
  try {
    const result = await runRuntimeStart(app, 'standalone');
    await refreshRuntimeApps();
    ElMessage.success(result.started ? '独立应用已启动' : '独立应用已在运行');
    if (result.openUrl) {
      openNewTab(result.openUrl);
    }
  } catch (error) {
    ElMessage.error(error.message || '启动独立应用失败');
  } finally {
    setActionLoading(app.id, 'standalone', false);
  }
}

async function triggerMicroStart(app) {
  setActionLoading(app.id, 'micro', true);
  try {
    const result = await runRuntimeStart(app, 'micro');
    await refreshRuntimeApps();

    const hostRunning = Boolean(result.hostState?.running);
    const message = hostRunning
      ? `子应用已启动。请从基座进入：${result.targetRoute || '--'}`
      : `子应用已启动。基座尚未启动，请先手动启动基座，再访问：${result.targetRoute || '--'}`;

    ElMessage.success(message);
  } catch (error) {
    ElMessage.error(error.message || '启动子应用失败');
  } finally {
    setActionLoading(app.id, 'micro', false);
  }
}

async function triggerStop(app) {
  setActionLoading(app.id, 'stop', true);
  try {
    await runRuntimeStop(app);
    await refreshRuntimeApps();
    ElMessage.success('应用已关闭');
  } catch (error) {
    ElMessage.error(error.message || '关闭应用失败');
  } finally {
    setActionLoading(app.id, 'stop', false);
  }
}

async function triggerDevelop(app) {
  setActionLoading(app.id, 'develop', true);
  try {
    const result = await runAppRunnerAction(APP_RUNNER_DEVELOP_ENDPOINT, app);
    ElMessage.success(result.message || '开发工作区已准备好');
  } catch (error) {
    ElMessage.error(error.message || '创建开发工作区失败');
  } finally {
    setActionLoading(app.id, 'develop', false);
  }
}

async function triggerBuild(app) {
  setActionLoading(app.id, 'build', true);
  try {
    const result = await runAppRunnerAction(APP_RUNNER_BUILD_ENDPOINT, app);
    ElMessage.success(result.message || '应用打包完成');
  } catch (error) {
    ElMessage.error(error.message || '应用打包失败');
  } finally {
    setActionLoading(app.id, 'build', false);
  }
}

function handleSearch() {}

function handleReset() {
  searchForm.text = '';
  searchForm.name = '';
  searchForm.appType = '';
  searchForm.planId = '';
}

async function handleResetStorage() {
  await refreshManifestRecords();
  loadRecords();
  await refreshRuntimeApps();
  ElMessage.success('已从 manifest 重新加载');
}

function openCreate() {
  editingId.value = '';
  form.value = {
    ...createDefaultForm(),
    planId: selectablePlans.value[0]?.id || '',
  };
  drawerVisible.value = true;
}

function openEdit(app) {
  editingId.value = app.id;
  form.value = {
    text: app.text || '',
    name: app.name || '',
    appType: app.appType || DEFAULT_APP_TYPE,
    source: app.source || DEFAULT_SOURCE,
    planId: app.planId || '',
    devPort: Number(app.runtime?.devPort) || DEFAULT_DEV_PORT,
    defaultRoute: app.runtime?.defaultRoute || '',
    homePageId: app.homePageId || '',
    description: app.description || '',
    enabled: app.enabled !== false,
  };
  drawerVisible.value = true;
}

function copyApp(app) {
  editingId.value = '';
  form.value = {
    text: `${app.text || ''} 复制`,
    name: `${app.name || ''}Copy`,
    appType: app.appType || DEFAULT_APP_TYPE,
    source: app.source || DEFAULT_SOURCE,
    planId: app.planId || '',
    devPort: DEFAULT_DEV_PORT,
    defaultRoute: app.runtime?.defaultRoute || '',
    homePageId: app.homePageId || '',
    description: app.description || '',
    enabled: app.enabled !== false,
  };
  drawerVisible.value = true;
}

async function removeApp(app) {
  await ElMessageBox.confirm(`确定删除应用“${app.text}”吗？`, '删除确认', {
    type: 'warning',
  });

  apps.value = apps.value.filter((item) => item.id !== app.id);
  saveAppRecords(apps.value);
  ElMessage.success('应用已删除');
}

async function submitApp() {
  await formRef.value?.validate();

  const name = String(form.value.name || '').trim();
  const text = String(form.value.text || '').trim();
  const id = editingId.value || `app:${name}`;

  if (!name) {
    ElMessage.error('应用编码不能为空');
    return;
  }

  if (
    apps.value.some(
      (item) => item.id !== editingId.value && (item.name === name || item.id === id),
    )
  ) {
    ElMessage.error('应用编码不能重复');
    return;
  }

  const defaultRoute = normalizeRoutePath(form.value.defaultRoute) || getPlanDefaultRoute(form.value.planId);
  const runtimeTemplate = getRuntimeTemplate(
    form.value.appType,
    form.value.planId,
    name,
    form.value.devPort,
    defaultRoute,
  );

  const nextRecord = {
    id,
    name,
    text,
    appType: form.value.appType,
    loginPageType: runtimeTemplate.loginPageType,
    source: form.value.source,
    description: String(form.value.description || '').trim(),
    planId: form.value.planId,
    homePageId: form.value.homePageId || '',
    enabled: form.value.enabled,
    status: form.value.enabled ? 'enabled' : 'disabled',
    build: runtimeTemplate.build,
    runtime: runtimeTemplate.runtime,
  };

  const nextApps = [...apps.value];
  const index = nextApps.findIndex((item) => item.id === id);

  if (index >= 0) {
    nextApps.splice(index, 1, nextRecord);
  } else {
    nextApps.push(nextRecord);
  }

  apps.value = saveAppRecords(nextApps);
  drawerVisible.value = false;
  await refreshRuntimeApps();
  ElMessage.success('应用已保存');
}

function openDetail(app) {
  detailApp.value = app;
  selectedDetailMenu.value = null;
  detailVisible.value = true;
}

function normalizeDetailTree(nodes = []) {
  return nodes.map((node) => ({
    ...node,
    label: node.text || node.title || node.name,
    children: normalizeDetailTree(node.children || []),
  }));
}

function handleDetailMenuClick(data) {
  selectedDetailMenu.value = data;
}

onMounted(async () => {
  loadRecords();
  await refreshRuntimeApps();
});
</script>

<style scoped lang="scss">
.summary-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
}

.runner-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.runner-port {
  color: #6b7280;
  font-size: 12px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
}

.detail-header {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.detail-card {
  padding: 16px;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 0 4px 0 rgba(200, 201, 204, 0.5);
}

.detail-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.detail-value {
  font-size: 16px;
  color: #111827;
  font-weight: 500;
}

.runtime-panel {
  margin-bottom: 16px;
}

.detail-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 420px;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 0 4px 0 rgba(200, 201, 204, 0.5);
}

.panel-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.menu-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.menu-info {
  margin-top: 16px;
}
</style>
