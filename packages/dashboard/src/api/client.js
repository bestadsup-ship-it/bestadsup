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

// Posts API - Portfolio posts for creator showcases
export const postsAPI = {
  getAll: async (limit = 50, offset = 0, category = null, account_id = null) => {
    const params = { limit, offset };
    if (category) params.category = category;
    if (account_id) params.account_id = account_id;

    const response = await apiClient.get('/posts', { params });
    return response.data;
  },

  getMyPosts: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/posts/my-posts', {
      params: { limit, offset },
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/posts/${id}`);
    return response.data;
  },

  create: async (postData) => {
    const response = await apiClient.post('/posts', postData);
    return response.data;
  },

  update: async (id, postData) => {
    const response = await apiClient.patch(`/posts/${id}`, postData);
    return response.data;
  },

  delete: async (postId) => {
    const response = await apiClient.delete(`/posts/${postId}`);
    return response.data;
  },
};

// Comments API - Removed (not needed for marketplace)

// Profile API
export const profileAPI = {
  getMyProfile: async () => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.patch('/profile', profileData);
    return response.data;
  },
};

// Accounts API - Removed (not needed for marketplace)

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

// Services API
export const servicesAPI = {
  // Get all services with optional filters
  getAll: async (filters = {}) => {
    const { category, creator_id, verified_only, limit, offset } = filters;
    const params = {};
    if (category) params.category = category;
    if (creator_id) params.creator_id = creator_id;
    if (verified_only) params.verified_only = verified_only;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await apiClient.get('/services', { params });
    return response.data;
  },

  // Get service categories
  getCategories: async () => {
    const response = await apiClient.get('/services/categories');
    return response.data;
  },

  // Get single service by ID
  getById: async (id) => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  // Create new service
  create: async (serviceData) => {
    const response = await apiClient.post('/services', serviceData);
    return response.data;
  },

  // Update service
  update: async (id, serviceData) => {
    const response = await apiClient.put(`/services/${id}`, serviceData);
    return response.data;
  },

  // Delete service
  delete: async (id) => {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
  },
};

// Verification API
export const verificationAPI = {
  // Get verification badges
  getBadges: async () => {
    const response = await apiClient.get('/verification/badges');
    return response.data;
  },

  // Get verified metrics
  getMetrics: async (verifiedOnly = true) => {
    const response = await apiClient.get('/verification/metrics', {
      params: { verified_only: verifiedOnly },
    });
    return response.data;
  },

  // Add a new metric
  addMetric: async (metricData) => {
    const response = await apiClient.post('/verification/metrics', metricData);
    return response.data;
  },

  // Get verification requests
  getRequests: async () => {
    const response = await apiClient.get('/verification/requests');
    return response.data;
  },

  // Create verification request
  createRequest: async (requestData) => {
    const response = await apiClient.post('/verification/requests', requestData);
    return response.data;
  },

  // Get third-party connections
  getConnections: async () => {
    const response = await apiClient.get('/verification/connections');
    return response.data;
  },

  // Get verification stats
  getStats: async () => {
    const response = await apiClient.get('/verification/stats');
    return response.data;
  },

  // Disconnect a service
  disconnectService: async (serviceName) => {
    const response = await apiClient.delete(`/verification/connections/${serviceName}`);
    return response.data;
  },

  // Initiate OAuth flow for a service
  initiateOAuth: async (serviceName) => {
    const response = await apiClient.post('/verification/oauth/initiate', { serviceName });
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  // Get all orders for current user (buyer or creator)
  getAll: async (filters = {}) => {
    const { status, role, limit, offset } = filters;
    const params = {};
    if (status) params.status = status;
    if (role) params.role = role;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  // Get single order by ID
  getById: async (id) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  // Create new order
  create: async (orderData) => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  // Update order status
  updateStatus: async (id, status, notes = null) => {
    const response = await apiClient.patch(`/orders/${id}/status`, { status, notes });
    return response.data;
  },

  // Get order messages
  getMessages: async (id) => {
    const response = await apiClient.get(`/orders/${id}/messages`);
    return response.data;
  },

  // Send message
  sendMessage: async (id, message, attachments = []) => {
    const response = await apiClient.post(`/orders/${id}/messages`, { message, attachments });
    return response.data;
  },

  // Get deliverables
  getDeliverables: async (id) => {
    const response = await apiClient.get(`/orders/${id}/deliverables`);
    return response.data;
  },

  // Upload deliverable
  uploadDeliverable: async (id, deliverableData) => {
    const response = await apiClient.post(`/orders/${id}/deliverables`, deliverableData);
    return response.data;
  },

  // Approve/reject deliverable
  updateDeliverable: async (orderId, deliverableId, status, reason = null) => {
    const response = await apiClient.patch(`/orders/${orderId}/deliverables/${deliverableId}`, {
      status,
      rejection_reason: reason,
    });
    return response.data;
  },

  // Get order timeline
  getTimeline: async (id) => {
    const response = await apiClient.get(`/orders/${id}/timeline`);
    return response.data;
  },

  // Request revision
  requestRevision: async (id, description) => {
    const response = await apiClient.post(`/orders/${id}/revisions`, { description });
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  // Create payment intent for an order
  createPaymentIntent: async (orderId) => {
    const response = await apiClient.post('/payments/create-payment-intent', {
      order_id: orderId,
    });
    return response.data;
  },

  // Confirm payment after successful Stripe checkout
  confirmPayment: async (paymentIntentId) => {
    const response = await apiClient.post('/payments/confirm-payment', {
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  },

  // Get payment status for an order
  getPaymentStatus: async (orderId) => {
    const response = await apiClient.get(`/payments/status/${orderId}`);
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  // Create a review for an order
  create: async (reviewData) => {
    const response = await apiClient.post('/reviews', reviewData);
    return response.data;
  },

  // Get reviews for a product
  getByProduct: async (productId, page = 1, limit = 10) => {
    const response = await apiClient.get(`/reviews/product/${productId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get reviews for a creator
  getByCreator: async (creatorId, page = 1, limit = 10) => {
    const response = await apiClient.get(`/reviews/creator/${creatorId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get rating stats for a product
  getProductStats: async (productId) => {
    const response = await apiClient.get(`/reviews/stats/product/${productId}`);
    return response.data;
  },

  // Get rating stats for a creator
  getCreatorStats: async (creatorId) => {
    const response = await apiClient.get(`/reviews/stats/creator/${creatorId}`);
    return response.data;
  },

  // Get review for a specific order
  getByOrder: async (orderId) => {
    const response = await apiClient.get(`/reviews/order/${orderId}`);
    return response.data;
  },

  // Update a review
  update: async (reviewId, reviewData) => {
    const response = await apiClient.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  // Add creator response to a review
  addResponse: async (reviewId, responseText) => {
    const response = await apiClient.post(`/reviews/${reviewId}/response`, {
      creator_response: responseText,
    });
    return response.data;
  },

  // Flag a review for moderation
  flag: async (reviewId, flagReason) => {
    const response = await apiClient.post(`/reviews/${reviewId}/flag`, {
      flag_reason: flagReason,
    });
    return response.data;
  },

  // Delete a review
  delete: async (reviewId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
  },
};

// Notifications API - Removed (will be reimplemented for project updates)
// Messages API - Removed (replaced by project_messages in projects table)

export default {
  authAPI,
  adUnitsAPI,
  analyticsAPI,
  postsAPI,
  profileAPI,
  productsAPI,
  servicesAPI,
  cartAPI,
  verificationAPI,
  ordersAPI,
  paymentsAPI,
  reviewsAPI,
};
