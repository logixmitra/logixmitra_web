import { IIntegrationService } from "./types";
import { Order, Platform } from "@/types/order";

export class CustomService implements IIntegrationService {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      return !!(this.config.credentials?.storeUrl && this.config.credentials?.apiKey);
    } catch {
      return false;
    }
  }

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockOrders: Partial<Order>[] = [
      {
        id: `CUST-${Math.floor(Math.random() * 10000)}`,
        customer: "Alex Turner",
        seller: "Custom Store",
        courier: "Speedy Delivery",
        status: "Shipped",
        amount: "$299.99",
        date: new Date().toISOString().split('T')[0],
        awb: "SPD" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "Austin, TX",
        phone: "+1 512-555-0345",
        address: "432 Congress Ave, Austin, TX 78701",
        platform: "Custom",
        platformOrderId: `CUST-${Date.now()}`
      },
      {
        id: `CUST-${Math.floor(Math.random() * 10000)}`,
        customer: "Emma Wilson",
        seller: "Custom Store",
        courier: "FastShip",
        status: "Delivered",
        amount: "$78.50",
        date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
        awb: "FST" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "Denver, CO",
        phone: "+1 303-555-0567",
        address: "765 16th Street, Denver, CO 80202",
        platform: "Custom",
        platformOrderId: `CUST-${Date.now() - 3000}`
      }
    ];

    return mockOrders;
  }
}