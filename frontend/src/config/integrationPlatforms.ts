export interface OrderChannelPlatform {
  id: string;
  name: string;
  color: string;
  logoText: string;
}

export interface OmsPlatform {
  id: string;
  name: string;
  color: string;
  logoText: string;
  guideUrl?: string;
}

export const ORDER_CHANNEL_PLATFORMS: OrderChannelPlatform[] = [
  { id: "shopify", name: "Shopify", color: "#96bf48", logoText: "S" },
  { id: "woocommerce", name: "WooCommerce", color: "#7f54b3", logoText: "W" },
  { id: "cscart", name: "CSCart", color: "#2563eb", logoText: "CS" },
  { id: "opencart", name: "OpenCart", color: "#1dc9c9", logoText: "OC" },
  { id: "amazon", name: "Amazon Channel", color: "#ff9900", logoText: "a" },
];

export const OMS_PLATFORMS: OmsPlatform[] = [
  { id: "omsguru", name: "Omsguru", color: "#0ea5e9", logoText: "OG" },
  { id: "easyecom", name: "Easyecom", color: "#6366f1", logoText: "EE" },
  { id: "unicommerce", name: "Unicommerce", color: "#059669", logoText: "UC" },
  { id: "dotpe", name: "DotPe", color: "#dc2626", logoText: "DP" },
  { id: "vinculum", name: "Vinculum", color: "#0891b2", logoText: "VN" },
  { id: "pragma", name: "Pragma", color: "#7c3aed", logoText: "PR" },
  { id: "return-prime", name: "Return-Prime", color: "#ea580c", logoText: "RP" },
  { id: "clickpost", name: "Clickpost", color: "#0284c7", logoText: "CP" },
  { id: "shoopy", name: "Shoopy", color: "#16a34a", logoText: "SH" },
];

export interface ConnectedChannel {
  id: string;
  channel: string;
  channelLabel: string;
  storeId: string;
  storeName: string;
  connectionStatus: "Active" | "In-Active";
  status: "Active" | "In-Active";
  lastSync: string;
}
