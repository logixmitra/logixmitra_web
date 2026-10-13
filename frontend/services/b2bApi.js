import { API_BASE_URL } from './config';
import { getuserid, getuser } from './getbasicdata';

const API_URL = API_BASE_URL.replace(/\/?$/, '/');

async function request(method, path, data) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path.replace(/^\//, '')}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: method !== 'GET' && data !== undefined ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  return json;
}

export const b2bApi = {
  listRateCards: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `b2b/rate-cards${q ? `?${q}` : ''}`);
  },
  createRateCard: (data) => request('POST', 'b2b/rate-cards', data),
  updateRateCard: (id, data) => request('PUT', `b2b/rate-cards/${id}`, data),
  deleteRateCard: (id) => request('DELETE', `b2b/rate-cards/${id}`),

  quote: (data) => request('POST', 'b2b/quote', data),

  listOrders: (params = {}) => {
    const isAdmin = getuser()?.role === 'admin';
    const filters = { ...params };
    if (!isAdmin) filters.user_id = getuserid();
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request('GET', `b2b/orders${q ? `?${q}` : ''}`);
  },
  createOrder: (data) => {
    const isAdmin = getuser()?.role === 'admin';
    return request('POST', 'b2b/orders', {
      ...data,
      user_id: data.user_id || (!isAdmin ? getuserid() : data.user_id),
    });
  },
  bookOrder: (id, data) => request('POST', `b2b/orders/${id}/book`, data),

  listFreight: (params = {}) => {
    const isAdmin = getuser()?.role === 'admin';
    const filters = { ...params };
    if (!isAdmin) filters.user_id = getuserid();
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request('GET', `b2b/freight${q ? `?${q}` : ''}`);
  },
  createFreight: (data) => {
    const isAdmin = getuser()?.role === 'admin';
    return request('POST', 'b2b/freight', {
      ...data,
      user_id: data.user_id || (!isAdmin ? getuserid() : data.user_id),
    });
  },
  bookFreight: (id, data) => request('POST', `b2b/freight/${id}/book`, data),
  updateFreightPickup: (id, data) => request('PATCH', `b2b/freight/${id}/pickup`, data),
  uploadFreightEpod: (id, data) => request('PATCH', `b2b/freight/${id}/epod`, data),
};

export default b2bApi;
