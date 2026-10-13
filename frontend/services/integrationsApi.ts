import { API_BASE_URL } from "./config";

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token && token !== "undefined" && token !== "null") {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const integrationApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/integrations`, { headers: authHeaders() });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}`, { headers: authHeaders() });
    if (!response.ok) throw new Error("Failed to fetch integration");
    return response.json();
  },

  create: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create integration");
    return response.json();
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update integration");
    return response.json();
  },

  delete: async (id: string) => {
    await fetch(`${API_BASE_URL}/integrations/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  testConnection: async (platform: string, credentials: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}/integrations/test`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ platform, credentials }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.success);
  },

  syncShopify: async (payload: Record<string, unknown> = {}) => {
    const response = await fetch(`${API_BASE_URL}/integrations/syncsopify`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || "Shopify sync failed");
    }
    return data;
  },
};

export default integrationApi;
