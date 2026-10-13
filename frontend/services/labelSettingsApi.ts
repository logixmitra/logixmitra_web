import { API_BASE_URL } from "./config";
import type { LabelSettings } from "../src/config/labelSettings";
import { DEFAULT_LABEL_SETTINGS, mergeLabelSettings } from "../src/config/labelSettings";

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token && token !== "undefined" && token !== "null") {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const labelSettingsApi = {
  get: async (sellerId: string | number) => {
    const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}/label-settings`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      return {
        sellerId,
        settings: { ...DEFAULT_LABEL_SETTINGS },
      };
    }
    const data = await response.json();
    return {
      sellerId: data?.data?.sellerId ?? sellerId,
      sellerName: data?.data?.sellerName,
      company: data?.data?.company,
      settings: mergeLabelSettings(data?.data?.settings),
    };
  },

  update: async (sellerId: string | number, settings: Partial<LabelSettings>) => {
    const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}/label-settings`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ settings }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to save label settings");
    }
    return {
      sellerId: data?.data?.sellerId ?? sellerId,
      settings: mergeLabelSettings(data?.data?.settings),
    };
  },
};

export default labelSettingsApi;
