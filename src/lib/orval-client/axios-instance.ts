import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';

const DEFAULT_API_URL = 'http://localhost:8080';
const DEFAULT_BACKDOOR_API_URL = 'https://cqi.ustp.edu.ph/dev';

const BACKDOOR_PREFIXES = [
  '/EnrollmentBackdoor',
  '/User',
  '/College',
  '/Cycle',
  '/AcademicProgram',
  '/Course',
];

const getApiBaseUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) {
    return undefined;
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  const isBackdoorRequest = BACKDOOR_PREFIXES.some((prefix) => normalizedUrl.startsWith(prefix));

  return isBackdoorRequest
    ? (import.meta.env.VITE_APP_API_BACKDOOR_URL ?? DEFAULT_BACKDOOR_API_URL)
    : (import.meta.env.VITE_APP_API_URL ?? DEFAULT_API_URL);
};

const AXIOS_INSTANCE = axios.create();

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');

  if (config.url) {
    config.baseURL = getApiBaseUrl(config.url);
  }

  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    config.headers = headers;
  }

  return config;
});

export const customInstance = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await AXIOS_INSTANCE.request<T>(config);
  return response.data;
};

export default customInstance;
