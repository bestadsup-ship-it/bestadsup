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

// Determine auth endpoint paths based on environment
const getAuthPath = (endpoint) => {
  const hostname = window.location.hostname;
  const isLocalDev = hostname === 'localhost' ||
                     hostname === '127.0.0.1' ||
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.startsWith('172.');

  // In development, use Express routes like /auth/login
  if (isLocalDev) {
    return `/auth/${endpoint}`;
  }

  // In production (Netlify), use function paths like /auth-login
  return `/auth-${endpoint}`;
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post(getAuthPath('login'), { email, password });
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      if (response.data.account) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.account));
      }
    }
    return response.data;
  },

  signup: async (email, password, organizationName, accountType = 'creator') => {
    const response = await apiClient.post(getAuthPath('signup'), {
      email,
      password,
      name: organizationName,
      account_type: accountType,
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

  getByTag: async (tag, limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts', {
      params: { tag, limit, offset },
    });
    return response.data;
  },

  getMyPosts: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/my-posts', {
      params: { limit, offset },
    });
    return response.data;
  },

  getExplore: async (filter = 'trending', limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/explore', {
      params: { filter, limit, offset },
    });
    return response.data;
  },

  getFollowing: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/following', {
      params: { limit, offset },
    });
    return response.data;
  },

  getLiked: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/liked', {
      params: { limit, offset },
    });
    return response.data;
  },

  create: async (postData) => {
    const response = await apiClient.post('/posts', postData);
    return response.data;
  },

  getTrendingTags: async (limit = 15) => {
    const response = await apiClient.get('/tags/trending', {
      params: { limit },
    });
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

// Comments API
export const commentsAPI = {
  getForPost: async (postId) => {
    const response = await apiClient.get(`/comments/post/${postId}`);
    return response.data;
  },

  create: async (postId, commentData) => {
    const response = await apiClient.post(`/comments/post/${postId}`, commentData);
    return response.data;
  },

  delete: async (commentId) => {
    const response = await apiClient.delete(`/comments/${commentId}`);
    return response.data;
  },

  like: async (commentId) => {
    const response = await apiClient.post(`/comments/${commentId}/like`);
    return response.data;
  },

  unlike: async (commentId) => {
    const response = await apiClient.delete(`/comments/${commentId}/like`);
    return response.data;
  },
};

// Follows API
export const followsAPI = {
  follow: async (accountId) => {
    const response = await apiClient.post(`/follows/${accountId}`);
    return response.data;
  },

  unfollow: async (accountId) => {
    const response = await apiClient.delete(`/follows/${accountId}`);
    return response.data;
  },

  getFollowers: async () => {
    const response = await apiClient.get('/follows/followers');
    return response.data;
  },

  getFollowing: async () => {
    const response = await apiClient.get('/follows/following');
    return response.data;
  },

  checkFollowStatus: async (accountId) => {
    const response = await apiClient.get(`/follows/status/${accountId}`);
    return response.data;
  },
};

// Saves/Bookmarks API
export const savesAPI = {
  save: async (postId) => {
    const response = await apiClient.post(`/saves/${postId}`);
    return response.data;
  },

  unsave: async (postId) => {
    const response = await apiClient.delete(`/saves/${postId}`);
    return response.data;
  },

  getSaved: async () => {
    const response = await apiClient.get('/saves');
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  getMyProfile: async () => {
    const response = await apiClient.get('/accounts/me');
    return response.data;
  },

  getProfileByUsername: async (username) => {
    const response = await apiClient.get(`/profile/${username}`);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.patch('/accounts/me', profileData);
    return response.data;
  },
};

// Accounts API
export const accountsAPI = {
  getSuggested: async (limit = 10) => {
    const response = await apiClient.get('/accounts/suggested', {
      params: { limit },
    });
    return response.data;
  },
};

// Products API
export const productsAPI = {
  getAll: async (category = null) => {
    const response = await apiClient.get('/products', {
      params: category ? { category } : {},
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/products/categories');
    return response.data;
  },

  create: async (productData) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  update: async (id, productData) => {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};

// Cart API
export const cartAPI = {
  get: async () => {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  add: async (productId, quantity = 1) => {
    const response = await apiClient.post('/cart', { productId, quantity });
    return response.data;
  },

  update: async (itemId, quantity) => {
    const response = await apiClient.put(`/cart/${itemId}`, { quantity });
    return response.data;
  },

  remove: async (itemId) => {
    const response = await apiClient.delete(`/cart/${itemId}`);
    return response.data;
  },

  clear: async () => {
    const response = await apiClient.delete('/cart');
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async (filter = 'all', limit = 50, offset = 0) => {
    const response = await apiClient.get('/notifications', {
      params: { filter, limit, offset },
    });
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await apiClient.patch('/notifications/mark-read', {
      notificationId,
    });
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/mark-read', {
      markAll: true,
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/count');
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  getConversations: async () => {
    const response = await apiClient.get('/messages/conversations');
    return response.data;
  },

  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/messages/${conversationId}`);
    return response.data;
  },

  sendMessage: async (conversationId, content, recipientId = null) => {
    const response = await apiClient.post('/messages', {
      conversationId,
      content,
      recipientId,
    });
    return response.data;
  },
};

export default {
  authAPI,
  adUnitsAPI,
  analyticsAPI,
  postsAPI,
  commentsAPI,
  followsAPI,
  savesAPI,
  profileAPI,
  accountsAPI,
  productsAPI,
  cartAPI,
  notificationsAPI,
  messagesAPI,
};
