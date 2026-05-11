# Biz Factory

面向业务前端装配的 Monorepo 工作区。

这个仓库不是单纯的前端模板，也不是把页面随手拼起来的演示工程。它尝试把“页面能力、导航方案、应用交付”拆成稳定模型，用 manifest 把这些关系描述出来，再由脚本和运行时把它们组装成可开发、可校验、可运行、可构建的应用。

一句话理解：

> 页面能力沉淀在 `packages/page-*`，方案决定选哪些页面，应用决定如何交付。

## 核心模型

仓库围绕三层模型组织：

- 页面能力：一个可复用的页面单元，对应一个 `packages/page-*` 包。
- 导航方案：一组页面的菜单、路由和挂载关系。
- 业务应用：最终运行和交付的应用成品，绑定某个方案并声明交付形态。

对应的正式配置源：

- 页面 manifest：`packages/*/page.manifest.json`
- 方案 manifest：`apps/manifests/plans/*.plan.json`
- 应用 manifest：`apps/manifests/apps/*.app.json`

这三层关系不是隐含在代码里，而是显式写在 manifest 里，所以可以被程序读取、校验、生成路由、生成菜单、生成页面模块和构建产物。

## 当前交付形态

仓库当前覆盖三种典型形态：

- `host`：宿主基座，负责登录、门户和微应用容器。
- `micro`：微应用，运行在宿主基座中。
- `standalone`：独立应用，单独部署和访问。

当前内置的典型应用：

- `itgHostApp`：ITG 基座
- `studioMicroApp`：装配平台子应用
- `studioStandaloneApp`：装配平台独立应用
- `sampleDemoApp`：样例独立应用

## 仓库结构

```text
xuexi2/
├─ apps/
│  ├─ itg-portal/              # 宿主基座
│  ├─ uoc-portal/              # 微应用入口 / 工作台壳
│  ├─ assembly-portal/         # 独立应用入口
│  └─ manifests/
│     ├─ apps/                 # 应用 manifest
│     └─ plans/                # 方案 manifest
├─ packages/
│  ├─ common/                  # 公共组件、公共服务、共享运行能力
│  └─ page-*/                  # 页面能力包
├─ schemas/                    # manifest schema
└─ scripts/
   ├─ app-runtime/             # 运行、构建、工作区脚本层
   ├─ gen-page.mjs             # 页面脚手架
   ├─ validate-manifests.mjs   # manifest 校验
   └─ check-p0.mjs             # P0 自检
```

## 环境要求

- Node.js `>=20 <23`
- pnpm `>=9 <11`

补充说明：

- 根 `package.json` 的 `packageManager` 目前固定为 `pnpm@9.0.0`。
- 如果你用 `corepack pnpm ...`，通常会按 `9.0.0` 运行。
- 如果你直接用全局 `pnpm`，当前仓库允许 `pnpm 9` 和 `pnpm 10`。

推荐先确认版本：

```bash
node -v
pnpm -v
```

如果你想严格按仓库默认工具链运行，可以使用：

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

## 安装依赖

```bash
pnpm install
```

## 快速开始

### 1. 校验 manifest

```bash
pnpm validate:manifests
```

它会做两层检查：

- schema 结构校验
- manifest 之间的引用关系校验

### 2. 启动默认入口

```bash
pnpm dev
```

当前根入口会启动：

- launcher 服务
- `@biz/assembly-portal` 的 `frameworkWorkbench` 演示入口

### 3. 构建默认入口

```bash
pnpm build
```

当前根构建会执行：

- `@biz/assembly-portal` 的 `build:framework`

### 4. 运行 P0 自检

```bash
pnpm check:p0
```

## 常用命令

### 根目录命令

```bash
pnpm dev
pnpm build
pnpm validate:manifests
pnpm check:p0
pnpm gen:page
```

### 按应用壳运行

```bash
# 微应用工作台
pnpm -F @biz/uoc-portal dev:framework
pnpm -F @biz/uoc-portal build:framework

# 独立应用工作台
pnpm -F @biz/assembly-portal dev:framework
pnpm -F @biz/assembly-portal build:framework

# 宿主基座
pnpm -F @biz/itg-portal dev
pnpm -F @biz/itg-portal build
```

### 开发工作区

```bash
pnpm internal:worktree:uoc
pnpm internal:worktree:assembly
```

### 页面脚手架

```bash
pnpm gen:page
```

这个脚本会交互式生成：

- 页面包目录
- `src/index.vue`
- `page.manifest.json`
- 配套 `package.json`

说明：

- 日常新增页面能力，推荐优先通过可视化页面操作。
- `pnpm gen:page` 更适合作为脚手架补充，或在批量初始化、纯代码方式维护时使用。

## Manifest 如何串起来

推荐把它理解成一条装配链：

```text
page.manifest.json
  ↓
plan manifest 选择页面并组织菜单
  ↓
app manifest 绑定运行壳、构建路径和交付形态
  ↓
generate-page-modules / runtime
  ↓
最终应用
```

其中：

- 页面 manifest 负责说明“这个页面能力是什么”
- 方案 manifest 负责说明“这次要哪些页面、菜单怎么排”
- 应用 manifest 负责说明“跑在哪个壳里、怎么访问、怎么构建”

## 推荐开发流程

### 新增一个页面能力

推荐方式：在可视化页面中新增和维护。

建议路径：

1. 启动工作台入口
2. 进入 `应用装配中心`
3. 在 `页面能力库` 页面新增页面能力
4. 在 `导航方案` 页面把它挂进某个方案
5. 如需交付到某个应用，再到 `业务应用` 页面绑定方案
6. 最后执行 `pnpm validate:manifests`

补充方式：

- 如果你需要用脚手架快速初始化页面包，也可以执行 `pnpm gen:page`
- 然后再回到可视化页面中继续维护和装配

### 新增一个方案

推荐方式：在可视化页面中新增和维护。

建议路径：

1. 启动工作台入口
2. 进入 `应用装配中心`
3. 在 `导航方案` 页面新增方案
4. 通过页面操作组织菜单树并绑定页面能力
5. 选择首页页面
6. 如需交付，再到 `业务应用` 页面把该方案绑定到某个应用
7. 最后执行 `pnpm validate:manifests`

补充方式：

- 如果你需要直接维护配置，也可以在 `apps/manifests/plans/` 下编辑 `*.plan.json`

### 新增一个应用

推荐方式：在可视化页面中新增和维护。

建议路径：

1. 启动工作台入口
2. 进入 `应用装配中心`
3. 在 `业务应用` 页面新增应用
4. 选择要绑定的方案
5. 选择应用类型，例如 `host`、`micro` 或 `standalone`
6. 补全运行和交付相关配置
7. 最后执行 `pnpm validate:manifests`

补充方式：

- 如果你需要直接维护配置，也可以在 `apps/manifests/apps/` 下编辑 `*.app.json`

## 当前约定

- `apps/*` 只负责交付入口，不重复沉淀共享运行逻辑。
- `packages/page-*` 代表页面能力包，是复用和装配的基本单位。
- `apps/manifests/*` 是页面、方案、应用的正式配置源。
- `scripts/app-runtime/*` 是共享运行层，当前阶段仍然以脚本形式存在。

## 常见问题

### 1. pnpm 版本不匹配怎么办

先看当前版本：

```bash
pnpm -v
```

如果你想按仓库默认版本运行：

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

如果你直接使用全局 `pnpm`，当前仓库允许 `pnpm 9.x` 和 `pnpm 10.x`。

### 2. Manifest 校验失败怎么看

`pnpm validate:manifests` 的报错通常会包含：

- manifest 文件路径
- 字段路径
- 失败原因

优先检查：

- `pageId` 是否引用了存在的页面
- `planId` 是否引用了存在的方案
- `hostAppId` 是否引用了存在的宿主应用
- 路由、`basePath`、`defaultRoute` 是否符合约定

### 3. 为什么访问地址里会带应用前缀

独立应用和部分样例应用会配置自己的 `basePath`，例如：

- `/studioStandaloneApp/`
- `/sampleDemoApp/`

这意味着访问时需要带上对应前缀，而不是直接访问站点根路径。

### 4. `pnpm dev` 实际启动了什么

根目录 `pnpm dev` 不是把所有应用一起跑起来，而是启动：

- launcher 服务
- `@biz/assembly-portal` 的 framework workbench 演示入口

如果你想启动其他壳，请直接使用 `pnpm -F ...` 的方式运行对应包脚本。

## 相关文档

- [GITLAB_PROJECT_OVERVIEW.md](./GITLAB_PROJECT_OVERVIEW.md)

## 一句话总结

Biz Factory 想做的不是“再造一个大前端工程”，而是把应用研发从“堆项目”推进到“按页面、方案、应用进行标准化装配和交付”。
