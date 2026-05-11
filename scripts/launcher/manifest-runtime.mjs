import { loadAppManifests } from '../manifest-lib.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const loadRuntimeApps = () =>
  loadAppManifests().map(({ filePath, data }) => ({
    filePath,
    data: clone(data),
  }));

export const getEnabledApps = () => loadRuntimeApps().filter(({ data }) => data.status === 'enabled');

export const findRuntimeAppById = (appId) =>
  loadRuntimeApps().find(({ data }) => data.id === appId) || null;

export const getHostAppForMicro = (app) => {
  const hostAppId = app?.runtime?.hostAppId;
  if (!hostAppId) {
    return null;
  }
  return findRuntimeAppById(hostAppId);
};

export const toRuntimeSummary = (data) => ({
  id: data.id,
  name: data.name,
  title: data.title,
  description: data.description || '',
  appType: data.appType,
  source: data.source,
  status: data.status,
  planId: data.planId,
  loginPageType: data.loginPageType,
  homePageId: data.homePageId || '',
  build: data.build || {},
  runtime: data.runtime || {},
});
