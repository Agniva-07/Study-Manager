import axios from 'axios';

function resolveBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw && typeof raw === 'string') return raw.replace(/\/+$/, '');
  // Fallback to same-origin (useful for local proxies / previews)
  return window.location.origin;
}

const api = axios.create({
  baseURL: `${resolveBaseUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ REQUEST INTERCEPTOR - Add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && token !== 'null' && token !== '') {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`📤 [${config.method.toUpperCase()}] ${config.url} - Authorization header set`);
    } else {
      console.log(`📤 [${config.method.toUpperCase()}] ${config.url} - No token in localStorage`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response?.data?.success === true && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
      console.log(`📥 [${response.status}] Response - extracted data`);
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    console.log(`❌ [HTTP ${status}]`, error?.response?.data?.message || error?.message);
    
    if (status === 401) {
      console.log('🔓 401 Unauthorized - clearing auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    }
    
    if (error?.response?.data?.success === false) {
      return Promise.reject(new Error(error.response.data.message || 'Request failed'));
    }
    
    return Promise.reject(error);
  }
);

// ─── Session Endpoints ─────────────────────────
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.patch(`/sessions/${id}`, data);
export const getSessionStats = () => api.get('/sessions/stats');
export const getDashboard = () => api.get('/sessions/dashboard');
export const getDashboardTrends = () => api.get('/sessions/dashboard/trends');
export const getDashboardGravity = () => api.get('/sessions/dashboard/gravity');
export const getBuilderStats = (sectionName) => api.get(`/sections/${sectionName}/builder-stats`);
export const getLeaderboard = () => api.get('/leaderboard');
export const getPublicProfile = (id) => api.get(`/users/${id}/profile`);
export const getWeeklyStats = (id) => api.get(`/users/${id}/weekly-stats`);

// ─── Analytics Endpoints ───────────────────────
export const getAnalyticsHeatmap = () => api.get('/analytics/heatmap');
export const getAnalyticsStreakDna = () => api.get('/analytics/streak-dna');
export const getAnalyticsEnergyProfile = () => api.get('/analytics/energy-profile');
export const getAnalyticsSummary = () => api.get('/analytics/summary');

// ─── Contract Endpoints ────────────────────────
export const createContract = (data) => api.post('/contracts', data);
export const getCurrentContract = () => api.get('/contracts/current');
export const getContractReview = () => api.get('/contracts/review');

// ─── Plan Endpoints ────────────────────────────
export const generatePlan = (data) => api.post('/plan/generate', data);

export default api;