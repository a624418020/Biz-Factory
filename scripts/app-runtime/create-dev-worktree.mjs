import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildSpecFromPlanId } from '../manifest-lib.mjs';
import { assertSupportedNodeVersion } from '../node-version.mjs';

assertSupportedNodeVersion();

const parseCliArgs = (argv) => {
  const rawArgs = argv.filter((arg) => arg && arg !== '--');
  let specPath = '';
  let planId = '';

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--spec') {
      specPath = rawArgs[index + 1] || '';
      index += 1;
    } else if (arg.startsWith('plan:')) {
      planId = arg;
    }
  }

  return { specPath, planId };
};

const normalizeName = (value) => String(value || 'app').replace(/[^a-zA-Z0-9-_]+/g, '-');

const getMenuDescendantIds = (menuIds, menus) => {
  const seedIds = Array.isArray(menuIds) ? menuIds.filter(Boolean) : [menuIds].filter(Boolean);
  const result = new Set(seedIds);
  let changed = true;

  while (changed) {
    changed = false;
    menus.forEach((menu) => {
      if (menu.parentId && result.has(menu.parentId) && !result.has(menu.id)) {
        result.add(menu.id);
        changed = true;
      }
    });
  }

  return [...result];
};

const collectSelectedPackages = (spec) => {
  const menus = spec.menus || [];
  const pages = spec.pages || [];
  const selectedMenuIds = new Set(getMenuDescendantIds(spec.plan?.menuIds || [], menus));
  const selectedPageIds = new Set(
    menus.filter((menu) => selectedMenuIds.has(menu.id) && menu.pageId).map((menu) => menu.pageId),
  );

  return [...new Set(
    pages
      .filter((page) => selectedPageIds.has(page.id))
      .map((page) => String(page.component || '').replace(/\\/g, '/'))
      .filter((component) => component.startsWith('page-'))
      .map((component) => component.split('/')[0]),
  )].sort();
};

export const runCreateDevWorktree = ({ appRoot, argv, sparseAppPath }) => {
  const repoRoot = path.resolve(appRoot, '..', '..');
  const { specPath, planId } = parseCliArgs(argv);

  if (!specPath && !planId) {
    throw new Error('Missing --spec argument or plan id.');
  }

  const readSpec = () => {
    if (specPath) {
      return JSON.parse(fs.readFileSync(path.resolve(appRoot, specPath), 'utf8'));
    }

    return buildSpecFromPlanId(planId);
  };

  const runGit = (args, cwd = repoRoot) => {
    const result = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
    });

    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || 'Git command failed.').trim());
    }

    return String(result.stdout || '').trim();
  };

  const branchExists = (branchName) => {
    const result = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
    });
    return result.status === 0;
  };

  const isMissingRegisteredWorktreeError = (error) =>
    String(error?.message || '').includes('missing but already registered worktree');

  const addWorktree = (args) => {
    try {
      runGit(['worktree', 'add', ...args]);
    } catch (error) {
      if (!isMissingRegisteredWorktreeError(error)) {
        throw error;
      }

      runGit(['worktree', 'prune']);
      runGit(['worktree', 'add', '-f', ...args]);
    }
  };

  const ensureWorktree = (worktreeDir, branchName) => {
    if (fs.existsSync(path.join(worktreeDir, '.git'))) {
      runGit(['checkout', branchName], worktreeDir);
      return 'reused';
    }

    if (fs.existsSync(worktreeDir) && fs.readdirSync(worktreeDir).length > 0) {
      throw new Error(`Worktree directory already exists and is not empty: ${worktreeDir}`);
    }

    fs.mkdirSync(worktreeDir, { recursive: true });
    if (branchExists(branchName)) {
      addWorktree([worktreeDir, branchName]);
      return 'attached';
    }

    addWorktree(['-b', branchName, worktreeDir, 'HEAD']);
    return 'created';
  };

  const applySparseCheckout = (worktreeDir, sparsePaths) => {
    runGit(['sparse-checkout', 'init', '--cone'], worktreeDir);
    runGit(['sparse-checkout', 'set', ...sparsePaths], worktreeDir);
  };

  const applyWorktreeLocalIgnore = (worktreeDir) => {
    const gitEntry = fs.readFileSync(path.join(worktreeDir, '.git'), 'utf8');
    const match = gitEntry.match(/gitdir:\s*(.+)\s*$/i);
    if (!match) {
      return;
    }

    const gitDir = path.resolve(worktreeDir, match[1].trim());
    const infoDir = path.join(gitDir, 'info');
    const excludeFile = path.join(infoDir, 'exclude');
    const localIgnoreEntries = ['.idea/', '.vscode/', '*.iml', '*.ipr', '*.iws'];

    fs.mkdirSync(infoDir, { recursive: true });
    const current = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf8') : '';
    const next = [...new Set([...current.split(/\r?\n/).filter(Boolean), ...localIgnoreEntries])].join('\n');
    fs.writeFileSync(excludeFile, `${next}\n`, 'utf8');
  };

  const applyWorktreeLocalConfig = (worktreeDir) => {
    runGit(['config', '--worktree', 'advice.updateSparsePath', 'false'], worktreeDir);
    runGit(['config', '--worktree', 'core.fsmonitor', 'false'], worktreeDir);
  };

  const spec = readSpec();
  const appCode = normalizeName(spec.app?.name || spec.app?.id || 'app');
  const branchName = `codex/dev-${appCode}`;
  const worktreeRoot = path.resolve(path.dirname(repoRoot), `${path.basename(repoRoot)}-worktrees`);
  const worktreeDir = path.resolve(worktreeRoot, appCode);
  const pagePackages = collectSelectedPackages(spec);
  const sparsePaths = [
    sparseAppPath,
    'packages/common',
    ...pagePackages.map((pkgName) => `packages/${pkgName}`),
  ];

  fs.mkdirSync(worktreeRoot, { recursive: true });
  const mode = ensureWorktree(worktreeDir, branchName);
  applySparseCheckout(worktreeDir, sparsePaths);
  applyWorktreeLocalIgnore(worktreeDir);
  applyWorktreeLocalConfig(worktreeDir);

  const result = {
    success: true,
    mode,
    branchName,
    worktreeDir,
    sparsePaths,
    packageCount: pagePackages.length,
    appName: spec.app?.text || spec.app?.name || '',
  };

  process.stdout.write(JSON.stringify(result));
};
