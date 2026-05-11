import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { assertSupportedNodeVersion } from './node-version.mjs';
import { ensurePagePackageScaffold } from './page-package-scaffold.mjs';

assertSupportedNodeVersion();
import {
  buildDefaultPackageFolderName,
  buildDefaultRoute,
  buildPageSlug,
  toCamelCase,
} from '../packages/common/utils/page-defaults.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const repoRoot = process.cwd();
const packagesRoot = path.join(repoRoot, 'packages');
const cliArgs = process.argv.slice(2);

const ask = (question) =>
  new Promise((resolve) => {
    rl.question(question, (answer) => resolve(String(answer || '').trim()));
  });

const getArgValue = (flagName) => {
  const index = cliArgs.indexOf(flagName);
  if (index === -1) {
    return '';
  }
  return String(cliArgs[index + 1] || '').trim();
};

const readField = async (flagName, question, fallback = '') => {
  const argValue = getArgValue(flagName);
  if (argValue) {
    return argValue;
  }

  const answer = await ask(question);
  return answer || fallback;
};

const writeJsonFile = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const createPagePackage = async () => {
  const rawPageCode = await readField('--name', '请输入页面编码（例如：commandScreen 或 user-mgt）：');
  if (!rawPageCode) {
    console.error('页面编码不能为空。');
    rl.close();
    process.exit(1);
  }

  const pageSlug = buildPageSlug(rawPageCode);
  if (!pageSlug) {
    console.error('页面编码格式不合法。');
    rl.close();
    process.exit(1);
  }

  const pageCode = toCamelCase(pageSlug);
  const titleInput = await readField('--title', '请输入页面标题（直接回车则使用页面编码）：');
  const sourceInput = await readField('--source', '请输入 source（默认 core）：', 'core');
  const centerInput = await readField('--center', '请输入 center（默认 Framework Core）：', 'Framework Core');
  const domainInput = await readField('--domain', '请输入 businessDomain（可留空）：');
  const categoryInput = await readField('--category', '请输入 pageCategory（默认 业务页）：', '业务页');
  const defaultRoute = buildDefaultRoute(pageCode, centerInput);
  const routeInput = await readField('--route', `请输入 route（默认 ${defaultRoute}）：`, defaultRoute);

  const packageFolderName = buildDefaultPackageFolderName(pageCode, centerInput);
  const packageName = `@biz/${packageFolderName}`;
  const packageDir = path.join(packagesRoot, packageFolderName);

  if (fs.existsSync(packageDir)) {
    console.error(`页面包 ${packageFolderName} 已存在。`);
    rl.close();
    process.exit(1);
  }

  fs.mkdirSync(packageDir, { recursive: true });

  const manifest = {
    id: `page:${pageCode}`,
    name: pageCode,
    title: titleInput || pageCode,
    route: routeInput.startsWith('/') ? routeInput : `/${routeInput}`,
    packageName,
    entry: 'src/index.vue',
    source: sourceInput,
    center: centerInput,
    businessDomain: domainInput,
    pageCategory: categoryInput,
    status: 'draft',
    iconName: 'icon-menu2level',
    description: '',
    tags: [],
    meta: {
      menuAlive: pageCode,
    },
  };

  const manifestPath = path.join(packageDir, 'page.manifest.json');
  writeJsonFile(manifestPath, manifest);
  ensurePagePackageScaffold({
    manifestPath,
    manifest,
  });

  console.log(`页面包已创建：packages/${packageFolderName}`);
  console.log(`默认页面路由：${manifest.route}`);
  console.log(`默认组件路径：${packageFolderName}/index.vue`);
  console.log(`Manifest 已创建：packages/${packageFolderName}/page.manifest.json`);
  rl.close();
};

createPagePackage().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  rl.close();
  process.exit(1);
});
