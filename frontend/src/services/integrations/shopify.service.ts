import { IIntegrationService } from "./types";
import { Order } from "@/types/order";
import { API_BASE_URL } from "../../../services/config";
import { getuserid } from "../../../services/getbasicdata";

function normalizeShopifyShop(storeUrl: unknown): string {
  return String(storeUrl ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .replace(/\.myshopify\.com.*/i, "")
    .split("/")[0]
    .replace(/\s+/g, "");
}

export class ShopifyService implements IIntegrationService {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  private getCredentials() {
    const creds = this.config?.credentials || {};
    const storeUrl = normalizeShopifyShop(creds.storeUrl);
    const clientId = String(creds.clientid ?? creds.clientId ?? "");
    const clientSecret = String(creds.accessToken ?? creds.clientSecret ?? "");
    return { storeUrl, clientId, clientSecret };
  }

  async testConnection(): Promise<boolean> {
    try {
      const { storeUrl, clientId, clientSecret } = this.getCredentials();
      if (!storeUrl || !clientId || !clientSecret) return false;

      const response = await fetch(`${API_BASE_URL}/integrations/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "Shopify",
          credentials: {
            storeUrl,
            clientid: clientId,
            accessToken: clientSecret,
          },
        }),
      });

      if (!response.ok) return false;
      const data = await response.json().catch(() => ({}));
      return Boolean(data?.success);
    } catch {
      return false;
    }
  }

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]> {
    const { storeUrl, clientId, clientSecret } = this.getCredentials();
    if (!storeUrl || !clientId || !clientSecret) {
      throw new Error("Shopify credentials are not configured properly");
    }

    const response = await fetch(`${API_BASE_URL}/integrations/syncsopify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SHOP: storeUrl,
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        user_id: getuserid(),
        ordernumlist: [],
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || "Failed to fetch Shopify orders");
    }

    return Array.isArray(data?.data) ? data.data : [];
  }
}
