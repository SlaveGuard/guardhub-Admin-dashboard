import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAdminAuthStore } from '../store/adminAuthStore';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
if (!configuredApiUrl) throw new Error('Missing VITE_API_URL');
export const API_URL = configuredApiUrl;

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const adminApiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

function isAuthRequest(url: string) {
  return url.includes('/admin/auth/login') || url.includes('/admin/auth/refresh');
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAdminAuthStore.getState();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = adminApiClient
      .post('/admin/auth/refresh', { refreshToken })
      .then((res) => {
        const next = res.data.accessToken as string;
        const nextRefresh = res.data.refreshToken as string;
        if (!next || !nextRefresh) throw new Error('Missing tokens in refresh response');
        setTokens(next, nextRefresh);
        return next;
      })
      .catch((err) => {
        logout();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

adminApiClient.interceptors.request.use((config) => {
  const token = useAdminAuthStore.getState().token;
  if (token && config.headers) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

adminApiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const url = String(error.config?.url ?? '');
    const original = error.config as RetriableConfig | undefined;
    const { token, refreshToken, logout } = useAdminAuthStore.getState();
    if (error.response?.status === 401 && token && refreshToken && original && !original._retry && !isAuthRequest(url)) {
      original._retry = true;
      try {
        const next = await refreshAccessToken();
        if (next && original.headers) original.headers.Authorization = 'Bearer ' + next;
        return adminApiClient(original);
      } catch {
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    if (error.response?.status === 401 && token && !isAuthRequest(url)) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
