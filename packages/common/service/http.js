import axios from 'axios';

export const instance = axios.create({
  timeout: 10000,
  baseURL: '/api',
});

instance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = token;
      config.headers.token = token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
);

const http = {
  get(url, params, config = {}) {
    return instance({
      url,
      method: 'get',
      params,
      ...config,
    });
  },
  post(url, data, config = {}) {
    return instance({
      url,
      method: 'post',
      data,
      ...config,
    });
  },
};

export default http;
