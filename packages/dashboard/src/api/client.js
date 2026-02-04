import axios from 'axios';

const CONTROL_PLANE_URL = process.env.REACT_APP_CONTROL_PLANE_URL || 'http://localhost:3002';
const REPORTING_URL = process.env.REACT_APP_REPORTING_URL || 'http://localhost:3004';

const TOKEN_KEY = 'b2b_ad_platform_token';
const USER_KEY = 'b2b_ad_platform_user';

// Create axios instances
const controlPlaneClient = axios.create({
  baseURL: CONTROL_PLANE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const reportingClient = axios.create({
  baseURL: REPORTING_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptors to add auth token
controlPlaneClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

reportingClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptors to handle auth errors
const handleAuthError = (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

controlPlaneClient.interceptors.response.use(
  (response) => response,
  handleAuthError
);

reportingClient.interceptors.response.use(
  (response) => response,
  handleAuthError
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await controlPlaneClient.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      if (response.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  signup: async (email, password, organizationName) => {
    const response = await controlPlaneClient.post('/auth/signup', {
      email,
      password,
      organizationName,
    });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      if (response.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
};

// Ad Units API
export const adUnitsAPI = {
  getAll: async () => {
    const response = await controlPlaneClient.get('/ad-units');
    return response.data;
  },

  getById: async (id) => {
    const response = await controlPlaneClient.get(`/ad-units/${id}`);
    return response.data;
  },

  create: async (adUnitData) => {
    const response = await controlPlaneClient.post('/ad-units', adUnitData);
    return response.data;
  },

  update: async (id, adUnitData) => {
    const response = await controlPlaneClient.put(`/ad-units/${id}`, adUnitData);
    return response.data;
  },

  delete: async (id) => {
    const response = await controlPlaneClient.delete(`/ad-units/${id}`);
    return response.data;
  },
};

// Analytics/Reporting API
export const analyticsAPI = {
  getMetrics: async (startDate, endDate, adUnitId = null) => {
    const params = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
    if (adUnitId) {
      params.ad_unit_id = adUnitId;
    }
    const response = await reportingClient.get('/metrics', { params });
    return response.data;
  },

  getDailyMetrics: async (startDate, endDate, adUnitId = null) => {
    // For now, return the same as getMetrics since /metrics/daily doesn't exist yet
    return await analyticsAPI.getMetrics(startDate, endDate, adUnitId);
  },

  getAdUnitPerformance: async (startDate, endDate) => {
    // For now, return empty array since /metrics/ad-units doesn't exist yet
    return [];
  },
};

export default {
  authAPI,
  adUnitsAPI,
  analyticsAPI,
};
