import { IIntegrationService } from "./types";
import { Order, Platform } from "@/types/order";

export class WooCommerceService implements IIntegrationService {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      return !!(this.config.credentials?.storeUrl && this.config.credentials?.apiKey && this.config.credentials?.apiSecret);
    } catch {
      return false;
    }
  }

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockOrders: Partial<Order>[] = [
      {
        id: `WC-${Math.floor(Math.random() * 10000)}`,
        customer: "Tom Brown",
        seller: "WooCommerce Store",
        courier: "USPS",
        status: "Delivered",
        amount: "$67.25",
        date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        awb: "9400" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "Chicago, IL",
        phone: "+1 312-555-0678",
        address: "567 Michigan Ave, Chicago, IL 60601",
        platform: "WooCommerce",
        platformOrderId: `WC-${Date.now()}`
      },
      {
        id: `WC-${Math.floor(Math.random() * 10000)}`,
        customer: "Lisa Davis",
        seller: "WooCommerce Store",
        courier: "DHL",
        status: "Pending",
        amount: "$156.00",
        date: new Date().toISOString().split('T')[0],
        awb: "DHL" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "Boston, MA",
        phone: "+1 617-555-0890",
        address: "890 Beacon Street, Boston, MA 02215",
        platform: "WooCommerce",
        platformOrderId: `WC-${Date.now() - 2000}`
      }
    ];

    return mockOrders;
  }
}