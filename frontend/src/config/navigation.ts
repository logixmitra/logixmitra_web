import {
  LayoutDashboard, ShoppingCart, RotateCcw, Wallet, Calculator,
  BarChart3, Settings, Plug, Users, Truck, Warehouse, CreditCard,
  Scale, PiggyBank, Receipt, AlertTriangle, Shield, KeyRound,
  UserCog, LifeBuoy, Bell, FileText, Server, Layers, Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavChild {
  title: string;
  url: string;
}

export interface NavMenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  permissionlist?: string[];
  children?: NavChild[];
}

export interface NavSection {
  label: string;
  items: NavMenuItem[];
}

export const defaultNavSections: NavSection[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permissionlist: [] },
      { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
      { title: "NDR", url: "/dashboard/ndr-rto", icon: RotateCcw },
    ],
  },
  {
    label: "",
    items: [
      {
        title: "Billing",
        icon: Wallet,
        children: [
          { title: "Finance & COD", url: "/dashboard/finance" },
          { title: "Wallet Recharge", url: "/dashboard/wallet-recharge" },
          { title: "Subscription", url: "/dashboard/subscription" },
          { title: "Weight Dispute", url: "/dashboard/disputes" },
          { title: "Credit & Exposure", url: "/dashboard/credit" },
        ],
      },
      {
        title: "Tools",
        icon: Calculator,
        children: [
          { title: "Rate Calculator", url: "/dashboard/rate-calculator" },
          { title: "B2B", url: "/dashboard/b2b" },
          { title: "Couriers", url: "/dashboard/couriers" },
          { title: "Sellers", url: "/dashboard/sellers" },
          { title: "Label Customization", url: "/dashboard/label-customization" },
          { title: "Warehouse", url: "/dashboard/warehouse" },
        ],
      },
      {
        title: "Reports",
        icon: BarChart3,
        children: [
          { title: "Shipment Report", url: "/dashboard/reports" },
          { title: "Risk & Fraud", url: "/dashboard/risk" },
        ],
      },
      { title: "Settings", url: "/dashboard/settings", icon: Settings },
      {
        title: "Integrations",
        icon: Plug,
        children: [
          { title: "Order Channels", url: "/dashboard/integrations/channels" },
          { title: "OMS", url: "/dashboard/integrations/oms" },
          { title: "EDD Widget", url: "/dashboard/integrations/edd-widget" },
          { title: "API Integration", url: "/dashboard/integrations/api" },
        ],
      },
      {
        title: "Others",
        icon: Layers,
        children: [
          { title: "Roles", url: "/dashboard/roles" },
          { title: "Permissions", url: "/dashboard/permissions" },
          { title: "Users", url: "/dashboard/users" },
          { title: "Support", url: "/dashboard/support" },
          { title: "Notifications", url: "/dashboard/notifications" },
          { title: "Audit Logs", url: "/dashboard/audit-logs" },
          { title: "System Monitor", url: "/dashboard/system" },
        ],
      },
    ],
  },
];

export function filterNavByPermissions(
  sections: NavSection[],
  permissions: { module?: string }[],
  isAdmin: boolean
): NavSection[] {
  if (isAdmin) return sections;

  // Never expose admin-only tools to sellers even if they have parent "Tools" access
  const adminOnlyChildren = new Set([
    "Sellers",
    "Risk & Fraud",
    "Roles",
    "Permissions",
    "Users",
    "Audit Logs",
    "System Monitor",
  ]);

  const allowed = new Set(permissions.map((p) => p.module).filter(Boolean));

  const filterItem = (item: NavMenuItem): NavMenuItem | null => {
    if (item.children?.length) {
      const children = item.children.filter((c) => {
        if (adminOnlyChildren.has(c.title)) return false;
        return (
          allowed.has(c.title) ||
          allowed.has(item.title) ||
          (c.title === "Weight Dispute" && allowed.has("Disputes"))
        );
      });
      if (children.length === 0) return null;
      return { ...item, children };
    }
    if (adminOnlyChildren.has(item.title)) return null;
    if (allowed.has(item.title) || item.permissionlist?.length === 0) return item;
    return null;
  };

  return sections
    .map((section) => ({
      ...section,
      items: section.items.map(filterItem).filter(Boolean) as NavMenuItem[],
    }))
    .filter((s) => s.items.length > 0);
}
