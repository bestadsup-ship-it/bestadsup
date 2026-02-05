import axios from 'axios';

// Auto-detect the correct API URL
// In production (Netlify), use /.netlify/functions
// In development, use localhost:3002 for backward compatibility
const getApiUrl = () => {
  // Check if we're on a Netlify domain or custom domain (production)
  const hostname = window.location.hostname;
  const isLocalDev = hostname === 'localhost' ||
                     hostname === '127.0.0.1' ||
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.startsWith('172.');

  // Production: Use Netlify Functions
  if (!isLocalDev) {
    return '/.netlify/functions';
  }

  // Development: check if environment variable is set
  if (process.env.REACT_APP_CONTROL_PLANE_URL) {
    return process.env.REACT_APP_CONTROL_PLANE_URL;
  }

  // Development fallback: use localhost backend
  return 'http://localhost:3002';
};

const API_URL = getApiUrl();

const TOKEN_KEY = 'b2b_ad_platform_token';
const USER_KEY = 'b2b_ad_platform_user';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
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

apiClient.interceptors.response.use(
  (response) => response,
  handleAuthError
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth-login', { email, password });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      if (response.data.account) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.account));
      }
    }
    return response.data;
  },

  signup: async (email, password, organizationName) => {
    const response = await apiClient.post('/auth-signup', {
      email,
      password,
      name: organizationName,
    });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      if (response.data.account) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.account));
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

// Ad Units API (placeholder for future implementation)
export const adUnitsAPI = {
  getAll: async () => {
    // TODO: Implement Netlify Function for ad-units
    return [];
  },

  getById: async (id) => {
    return null;
  },

  create: async (adUnitData) => {
    return null;
  },

  update: async (id, adUnitData) => {
    return null;
  },

  delete: async (id) => {
    return null;
  },
};

// Analytics/Reporting API (placeholder for future implementation)
export const analyticsAPI = {
  getMetrics: async (startDate, endDate, adUnitId = null) => {
    // TODO: Implement Netlify Function for analytics
    return { impressions: 0, clicks: 0, revenue: 0 };
  },

  getDailyMetrics: async (startDate, endDate, adUnitId = null) => {
    return [];
  },

  getAdUnitPerformance: async (startDate, endDate) => {
    return [];
  },
};

// Posts API
export const postsAPI = {
  getAll: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts', {
      params: { limit, offset },
    });
    return response.data;
  },

  getMyPosts: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/my-posts', {
      params: { limit, offset },
    });
    return response.data;
  },

  create: async (postData) => {
    const response = await apiClient.post('/posts', postData);
    return response.data;
  },

  like: async (postId) => {
    const response = await apiClient.post(`/posts/${postId}/like`);
    return response.data;
  },

  unlike: async (postId) => {
    const response = await apiClient.delete(`/posts/${postId}/like`);
    return response.data;
  },

  delete: async (postId) => {
    const response = await apiClient.delete(`/posts/${postId}`);
    return response.data;
  },
};

export default {
  authAPI,
  adUnitsAPI,
  analyticsAPI,
  postsAPI,
};
