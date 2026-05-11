export const toKebabCase = (value = '') =>
  String(value || '')
    .trim()
    .replace(/^page-/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export const toCamelCase = (value = '') =>
  String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join('');

export const CENTER_SLUG_MAP = {
  'Framework Core': 'framework-core',
  'Sample Solution': 'sample-solution',
  'Hybrid Delivery': 'hybrid-delivery',
  'Shared Module': 'shared',
};

export const buildCenterSlug = (center = '') => CENTER_SLUG_MAP[String(center || '').trim()] || toKebabCase(center) || 'shared';

export const buildPageSlug = (pageCode = '') => toKebabCase(pageCode);

export const buildDefaultRoute = (pageCode = '', center = '') => {
  const pageSlug = buildPageSlug(pageCode);
  if (!pageSlug) {
    return '';
  }
  return `/${buildCenterSlug(center)}/${pageSlug}`;
};

export const buildDefaultPackageFolderName = (pageCode = '', center = '') => {
  const pageSlug = buildPageSlug(pageCode);
  if (!pageSlug) {
    return '';
  }
  return `page-${buildCenterSlug(center)}-${pageSlug}`;
};

export const buildDefaultComponentPath = (pageCode = '', center = '') => {
  const packageFolderName = buildDefaultPackageFolderName(pageCode, center);
  if (!packageFolderName) {
    return '';
  }
  return `${packageFolderName}/index.vue`;
};
