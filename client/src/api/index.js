import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

// ─── Session Endpoints ─────────────────────────
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.patch(`/sessions/${id}`, data);
export const getSessionStats = () => api.get('/sessions/stats');
export const getDashboard = () => api.get('/sessions/dashboard');
export const getDashboardTrends = () => api.get('/sessions/dashboard/trends');
export const getDashboardGravity = () => api.get('/sessions/dashboard/gravity');

// ─── Contract Endpoints ────────────────────────
export const createContract = (data) => api.post('/contracts', data);
export const getCurrentContract = () => api.get('/contracts/current');
export const getContractReview = () => api.get('/contracts/review');

// ─── Plan Endpoints ────────────────────────────
export const generatePlan = (data) => api.post('/plan/generate', data);

export default api;