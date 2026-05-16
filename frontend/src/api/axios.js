import axios from 'axios';

// __API_BASE_URL__ is injected by Vite's define at build time (see vite.config.js)
// Fallback chain: define → env var → hardcoded production URL
const API_URL = (typeof __API_BASE_URL__ !== 'undefined' ? __API_BASE_URL__ : null)
  || import.meta.env.VITE_API_URL
  || 'https://backend-production-e5dc6.up.railway.app';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
