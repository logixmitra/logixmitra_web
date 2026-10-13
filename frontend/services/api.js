import axios from 'axios';
import { API_BASE_URL } from './config';
class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
        return response.data;
      },
      (error) => {
        // console.error('API Error:', error.response || error.message);
        
        if (error.response) {
          const { status, data } = error.response;
          
          // Handle 401 Unauthorized
          if (status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
          
          return Promise.reject({
            message: data?.error || error.message,
            status,
            data: data?.data
          });
        }
        
        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
          return Promise.reject({
            message: 'Cannot connect to server. Please ensure backend is running.',
            networkError: true
          });
        }
        
        return Promise.reject({
          message: error.message || 'An unexpected error occurred',
          networkError: false
        });
      }
    );
  }

  setToken(token) {
    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('token', token);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      this.removeToken();
    }
  }

  removeToken() {
    localStorage.removeItem('token');
    delete this.api.defaults.headers.common['Authorization'];
  }

  initializeToken() {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    }
    return false;
  }

  // Auth endpoints
  async login(email, password) {
    try {
      const response = await this.api.post('/auth/login', { email, password });
      
      if (response.success && response.data?.token) {
        this.setToken(response.data.token);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      const response = await this.api.post('/auth/logout');
      this.removeToken();
      return response;
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  async getCurrentUser() {
    return this.api.get('/auth/me');
  }

  // Admin-only: switch into a seller account (returns seller user + token)
  async impersonate(id) {
    return this.api.post(`/auth/impersonate/${id}`);
  }

  async getAllUsers() {
    return this.api.get('/auth/users');
  }

  // Role endpoints
  async getRoles(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.api.get(`/roles/${queryParams ? '?' + queryParams : ''}`);
  }

  async getRolesWithPermissions() {
    return this.api.get('/roles/with-permissions');
  }

  async createRole(data) {
    return this.api.post('/roles/', data);
  }

  async updateRole(id, data) {
    return this.api.put(`/roles/${id}`, data);
  }

  async deleteRole(id) {
    return this.api.delete(`/roles/${id}`);
  }

  async getRolePermissionMatrix(roleId) {
    return this.api.get(`/roles/${roleId}/matrix`);
  }

  async updateRolePermissions(roleId, modulePermissions) {
    return this.api.put(`/roles/${roleId}/permissions`, { modulePermissions });
  }

  async resetRole(roleId) {
    return this.api.post(`/roles/${roleId}/reset`);
  }

  // Permission endpoints
  async getPermissions(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.api.get(`/permissions/${queryParams ? '?' + queryParams : ''}`);
  }

  async getModules() {
    return this.api.get('/permissions/modules');
  }

  async createPermission(data) {
    return this.api.post('/permissions/', data);
  }

  async updatePermission(id, data) {
    return this.api.put(`/permissions/${id}`, data);
  }

  async deletePermission(id) {
    return this.api.delete(`/permissions/${id}`);
  }

  // User endpoints
  async createUser(data) {
    return this.api.post('/users', data);
  }

  async updateUser(id, data) {
    return this.api.put(`/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.api.delete(`/users/${id}`);
  }

  async updateUserStatus(id, status) {
    return this.api.patch(`/users/${id}/status`, { status });
  }

  async resetUserPassword(id) {
    return this.api.post(`/users/${id}/reset-password`);
  }

  // Profile (self-service)
  async getProfile() {
    return this.api.get('/auth/profile');
  }

  async updateProfile(data) {
    return this.api.put('/auth/profile', data);
  }

  async changePassword(data) {
    return this.api.post('/auth/change-password', data);
  }

  async verifyPassword(currentPassword, email) {
    // email = the logged-in user's email; the backend resolves that account's
    // own row first and compares the stored bcrypt hash — never another user's.
    return this.api.post('/auth/verify-password', { currentPassword, email });
  }

  // Generic HTTP helpers used by pages
  get(url, config) {
    return this.api.get(url, config);
  }

  post(url, data, config) {
    return this.api.post(url, data, config);
  }

  put(url, data, config) {
    return this.api.put(url, data, config);
  }

  patch(url, data, config) {
    return this.api.patch(url, data, config);
  }

  delete(url, config) {
    return this.api.delete(url, config);
  }
}

export default new ApiService();