import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ ADD THIS BLOCK (IMPORTANT)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response?.data?.success === true && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    if (error?.response?.data?.success === false) {
      const message = error.response.data.message || 'Request failed';
      return Promise.reject(new Error(message));
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