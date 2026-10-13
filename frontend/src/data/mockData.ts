import { useState } from "react";

// Mock data types
export interface Permission {
  id: string;
  name: string;
  module: string;
  description: string;
}

// CRUD permission actions
export type PermissionAction = "create" | "read" | "update" | "delete";

// Module-wise CRUD permissions for roles
export interface ModulePermission {
  module: string;
  actions: PermissionAction[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // legacy permission IDs
  modulePermissions: ModulePermission[];
  usersCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "blocked";
  avatar?: string;
  joinedAt: string;
}

// All available modules (aligned with API defaultModules + navigation titles)
export const allModules = [
  "Dashboard",
  "Orders",
  "NDR",
  "NDR/RTO",
  "Settings",
  "Label Customization",
  "Warehouse",
  "Billing",
  "Finance",
  "Finance & COD",
  "Wallet Recharge",
  "Subscription",
  "Subscriptions",
  "Disputes",
  "Weight Dispute",
  "Credit & Exposure",
  "Tools",
  "Rate Calculator",
  "Couriers",
  "Sellers",
  "Reports",
  "Shipment Report",
  "Risk & Fraud",
  "Integrations",
  "Order Channels",
  "OMS",
  "EDD Widget",
  "API Integration",
  "Others",
  "Roles",
  "Permissions",
  "Users",
  "Support",
  "Notifications",
  "Audit Logs",
  "System Monitor",
  "System",
];

// Mock permissions by module (legacy)
export const mockPermissions: Permission[] = [
  { id: "p1", name: "View Dashboard", module: "Dashboard", description: "Access the main dashboard overview" },
  { id: "p2", name: "View Analytics", module: "Dashboard", description: "Access analytics and reports" },
  { id: "p3", name: "View Orders", module: "Order Management", description: "View all orders" },
  { id: "p4", name: "Create Orders", module: "Order Management", description: "Create new orders" },
  { id: "p5", name: "Edit Orders", module: "Order Management", description: "Modify existing orders" },
  { id: "p6", name: "Delete Orders", module: "Order Management", description: "Delete orders" },
  { id: "p7", name: "Bulk Actions", module: "Order Management", description: "Perform bulk order actions" },
  { id: "p8", name: "View Sellers", module: "Seller Management", description: "View seller list" },
  { id: "p9", name: "Approve Sellers", module: "Seller Management", description: "Approve or reject sellers" },
  { id: "p10", name: "Block Sellers", module: "Seller Management", description: "Block or unblock sellers" },
  { id: "p11", name: "Manage KYC", module: "Seller Management", description: "Manage seller KYC verification" },
  { id: "p12", name: "View Couriers", module: "Courier Management", description: "View courier partners" },
  { id: "p13", name: "Add Couriers", module: "Courier Management", description: "Add new courier partners" },
  { id: "p14", name: "Manage Rates", module: "Courier Management", description: "Manage courier rate cards" },
  { id: "p15", name: "View Finance", module: "Finance & COD", description: "View financial reports" },
  { id: "p16", name: "Manage COD", module: "Finance & COD", description: "Manage COD remittances" },
  { id: "p17", name: "Manage Wallet", module: "Finance & COD", description: "Credit/debit seller wallets" },
  { id: "p18", name: "View Users", module: "User Management", description: "View all users" },
  { id: "p19", name: "Manage Roles", module: "User Management", description: "Create and edit roles" },
  { id: "p20", name: "Assign Permissions", module: "User Management", description: "Assign permissions to roles" },
  { id: "p21", name: "Manage Users", module: "User Management", description: "Create, edit, delete users" },
  { id: "p22", name: "View Tickets", module: "Support", description: "View support tickets" },
  { id: "p23", name: "Manage Tickets", module: "Support", description: "Respond to and manage tickets" },
  { id: "p24", name: "View Logs", module: "System", description: "View audit and activity logs" },
  { id: "p25", name: "System Settings", module: "System", description: "Access platform configuration" },
];

const allActions: PermissionAction[] = ["create", "read", "update", "delete"];

export const mockRoles: Role[] = [
  {
    id: "r1",
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: mockPermissions.map((p) => p.id),
    modulePermissions: allModules.map((m) => ({ module: m, actions: [...allActions] })),
    usersCount: 2,
  },
  {
    id: "r2",
    name: "Admin",
    description: "Full access",
    permissions: ["p1", "p2", "p3", "p4", "p5", "p7", "p8", "p9", "p10", "p11", "p12", "p15", "p16", "p18", "p22", "p23"],
    modulePermissions: allModules.map((m) => ({ module: m, actions: [...allActions] })),
    usersCount: 5,
  },
  {
    id: "r3",
    name: "Manager",
    description: "Manage operations",
    permissions: ["p1", "p3", "p4", "p5", "p8", "p9", "p12", "p15", "p22", "p23"],
    modulePermissions: allModules.map((m) => ({ module: m, actions: ["read", "update"] })),
    usersCount: 8,
  },
  {
    id: "r4",
    name: "Seller",
    description: "Seller-level access for managing their own orders and shipments",
    permissions: ["p1", "p3", "p4", "p5", "p15"],
    modulePermissions: [
      { module: "Orders", actions: ["create", "read", "update"] },
      { module: "Warehouse", actions: ["read"] },
      { module: "NDR/RTO", actions: ["read"] },
      { module: "Finance", actions: ["read"] },
      { module: "Support", actions: ["create", "read"] },
      { module: "Notifications", actions: ["read"] },
    ],
    usersCount: 142,
  },
  {
    id: "r5",
    name: "Finance Manager",
    description: "Access to financial reports, COD management, and wallet operations",
    permissions: ["p1", "p2", "p3", "p15", "p16", "p17"],
    modulePermissions: [
      { module: "Finance", actions: ["create", "read", "update", "delete"] },
      { module: "Orders", actions: ["read"] },
      { module: "Reports", actions: ["read"] },
      { module: "Weight Dispute", actions: ["read", "update"] },
      { module: "Disputes", actions: ["read", "update"] },
    ],
    usersCount: 3,
  },
  {
    id: "r6",
    name: "Support Agent",
    description: "Handle customer support tickets and order queries",
    permissions: ["p1", "p3", "p8", "p22", "p23"],
    modulePermissions: [
      { module: "Support", actions: ["create", "read", "update"] },
      { module: "Orders", actions: ["read"] },
      { module: "Sellers", actions: ["read"] },
      { module: "NDR/RTO", actions: ["read"] },
    ],
    usersCount: 8,
  },
];

export const mockUsers: User[] = [
  { id: "u1", name: "Rajesh Kumar", email: "rajesh@logixmitra.com", role: "Super Admin", status: "active", joinedAt: "2024-01-15" },
  { id: "u2", name: "Priya Sharma", email: "priya@logixmitra.com", role: "Admin", status: "active", joinedAt: "2024-02-20" },
  { id: "u3", name: "Amit Patel", email: "amit@logixmitra.com", role: "Finance Manager", status: "active", joinedAt: "2024-03-10" },
  { id: "u4", name: "Sneha Gupta", email: "sneha@seller.com", role: "Seller", status: "active", joinedAt: "2024-04-05" },
  { id: "u5", name: "Vikram Singh", email: "vikram@seller.com", role: "Seller", status: "blocked", joinedAt: "2024-05-12" },
  { id: "u6", name: "Ananya Reddy", email: "ananya@logixmitra.com", role: "Support Agent", status: "active", joinedAt: "2024-06-01" },
  { id: "u7", name: "Karan Mehta", email: "karan@user.com", role: "Manager", status: "active", joinedAt: "2024-07-18" },
  { id: "u8", name: "Divya Joshi", email: "divya@logixmitra.com", role: "Admin", status: "active", joinedAt: "2024-08-22" },
];

// Helper to get permissions grouped by module
export function getPermissionsByModule(): Record<string, Permission[]> {
  return mockPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);
}
