import axios from "axios";
import { AuthService } from "../../../services/auth";

// Clear local authToken if AuthService triggers logout
AuthService.addLogoutListener && AuthService.addLogoutListener(() => {
  try { authToken = null; } catch (e) { /* noop */ }
});

const baseURL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

apiClient.interceptors.request.use(
  async (config) => {
    if (authToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${authToken}`,
      };
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Network errors (no response available)
    if (!error || !error.response) {
      return Promise.reject({ ...error, message: error?.message || 'Network Error' });
    }

    const status = error.response.status;

    // Handle 401 Unauthorized: attempt silent refresh via AuthService then retry once
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Try quick access token fetch (may trigger session refresh inside AuthService)
        const newToken = await AuthService.getAccessToken();
        if (newToken && newToken !== authToken) {
          authToken = newToken;
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return apiClient(originalRequest);
        }

        // As a fallback, call getSession (which may perform refresh or logout)
        const session = await AuthService.getSession();
        if (session && session.tokens && session.tokens.accessToken) {
          authToken = session.tokens.accessToken;
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${authToken}`,
          };
          return apiClient(originalRequest);
        }

        // If we reach here, refresh failed — force logout
        await AuthService.logout();
        return Promise.reject(error);
      } catch (e) {
        console.warn('Token refresh failed', e);
        try { await AuthService.logout(); } catch (_){ }
        return Promise.reject(e);
      }
    }

    // For other errors, forward as-is
    return Promise.reject(error);
  },
);
