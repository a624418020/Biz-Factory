import fs from 'node:fs';
import path from 'node:path';

const writeJsonFile = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeTextFile = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
};

const buildPackageJson = (packageName) => ({
  name: packageName,
  version: '1.0.0',
  private: true,
});

const buildVueTemplate = ({ title, className }) => `<template>
  <div class="${className}">
    <h1>${title}</h1>
  </div>
</template>

<script setup>
</script>

<style scoped>
.${className} {
  padding: 24px;
}
</style>
`;

export const ensurePagePackageScaffold = ({ manifestPath, manifest }) => {
  const packageDir = path.dirname(manifestPath);
  const entry = String(manifest?.entry || 'src/index.vue').replace(/\\/g, '/');
  const vueFilePath = path.resolve(packageDir, entry);
  const packageJsonPath = path.join(packageDir, 'package.json');
  const className = String(manifest?.packageName || path.basename(packageDir))
    .replace(/^@biz\//, '')
    .trim();
  const title = String(manifest?.title || manifest?.name || className).trim() || className;

  fs.mkdirSync(path.dirname(vueFilePath), { recursive: true });

  if (!fs.existsSync(packageJsonPath)) {
    writeJsonFile(packageJsonPath, buildPackageJson(manifest?.packageName || `@biz/${path.basename(packageDir)}`));
  }

  if (!fs.existsSync(vueFilePath)) {
    writeTextFile(
      vueFilePath,
      buildVueTemplate({
        title,
        className,
      }),
    );
  }
};
