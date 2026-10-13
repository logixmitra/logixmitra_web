import { Order, Platform } from "@/types/order";

export interface IIntegrationService {
  fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]>;
  testConnection(): Promise<boolean>;
}

export type { Platform, Order, IntegrationConfig, SyncResult } from "@/types/order";