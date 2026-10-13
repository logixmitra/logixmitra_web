import axios from 'axios';
import { API_BASE_URL } from './config';

const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sellerApi = {
  // Get all sellers with optional filters
  getAll: async (filters) => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/sellers?${params.toString()}`);
    return response.data.data;
  },

  // Get seller by ID
  getById: async (id) => {
    if (id == null || id === '' || id === 'undefined' || id === 'null') {
      throw new Error('Seller id is required');
    }
    const response = await api.get(`/sellers/${id}`);
    return response.data.data;
  },

  // Create new seller
  create: async (data) => {
    const response = await api.post('/sellers', data);
    return response.data.data;
  },

  // Update seller
  update: async (id, data) => {
    const response = await api.put(`/sellers/${id}`, data);
    return response.data.data;
  },

  // Delete seller
  delete: async (id) => {
    const response = await api.delete(`/sellers/${id}`);
    return response.data;
  },

  // Update seller status
  updateStatus: async (id, status) => {
    const response = await api.patch(`/sellers/${id}/status`, { status });
    return response.data.data;
  },

  // Update KYC status
  updateKycStatus: async (id, kycStatus) => {
    const response = await api.patch(`/sellers/${id}/kyc`, { kycStatus });
    return response.data.data;
  },

  // Approve seller
  approve: async (id) => {
    const response = await api.patch(`/sellers/${id}/approve`);
    return response.data.data;
  },

  // Update wallet balance
  updateWallet: async (id, data) => {
    const response = await api.patch(`/sellers/${id}/wallet`, data);
    return response.data.data;
  },

  // Update performance metrics
  updatePerformance: async (id, data) => {
    const response = await api.patch(`/sellers/${id}/performance`, data);
    return response.data.data;
  },

  // Get seller statistics
  getStats: async () => {
    const response = await api.get('/sellers/stats');
    return response.data.data;
  },

  // Bulk import sellers
  bulkImport: async (sellers) => {
    const response = await api.post('/sellers/bulk-import', { sellers });
    return response.data.data;
  },

  // Export sellers to CSV
  export: (sellers) => {
    const csv = [
      ['Name', 'Email', 'Company', 'Phone', 'GST', 'Status', 'KYC', 'Risk', 'Wallet', 'Score', 'RTO%', 'Subscription', 'Joined'].join(','),
      ...sellers.map(s => [
        s.name,
        s.email,
        s.company,
        s.phone,
        s.gst,
        s.status,
        s.kycStatus,
        s.riskCategory,
        s.walletBalance,
        s.performanceScore,
        s.rtoRate,
        s.subscription,
        s.joinedAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sellers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
};