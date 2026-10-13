import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import OrderWorkspaceToolbar from "@/components/orders/OrderWorkspaceToolbar";
import OrderFilterBar from "@/components/orders/OrderFilterBar";
import OrdersRichTable from "@/components/orders/OrdersRichTable";
import OrderFormFields from "@/components/orders/OrderFormFields";
import { computeOrderFinancials, lineTotal, withPaymentManualFlags } from "@/lib/orderMoney";
import { getOrderDateFilters } from "@/lib/orderDateFilters";
import { filterOrdersByDateRange, orderInDateRange } from "@/lib/orderDayGuard";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import AssignCourierDialog from "@/components/orders/AssignCourierDialog";
import { expandPackages, emptyBoxRow, sanePackageDim, volumetricOrDeadWeight } from "@/components/orders/packageDims";
import { computeStatusCounts, isRtoOrderStatus, getOrderSubStatus, subStatusBadgeClass } from "@/utils/orderStatusCounts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Filter, Download, Eye, Package, Plus, Edit, Pencil, Trash2, X,
  RefreshCw, Link, Unlink, Clock, CheckCircle, XCircle, 
  Globe, ShoppingBag, Store, Wifi, Ruler, ExternalLink, HelpCircle, Loader2,
  CornerDownLeft,
  User,
  AlignCenter,
  ConeIcon,
  Truck
} from "lucide-react";
import { ShoppingCart, CheckCircle as CheckCircleIcon, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Platform, IntegrationConfig, SyncResult, OrderItem } from "@/types/order";
import { orderApi } from "../../services/orderApi";
import { sellerApi } from "../../services/sellerApi"; 
import { SyncManager } from "@/services/integrations/sync-manager";
import { integrationApi } from "../../services/integrationsApi";
import { getuserid,getuser,storetmpdata,metroPincodeList, canViewAllOrders, isOrdersReadOnly, isAdminUser } from "../../services/getbasicdata";
import {apiRequest} from "../../src/apiglobal/apiconfig"
import { API_BASE_URL, UPLOAD_BASE_URL,UPLOAD_BASE_URLs } from "../../services/config";
import labelSettingsApi from "../../services/labelSettingsApi";
import { mergeLabelSettings, type LabelSettings } from "@/config/labelSettings";
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import pdfMake from 'pdfmake/build/pdfmake'; 
import pdfFonts from 'pdfmake/build/vfs_fonts';
//  pdfMake.vfs = pdfFonts.pdfMake.vfs;
 // Initialize fonts
 import QRCode from 'qrcode';
pdfMake.vfs = pdfFonts.vfs;

import JsBarcode from 'jsbarcode';
import pincodelist from "../apiglobal/pincodelist.json";
import { readFile, utils } from 'xlsx';
import * as XLSX from "xlsx";
import { set } from "date-fns";
import crypto from 'crypto';

const generateUniqueCode = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // Current timestamp in base36
  const timestamp = Date.now().toString(36).toUpperCase();

  // Random part
  const random = Array.from(
    crypto.randomBytes(length),
    b => chars[b % chars.length]
  ).join('');

  return (timestamp + random).slice(-length);
};

const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  Shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  RTO: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  Cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const platformIcons: Record<Platform, any> = {
  Manual: Package,
  Amazon: ShoppingBag,
  Shopify: Store,
  WooCommerce: Globe,
  Custom: Wifi,
  Merged: Wifi,

};

const COURIER_MODES = ["Air", "Surface"] as const;
type CourierMode = (typeof COURIER_MODES)[number];

function getCourierMode(name?: string, shippingMode?: unknown): CourierMode {
  const fromName = String(name || "").toLowerCase();
  if (/(?:^|[\s_/\-(])air(?:[\s_/\-)]|$)|express/.test(fromName)) return "Air";
  if (/(?:^|[\s_/\-(])surface(?:[\s_/\-)]|$)|ground/.test(fromName)) return "Surface";
  const fromField = String(shippingMode || "").toLowerCase();
  if (fromField.includes("air")) return "Air";
  return "Surface";
}

function stripCourierMode(name?: string): string {
  return String(name || "")
    .replace(/[\s_/\-]*(air|surface|express|ground)[\s_/\-]*$/i, "")
    .trim();
}

function withCourierMode(name: string, mode: CourierMode): string {
  const base = stripCourierMode(name);
  if (!base) return mode;
  return `${base} ${mode}`;
}

const platformColors: Record<Platform, string> = {
  Manual: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  Amazon: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  Shopify: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  WooCommerce: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  Custom: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  Merged: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400",
};

type FormItemErrors = { name?: string; unitPrice?: string; quantity?: string };
type FormErrors = Record<string, string | FormItemErrors[] | undefined>;

// const emptyOrderItem: Omit<OrderItem, 'id' | 'volumetricWeight' | 'totalPrice'> = {
//   name: "",
//   unitPrice: 0,
//   quantity: 1,
//   gstRate: 18,
//   height: undefined,
//   width: undefined,
//   length: undefined,
//   deadWeight: undefined,
// };



const emptyOrderItem: Omit<OrderItem, 'id' | 'volumetricWeight' | 'totalPrice'> = {
  name: "",
  sku: "",  // Add this line
  unitPrice: 0,
  quantity: 1,
  gstRate: 0,
  discount: 0,
  height: undefined,
  width: undefined,
  length: undefined,
  deadWeight: undefined,
};

function isNonShippableItem(item: any) {
  const name = String(item?.name || "").toLowerCase();
  return /(^|[^a-z])cod([^a-z]|$)|cash on delivery|cod\s*(charge|charges|fee|fees)/i.test(name);
}

const emptyOrder = {
  orderNumber: "",
  referenceId:"",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  alternatePhone: "",
  customerId: "",
  sellerOrderId: "",
  orderTags: [],
  addressType: "Home",
  country: "India",
  seller: getuser()?.role=="admin"?"":getuser()?.id,
  courier: "Auto Assign",
  courierService: "",
  shippingMode: "Surface",
  expectedDeliveryDate: "",
  zone: "",
  status: "Pending" as OrderStatus,
  amount: "0",
  goodsValue: "",
  orderDate: new Date().toISOString().split('T')[0],
  awb: "-",
  platform: "Manual" as Platform,
  pincode: "",
  city: "",
  state: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  items: [{ ...emptyOrderItem }],
  warehouse: null,
  
  // Missing fields from Order model:
  user_id: null,
  totalItems: 0,
  totalWeight: undefined,
  totalVolumetricWeight: undefined,
  shopifyOrderId: null,
  financialStatus: "paid",
  fulfillmentStatus: null,
  paymentGateway: "Prepaid",
  billingParty: "shipper",
  // Shipmozo-style Weight & Dimensions
  packageShipmentType: "SMALL",
  orderType: "B2C",
  packageType: "Box",
  packageCount: 1,
  shipmentWeight: "",
  pkgLength: "",
  pkgWidth: "",
  pkgHeight: "",
  rovType: "Rov Owner",
  boxRows: [{ noOfBox: 1, weightPerBox: 0, length: "", width: "", height: "" }],
  packages: null,
  subtotalPrice: null,
  totalTax: 0,
  totalDiscounts: 0,
  discountCodes: [],
  totalShippingPrice: 0,
  totalOutstanding: 0,
  paymentTaxManual: false,
  paymentDiscountManual: false,
  paymentCodManual: false,
  paymentPayableManual: false,
  payableAmount: 0,
  currency: "INR",
  taxesIncluded: false,
  taxExempt: false,
  confirmationNumber: null,
  checkoutId: null,
  checkoutToken: null,
  orderStatusUrl: null,
  sourceName: null,
  browserIp: null,
  userAgent: null,
  shippingAddress: null,
  billingAddress: null,
  customerData: null,
  processedAt: null,
  cancelledAt: null,
  cancelReason: null,
  trackingnumber: null,
};

function parseOrderPackages(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapOrderFormItems(rawItems: any[]) {
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems.map((item: any) => ({
      name: item.name || "",
      sku: item.sku || "",
      unitPrice: item.unitPrice ?? 0,
      quantity: item.quantity ?? 1,
      gstRate: Math.round(Number(item.gstRate) || 0),
      discount: item.discount ?? 0,
      height: sanePackageDim(item.height) || undefined,
      width: sanePackageDim(item.width) || undefined,
      length: sanePackageDim(item.length) || undefined,
      deadWeight: item.deadWeight,
    }));
  }
  return [{ ...emptyOrderItem }];
}

function buildOrderFormData(source: any, mode: "edit" | "clone" = "edit") {
  const mappedItems = mapOrderFormItems(source.items || []);
  const parsedPackages = parseOrderPackages(source.packages);
  const isClone = mode === "clone";

  return withPaymentManualFlags({
    orderNumber: isClone
      ? source.orderNumber
        ? `${source.orderNumber}-c` 
        : ""
      : source.orderNumber,
    referenceId: isClone ? "" : source.referenceId,
    customerName: source.customerName,
    customerPhone: source.customerPhone,
    customerEmail: source.customerEmail || "",
    alternatePhone: source.alternatePhone || "",
    customerId: source.customerId || "",
    sellerOrderId: source.sellerOrderId || "",
    orderTags: Array.isArray(source.orderTags) ? source.orderTags : [],
    addressType: source.addressType || "Home",
    country: source.country || "India",
    seller: source.seller,
    courier: isClone
      ? "Auto Assign"
      : source.courier && source.courier !== "-"
        ? source.courier
        : "Auto Assign",
    status: isClone ? "Pending" : source.status,
    amount: source.amount,
    orderDate: isClone ? new Date().toISOString().split("T")[0] : source.orderDate,
    awb: isClone ? "-" : source.awb,
    platform: source.platform,
    pincode: source.pincode,
    city: source.city,
    state: source.state,
    warehouse: source.warehouse || "",
    addressLine1: source.addressLine1,
    addressLine2: source.addressLine2 || "",
    landmark: source.landmark || "",
    items: mappedItems,
    user_id: source.user_id || null,
    totalItems: source.totalItems || 0,
    totalWeight: source.totalWeight,
    totalVolumetricWeight: source.totalVolumetricWeight,
    shopifyOrderId: isClone ? null : source.shopifyOrderId || null,
    financialStatus: source.financialStatus || "pending",
    fulfillmentStatus: source.fulfillmentStatus || null,
    paymentGateway: source.paymentGateway === "manual"
      ? (source.financialStatus === "pending" ? "COD" : "Prepaid")
      : (source.paymentGateway || "Prepaid"),
    subtotalPrice: source.subtotalPrice || null,
    totalTax: source.totalTax || 0,
    totalDiscounts: source.totalDiscounts || 0,
    discountCodes: source.discountCodes || [],
    totalShippingPrice: source.totalShippingPrice || 0,
    totalOutstanding: source.totalOutstanding || 0,
    currency: source.currency || "INR",
    taxesIncluded: source.taxesIncluded || false,
    taxExempt: source.taxExempt || false,
    confirmationNumber: source.confirmationNumber || null,
    checkoutId: source.checkoutId || null,
    checkoutToken: source.checkoutToken || null,
    orderStatusUrl: source.orderStatusUrl || null,
    sourceName: source.sourceName || "Manual",
    shippingMode: source.shippingMode || source.freightMode || "Surface",
    courierService: source.courierService || "",
    expectedDeliveryDate: source.expectedDeliveryDate || "",
    packageType: source.packageType || "Box",
    packageCount: source.packageCount || parsedPackages.length || 1,
    goodsValue: source.subtotalPrice || "",
    browserIp: source.browserIp || null,
    userAgent: source.userAgent || null,
    shippingAddress: source.shippingAddress || null,
    billingAddress: source.billingAddress || null,
    customerData: source.customerData || null,
    processedAt: isClone ? null : source.processedAt || null,
    cancelledAt: isClone ? null : source.cancelledAt || null,
    cancelReason: isClone ? null : source.cancelReason || null,
    trackingnumber: isClone ? null : source.trackingnumber || null,
    packageShipmentType:
      source.orderType === "B2B_MPS" || parsedPackages.length > 1 ? "HEAVY" : "SMALL",
    orderType: source.orderType || "B2C",
    rovType: source.rovType || "Rov Owner",
    billingParty: source.billingParty || (source.paymentGateway === "To-Pay" ? "consignee" : "shipper"),
    shipmentWeight: source.totalWeight ?? (parsedPackages[0]?.deadWeight ?? ""),
    pkgLength: sanePackageDim(parsedPackages[0]?.length) || sanePackageDim(source.items?.[0]?.length) || "",
    pkgWidth: sanePackageDim(parsedPackages[0]?.width) || sanePackageDim(source.items?.[0]?.width) || "",
    pkgHeight: sanePackageDim(parsedPackages[0]?.height) || sanePackageDim(source.items?.[0]?.height) || "",
    packages: parsedPackages.length ? parsedPackages : null,
    boxRows: parsedPackages.length
      ? (() => {
          const groups: Record<string, any> = {};
          for (const p of parsedPackages) {
            const key = `${p.length}|${p.width}|${p.height}|${p.deadWeight}`;
            if (!groups[key]) {
              groups[key] = {
                noOfBox: 0,
                weightPerBox: Number(p.deadWeight) || 0,
                length: p.length ?? "",
                width: p.width ?? "",
                height: p.height ?? "",
              };
            }
            groups[key].noOfBox += 1;
          }
          return Object.values(groups);
        })()
      : [emptyBoxRow()],
  });
}



// Default integrations array
const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'amazon-1',
    type: 'Amazon',
    name: 'Amazon Seller Central',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'shopify-1',
    type: 'Shopify',
    name: 'Shopify Store',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'woo-1',
    type: 'WooCommerce',
    name: 'WooCommerce',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'custom-1',
    type: 'Custom',
    name: 'Custom Website',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  }
];

const warelistbyid={}

// Amazon Integration Setup Guide Component
const AmazonSetupGuide = () => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-300">How to get Amazon credentials</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Follow these steps to get your Merchant ID and MWS Auth Token from Amazon Seller Central.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Step-by-step guide:</h4>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
          <li>Log in to your Amazon Seller Central panel</li>
          <li>Navigate to <strong>Permissions</strong> tab and locate <strong>Third-Party Developer and Apps</strong></li>
          <li>Click on <strong>Visit Manage your Apps</strong> button</li>
          <li>Click on <strong>Authorize a new Developer</strong> to generate a new token</li>
          <li>Enter the following developer credentials:
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>Developer's Name: <code className="bg-muted px-1 py-0.5 rounded">KartRocket</code></li>
              <li>Developer Account Number: <code className="bg-muted px-1 py-0.5 rounded">1469-7463-9584</code></li>
            </ul>
          </li>
          <li>Accept the Amazon MWS License Agreement</li>
          <li>Copy the <strong>Merchant ID</strong> and <strong>MWS Auth Token</strong> from the next screen</li>
        </ol>
        
        <div className="bg-muted/50 rounded-lg p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> The Developer Account Number format is 1469-7463-9584. 
            Make sure to enter it exactly as shown above.
          </p>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => window.open("https://sellercentral.amazon.in/gp/mws/registration/register.html", "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        Open Amazon Seller Central
      </Button>
    </div>
  );
};

// Shopify Integration Setup Guide Component
const ShopifySetupGuide = () => {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-300">How to get Shopify API credentials</h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Create a custom app and use Client ID, Client Secret, and your store URL to connect.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Step-by-step guide:</h4>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
          <li>
            <strong>Log in to Shopify Admin</strong>
            <p className="text-xs mt-1">Open your store admin dashboard.</p>
          </li>
          <li>
            <strong>Go to Apps → Develop apps</strong>
            <p className="text-xs mt-1">Open Settings → Apps and sales channels → Develop apps.</p>
          </li>
          <li>
            <strong>Create a new app</strong>
            <p className="text-xs mt-1">Click Create an app and name it (e.g. LogixMitra).</p>
          </li>
          <li>
            <strong>Configure Admin API scopes</strong>
            <p className="text-xs mt-1">Enable at least:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              <li><strong>read_orders</strong> (and write_orders if you update fulfillments)</li>
              <li><strong>read_products</strong>, <strong>read_customers</strong></li>
              <li><strong>write_fulfillments</strong> / fulfillment order scopes for shipping updates</li>
            </ul>
          </li>
          <li>
            <strong>Install the app</strong>
            <p className="text-xs mt-1">Click Install app so it can access your store.</p>
          </li>
          <li>
            <strong>Copy Client ID and Client Secret</strong>
            <p className="text-xs mt-1">From API credentials, copy:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              <li>Client ID (API key)</li>
              <li>Client Secret (API secret key)</li>
            </ul>
          </li>
        </ol>
        
        <div className="bg-muted/50 rounded-lg p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Important Notes:</strong>
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-muted-foreground">
            <li>Store URL format: <code>https://your-store.myshopify.com</code> (or just <code>your-store</code>)</li>
            <li>Connection uses Shopify client credentials (Client ID + Client Secret), not a static Admin API token.</li>
            <li>Keep the Client Secret private; rotate it if it is exposed.</li>
            <li>Grant the scopes above so order sync and fulfillment updates work.</li>
          </ul>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => window.open("https://admin.shopify.com/", "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        Open Shopify Admin
      </Button>
    </div>
  );
};

let warehouselist_=[]

async function getPincodeDetails(pincode) {
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );

    const data = await response.json();

    if (
      data[0].Status === "Success" &&
      data[0].PostOffice.length > 0
    ) {
      const post = data[0].PostOffice[0];

    return {
          pincode: post.Pincode,
          City: post.Region || post.Name,
          District: post.District,
          State: post.State,
          country: post.Country,
        }
    
    } else {
      return {
        success: false,
        message: "Pincode not found",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

const FormFields = (props: any) => (
  <OrderFormFields {...props} warehouselist={warehouselist_} />
);
async function getLocationByPincode(pincode){
  try {
   
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await response.json();


    if (
      data[0].Status === "Success" &&
      data[0].PostOffice &&
      data[0].PostOffice.length > 0
    ) {
      const postOffice = data[0].PostOffice[0];


      
      return {
        city: postOffice.District,
        state: postOffice.State,
        country: postOffice.Country,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching pincode details:", error);
    return null;
  }
}


const IntegrationConfigDialog = ({ 
  integration, 
  open, 
  onOpenChange,
  onSave,
  onTestConnection
}: { 
  integration: IntegrationConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: IntegrationConfig) => void;
  onTestConnection: (platform: Platform, credentials: any) => Promise<boolean>;
}) => {
                                                      
    // console.log(integration,"integrationintegrationintegrationintegration>>>>>>>>>>>>>>>>")

  const [config, setConfig] = useState<IntegrationConfig | null>(integration);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [showAmazonGuide, setShowAmazonGuide] = useState(false);
  const [showShopifyGuide, setShowShopifyGuide] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConfig(integration);
    setTestResult(null);
    setShowAmazonGuide(false);
    setShowShopifyGuide(false);
  }, [integration]);

  if (!config) return null;

  // Function to validate credentials based on platform
  const validateCredentials = (): boolean => {

    try{

    switch (config.type) {
      case "Amazon":
        return !!(config.credentials.sellerId && config.credentials.accessToken);
      case "Shopify":
        return !!(config.credentials.storeUrl && config.credentials.accessToken && config.credentials.clientid);
      case "WooCommerce":
        return !!(config.credentials.storeUrl && config.credentials.apiKey && config.credentials.apiSecret);
      case "Custom":
        return !!(config.credentials.storeUrl);
      default:
        return false;
    }

  }
  catch(e){
    return false;
  }




  };

  const handleTestConnection = async () => {
    // Validate credentials first
    if (!validateCredentials())
       {
      toast({
        title: "Invalid Credentials",
        description: "Please fill in all required fields before testing the connection.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTestConnection(config.type, config.credentials);
      setTestResult(result);
      
      toast({
        title: result ? "Connection Successful" : "Connection Failed",
        description: result ? "Successfully connected to the platform." : "Failed to connect. Please check your credentials.",
        variant: result ? "default" : "destructive",
      });
    } catch (error) {
      setTestResult(false);
      toast({
        title: "Connection Failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    // Validate credentials before saving
    if (!validateCredentials()) 
      {
      toast({
        title: "Invalid Credentials",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return;
    }

    onSave(config);
    onOpenChange(false);
    toast({
      title: "Configuration Saved",
      description: `${config.name} has been configured successfully.`,
    });

  };

  const renderConfigFields = () => {
    const cred = (key: string): string => String(config.credentials[key] ?? '');

    // console.log(config,"configconfigconfigconfigconfigconfig")



    switch (config.type) {
      case "Amazon":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="sellerId">Client ID</Label>
              <Input 
                id="sellerId"
                value={cred('sellerId')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, sellerId: e.target.value }
                }))}
                placeholder="Enter Amazon Merchant ID"
              />
              <p className="text-xs text-muted-foreground">
                This is your unique Amazon seller identifier
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketplaceId">Client ID</Label>
              <Input 
                id="marketplaceId"
                value={cred('marketplaceId')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, marketplaceId: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Client Secret</Label>
              <Input 
                id="accessToken"
                type="password"
                value={cred('accessToken')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, accessToken: e.target.value }
                }))}
              />
              <p className="text-xs text-muted-foreground">
                The token generated after authorizing KartRocket as a developer
              </p>
            </div>
            
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-xs"
              onClick={() => setShowAmazonGuide(!showAmazonGuide)}
            >
              {showAmazonGuide ? "Hide setup guide" : "Need help? View Amazon setup guide"}
            </Button>
            
            {showAmazonGuide && (
              <div className="mt-2">
                <AmazonSetupGuide />
              </div>
            )}
          </>
        );
      
      case "Shopify":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="shopifyStoreUrl">Shopify URL</Label>
              <Input 
                id="shopifyStoreUrl"
                placeholder="https://your-store.myshopify.com"
                value={cred('storeUrl')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
              />
             
            </div>



             <div className="space-y-2">
              <Label htmlFor="shopifyClientId">Client ID</Label>
              <Input 
                id="shopifyClientId"
                placeholder="Shopify app Client ID"
                value={cred('clientid')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, clientid: e.target.value }
                }))}
              />
             
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopifyClientSecret">Client Secret</Label>
              <Input 
                id="shopifyClientSecret"
                type="password"
                placeholder="Shopify app Client Secret"
                value={cred('accessToken')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, accessToken: e.target.value }
                }))}
              />
            
            </div>
            
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-xs"
              onClick={() => setShowShopifyGuide(!showShopifyGuide)}
            >
              {showShopifyGuide ? "Hide setup guide" : "Need help? View Shopify setup guide"}
            </Button>
            
            {showShopifyGuide && (
              <div className="mt-2">
                <ShopifySetupGuide />
              </div>
            )}
          </>
        );
      
      case "WooCommerce":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Store URL *</Label>
              <Input 
                id="storeUrl"
                value={cred('storeUrl')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
                placeholder="https://your-store.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Consumer Key *</Label>
              <Input 
                id="apiKey"
                value={cred('apiKey')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiKey: e.target.value }
                }))}
                placeholder="Enter WooCommerce consumer key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">Consumer Secret *</Label>
              <Input 
                id="apiSecret"
                type="password"
                value={cred('apiSecret')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiSecret: e.target.value }
                }))}
                placeholder="Enter WooCommerce consumer secret"
              />
            </div>
          </>
        );
      
      case "Custom":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input 
                id="apiUrl"
                value={cred('storeUrl')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
                placeholder="https://your-api.com/orders"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey"
                value={cred('apiKey')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiKey: e.target.value }
                }))}
                placeholder="Enter your API key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input 
                id="apiSecret"
                type="password"
                value={cred('apiSecret')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiSecret: e.target.value }
                }))}
                placeholder="Enter your API secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
              <Input 
                id="webhookUrl"
                value={cred('webhookUrl')} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, webhookUrl: e.target.value }
                }))}
                placeholder="https://your-server.com/webhook"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const isValid = validateCredentials();
return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configure {integration?.name}</DialogTitle>
          <DialogDescription>
            Enter your API credentials to enable order synchronization. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {renderConfigFields()}
          
          <div className="flex items-center justify-between pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testing || !isValid}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                </>
              ) : (
                <>Test Connection</>
              )}
            </Button>
            
            {testResult !== null && (
              <div className="flex items-center gap-2">
                {testResult ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {!isValid && (
            <p className="text-xs text-red-500 mt-2">
              Please fill in all required fields (*) before testing or saving.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
let tmpzone=""
const OrdersPage = () => {
  
  const { toast } = useToast();
  const seeAllOrders = canViewAllOrders();
  const ordersReadOnly = isOrdersReadOnly();
  const canEditAwb = isAdminUser() && !ordersReadOnly;
  const canEditCourier = canEditAwb;
  const ADMIN_COURIER_OPTIONS = [
    "Delhivery",
    "eKART",
    "Innufill",
    "Shree Maruti Courier",
    "Shadowfax",
    "Xpressbees",
    "BlueDart",
    "Amazon",
  ];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderDirection, setOrderDirection] = useState<"forward" | "reverse">("forward");
  const [orderScope, setOrderScope] = useState<"domestic" | "international">("domestic");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [courier__, setcourier__] = useState<string>("all");
  const [paymentmood, setpaymentmood] = useState<string>("all"); 

const [dateFrom, setDateFrom] = useState<string>("");
const [dateTo, setDateTo] = useState<string>("");
const [urlParams] = useSearchParams();
const urlSearch = (urlParams.get("search") || "").trim();
const [searchQuery, setSearchQuery] = useState(urlSearch);
const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
const [showMoreFilters, setShowMoreFilters] = useState(false);
const [dateType, setDateType] = useState("Order Created");
const [countOrders, setCountOrders] = useState<Order[]>([]);
const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number>>({});
  // Filter signatures behind each count source. A response that arrives late
  // (or a stale API that ignores the day filter) must never overwrite the
  // chips for the filters on screen — this is what kept All / Cancelled on
  // the old totals while the list was already correct.
  const [countOrdersSig, setCountOrdersSig] = useState<string>("");
  const [serverCountsSig, setServerCountsSig] = useState<string>("");
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);
const [totalOrdersCount, setTotalOrdersCount] = useState(0);
const [serverTotalPages, setServerTotalPages] = useState(1);
const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const latestOrdersRequestId = useRef(0);
const [rtocharge, setrtocharge] = useState([]);
const [rtocharge1, setrtocharge1] = useState([]);

const [formErrors, setFormErrors] = useState<any>({});
  const [warehouselist,setwarehouselist]=useState([])
  warehouselist_=warehouselist
  const [proof,setproof]=useState("")

  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isClone, setIsClone] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [codEditOrder, setCodEditOrder] = useState<Order | null>(null);
  const [codEditAmount, setCodEditAmount] = useState<string>("");
  const [codEditSaving, setCodEditSaving] = useState(false);
  const [awbEditOrder, setAwbEditOrder] = useState<Order | null>(null);
  const [awbEditValue, setAwbEditValue] = useState<string>("");
  const [awbEditSaving, setAwbEditSaving] = useState(false);
  const [courierEditOrder, setCourierEditOrder] = useState<Order | null>(null);
  const [courierEditValue, setCourierEditValue] = useState<string>("");
  const [courierEditSelect, setCourierEditSelect] = useState<string>("");
  const [courierEditMode, setCourierEditMode] = useState<CourierMode>("Surface");
  const [courierEditSaving, setCourierEditSaving] = useState(false);
  const [createOpen__, setCreateOpen__] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [bulkAction, setBulkAction] = useState<"delete" | "cancel" | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [disputeOrder, setdisputeOrder] = useState<Order | null>(null);
  const [previousWeight, setPreviousWeight] = useState("");
  const [claimWeight, setClaimWeight] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [disputeSaving, setDisputeSaving] = useState(false);
  const [bulkcreatemodal, setbulkcreatemodal] = useState(false);
  const [singleor,setsingleor]=useState(false)
  const [assignRatesLoading, setAssignRatesLoading] = useState(false);
  const [assignShipping, setAssignShipping] = useState(false);
  

  const [formData, setFormData] = useState(emptyOrder);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [showSyncResults, setShowSyncResults] = useState(false);
  const [showShopifyManualSync, setShowShopifyManualSync] = useState(false);
  const [shopifySyncFromDate, setShopifySyncFromDate] = useState("");
  const [shopifySyncToDate, setShopifySyncToDate] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [showIntegrationConfig, setShowIntegrationConfig] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(DEFAULT_INTEGRATIONS);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [rendertmp, setrendertmp] = useState(true);
  const [bulkshipmentcreate, setbulkshipmentcreate] = useState({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{},zone:[]});
  const [allsellerlist, setallsellerlist] = useState([]);
  const [allsellerlistid, setallsellerlistid] = useState({});

  const [ratelist, setratelist] = useState({});

bulkshipmentcreate.ratelist={...ratelist}
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const [uploadFile, setUploadFile] = useState<File | null>(null);
const [uploadPreview, setUploadPreview] = useState<any[]>([]);
const [uploadProcessing, setUploadProcessing] = useState(false);
const [uploadErrors, setUploadErrors] = useState<string[]>([]);
const [trackorder_, settrackorder_] = useState(false);
const [trackorderdata, settrackorderdata] = useState([]);




  const [rawData,setrawData]=useState([])
 
const northEastStates = [
  "arunachal pradesh",
  "assam",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "sikkim",
  "tripura",
  "shimla",
  "jammu & kashmir"


];

  const metroCities = [
  "mumbai", 
  "delhi",
  "new delhi", 
  "bengaluru", 
  "chennai", 
  "hyderabad", 
  "ahmedabad", 
  "kolkata",   
  "pune",
  "noida",
  "gautam buddha nagar",
  "jaipur",
  "lucknow",
];
// https://api.postalpincode.in/pincode/




  // Fetch integrations from API
  useEffect(() => {
    fetchIntegrations();
  }, [rendertmp]);



const getWarehouses = async () => {
  const response = await apiRequest("GET", "auth/getAllWarehouses", {}, {});
  const warehouseRows = Array.isArray(response?.data?.data) ? response.data.data : [];
  const mappedRows = warehouseRows.map((val: any) => {
    const isDef = Boolean(val.isDefault ?? val.is_default ?? val.isDefault);
    const isOn = val.isActive !== false && val.isActive !== false;
    return {
      ...val,
      id: String(val.id),
      isDefault: isDef,
      isDefault: isDef,
      isActive: isOn,
      isActive: isOn,
      user_id: val.user_id ?? val.user_id,
    };
  });
  mappedRows.forEach((val) => {
    warelistbyid[val.id] = val;
  });

  const activeRows = mappedRows.filter((val) => val.isActive == true);
  const defaultsBySeller: Record<string, any> = {};
  activeRows.forEach((warehouse) => {
    const sellerKey = String(warehouse.user_id || "");
    if (!sellerKey) return;
    const existing = defaultsBySeller[sellerKey];
    if (!existing || warehouse.isDefault || warehouse.isDefault) {
      defaultsBySeller[sellerKey] = warehouse;
    }
  });
  Object.entries(defaultsBySeller).forEach(([sellerId, warehouse]) => {
    warelistbyid[`seller:${sellerId}`] = warehouse;
  });

  setwarehouselist(
    seeAllOrders
      ? [...activeRows]
      : [...activeRows.filter((val) => String(val.user_id) == String(getuserid()))]
  );
}




  useEffect(() => {
    getWarehouses();
  }, [rendertmp]);

  const fetchIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const data = await integrationApi.getAll();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const uid = String(getuserid() ?? '');

      const userIntegrations = list.filter((y: any) => String(y?.user_id ?? '') === uid);

      const tmpstore: IntegrationConfig[] = [];
      for (const defaults of DEFAULT_INTEGRATIONS) {
        const saved = userIntegrations.find(
          (y: any) => y?.type === defaults.type || y?.name === defaults.name
        );
        if (saved) {
          tmpstore.push({
            id: saved.id,
            type: saved.type,
            name: saved.name || defaults.name,
            isActive: Boolean(saved.isActive),
            lastSync: saved.lastSync,
            credentials: saved.credentials || {},
            settings: saved.settings || {},
            user_id: saved.user_id,
          } as IntegrationConfig);
        } else {
          tmpstore.push(defaults);
        }
      }

      // Include any extra user integrations not in defaults
      for (const saved of userIntegrations) {
        if (!tmpstore.some((x) => x.id === saved.id || x.type === saved.type)) {
          tmpstore.push({
            id: saved.id,
            type: saved.type,
            name: saved.name,
            isActive: Boolean(saved.isActive),
            lastSync: saved.lastSync,
            credentials: saved.credentials || {},
            settings: saved.settings || {},
            user_id: saved.user_id,
          } as IntegrationConfig);
        }
      }

      setIntegrations(tmpstore);
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
      setIntegrations(DEFAULT_INTEGRATIONS);
      toast({
        title: "Warning",
        description: "Failed to load integrations from server. Using default integrations.",
        variant: "destructive",
      });
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const fetchOrders = async (page = currentPage, limit = itemsPerPage) => {
    const requestId = ++latestOrdersRequestId.current;
    try {
      setLoading(true);
      const searchTerm = debouncedSearch.trim() || undefined;
      const result = await orderApi.getAll({
        page: String(page),
        limit: String(limit),
        paginate: 'true',
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        ...getOrderDateFilters(dateFrom, dateTo, dateType),
        courier: courier__ !== 'all' ? courier__ : undefined,
        financialStatus: paymentmood !== 'all' ? paymentmood : undefined,
        direction: statusFilter === 'all' && orderDirection === 'forward' ? undefined : orderDirection,
      });

      if (requestId !== latestOrdersRequestId.current) return;
      const data = result.orders || result;
      const pagination = result.pagination;

      // Client-side day guard (shared rule in lib/orderDayGuard): never
      // render rows outside the picked From/To calendar days. The server
      // applies the same rule (startDateDay / endDateDay), but this keeps
      // the list correct even against a stale API — the classic
      // "select 9 Oct, still see 8 Oct rows" bug.
      let displayData = data;
      if ((dateFrom || dateTo) && Array.isArray(data)) {
        displayData = data.filter((o: any) => orderInDateRange(o, dateFrom, dateTo, dateType));
      }

      let data2 = [];
      if (seeAllOrders) {
        try {
          data2 = await sellerApi.getAll();
        } catch (e) {
          console.warn("Failed to load sellers list", e);
        }
      } else {
        // Seller: only own profile for name display
        try {
          const me = await sellerApi.getById(getuserid());
          if (me) data2 = [me];
        } catch (_) {
          data2 = [];
        }
      }
      storetmpdata.referenceId = [];
      for (const x of displayData) {
        storetmpdata.referenceId.push(x.referenceId);
      }

      setOrders(Array.isArray(displayData) ? displayData : []);
      if (pagination) {
        setTotalOrdersCount(pagination.total);
        setServerTotalPages(pagination.totalPages);
      } else {
        setTotalOrdersCount(Array.isArray(displayData) ? displayData.length : 0);
        setServerTotalPages(Math.ceil((Array.isArray(displayData) ? displayData.length : 0) / limit) || 1);
      }
      const temp = {};
      for (const x of data2 || []) {
        temp[x.id] = x;
      }
      setallsellerlistid(temp);
      setallsellerlist(seeAllOrders ? (data2 || []) : []);
    } catch (error) {
      if (requestId !== latestOrdersRequestId.current) return;
      console.log(error, "error fetching orders");
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      if (requestId === latestOrdersRequestId.current) {
        setLoading(false);
      }
    }
  };

  const loadCountOrders = useCallback(async () => {
    const searchTerm = debouncedSearch.trim() || undefined;
    const dateFilters = getOrderDateFilters(dateFrom, dateTo, dateType);
    // Signature of the filters on screen — stale responses must never
    // overwrite the chips (the old "keep last good counts" did exactly that
    // when the date changed but the old response arrived last).
    const baseSig = JSON.stringify({
      search: searchTerm || "",
      platform: platformFilter,
      courier: courier__,
      financialStatus: paymentmood,
      dateFrom,
      dateTo,
      dateType,
    });
    try {
      // Server-driven exact counts: same where-builder as the list query,
      // with the caller's live filters so chip number == list length.
      const serverCounts = await orderApi.getStatusCounts({
        search: searchTerm,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        courier: courier__ !== 'all' ? courier__ : undefined,
        financialStatus: paymentmood !== 'all' ? paymentmood : undefined,
        ...dateFilters,
        direction: orderDirection,
      });
      if (serverCounts && Object.keys(serverCounts).length > 0) {
        setServerStatusCounts(serverCounts);
        setServerCountsSig(`${baseSig}|dir:${orderDirection}`);
      }
    } catch {
      /* keep last good counts */
    }
    try {
      // Same filters as the list (minus status/direction) so chip fallbacks
      // still respect search / date range when the counts endpoint is down.
      // Direction is applied client-side by computeStatusCounts instead.
      const result = await orderApi.getAll({
        paginate: "false",
        search: debouncedSearch.trim() || undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        courier: courier__ !== 'all' ? courier__ : undefined,
        financialStatus: paymentmood !== 'all' ? paymentmood : undefined,
        ...dateFilters,
      });
      const data = result?.orders ?? (Array.isArray(result) ? result : []);
      // Same day guard as the list: a stale API build that ignores
      // startDateDay/endDateDay would otherwise leak out-of-range rows into
      // All / Cancelled / every other chip.
      const guarded = filterOrdersByDateRange(
        Array.isArray(data) ? data : [],
        dateFrom,
        dateTo,
        dateType
      );
      setCountOrders(guarded);
      setCountOrdersSig(baseSig);
    } catch {
      /* keep last good counts instead of blanking the chips to zero */
    }
  }, [debouncedSearch, platformFilter, courier__, paymentmood, dateFrom, dateTo, dateType, orderDirection]);

  // Latest-first: Order Details number ka leading numeric part (1052, 1051,
  // 1050, 1049...) bada number sabse upar — naam wale orders (NULL) uske baad.
  // Phir wahi created date jo Order Date column dikhata hai (orderDate,
  // warna createdAt), createdAt, phir id. Ye rule server ke ORDER BY ke same
  // hai, warna pagination me page 1/2 ke numbers mix ho jaate.
  const createdTimeOf = (o: Order) => {
    // Order Date column ki tarah: orderDate (agar hai) warna createdAt.
    const raw = (o as any).orderDate || (o as any).createdAt || 0;
    const ms = new Date(raw).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };
  const orderSeqOf = (o: Order): number | null => {
    // Leading digits only: "1052" -> 1052, "1050-M"/"1046-c" -> 1050/1046,
    // "UMAR#001"/"HSK" -> null (naam wale orders date se sort honge).
    const raw = String(
      (o as any).orderNumber ?? (o as any).order_number ?? ""
    ).trim();
    const m = raw.match(/^(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };
  // Clone = naya order (`10-c`, `10-c-2`) — server ke ORDER BY me bhi yahi
  // clone-band hai, warna pagination me pages mix ho jaate.
  const isCloneOrder = (o: Order) =>
    /-c(-\d+)?$/i.test(String((o as any).orderNumber ?? "").trim());
  const sortedOrders = [...orders].sort((a, b) => {
    // Clones sabse upar (page 1 row 1), andar hi newest clone first.
    const aClone = isCloneOrder(a);
    const bClone = isCloneOrder(b);
    if (aClone !== bClone) return aClone ? -1 : 1;
    if (aClone && bClone) {
      const aCloneCreated = new Date((a as any).createdAt || 0).getTime();
      const bCloneCreated = new Date((b as any).createdAt || 0).getTime();
      if (bCloneCreated !== aCloneCreated) return bCloneCreated - aCloneCreated;
    }
    const aSeq = orderSeqOf(a);
    const bSeq = orderSeqOf(b);
    const aNumeric = aSeq !== null;
    const bNumeric = bSeq !== null;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (aNumeric && bNumeric && aSeq !== bSeq) return (bSeq as number) - (aSeq as number);
    const aTime = createdTimeOf(a);
    const bTime = createdTimeOf(b);
    if (bTime !== aTime) return bTime - aTime;
    const aCreated = new Date((a as any).createdAt || 0).getTime();
    const bCreated = new Date((b as any).createdAt || 0).getTime();
    if (bCreated !== aCreated) return bCreated - aCreated;
    const aId = Number(String((a as any).id ?? "").replace(/\D/g, "")) || 0;
    const bId = Number(String((b as any).id ?? "").replace(/\D/g, "")) || 0;
    if (bId !== aId) return bId - aId;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
  const paginatedOrders = orderScope === "international" ? [] : sortedOrders;

  const totalPages = serverTotalPages || Math.ceil(totalOrdersCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Apply header search (?search=...) even when already on this page
  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setDebouncedSearch(urlSearch);
    }
  }, [urlSearch]);

  // Debounce text filters (~300ms)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, platformFilter, courier__, paymentmood, dateFrom, dateTo, orderDirection, dateType, orderScope]);

  useEffect(() => {
    if (orderScope === "international") {
      setOrders([]);
      setTotalOrdersCount(0);
      setServerTotalPages(1);
      setLoading(false);
      return;
    }
    fetchOrders(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, platformFilter, dateFrom, dateTo, courier__, paymentmood, orderDirection, dateType, orderScope]);

  useEffect(() => {
    loadCountOrders();
  }, [loadCountOrders]);

  const statusCounts = useMemo(() => {
    const fallback = computeStatusCounts(countOrders, orderDirection);
    const currentBaseSig = JSON.stringify({
      search: debouncedSearch.trim() || "",
      platform: platformFilter,
      courier: courier__,
      financialStatus: paymentmood,
      dateFrom,
      dateTo,
      dateType,
    });
    // Only trust a count source that was fetched for THESE filters.
    const fallbackFresh = countOrdersSig === currentBaseSig;
    const serverFresh = serverCountsSig === `${currentBaseSig}|dir:${orderDirection}`;
    const server = serverFresh ? serverStatusCounts : {};
    const hasServer = server && Object.keys(server).length > 0;
    if (!hasServer) return fallback;
    // Date filter active: the client-guarded fallback is exact for the picked
    // days (immune to a stale API that ignores the day filter), so it wins
    // over server counts. Without dates the server stays authoritative.
    if ((dateFrom || dateTo) && fallbackFresh) {
      return { ...server, ...fallback };
    }
    return { ...fallback, ...server };
  }, [countOrders, countOrdersSig, orderDirection, serverStatusCounts, serverCountsSig, debouncedSearch, platformFilter, courier__, paymentmood, dateFrom, dateTo, dateType]);

  const refreshOrdersAndCounts = async () => {
    await Promise.all([fetchOrders(currentPage, itemsPerPage), loadCountOrders()]);
  };

  // Download the WHOLE filtered set (all pages), not just the rows on the
  // current page — the old behaviour silently exported only 10 rows.
  const handleExport = async () => {
    try {
      const result = await orderApi.getAll({
        paginate: "false",
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        ...getOrderDateFilters(dateFrom, dateTo, dateType),
        courier: courier__ !== 'all' ? courier__ : undefined,
        financialStatus: paymentmood !== 'all' ? paymentmood : undefined,
        direction: statusFilter === 'all' && orderDirection === 'forward' ? undefined : orderDirection,
      });
      const rows = result?.orders ?? [];
      await orderApi.export(rows.length ? rows : paginatedOrders);
    } catch (error) {
      console.warn("Export: full fetch failed, exporting current page", error);
      orderApi.export(paginatedOrders);
    }
  };

  const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
    if (!height || !width || !length) return undefined;
    return Number(((height * width * length) / 5000).toFixed(2));
  };

  const calculateTotalPrice = (unitPrice: number, quantity: number, gstRate: number, discount = 0): number => {
    const gross = (Number(unitPrice) || 0) * (Number(quantity) || 0);
    const gstAmount = (gross * (Number(gstRate) || 0)) / 100;
    return Number(Math.max(0, gross + gstAmount - (Number(discount) || 0)).toFixed(2));
  };
  const validateForm = (data: typeof emptyOrder, userRole: string): { isValid: boolean; errors: FormErrors } => {
  const currentErrors: FormErrors = {};
  
  // 1. Order Number Validation
  if (!data.orderNumber || !data.orderNumber.trim()) {
    currentErrors.orderNumber = "Order Number is required";
  }
  if (!(data as any).orderDate) {
    currentErrors.orderDate = "Order Date is required";
  }

  // 2. Customer Information Validation
  if (!data.customerName || !data.customerName.trim()) {
    currentErrors.customerName = "Customer Name is required";
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!data.customerPhone || !data.customerPhone.trim()) {
    currentErrors.customerPhone = "Phone number is required";
  } else if (!phoneRegex.test(data.customerPhone)) {
    currentErrors.customerPhone = "Enter a valid 10-digit mobile number";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.customerEmail && data.customerEmail.trim() && !emailRegex.test(data.customerEmail)) {
    currentErrors.customerEmail = "Enter a valid Email Address";
  }

  // 3. Shipping Address Validation
  if (!data.pincode || !data.pincode.toString().trim()) {
    currentErrors.pincode = "Pincode is required";
  } else if (!/^\d{6}$/.test(data.pincode.toString().trim())) {
    currentErrors.pincode = "Pincode must be exactly 6 digits";
  }

  if (!data.city || !data.city.trim()) {
    currentErrors.city = "City is required";
  }

  if (!data.state || !data.state.trim()) {
    currentErrors.state = "State is required";
  }

  if (!data.addressLine1 || !data.addressLine1.trim()) {
    currentErrors.addressLine1 = "Address Line 1 is required";
  }

  if (!(data as any).warehouse) {
    (currentErrors as any).warehouse = "Pickup location is required";
  }

  // Weight & Dimensions (Shipmozo-style)
  const pkgType = (data as any).packageShipmentType || "SMALL";
  const rawWt = (data as any).shipmentWeight;
  const wt = Number(rawWt);
  if (rawWt === "" || rawWt == null || Number.isNaN(wt) || wt <= 0) {
    (currentErrors as any).shipmentWeight = "Dead weight is required";
  } else if (wt < 0.1) {
    (currentErrors as any).shipmentWeight = "Minimum chargeable weight is 0.10 kg";
  }
  if (pkgType === "SMALL") {
    // already validated dead weight above
  } else {
    const rows = Array.isArray((data as any).boxRows) ? (data as any).boxRows : [];
    // const summary = expandPackages(rows);
    // if (!summary.totalDead || summary.totalDead < 0.5) {
    //   (currentErrors as any).shipmentWeight = "Minimum chargeable weight is 0.50 kg";
    // }
    for (const row of rows) {
      if (Number(row.length) > 306 || Number(row.width) > 306 || Number(row.height) > 306) {
        (currentErrors as any).shipmentWeight = "Length, width or height can't be greater than 306cm";
        break;
      }
      if (!row.height) {
        (currentErrors as any).shipmentWeight = "Height is required for each box group";
        break;
      }
    }
  }

  // 4. Admin-Specific Validation
  // if (userRole === "admin" && (!data.seller || !data.seller.trim())) {
  //   currentErrors.seller = "Seller selection is required for admins";
  // }

  // 5. Order Items Validation (Loops through all dynamic items)


  if(pkgType === "SMALL"){
  if (data.items && data.items.length > 0 ) {
    const itemErrorsArray: Array<{ name?: string; unitPrice?: string; quantity?: string }> = [];
    let hasItemErrors = false;

    data.items.forEach((item, index) => {
      const itemError: { name?: string; unitPrice?: string; quantity?: string } = {};

      if (!item.name || !item.name.trim()) {
        itemError.name = "Product name is required";
        hasItemErrors = true;
      }

      if (item.unitPrice === undefined || item.unitPrice === null || Number(item.unitPrice) <= 0) {
        itemError.unitPrice = "Price must be greater than 0";
        hasItemErrors = true;
      }

      if (!item.quantity || Number(item.quantity) < 1) {
        itemError.quantity = "Quantity must be 1 or more";
        hasItemErrors = true;
      }

      itemErrorsArray[index] = itemError;
    });

    if (hasItemErrors) {
      currentErrors.items = itemErrorsArray;
    }
  } else {
    // Edge case: If they managed to delete all items
    currentErrors.orderNumber = currentErrors.orderNumber || "At least one order item is required";
  }
}

  // The form is valid if our errors object has no root keys
  return {
    isValid: Object.keys(currentErrors).length === 0,
    errors: currentErrors
  };
};

  // const handleCreate = async () => {
  
  // // Run the validator
  // const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  //  console.log(validationErrors,"validationErrorsvalidationErrorsvalidationErrors")
  
  // if (!isValid) {
  //   console.log(validationErrors,"validationErrorsvalidationErrorsvalidationErrorsvalidationErrorsvalidationErrorsvalidationErrors")
  //   // 1. Pass the errors back down to your FormFields component to show them visually
  //   // setErrors(validationErrors); 
    
  //   // 2. Stop submission
  //   alert("Please fix the validation errors in the form.");
  //   return;
  // }
  //   try {
  //     const totalAmount = formData.items.reduce((sum, item) => {
  //       const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
  //       return sum + total;
  //     }, 0);

  //     let orderData = {
  //       ...formData,
  //       amount: `₹${totalAmount.toFixed(2)}`,
  //       items: formData.items.map(item => ({
  //         ...item,
  //         volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
  //         totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
  //       }))
  //     };  
  //     orderData.financialStatus=orderData.paymentGateway=="COD"?"pending":"paid"
  //     orderData.seller=getuser()?.role=="admin"?orderData.seller:getuser()?.id
  //     orderData.user_id=getuser()?.role=="admin"?orderData.seller:getuser()?.id

  //     const newOrder = await orderApi.mancreate([orderData]);
  //   fetchOrders()
  //     setFormData(emptyOrder);
  //     toast({ title: "Success", description: "Order created successfully" });
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to create order",
  //       variant: "destructive",
  //     });
  //   }
  // };
const handleCreate = async () => {
  const defaultWarehouseId =
    formData.warehouse ||
    warehouselist.find((w) => w.isDefault || w.isDefault)?.id ||
    warehouselist[0]?.id ||
    "";
  const dataToValidate = { ...formData, warehouse: defaultWarehouseId };
  const { isValid, errors: validationErrors } = validateForm(dataToValidate, getuser().role);
  
  if (!isValid) {
    setFormErrors(validationErrors);
    alert("Please fix the validation errors in the form.");
    return;
  }
  
  setOrderSaving(true);
  try {
    const defaultWarehouseId =
      formData.warehouse ||
      warehouselist.find((w) => w.isDefault)?.id ||
      warehouselist[0]?.id ||
      "";
    const money = computeOrderFinancials(formData);

    const orderData = {
      ...formData,
      warehouse: defaultWarehouseId,
      subtotalPrice: money.itemSubtotal,
      totalTax: money.tax,
      totalDiscounts: money.discount,
      totalShippingPrice: money.shipping,
      amount: `₹${money.payable.toFixed(2)}`,
      totalOutstanding: money.outstanding,
      items: formData.items.map(item => ({
        ...item,
        volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
        totalPrice: lineTotal(item),
      }))
    };
    delete (orderData as any).paymentTaxManual;
    delete (orderData as any).paymentDiscountManual;
    delete (orderData as any).paymentCodManual;
    delete (orderData as any).paymentPayableManual;
    delete (orderData as any).payableAmount;

    const count = Math.max(1, Number(formData.packageCount) || 1);
    const item0 = orderData.items?.[0] || {};
    const l = Number(formData.pkgLength) || Number(item0.length) || 0;
    const w = Number(formData.pkgWidth) || Number(item0.width) || 0;
    const h = Number(formData.pkgHeight) || Number(item0.height) || 0;
    const dead = Number(formData.shipmentWeight) || Number(item0.deadWeight) || 0;
    const vol =
      l && w && h
        ? Number(((l * w * h) / 5000).toFixed(3))
        : Number(item0.volumetricWeight) || 0;
    const isB2B = String(formData.orderType || "").toUpperCase().startsWith("B2B");
    orderData.orderType = isB2B ? (count > 1 ? "B2B_MPS" : "B2B") : "B2C";
    orderData.packageType = formData.packageType || "Box";
    orderData.packageCount = count;
    orderData.packages = Array.from({ length: count }, (_, i) => ({
      boxNo: i + 1,
      length: l,
      width: w,
      height: h,
      deadWeight: dead,
      volumetricWeight: vol,
    }));
    orderData.totalWeight = dead * count;
    orderData.totalVolumetricWeight = vol * count;
    if (orderData.items?.[0]) {
      orderData.items[0].length = l;
      orderData.items[0].width = w;
      orderData.items[0].height = h;
      orderData.items[0].deadWeight = dead;
      orderData.items[0].volumetricWeight = vol;
    }
    orderData.shippingMode = formData.shippingMode || "Surface";
    orderData.freightMode = formData.shippingMode || formData.freightMode || "Surface";
    orderData.courierService = formData.courierService || "";
    orderData.expectedDeliveryDate = formData.expectedDeliveryDate || null;
    orderData.sellerOrderId = formData.sellerOrderId || "";
    orderData.orderTags = formData.orderTags || [];
    orderData.alternatePhone = formData.alternatePhone || "";
    orderData.customerId = formData.customerId || "";
    orderData.addressType = formData.addressType || "Home";
    orderData.country = formData.country || "India";
    orderData.sourceName = formData.sourceName || "Manual";
    orderData.zone = formData.zone || "";
    if (formData.courier === "Auto Assign") orderData.courier = "-";
    orderData.billingParty =
      orderData.paymentGateway === "To-Pay" ? "consignee" : formData.billingParty || "shipper";

    orderData.financialStatus = orderData.paymentGateway == "COD" ? "pending" : "paid";
    orderData.seller = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;
    orderData.user_id = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;

    const newOrder = await orderApi.mancreate([orderData]);
    // Naya/cloned order list ke top (page 1) par aata hai — usi page par le jao,
    // warna doosre page par baithe user ko wo row nahi dikhegi.
    setCurrentPage(1);
    await Promise.all([fetchOrders(1, itemsPerPage), loadCountOrders()]);
    setFormData(emptyOrder);
    setFormErrors({});
    setIsClone(false);
    toast({ title: "Success", description: isClone ? "Order cloned successfully" : "Order created successfully" });
    setCreateOpen(false);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to create order",
      variant: "destructive",
    });
  } finally {
    setOrderSaving(false);
  }
};
  // const handleUpdate = async () => {
  //   //  Run the validator
  // const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  
  // if (!isValid) {
  //   // 1. Pass the errors back down to your FormFields component to show them visually
  //   // setErrors(validationErrors); 
    
  //   // 2. Stop submission
  //   alert("Please fix the validation errors in the form.");
  //   return;
  // }

  //   if (!editOrder) return;
  //   try {

  //     const totalAmount = formData.items.reduce((sum, item) => {
  //       const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
  //       return sum + total;
  //     }, 0);

  //     let orderData = {
  //       ...formData,
  //       amount: `₹${totalAmount.toFixed(2)}`,
  //       items: formData.items.map(item => ({
  //         ...item,
  //         volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
  //         totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
  //       }))
  //     };
       
  //       orderData.financialStatus=orderData.paymentGateway=="COD" || orderData.paymentGateway=="Cash on Delivery (COD)"?"pending":orderData.paymentGateway=="manual"? orderData.financialStatus:"paid"  
  //       orderData.seller=getuser()?.role=="admin"?orderData.seller:getuser()?.id  
  //       orderData.user_id=getuser()?.role=="admin"?orderData.seller:getuser()?.id
   


  //     const updated = await orderApi.update(editOrder.id, orderData);
  //     setOrders(prev => prev.map(o => o.id === editOrder.id ? updated : o));
  //     setEditOrder(null);
  //     toast({ title: "Success", description: "Order updated successfully" });
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to update order",
  //       variant: "destructive",
  //     });
  //   }
  // };
const handleUpdate = async () => {
  const defaultWarehouseId =
    formData.warehouse ||
    warehouselist.find((w) => w.isDefault || w.isDefault)?.id ||
    warehouselist[0]?.id ||
    "";
  const dataToValidate = { ...formData, warehouse: defaultWarehouseId };
  const { isValid, errors: validationErrors } = validateForm(dataToValidate, getuser().role);
  
  if (!isValid) {
    setFormErrors(validationErrors);
    alert("Please fix the validation errors in the form.");
    return;
  }

  if (!editOrder?.id) return;
  setOrderSaving(true);
  try {
    const safeItems = formData.items || [];
    const money = computeOrderFinancials(formData);
    const payable = money.payable;

    const sellerId = getuser()?.role == "admin" ? formData.seller : getuser()?.id;
    const defaultWarehouseId =
      formData.warehouse ||
      warehouselist.find((w) => w.isDefault)?.id ||
      warehouselist[0]?.id ||
      "";
    const paymentGateway = formData.paymentGateway;
    const financialStatus =
      paymentGateway == "COD" || paymentGateway == "Cash on Delivery (COD)"
        ? "pending"
        : paymentGateway == "Prepaid"
          ? "paid"
          : formData.financialStatus || "pending";

    const orderData = {
      orderNumber: formData.orderNumber,
      referenceId: formData.referenceId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || null,
      seller: sellerId,
      user_id: sellerId,
      courier: formData.courier || '-',
      status: formData.status || 'Pending',
      amount: `₹${payable.toFixed(2)}`,
      warehouse: defaultWarehouseId,
      orderDate: formData.orderDate,
      awb: formData.awb || '-',
      platform: formData.platform || 'Manual',
      pincode: formData.pincode,
      city: formData.city,
      state: formData.state,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2 || '',
      landmark: formData.landmark || '',
      alternatePhone: formData.alternatePhone || '',
      customerId: formData.customerId || '',
      sellerOrderId: formData.sellerOrderId || '',
      orderTags: formData.orderTags || [],
      addressType: formData.addressType || 'Home',
      country: formData.country || 'India',
      sourceName: formData.sourceName || 'Manual',
      shippingMode: formData.shippingMode || 'Surface',
      freightMode: formData.shippingMode || formData.freightMode || 'Surface',
      courierService: formData.courierService || '',
      expectedDeliveryDate: formData.expectedDeliveryDate || null,
      packageType: formData.packageType || 'Box',
      packageCount: Math.max(1, Number(formData.packageCount) || 1),
      zone: formData.zone || '',
      financialStatus,
      paymentGateway: formData.courier === "Auto Assign" ? paymentGateway : paymentGateway,
      subtotalPrice: money.itemSubtotal,
      totalTax: money.tax,
      totalDiscounts: money.discount,
      totalShippingPrice: money.shipping,
      totalOutstanding: money.outstanding,
      discountCodes: formData.discountCodes || [],
      items: safeItems.map(item => ({
        name: item.name,
        sku: item.sku || null,
        unitPrice: Number(item.unitPrice) || 0,
        quantity: Number(item.quantity) || 1,
        gstRate: item.gstRate == null ? 0 : Number(item.gstRate),
        discount: Number(item.discount) || 0,
        height: item.height === '' || item.height == null ? null : Number(item.height),
        width: item.width === '' || item.width == null ? null : Number(item.width),
        length: item.length === '' || item.length == null ? null : Number(item.length),
        deadWeight: item.deadWeight === '' || item.deadWeight == null ? null : Number(item.deadWeight),
        volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
        totalPrice: lineTotal(item),
      })),
    };

    const count = Math.max(1, Number(formData.packageCount) || 1);
    const item0 = (orderData as any).items?.[0] || {};
    const l = Number(formData.pkgLength) || Number(item0.length) || 0;
    const w = Number(formData.pkgWidth) || Number(item0.width) || 0;
    const h = Number(formData.pkgHeight) || Number(item0.height) || 0;
    const dead = Number(formData.shipmentWeight) || Number(item0.deadWeight) || 0;
    const vol =
      l && w && h
        ? Number(((l * w * h) / 5000).toFixed(3))
        : Number(item0.volumetricWeight) || 0;
    const isB2B = String(formData.orderType || "").toUpperCase().startsWith("B2B");
    (orderData as any).orderType = isB2B ? (count > 1 ? "B2B_MPS" : "B2B") : "B2C";
    (orderData as any).packages = Array.from({ length: count }, (_, i) => ({
      boxNo: i + 1, length: l, width: w, height: h, deadWeight: dead, volumetricWeight: vol,
    }));
    (orderData as any).totalWeight = dead * count;
    (orderData as any).totalVolumetricWeight = vol * count;
    if ((orderData as any).items?.[0]) {
      (orderData as any).items[0].length = l;
      (orderData as any).items[0].width = w;
      (orderData as any).items[0].height = h;
      (orderData as any).items[0].deadWeight = dead;
      (orderData as any).items[0].volumetricWeight = vol;
    }
    if (formData.courier === "Auto Assign") (orderData as any).courier = "-";
    (orderData as any).billingParty =
      paymentGateway === "To-Pay" ? "consignee" : formData.billingParty || "shipper";

    await orderApi.update(editOrder.id, orderData);
    await refreshOrdersAndCounts();
    setEditOrder(null);
    setFormErrors({});
    toast({ title: "Success", description: "Order updated successfully" });
  } catch (error: any) {
    const apiMsg =
      error?.response?.data?.error ||
      error?.response?.data?.errors?.[0]?.msg ||
      error?.message ||
      "Failed to update order";
    toast({
      title: "Error",
      description: apiMsg,
      variant: "destructive",
    });
  } finally {
    setOrderSaving(false);
  }
};
  const handleDelete = async () => {
    if (!deleteOrder) return;
    try {
      await orderApi.delete(deleteOrder.id);
      setOrders(prev => prev.filter(o => o.id !== deleteOrder.id));
      setDeleteOrder(null);
      toast({ title: "Success", description: "Order deleted successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const clearBulkSelection = () => {
    setbulkshipmentcreate({
      coureir: [],
      orderlist: [],
      id: [],
      ratelist: {},
      warehouselist: [],
      dispatchdate: {},
      zone: [],
    });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || bulkshipmentcreate.id.length === 0) return;
    setBulkActionLoading(true);
    try {
      if (bulkAction === "delete") {
        const result = await orderApi.bulkDelete(bulkshipmentcreate.id);
        const skippedCount = result?.skipped?.length || 0;
        toast({
          title: `${result?.deletedCount || 0} order(s) deleted`,
          description: skippedCount
            ? `${skippedCount} order(s) skipped because they are not Pending or cannot be accessed.`
            : "Selected Pending orders were deleted successfully.",
        });
      } else {
        const result = await orderApi.bulkCancel(bulkshipmentcreate.id);
        const failedCount = result?.failed?.length || 0;
        const rtoCount = result?.rtoCount || 0;
        toast({
          title: `${result?.cancelledCount || 0} order(s) updated`,
          description: [
            rtoCount ? `${rtoCount} moved to RTO In Transit with RTO charge.` : null,
            failedCount ? `${failedCount} order(s) could not be cancelled.` : null,
            !rtoCount && !failedCount ? "Selected orders were cancelled successfully." : null,
          ].filter(Boolean).join(" "),
        });
      }
      setBulkAction(null);
      clearBulkSelection();
      await refreshOrdersAndCounts();
    } catch (error: any) {
      toast({
        title: `Bulk ${bulkAction} failed`,
        description: error?.response?.data?.error || error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };



  const handleDispute = async () => {
    if (!disputeOrder) return;
    if (!String(claimWeight).trim()) {
      toast({ title: "Claim weight required", description: "Enter the claimed weight (kg).", variant: "destructive" });
      return;
    }
    setDisputeSaving(true);
    try {
      const payload = {
        id: disputeOrder.id,
        awb: disputeOrder.awb,
        dispute_status: "Disputed",
        dispute_file_: proof,
        dispute_file: String(proofLink).trim(),
        referenceId: disputeOrder.referenceId,
        dispute_reason: "Weight Dispute",
        claimweight: String(claimWeight).trim(),
        previousweight: String(previousWeight).trim(),
      };

      const response = await apiRequest("POST", "orders/dispute_order", payload, {});
      const body = response?.data || response;
      const ok = response?.status === 200 && (body?.status === 200 || body?.message === "success" || !body?.status);

      if (ok) {
        setdisputeOrder(null);
        setproof("");
        setProofLink("");
        setPreviousWeight("");
        setClaimWeight("");
        toast({ title: "Success", description: "Weight dispute submitted successfully" });
        refreshOrdersAndCounts();
      } else {
        toast({
          title: "Error",
          description: body?.message || "Failed to submit weight dispute",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to submit weight dispute",
        variant: "destructive",
      });
    } finally {
      setDisputeSaving(false);
    }
  };


  
  console.log(formData,"formDataformDataformDataformDataformData")

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await orderApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      loadCountOrders();
      toast({ title: "Success", description: `Status updated to ${newStatus}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

const openEdit = async (order) => {
  if (ordersReadOnly) {
    toast({
      title: "View only",
      description: "This account can view orders but cannot edit them.",
    });
    return;
  }
  if (order.status === "Delivered" || order.status === "Cancelled") {
    toast({
      title: "Cannot edit",
      description: `Orders with status "${order.status}" cannot be edited.`,
      variant: "destructive",
    });
    return;
  }

  const hasAwb = order.awb && order.awb !== "-" && order.awb !== "—";
  if (getuser()?.role !== "admin" && hasAwb) {
    toast({
      title: "Cannot edit",
      description: "Order cannot be edited after AWB is generated. Contact admin if changes are needed.",
      variant: "destructive",
    });
    return;
  }

  setFormErrors({});

  let full: any = null;
  try {
    full = await orderApi.getById(order.id);
  } catch {
    full = null;
  }

  const source = full || order;
  setFormData(buildOrderFormData({ ...source, items: full?.items || order.items || source.items || [] }, "edit"));
  setIsClone(false);
  setEditOrder(source);
};

const openViewOrder = async (order) => {
  try {
    const full = await orderApi.getById(order.id);
    setViewOrder(full || order);
  } catch {
    setViewOrder(order);
  }
};




// console.log(courier__,"courier__courier__courier__courier__   ")


  // const openEdit = (order: Order) => {
  //   setFormData({
  //     orderNumber: order.orderNumber,
  //     customerName: order.customerName,
  //     customerPhone: order.customerPhone,
  //     customerEmail: order.customerEmail || "",
  //     seller: order.seller,
  //     courier: order.courier,
  //     status: order.status,
  //     amount: order.amount,
  //     orderDate: order.orderDate,
  //     awb: order.awb,
  //     platform: order.platform,
  //     pincode: order.pincode,
  //     city: order.city,
  //     state: order.state,
  //     addressLine1: order.addressLine1,
  //     addressLine2: order.addressLine2 || "",
  //     landmark: order.landmark || "",
  //     items: order.items.map(item => ({
  //       name: item.name,
  //       unitPrice: item.unitPrice,
  //       quantity: item.quantity,
  //       gstRate: item.gstRate,
  //       height: item.height,
  //       width: item.width,
  //       length: item.length,
  //       deadWeight: item.deadWeight,
  //     })),
  //   });
  //   setEditOrder(order);
  // };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Keep Weight & Dimensions (packages) in sync when editing first-item dims/weight.
    // Cloned orders copy packages — without this, stale pkgLength wins on save and dims look stuck.
    const dimFields = ["length", "width", "height", "deadWeight"];
    const isSmall = (formData.packageShipmentType || "SMALL") !== "HEAVY";
    if (index === 0 && isSmall && dimFields.includes(String(field))) {
      const first = newItems[0];
      const l = Number(first.length) || 0;
      const w = Number(first.width) || 0;
      const h = Number(first.height) || 0;
      const dead = Number(first.deadWeight) || 0;
      const vol = l && w && h ? Number(((l * w * h) / 5000).toFixed(3)) : 0;
      setFormData({
        ...formData,
        items: newItems,
        pkgLength: first.length ?? "",
        pkgWidth: first.width ?? "",
        pkgHeight: first.height ?? "",
        shipmentWeight: first.deadWeight ?? formData.shipmentWeight,
        totalWeight: dead || formData.totalWeight,
        totalVolumetricWeight: vol || formData.totalVolumetricWeight,
        packages: [
          { boxNo: 1, length: l, width: w, height: h, deadWeight: dead, volumetricWeight: vol },
        ],
      });
      return;
    }

    const moneyFields = ["gstRate", "quantity", "unitPrice", "discount"];
    const shouldResyncPayment = moneyFields.includes(String(field));
    setFormData({
      ...formData,
      items: newItems,
      ...(shouldResyncPayment
        ? {
            paymentTaxManual: false,
            paymentDiscountManual: false,
            paymentPayableManual: false,
          }
        : {}),
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...emptyOrderItem }],
      paymentTaxManual: false,
      paymentPayableManual: false,
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        items: newItems,
        paymentTaxManual: false,
        paymentDiscountManual: false,
        paymentPayableManual: false,
      });
    }
  };

  const getDateAtTime = (dateValue: string, endOfDay = false) => {
    const date = new Date(dateValue);
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return date;
  };

  const handleSync = async (type?: Platform, manualDateFrom?: Date, manualDateTo?: Date) => {
    setIsSyncing(true);
    setShowSyncResults(true);
    
    // Ensure integrations is an array
    const activeIntegrations = Array.isArray(integrations) ? integrations.filter(i => i.isActive) : [];
    const syncManager = new SyncManager(activeIntegrations);


    // console.log(activeIntegrations,syncManager,"syncManagersyncManager")
    
    try {
      const dateTo = manualDateTo || new Date();
      const dateFrom = manualDateFrom || new Date();
      if (!manualDateFrom) {
        dateFrom.setDate(dateFrom.getDate() - 7);
      }
      
      let results: SyncResult[];
      
      if (type) {
        const result = await syncManager.syncByType(type, dateFrom, dateTo);
        results = [result];
      } else {
        results = await syncManager.syncAll(dateFrom, dateTo);
      }

      console.log(results,"resultmmmmmmmmmmmmmmmmmmm",type)
      
      setSyncResults(results);
      setLastSyncTime(new Date().toLocaleString());
  
  
      
  
        await refreshOrdersAndCounts();
      
      
      results.forEach(result => {
        if (result.success) {
          toast({
            title: `${result.platform} Sync Completed`,
            description: `Synced ${result.ordersSynced} orders`,
          });
        } else {
          toast({
            title: `${result.platform} Sync Failed`,
            description: result.errors?.[0] || "Unknown error",
            variant: "destructive",
          });
        }
      });
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualShopifySync = async () => {
    if (!shopifySyncFromDate || !shopifySyncToDate) {
      toast({
        title: "Date required",
        description: "Please select both from and to date for Shopify sync.",
        variant: "destructive",
      });
      return;
    }

    const manualDateFrom = getDateAtTime(shopifySyncFromDate);
    const manualDateTo = getDateAtTime(shopifySyncToDate, true);

    if (manualDateFrom > manualDateTo) {
      toast({
        title: "Invalid date range",
        description: "From date cannot be after to date.",
        variant: "destructive",
      });
      return;
    }

    setShowShopifyManualSync(false);
    await handleSync("Shopify", manualDateFrom, manualDateTo);
  };

  const toggleIntegration = async (integrationId: string) => {
    // Ensure integrations is an array
    if (!Array.isArray(integrations)) {
      setIntegrations(DEFAULT_INTEGRATIONS);
      return;
    }
    
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;




    console.log(integration,"KKKKKKKKKKKKKKKKKKKKKKKK")
    
    // Check if integration has proper credentials before enabling
    if (!integration?.isActive) {
      // Check if credentials are configured
      let hasCredentials = false;
      switch (integration?.type) {
        case "Amazon":
          hasCredentials = !!(integration.credentials.sellerId && integration.credentials.accessToken);
          break;
        case "Shopify":
          hasCredentials = !!(integration.credentials.storeUrl && integration.credentials.accessToken && integration.credentials.clientid);
          break;
        case "WooCommerce":
          hasCredentials = !!(integration.credentials.storeUrl && integration.credentials.apiKey && integration.credentials.apiSecret);
          break;
        case "Custom":
          hasCredentials = !!(integration.credentials.storeUrl);
          break;
        default:
          hasCredentials = false;
      }
      
      if (!hasCredentials) {
        toast({
          title: "Cannot Enable Integration",
          description: `Please configure ${integration?.name} credentials first.`,
          variant: "destructive",
        });
        openIntegrationConfig(integration!);
        return;
      }
    }
    
    try {
      const updatedIntegration = { ...integration!, isActive: !integration.isActive };
      await integrationApi.update(integrationId, updatedIntegration);
  
      toast({
        title: integration?.isActive ? "Integration Disabled" : "Integration Enabled",
        description: `${integration?.name} has been ${integration?.isActive ? 'disabled' : 'enabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const openIntegrationConfig = (integration: IntegrationConfig) => {
    console.log(integration,"integrationintegrationintegrationintegrationintegration")
    setSelectedIntegration(integration);
    setShowIntegrationConfig(true);
  };

  const handleTestConnection = async (platform: Platform, credentials: any): Promise<boolean> => {
    try {
      const result = await integrationApi.testConnection(platform, credentials);
      return result;
    } catch (error) {
      console.error("Test connection failed:", error);
      return false;
    }
  };

  const handleSaveIntegration = async (updatedConfig: IntegrationConfig) => {
    try {
      // Check if integration exists (has valid ID from backend)
      const existingIntegration = Array.isArray(integrations) 
        ? integrations.find(i => i.id === updatedConfig.id)
        : null;

      const payload = {
        ...updatedConfig,
        user_id: updatedConfig.user_id || getuserid(),
        isActive: updatedConfig.isActive ?? true,
      };
      
      let savedIntegration;
      if (existingIntegration && existingIntegration.id !== 'amazon-1' && existingIntegration.id !== 'shopify-1' && 
          existingIntegration.id !== 'woo-1' && existingIntegration.id !== 'custom-1') {
        // Update existing integration
        savedIntegration = await integrationApi.update(updatedConfig.id, payload as unknown as Record<string, unknown>);
      } else {
        // Create new integration as active so sync works immediately
        savedIntegration = await integrationApi.create({
          ...payload,
          isActive: true,
        } as unknown as Record<string, unknown>);
      }
      
      setrendertmp(!rendertmp)
      // setIntegrations(prev => {
      //   if (!Array.isArray(prev)) return [savedIntegration];
      //   return prev.map(i => 
      //     i.id === updatedConfig.id ? savedIntegration : i
      //   );
      // });
      
      toast({
        title: "Configuration Saved",
        description: ` configuration has been saved. You can now enable the integration.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save integration configuration",
        variant: "destructive",
      });
    }
  };

  // Safe function to check if integration is active
  const isIntegrationActive = (type: Platform): boolean => {
    if (!Array.isArray(integrations)) return false;
    const integration = integrations.find(i => i.type === type);
    return integration?.isActive || false;
    
  };

  async function createshipmentfuntion(){
    try {
      if (bulkshipmentcreate.orderlist.some((o) => isRtoOrderStatus(o.status))) {
        toast({
          title: "Cannot assign courier",
          description: "Courier cannot be assigned to RTO orders",
          variant: "destructive",
        });
        return;
      }
      setAssignShipping(true);
      const response = await orderApi.bulkshipmentcreate(bulkshipmentcreate);
      toast({
        title: response?.status === false ? "Shipment issue" : "Shipment created",
        description: response?.message || "Courier assigned successfully",
        variant: response?.status === false ? "destructive" : "default",
      });
      setbulkcreatemodal(false);
      setsingleor(false);
      setbulkshipmentcreate({ coureir: [], orderlist: [], id: [], ratelist: {}, warehouselist: [], dispatchdate: {}, zone: [] });
      setrendertmp(!rendertmp);
      await refreshOrdersAndCounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create shipment",
        variant: "destructive",
      });
    } finally {
      setAssignShipping(false);
    }
  }

  async function Shippmentcancel(order_){
    try {
      const response = await orderApi.Shippmentcancel(order_.referenceId, order_.seller);
      const message = response?.message || "Order cancelled successfully";
      const failed = /fail|error|not found|unsupported|already|cannot/i.test(String(message));
      const wentRto = Boolean(response?.rto) || /rto in transit/i.test(String(message));
      toast({
        title: failed ? "Cancel failed" : wentRto ? "Order moved to RTO In Transit" : "Order cancelled",
        description: message,
        variant: failed ? "destructive" : "default",
      });
      setrendertmp(!rendertmp);
      refreshOrdersAndCounts();
    } catch (error: any) {
      toast({
        title: "Cancel failed",
        description: error?.message || error?.response?.data?.error || "Failed to cancel shipment",
        variant: "destructive",
      });
    }
  }


  /**
 * Converts a raw order object into a shipment request payload.
 * @param {Object} order - The complete order object (like the one provided).
 * @param {string} originPincode - Origin pincode (default: "201303").
 * @returns {Object} Shipment object ready for API consumption.
 */
function convertOrderToShipment(order, originPincode = "") {
    // Helper: clean amount string (e.g., "₹297.36" -> 297.36)
    const parseAmount = (amountStr) => {
        const numeric = amountStr.replace(/[^0-9.-]/g, '');
        return parseFloat(numeric) || 0;
    };

    // Determine payment mode based on financial status
    const paymentMode = order.financialStatus === "paid" ? "PREPAID" : "COD";

    // Get delivery pincode from order's top-level pincode or shipping address
    const deliveryPincode = order.pincode || order.shippingAddress?.zip || "";

    // Calculate total invoice value (fallback to amount if subtotal+tax missing)
    let invoiceValue = 0;
    if (order.subtotalPrice && order.totalTax) {
        invoiceValue = parseFloat(order.subtotalPrice) + parseFloat(order.totalTax);
    } else {
        invoiceValue = parseAmount(order.amount);
    }

    // Extract weight (use totalWeight if available, otherwise sum items' deadWeight)
    let weight = order.totalWeight || 0;
    if (!weight && order.items && order.items.length) {
        weight = order.items.reduce((sum, item) => sum + (item.deadWeight || 0), 0);
    }
    weight = parseFloat(weight) || 0.1; // fallback to 0.1 kg if no weight found

    // Compute dimensions from items (max length, width, height if available)
    let dimensions = { length: 12, width: 12, height: 10 }; // default
    if (order.items && order.items.length) {
        let maxLen = 0, maxWid = 0, maxHei = 0;
        let hasAnyDim = false;
        for (const item of order.items) {
            if (item.length && item.length > maxLen) maxLen = item.length;
            if (item.width && item.width > maxWid) maxWid = item.width;
            if (item.height && item.height > maxHei) maxHei = item.height;
            if (item.length || item.width || item.height) hasAnyDim = true;
        }
        if (hasAnyDim) {
            dimensions = {
                length: maxLen || 10,
                width: maxWid || 10,
                height: maxHei || 10
            };
        }
    }

    // Build the final shipment object
    return {
        shipmentType: "FORWARD",
        packageType: "SPS",
        originPincode: originPincode,
        deliveryPincode: deliveryPincode,
        paymentMode: paymentMode,
        weight: weight, // in kg
        invoiceValue: invoiceValue, // numeric value in INR
        dimensions: dimensions,
        serviceType: "domestic"
    };
}

/**
 * Converts an order object (Shopify/WooCommerce format) into a shipment request.
 * @param {Object} order - The raw order object.
 * @param {string} [originPincode="201303"] - Origin pincode (default provided).
 * @returns {Object} Shipment object matching the required structure.
 */
function convertOrderToShipment2(order, originPincode = "") {
    // Helper: clean currency string (e.g., "₹75.52" -> 75.52)
    const parseAmount = (amountStr) => {
        if (typeof amountStr !== 'string') return 0;
        const numeric = amountStr.replace(/[^0-9.-]/g, '');
        return parseFloat(numeric) || 0;
    };

    // ---- deliveryPincode ----
    const deliveryPincode = order.pincode || "";

    // ---- paymentMode ----
    // "paid" -> PREPAID, anything else (pending, etc.) -> COD
    const paymentMode = (order.financialStatus === "paid") ? "PREPAID" : "COD";

    // ---- weight ----
    let weight = 0;
    if (order.totalWeight && order.totalWeight > 0) {
        weight = parseFloat(order.totalWeight);
    } else if (order.items && order.items.length) {
        weight = order.items.reduce((sum, item) => sum + (item.deadWeight || 0), 0);
    }
    // fallback to 0.1 kg if still 0 (to avoid zero-weight issues)
    if (weight <= 0) weight = 0.1;

    // ---- invoiceValue ----
    let invoiceValue = 0;
    // Try subtotalPrice + totalTax (if available)
    if (order.subtotalPrice !== undefined && order.totalTax !== undefined) {
        const subtotal = parseFloat(order.subtotalPrice) || 0;
        const tax = parseFloat(order.totalTax) || 0;
        invoiceValue = subtotal + tax;
    }
    // Fallback: parse the "amount" field
    if (invoiceValue === 0 && order.amount) {
        invoiceValue = parseAmount(order.amount);
    }
    // Final fallback: sum item totalPrice
    if (invoiceValue === 0 && order.items && order.items.length) {
        invoiceValue = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    // ---- dimensions ----
    // Default dimensions (as per example)
    let dimensions = { length: 12, width: 12, height: 10 };
    if (order.items && order.items.length) {
        let maxLen = 0, maxWid = 0, maxHei = 0;
        let hasDim = false;
        for (const item of order.items) {
            if (item.length > 0) { maxLen = Math.max(maxLen, item.length); hasDim = true; }
            if (item.width > 0)  { maxWid = Math.max(maxWid, item.width); hasDim = true; }
            if (item.height > 0) { maxHei = Math.max(maxHei, item.height); hasDim = true; }
        }
        if (hasDim) {
            dimensions = {
                length: maxLen || 10,
                width: maxWid || 10,
                height: maxHei || 10
            };
        }
    }

    // ---- return final object ----
    return {
        shipmentType: "FORWARD",
        packageType: "SPS",
        originPincode: originPincode,
        deliveryPincode: deliveryPincode,
        paymentMode: paymentMode,
        weight: weight,          // in kg
        invoiceValue: invoiceValue,
        dimensions: dimensions,
        serviceType: "domestic"
    };
}




















 const userdata=async ()=>{
      try {
  
  
        const response = await fetch(`${API_BASE_URL}/users/${getuser().id}`,{
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          }
        });
        const data = await response.json();
        setrawData(data?.data?.ratechart ||[])
      } catch (error) {
        console.error("Error fetching wallet data:", error);
        return null;
      }
    } 
    useEffect(()=>{
         userdata()
    },[])
  

// const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
//     if (!height || !width || !length) return undefined;
//     return Number(((height * width * length) / 5000).toFixed(2));
//   }




// // Example
// getPincodeDetails("515871").then((res) => {
//   console.log(res);
// });

  const handleCalculate=async(orderdata,wareid='')=>{


    try {
     const fallbackWarehouse = warehouselist.find((ware) => ware.isDefault || ware.isDefault) || warehouselist[0] || {};
     const pincodefrom=warehouselist.find((ware)=>
      (wareid && String(ware.id)==String(wareid)) ||
      (!wareid && orderdata?.warehouse && String(ware.id)==String(orderdata.warehouse)) ||
      (!wareid && (ware.isDefault || ware.isDefault))
     ) || fallbackWarehouse || {}
    // let pincodefrom=warehouselist.find((ware)=>ware.id== orderdata.warehouse) ||{}
    console.log(pincodefrom,"pincodefrompincodefrompincodefrompincodefrompincodefrompincodefrom")





     console.log(pincodefrom)

    const hwl={
      height:0,
      width:0,
      length:0,
    }
    let tmpweight= Number(orderdata.totalWeight) || 0
    let valometric=0
    const productItems = (orderdata.items || []).filter((val) => !isNonShippableItem(val))
    const pkgs = parseOrderPackages(orderdata.packages)
    const firstPkg = pkgs[0] || {}

    if (Number(firstPkg.deadWeight) && !tmpweight) tmpweight = Number(firstPkg.deadWeight)
    hwl.length = sanePackageDim(firstPkg.length)
    hwl.width = sanePackageDim(firstPkg.width)
    hwl.height = sanePackageDim(firstPkg.height)

    productItems.forEach((val)=>{
         hwl.height = Math.max(hwl.height, sanePackageDim(val.height))
         hwl.width = Math.max(hwl.width, sanePackageDim(val.width))
         hwl.length = Math.max(hwl.length, sanePackageDim(val.length))
    })
    if (!tmpweight) {
      tmpweight = productItems.reduce(
        (sum, val) => sum + (parseFloat(val.deadWeight) || 0) * (Number(val.quantity) || 1),
        0
      )
    }
    const storedVol = Number(firstPkg.volumetricWeight)
    if (!hwl.height || !hwl.width || !hwl.length) {
      hwl.length = hwl.length || 10
      hwl.width = hwl.width || 10
      hwl.height = hwl.height || 10
    }
    valometric = volumetricOrDeadWeight(hwl.length, hwl.width, hwl.height, tmpweight, storedVol)
    // order.items.map(item => item.deadWeight || 0).reduce((a, b) => a + b, 0)
    


 
      const pin1 =  {}
      const pin2 ={}

  //         for(let x of pincodelist.Sheet1){
  //           if(x.Pincode.includes(pincodefrom)){
  //             pin1=x
  //           }
  //           if(x.Pincode.includes(pincodeto)){
  //             pin2=x
  //           }
  //         }


       



  //       if(!pin1.City){
  //         pin1=await getPincodeDetails(pincodefrom)
  //       }

  // if(!pin2.City){
  //         pin2=await getPincodeDetails(pincodeto)
  //       }

  // console.log(pincodefrom?.city?.toLowerCase(),"gautam buddha nagar")

    let zone=""
      const response1={
        city: pincodefrom?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :pincodefrom?.state?.toLowerCase()=="delhi"?"delhi":pincodefrom?.city?.trim()?.toLowerCase()||"",
        district:pincodefrom?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :pincodefrom?.state?.toLowerCase()=="delhi"?"delhi":pincodefrom?.city?.trim()?.toLowerCase()||"" ,
        state:pincodefrom?.state?.trim()?.toLowerCase()||""  ,
      }

      
       const response2={ 
        city:orderdata?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :orderdata?.state?.toLowerCase()=="delhi"?"delhi":orderdata.city?.trim()?.toLowerCase()||"",
        district:orderdata?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :orderdata?.state?.toLowerCase()=="delhi"?"delhi":orderdata.city?.trim()?.toLowerCase()||"",
        state:orderdata.state?.trim()?.toLowerCase()||"",
      }

  // console.log(response1,response2,pincodefrom,"pincodefrompincodefrompincodefrompincodefrompincodefrompincodefrom",)



      const response3Res = await fetch(`${UPLOAD_BASE_URLs}/read-excel`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body:JSON.stringify({pin1:response1,pin2:response2})
      })
      const response3 = await response3Res.json() as { data?: string }


       zone=response3.data



      //  console.log(zone,"SADSADSADSADSADSADSAD")


      //     console.log(response1,response2,pin1,pin2,response3,"pin1pin1pin1pin1pin1pin1pin1pin1pin1pin1")

      if(response3.data=="Zone not found" || !response3.data){
      if(response1.city==response2.city && response1.state==response2.state){
        zone="ZONE A"
      }
      else if(response1.state==response2.state){
        zone="ZONE B"
      }
      else if((metroCities.includes(response1.city) && metroCities.includes(response2.city)) ||(metroPincodeList.includes(pincodefrom?.Pincode) && metroPincodeList.includes(orderdata.pincode))){ 
        zone="ZONE C"
        
      }
      else if(northEastStates.includes(response1.state) || northEastStates.includes(response2.state)){
        zone="ZONE E"
        
      }
      else{
        zone="ZONE D"
        
      }
    }
    




//  const response = await fetch("/zonetest.xlsx");


  // const arrayBuffer = await response.arrayBuffer();

  //  const workbook = XLSX.read(arrayBuffer, {
  //   type: "array",
  //   sheetRows: 5000, // IMPORTANT
  // });

  // const sheetName = workbook.SheetNames[0];

  // const worksheet = workbook.Sheets[sheetName];


  // const data____ = XLSX.utils.sheet_to_json(worksheet);

  // console.log(worksheet,data____);
// const response = await fetch('http://localhost:8080/zone.xlsx');
//   const buffer = await response.arrayBuffer();
//   const workbook = XLSX.read(buffer, { type: 'array' });
//   const sheet = workbook.Sheets[workbook.SheetNames[0]];
//   const data_____ = XLSX.utils.sheet_to_json(sheet);
//   console.log(data_____,"data_____data_____data_____data_____")



      
      const wieght=valometric>tmpweight?valometric:tmpweight //calculateVolumetricWeight(hwl.height,hwl.width,hwl.length)
      // console.log(wieght,"wieghtsakdlkdslalsdkladsk",valometric>tmpweight?valometric:tmpweight)
     
      const couriertype={

      }
    const alldata={
        type:[],
        rate:[],
        data:[],
        codcharge:[],
      }
      const tmp=""
      const rateUserId = (pincodefrom?.user_id || orderdata?.seller || "").toString().trim();
      const response___ = await fetch(`${API_BASE_URL}/users/${rateUserId}`,{
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          }
        });

        const data = await response___.json();

        
        // setrawData(data?.data?.ratechart ||[])
        const ratechartData = data?.data?.ratechart || []
        // Detect where courier data starts: charts with a sub-header row (zone
        // descriptions under each zone name) start data at row 2; charts with a
        // single header row start at row 1. Skipping row 1 unconditionally dropped
        // the first courier's base slab row on single-header charts.
        const _subHeaderRow = Array.isArray(ratechartData[1]) ? ratechartData[1] : null;
        const _hasSubHeader =
          _subHeaderRow != null &&
          (_subHeaderRow[0] == null || String(_subHeaderRow[0]).trim() === "") &&
          (_subHeaderRow[1] == null || String(_subHeaderRow[1]).trim() === "");
        const _dataStart = _hasSubHeader ? 2 : 1;
        // Forward-fill merged courier cells: a courier block lists its name on the
        // first slab row and leaves continuation rows blank. Carry the last name down
        // so every slab row belongs to its courier (mirrors backend rate-card lookup).
        const rateRows = ratechartData.slice(_dataStart).map((row) => {
          return Array.isArray(row) ? row.slice() : [];
        });
        let _lastCourierCell = null;
        for (let _i = 0; _i < rateRows.length; _i++) {
          if (rateRows[_i][0] != null && String(rateRows[_i][0]).trim() !== "") {
            _lastCourierCell = rateRows[_i][0];
          } else if (_lastCourierCell != null) {
            rateRows[_i][0] = _lastCourierCell;
          }
        }
        const rawData_ = rateRows

        const rateHeaderRow = Array.isArray(ratechartData[0])
          ? ratechartData[0]
          : Array.isArray(rawData[0])
          ? rawData[0]
          : []
        const zoneCol = (() => {
          const exact = rateHeaderRow.indexOf(zone)
          if (exact >= 0) return exact
          const key = String(zone || "").toUpperCase().replace(/\s+/g, "")
          return rateHeaderRow.findIndex(
            (c) => String(c ?? "").toUpperCase().replace(/\s+/g, "") === key
          )
        })()
        if (zoneCol < 0) {
          tmpzone = zone
          const emptyRates = { type: [], rate: [], data: [], codcharge: [] };
          const rateKeyEmpty = String(orderdata?.referenceId || orderdata?.id || "unassigned");
          ratelist[rateKeyEmpty] = JSON.parse(JSON.stringify(emptyRates)) || {};
          return emptyRates
        }
       
        const alltype=[]

         for(let i=0;i<rawData_.length;i++)
            {
                  if(rawData_[i][0]!=null ){
                    if(/rto/i.test(String(rawData_[i][0]))) continue;
                    if(!alltype.includes(rawData_[i][0])){
                      alltype.push(rawData_[i][0])
                    }
                  }
            }


            // console.log(alltype,"alltypealltypealltypealltype",orderdata)



            tmpzone=zone

           console.log(wieght,zone,"dataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",alltype)
    // console.log(pincodefrom,"pincodefrompincodefrom")


            for(let i=0;i<alltype.length;i++){
              try {
              let max=0
              let ind=-1


               let max2=0
              let ind2=-1
                for(let j=0;j<rawData_.length;j++)
                 { 
                    
                    const tmax=Number(String(rawData_[j][1] ?? "").toLowerCase().replaceAll(" ","").replace("per","").replace("kg","").replace("additional","") || 0)
                    
                     if(rawData_[j][0]==alltype[i] && wieght<=tmax && ind2==-1){
                       ind2=j
                       max2=tmax 
                      
                    }
                     if((tmax>max && rawData_[j][0]==alltype[i] && wieght>=tmax) ){
                      ind=j
                      max=tmax
                    }
                     
                    
                 }



                 if(ind==-1){
                  ind=ind2
                  max=max2
                 }

                 // No parseable slab row for this courier: skip just this courier
                 // instead of crashing the whole calculation on rawData_[-1].
                 if(ind < 0 || !rawData_[ind]){
                   continue
                 }


                    if(max>=wieght){ 
     

       const amountNum = parseFloat(String(orderdata.amount ?? "").replace(/[^0-9.-]/g, ''));
  let charge=0
  let coudcharge=0
              
 
              

            
        charge +=rawData_[ind][zoneCol]

     
 
      if(orderdata.financialStatus == "pending"){
          // charge +=amountNum      
          let tmpcharg1=0   
          let tmpcharg2=0  
          try{
          const x11= String(rawData_[ind].at(-1) ?? "").toLowerCase().replaceAll(" ","").replaceAll("%","").split("|")
          tmpcharg1=amountNum/100*parseFloat(x11[1])
          tmpcharg2=parseFloat(x11[0]) 
          if(!Number.isFinite(tmpcharg1)) tmpcharg1=0
          if(!Number.isFinite(tmpcharg2)) tmpcharg2=0

           charge +=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2
           coudcharge=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2
            console.log("mmmmmmmmmmmm",charge,amountNum,tmpcharg1,tmpcharg2 , orderdata.courier==alltype[i])  
            if (orderdata.courier==alltype[i]) {
              rtocharge.push({referenceId:orderdata.referenceId,charge:tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2,totalrate:rawData_[ind][zoneCol]})
            }
          
             
          }
          catch(e){
            console.log(e,"ratelistttttttttt",tmpcharg1,amountNum)

          }
        }
        else{
            if (orderdata.courier==alltype[i]) {
              rtocharge.push({referenceId:orderdata.referenceId,charge:0,totalrate:rawData_[ind][zoneCol]})
            }

        }
        charge=charge*1.18


                      



                        alldata.type.push(alltype[i])
                        alldata.rate.push(charge.toFixed(2))
                        alldata.data.push(rawData_[ind]) 
                        alldata.codcharge.push(coudcharge.toFixed(2))
                        
                      }
                      else {
   
                         console.log(rawData_,max,wieght,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",ind,orderdata)

                   const parseSlabCell = (cell: unknown) =>
                     Number(String(cell ?? "").toLowerCase().replaceAll(" ","").replace("per","").replace("kg","").replace("additional","") || 0)
                   const amount1=Number(rawData_[ind][zoneCol]) || 0

                   // Find THIS courier's additional-rate row. Only rows that still belong
                   // to the same courier count, so one courier's rates are never used for
                   // another — and a missing row (old rawData_[ind+1] access) can no longer
                   // throw away the whole result.
                   let nextIdx=-1
                   for(let k=ind+1;k<rawData_.length;k++){
                     const cand=rawData_[k]
                     if(!cand || cand[0]!==alltype[i]) continue
                     if(Number(cand[zoneCol])>0 && parseSlabCell(cand[1])>0){ nextIdx=k; break }
                   }

                   let amount2=0
                   let step=0
                   let totalrate=0
                   if(nextIdx>=0){
                     amount2=Number(rawData_[nextIdx][zoneCol]) || 0
                     step=parseSlabCell(rawData_[nextIdx][1])
                     totalrate=amount1+amount2
                     max =max + step
                   } else {
                     // No additional row on this rate card: repeat the courier's own
                     // "Per X kg" rate over each X kg so overweight orders still show.
                     step=parseSlabCell(rawData_[ind][1]) || 0.5
                     amount2=amount1
                     totalrate=amount1*Math.max(Math.ceil(wieght/step),1)
                     max=wieght
                   }
                   if(!(step>0) || !(amount2>0)){
                     continue
                   }


                    let totalcount=0
                        console.log(max,"11111totalcounttotalcounttotalcounttotalcount",step)

                    do{
                      totalcount++
                        if(totalcount>299){
                          break;
                        }

                        console.log(max,wieght,totalcount,"totalcounttotalcounttotalcounttotalcount")
                        if(max>=wieght){
                        alldata.type.push(alltype[i])


  const amountNum = parseFloat(String(orderdata.amount ?? "").replace(/[^0-9.-]/g, ''));
  let charge=0
  let coudcharge=0
              
 
              

            
        charge +=totalrate

     
 
      if(orderdata.financialStatus == "pending"){
          // charge +=amountNum      
          let tmpcharg1=0   
          let tmpcharg2=0  
          try{
          const x11= String(rawData_[ind].at(-1) ?? "").replaceAll(" ","").replaceAll("%","").split("|")
          tmpcharg1=amountNum/100*parseFloat(x11[1])
          tmpcharg2=parseFloat(x11[0]) 
          if(!Number.isFinite(tmpcharg1)) tmpcharg1=0
          if(!Number.isFinite(tmpcharg2)) tmpcharg2=0

           charge +=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2
            coudcharge=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2



       if (orderdata.courier==alltype[i]) {
         rtocharge.push({referenceId:orderdata.referenceId,charge:tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2,totalrate:totalrate})
       }
            //  console.log("mmmmmmmmmmmm",orderdata.courier,alltype[i])  
          
             
          }
          catch(e){
            console.log(e,"ratelistttttttttt",tmpcharg1,amountNum)

          }
        }
        else{
          if (orderdata.courier==alltype[i]) {
            rtocharge.push({referenceId:orderdata.referenceId,charge:0,totalrate:totalrate})
          }

        }
        charge=charge*1.18




                        alldata.rate.push(charge.toFixed(2))
                        alldata.data.push(rawData_[ind]) 
                        alldata.codcharge.push(coudcharge.toFixed(2))
                        break;
                      }
                      if(!(step>0)){
                        break;
                      }
                      max+=step
                      totalrate+=amount2
                      } while (true); // eslint-disable-line no-constant-condition
                      }
              } catch (courierLoopErr) {
                console.log(courierLoopErr, "rate lookup failed for courier", alltype[i])
              }
                  }

                  
            



                  console.log(alldata,"alldataalldataalldataalldata")



         const rateKey = String(orderdata?.referenceId || orderdata?.id || "unassigned");
         ratelist[rateKey] = JSON.parse(JSON.stringify(alldata)) || {};  




console.log(ratelist,"ratelistratelistratelist")

         return alldata

        }
        catch(e){
           console.log(e,"sakjdksajdk sakdjsadkjk sadksajdk")
        }


  }





async function getrtocharge(){
  const rtood=[]
  
  for(const x of sortedOrders){
    if(x.status.toLowerCase().includes("rto")){
      rtood.push(x.referenceId)

       await handleCalculate(x)
    }
  }
  const rtood2=[]

     for(const x of rtocharge){
      
      rtood2.push(x.referenceId)
     }
  

  for(const x of rtood){
    if(!rtood2.includes(x)){
    // console.log(x,"xreferenceIdxreferenceIdxreferenceId")
    }
  }

  console.log(rtocharge,"rtochargertochargertocharge")
}
// setTimeout(()=>{  






// },20000)

 
    
const funsettype=(y,response2)=>{
   if (!response2 || !Array.isArray(response2.rate) || response2.rate.length === 0) {
     bulkshipmentcreate.coureir[y] = "";
     return;
   }
   const courierNames = response2.type || [];
   let rrr = Infinity;
        bulkshipmentcreate.coureir[y] = "";
        for(const y1  in response2?.rate){
          if (/rto/i.test(String(courierNames[y1] || ""))) continue;
          if(Number(response2?.rate[y1])<rrr){
            rrr=response2?.rate[y1]
            bulkshipmentcreate.coureir[y]=Number(y1)
          }              
        }
}



  const fungetratelist=async()=>{
    try{
      setAssignRatesLoading(true);
      const defaultWarehouse = warehouselist.find((ware) => ware.isDefault || ware.isDefault) || warehouselist[0] || {};
      const keepIndexes = bulkshipmentcreate.orderlist
        .map((_, i) => i)
        .filter((i) => !isRtoOrderStatus(bulkshipmentcreate.orderlist[i]?.status));
      if (keepIndexes.length !== bulkshipmentcreate.orderlist.length) {
        bulkshipmentcreate.orderlist = keepIndexes.map((i) => bulkshipmentcreate.orderlist[i]);
        bulkshipmentcreate.id = keepIndexes.map((i) => bulkshipmentcreate.id[i]);
        bulkshipmentcreate.coureir = keepIndexes.map((i) => bulkshipmentcreate.coureir[i] ?? "");
        bulkshipmentcreate.warehouselist = keepIndexes.map((i) => bulkshipmentcreate.warehouselist[i] ?? "");
        bulkshipmentcreate.zone = keepIndexes.map((i) => bulkshipmentcreate.zone?.[i] ?? "");
      }

      console.log(bulkshipmentcreate,"bulkshipmentcreatebulkshipmentcreatebulkshipmentcreatebulkshipmentcreate")
      for (const y in bulkshipmentcreate.orderlist) {
        const x = bulkshipmentcreate.orderlist[y];
        const resolvedWarehouseId = bulkshipmentcreate.warehouselist[y] || x?.warehouse || defaultWarehouse.id || "";
        const response2 = await handleCalculate(x, resolvedWarehouseId);
        bulkshipmentcreate.warehouselist[y] = resolvedWarehouseId || "";
        bulkshipmentcreate.orderlist[y] = {
          ...bulkshipmentcreate.orderlist[y],
          warehouse: resolvedWarehouseId || "",
        };
        bulkshipmentcreate.zone[y] = tmpzone;
        funsettype(y, response2 || { rate: [], type: [] });
      }
      setbulkshipmentcreate({ ...bulkshipmentcreate });
      setratelist({ ...ratelist });
    } catch (e) {
      console.log(e, ">>>>>>>>>>>>>>>>>>>");
      toast({
        title: "Rate fetch failed",
        description: "Could not load courier rates. Try again.",
        variant: "destructive",
      });
    } finally {
      setAssignRatesLoading(false);
    }
  }

  
const uploaddcoument=async(e)=>{
  const formdata=new FormData()
  formdata.append("file",e.target.files[0])

  // UPLOAD_BASE_URL already ends with "/upload" — posting to
  // `${UPLOAD_BASE_URL}/upload` ("/upload/upload") hits no route server-side.
  const uploadRes = await fetch(`${UPLOAD_BASE_URL}`,{
  method:"POST",
  body:formdata
})
const response = await uploadRes.json().catch(() => ({})) as { message?: string; error?: string; filename?: string; fileInfo?: { filename?: string } }
if(!uploadRes.ok){
  toast({
    title: "Upload failed",
    description: response?.message || response?.error || "Unable to upload document",
    variant: "destructive",
  })
  e.target.value=""
  return
}
setproof(response?.filename || response?.fileInfo?.filename || "")
e.target.value=""
}


const checkmerge=()=>{
 if(bulkshipmentcreate.orderlist.length<2){
  return false
 }
 let match=true
 const statusx=bulkshipmentcreate.orderlist[0].status
 const customerdetails={
  name:bulkshipmentcreate.orderlist[0].customerName?.toLowerCase(),
  phone:bulkshipmentcreate.orderlist[0].customerPhone,
  pincode:bulkshipmentcreate.orderlist[0].pincode,
  financialStatus:bulkshipmentcreate.orderlist[0].financialStatus,
  address:bulkshipmentcreate.orderlist[0].addressLine1?.replace(/[^\p{L}\p{N} ]/gu, '')?.toLowerCase()?.split(" ") || null,
 }
 const checkaddress=(add1,add2)=>{
  add2=add2?.replace(/[^\p{L}\p{N} ]/gu, '').toLowerCase()?.split(" ") || null
  if(!add1 || !add2){
    return true
  }
  if(add1.length==0 || add2.length==0){
    return true
  }
  let match=false
  const arrrr=(add1.length>=add2.length?add1:add2)
  for(const x of (add1.length<=add2.length?add1:add2)){
    if(!arrrr.includes(x)){
      match=true
      break
    }

  }
 }
for(const x of bulkshipmentcreate.orderlist){
if(statusx!=x.status || customerdetails.name!=x.customerName.toLowerCase() || customerdetails.phone!=x.customerPhone || customerdetails.pincode!=x.pincode || customerdetails.financialStatus!=x.financialStatus || checkaddress(customerdetails.address,x.addressLine1)){
  match=false
  break
}
}
return match
}


function mergeOrders(orders) {
  if (!orders || orders.length === 0) return null;
  if (orders.length === 1) return { ...orders[0] };

  // Helper: parse amount string like "₹297.36" → number
  const parseAmount = (amountStr) => {
    const match = amountStr?.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Helper: format number back to INR currency string
  const formatAmount = (num) => `₹${num.toFixed(2)}`;

  // Start with a shallow copy of the first order as base
  const base = orders[0];
  const merged = {
    ...base,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    items: [...(base.items || [])],
    totalItems: base.totalItems || 0,
    totalWeight: base.totalWeight || 0,
    totalVolumetricWeight: base.totalVolumetricWeight || 0,
    subtotalPrice: parseFloat(base.subtotalPrice) || 0,
    totalTax: parseFloat(base.totalTax) || 0,
    totalDiscounts: parseFloat(base.totalDiscounts) || 0,
    totalShippingPrice: parseFloat(base.totalShippingPrice) || 0,
    totalOutstanding: parseFloat(base.totalOutstanding) || 0,
    amountNumber: parseAmount(base.amount),
    merge_order:[orders[0].referenceId]
  };

  // Merge subsequent orders
  for (let i = 1; i < orders.length; i++) {
    const order = orders[i];

    // Merge items
    if (order.items?.length) {
      merged.items.push(...order.items);
    }

    // Sum numeric fields
    merged.totalItems += order.totalItems || 0;
    merged.totalWeight += order.totalWeight || 0;
    merged.totalVolumetricWeight += order.totalVolumetricWeight || 0;
    merged.subtotalPrice += parseFloat(order.subtotalPrice) || 0;
    merged.totalTax += parseFloat(order.totalTax) || 0;
    merged.totalDiscounts += parseFloat(order.totalDiscounts) || 0;
    merged.totalShippingPrice += parseFloat(order.totalShippingPrice) || 0;
    merged.totalOutstanding += parseFloat(order.totalOutstanding) || 0;
    merged.amountNumber += parseAmount(order.amount);
    merged.merge_order.push(order.referenceId)
  }



  // Format the summed amount back to currency string
  merged.amount = formatAmount(merged.amountNumber);
  delete merged.amountNumber;

  // Convert summed numeric fields back to strings if they were originally strings
  merged.subtotalPrice = merged.subtotalPrice.toFixed(2);
  merged.totalTax = merged.totalTax.toFixed(2);
  merged.totalDiscounts = merged.totalDiscounts.toFixed(2);
  merged.totalShippingPrice = merged.totalShippingPrice.toFixed(2);
  merged.totalOutstanding = merged.totalOutstanding.toFixed(2);

  // Handle fields that may conflict
  merged.referenceId = orders.map(o => o.referenceId).filter(Boolean).join(',').replaceAll(",","");
  merged.orderDate = orders.reduce((earliest, o) => 
    o.orderDate && o.orderDate < earliest ? o.orderDate : earliest, orders[0].orderDate);
  merged.status = orders.some(o => o.status === 'Pending') ? 'Pending' : (orders[0].status || 'Merged');
  merged.courier = orders.every(o => o.courier === orders[0].courier) ? orders[0].courier : 'Multiple';
  merged.awb = orders.every(o => o.awb === orders[0].awb) ? orders[0].awb : null;
  merged.trackingnumber = null; // reset when merging
  merged.merge_status="Merged"
  merged.platform="Merged"

  return merged;
}

 const handleCreateMerge = async () => {
try{
  const orderdata=mergeOrders(bulkshipmentcreate.orderlist)
    
      const newOrder = await orderApi.mergecreate([orderdata]);
    refreshOrdersAndCounts()
      toast({ title: "Success", description: "Order Merged successfully" });
    } catch (error) {
      console.log(error,"sadmansdmansd samdnamdsnm")

      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    }

setbulkshipmentcreate({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{},zone:[]})

  };


  const exceldatetorealdate = (excelDate) => {
  try{
    const [day, month, year] = excelDate.split('/');

  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');

  return `${year}-${m}-${d}`;
  }
  catch(e){
    try{
      const date = new Date((excelDate - 25569) * 86400 * 1000);

    return date.toISOString().split('T')[0].split("-")[0]+"-"+date.toISOString().split('T')[0].split("-")[2]+"-"+date.toISOString().split('T')[0].split("-")[1];

    }
    catch(e){
      alert("Invalid date format in Excel. Please ensure dates are in 'DD/MM/YYYY' format or valid Excel date numbers.")

    }
}
  }


//   const exceldatetorealdate=(excelDate)=>{

// const date = new Date((excelDate - 25569) * 86400 * 1000);

// return date.toISOString().split('T')[0].split("-")[0]+"-"+date.toISOString().split('T')[0].split("-")[2]+"-"+date.toISOString().split('T')[0].split("-")[1];
//   }
  // Parse Excel/CSV file and convert rows to orders
const parseExcelToOrders = async (file: File): Promise<{ orders: any[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      if (!rows.length) {
        resolve({ orders: [], errors: ['File is empty'] });
        return;
      }

      const errors: string[] = [];
      const orderMap = new Map<string, any>();

      // Required columns
      const requiredCols = ['Order Number','Order Date', 'Customer Name', 'Customer Phone', 'Pincode', 'City', 'State', 'Address Line 1', 'Product Name', 'Quantity', 'Unit Price'];
      const firstRow = rows[0];
      const missingCols = requiredCols.filter(col => !(col in firstRow));
      if (missingCols.length) {
        errors.push(`Missing required columns: ${missingCols.join(', ')}`);
        resolve({ orders: [], errors });
        return;
      }

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        // Use referenceId column if present, otherwise fall back to Order Number
        const referenceId = (row['referenceId']?.toString().trim() || row['Order Number']?.toString().trim());
        // if (!referenceId) {
          
        //   errors.push(`Row ${idx + 2}: referenceId is required`);
        //   continue;
        // }

        // Validate numeric fields
        const quantity = parseFloat(row['Quantity']);
        const unitPrice = parseFloat(row['Unit Price']);
        const gstRate = parseFloat(row['GST Rate (%)'] || 0);
        const height = row['Height (cm)'] ? parseFloat(row['Height (cm)']) : undefined;
        const width = row['Width (cm)'] ? parseFloat(row['Width (cm)']) : undefined;
        const length = row['Length (cm)'] ? parseFloat(row['Length (cm)']) : undefined;
        const deadWeight = row['Dead Weight (kg)'] ? parseFloat(row['Dead Weight (kg)']) : undefined;

        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${idx + 2}: Quantity must be a positive number`);
          continue;
        }
        if (isNaN(unitPrice) || unitPrice < 0) {
          errors.push(`Row ${idx + 2}: Unit Price must be a valid number`);
          continue;
        }

        const item = {
          name: row['Product Name']?.toString().trim() || 'Unnamed Product',
          // Bulk upload must keep the seller's SKU — Product Details shows it.
          sku: String(row['SKU'] ?? row['Sku'] ?? row['sku'] ?? '').trim(),
          unitPrice,
          quantity,
          gstRate: isNaN(gstRate) ? 0 : gstRate,
          height,
          width,
          length,
          deadWeight,
        };

        if (!orderMap.has(referenceId)) {
          // Create new order object
          const newOrder = {
            referenceId: "mmm",
            orderNumber: row['Order Number']?.toString().trim() || '',
            customerName: row['Customer Name']?.toString().trim() || '',
            customerPhone: row['Customer Phone']?.toString().trim() || '',
            customerEmail: row['Customer Email']?.toString().trim() || '',
            seller: getuser()?.role === "admin" ? (row['Seller ID'] || getuser()?.id) : getuser()?.id,
            courier: row['Courier'] || '-',
            status: 'Pending' as OrderStatus,
            amount: '0',
            orderDate: exceldatetorealdate(row['Order Date']),
            processedAt: exceldatetorealdate(row['Order Date']),

            awb: '-',
            platform: (row['Platform'] as Platform) || 'Manual',
            pincode: row['Pincode']?.toString().trim() || '',
            city: row['City']?.toString().trim() || '',
            state: row['State']?.toString().trim() || '',
            addressLine1: row['Address Line 1']?.toString().trim() || '',
            addressLine2: row['Address Line 2']?.toString().trim() || '',
            landmark: row['Landmark']?.toString().trim() || '',
            paymentGateway: row['Payment Method'] === 'Prepaid' ? 'Prepaid' : 'COD',
            items: [],
            user_id: getuser()?.role === "admin" ? (row['Seller ID'] || getuser()?.id) : getuser()?.id,
            totalItems: 0,
            totalWeight: undefined,
            totalVolumetricWeight: undefined,
            financialStatus: row['Payment Method'] === 'Prepaid' ? 'paid' : 'pending',
            fulfillmentStatus: null,
            subtotalPrice: null,
            totalTax: 0,
            totalDiscounts: 0,
            totalShippingPrice: 0,
            totalOutstanding: 0,
            currency: 'INR',
            taxesIncluded: false,
            taxExempt: false,
            confirmationNumber: null,
            checkoutId: null,
            checkoutToken: null,
            orderStatusUrl: null,
            sourceName: null,
            browserIp: null,
            userAgent: null,
            shippingAddress: null,
            billingAddress: null,
            customerData: null,
            cancelledAt: null,
            cancelReason: null,
            trackingnumber: null,
          };
          orderMap.set(referenceId, newOrder);
        }

        const order = orderMap.get(referenceId);
        order.items.push(item);
      }

      // Calculate totals for each order
      const orders = Array.from(orderMap.values()).map(order => {
        let totalAmount = 0;
        let totalItems = 0;
        let totalWeight = 0;
        let totalVolumetricWeight = 0;
        let subtotal = 0;
        let totalTax = 0;

        order.items.forEach((item: any) => {
          const money = computeOrderFinancials({ items: [item], totalDiscounts: 0, totalShippingPrice: 0 });
          totalAmount += money.payable;
          totalItems += item.quantity;
          totalWeight += (item.deadWeight || 0) * item.quantity;
          
          const volWeight = calculateVolumetricWeight(item.height, item.width, item.length);
          if (volWeight) totalVolumetricWeight += volWeight * item.quantity;
          
          subtotal += money.itemSubtotal;
          totalTax += money.tax;
        });

        const orderMoney = computeOrderFinancials(order);
        order.amount = `₹${orderMoney.payable.toFixed(2)}`;
        order.totalItems = totalItems;
        order.totalWeight = totalWeight;
        order.totalVolumetricWeight = totalVolumetricWeight;
        order.subtotalPrice = orderMoney.itemSubtotal;
        order.totalTax = orderMoney.tax;
        order.totalOutstanding = orderMoney.outstanding;
        order.items = order.items.map((item: any) => ({
          ...item,
          volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
          totalPrice: lineTotal(item)
        }));

        return order;
      });


      console.log(orders,"ordersordersordersordersordersordersordersorders")

      resolve({ orders, errors });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

// Handle file upload and preview
const handleUploadFile = async (file: File) => {
  setUploadFile(file);
  setUploadErrors([]);
  setUploadProcessing(true);
  try {
    const { orders, errors } = await parseExcelToOrders(file);
    // console.log(orders,"ordersordersordersorders")



    if (errors.length) {
      setUploadErrors(errors);
      setUploadPreview([]);
    } else {
      setUploadPreview(orders);
      setUploadErrors([]);
    }
  } catch (err: any) {
    setUploadErrors([err.message || 'Failed to parse file']);
    setUploadPreview([]);
  } finally {
    setUploadProcessing(false);
  }
};

// Confirm and create orders
const handleUploadConfirm = async () => {
  if (!uploadPreview.length) return;
  setUploadProcessing(true);
  try {
    await orderApi.mancreate(uploadPreview);
    toast({ title: "Success", description: `${uploadPreview.length} orders created successfully` });
    refreshOrdersAndCounts(); // refresh list
    setUploadDialogOpen(false);
    setUploadFile(null);
    setUploadPreview([]);
    setUploadErrors([]);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to create orders",
      variant: "destructive",
    });
  } finally {
    setUploadProcessing(false);
  }
};

// console.log(bulkshipmentcreate,"bulkshipmentcreatebulkshipmentcreatebulkshipmentcreate")

// Download Excel template for bulk upload
const handleDownloadTemplate = () => {
  // Define headers and sample rows
  const headers = [
    "Order Number",
    "referenceId",
    "Order Date",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Pincode",
    "City",
    "State",
    "Address Line 1",
    "Address Line 2",
    "Landmark",
    "Product Name",
    "SKU",
    "Quantity",
    "Unit Price",
    "GST Rate (%)",
    "Height (cm)",
    "Width (cm)",
    "Length (cm)",
    "Dead Weight (kg)",
    "Payment Method",
    "Courier",
    "Platform"
  ];

  // Sample data rows (can be removed by user)


  const datetmp=new Date()

  datetmp.setDate(datetmp.getDate()+2)
  const sampleRows = [
    [
      "ORD-001", 
      "REF-ORD001",
      "5/5/2025",
      "John Doe",
      "9876543210",
      "john@example.com",
      "400001",
      "Mumbai",
      "Maharashtra",
      "123, Main Street",
      "Near Park",
      "Landmark",
      "Wireless Mouse",
      "MOUSE-BLK-01",
      "2",
      "499",
      "18",
      "3",
      "8",
      "12",
      "0.2",
      "COD",
      "eKART",
      "Manual"
    ]
  ];

  // Create worksheet
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 15 }, // Order Number
    { wch: 15 }, // referenceId
    { wch: 20 }, // Customer Name
    { wch: 15 }, // Customer Phone
    { wch: 25 }, // Customer Email
    { wch: 10 }, // Pincode
    { wch: 15 }, // City
    { wch: 15 }, // State
    { wch: 30 }, // Address Line 1
    { wch: 25 }, // Address Line 2
    { wch: 15 }, // Landmark
    { wch: 25 }, // Product Name
    { wch: 16 }, // SKU
    { wch: 10 }, // Quantity
    { wch: 12 }, // Unit Price
    { wch: 12 }, // GST Rate (%)
    { wch: 12 }, // Height (cm)
    { wch: 12 }, // Width (cm)
    { wch: 12 }, // Length (cm)
    { wch: 15 }, // Dead Weight (kg)
    { wch: 15 }, // Payment Method
    { wch: 12 }, // Courier
    { wch: 12 }, // Platform
    { wch: 20 }  // Seller ID
  ];

  // Add some styling (optional - makes headers bold)
  for (let i = 0; i < headers.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    ws[cellAddress].s = { font: { bold: true, sz: 12 } };
  }

  // Create workbook and trigger download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order Template");
  XLSX.writeFile(wb, "order_upload_template.xlsx");
};


const labelSettingsCache: Record<string, { at: number; settings: LabelSettings }> = {};

async function loadSellerLabelSettings(sellerId: unknown): Promise<LabelSettings> {
  const key = String(sellerId || getuserid() || "");
  if (!key) return mergeLabelSettings();
  const cached = labelSettingsCache[key];
  if (cached && Date.now() - cached.at < 15000) return cached.settings;
  try {
    const data = await labelSettingsApi.get(key);
    labelSettingsCache[key] = { at: Date.now(), settings: data.settings };
    return data.settings;
  } catch {
    return mergeLabelSettings();
  }
}

const getdefaultdata= async (warehouseid,referenceId, sellerId = null) => {
  const response =await apiRequest("GET","auth/getAllWarehouses",{},{})
  const warehouseList = response?.data?.data || [];
  const warehouse = warehouseList.find((val)=>val.id==warehouseid)
  || warehouseList.find((val)=>val.isDefault)
  || warehouseList[0]
  || {};

  const resolvedSellerId = sellerId || warehouse?.user_id || warehouse?.seller?.id || getuserid();
  if (warehouse?.seller) delete warehouse.seller;

  const labelSettings = await loadSellerLabelSettings(resolvedSellerId);

  return { warehouse, labelSettings, sellerId: resolvedSellerId }
}

/** Resolve package weight/dimensions for optional label fields. */
function resolveLabelPackageMeta(order: any) {
  let weight = Number(order?.totalWeight) || 0;
  if (!weight && Array.isArray(order?.items)) {
    weight = order.items.reduce(
      (sum: number, item: any) => sum + (Number(item?.deadWeight) || 0) * (Number(item?.quantity) || 1),
      0
    );
  }

  let length = 0;
  let width = 0;
  let height = 0;
  if (Array.isArray(order?.items)) {
    for (const item of order.items) {
      const l = Number(item?.length) || 0;
      const w = Number(item?.width) || 0;
      const h = Number(item?.height) || 0;
      if (l > length) length = l;
      if (w > width) width = w;
      if (h > height) height = h;
    }
  }

  const weightText = weight > 0 ? `${Number(weight).toFixed(2)} kg` : "-";
  const dimensionsText =
    length || width || height
      ? `${length || "-"} × ${width || "-"} × ${height || "-"} cm`
      : "-";

  return { weightText, dimensionsText };
}

function buildLabelWeightDimensionLines(order: any, labelSettings: LabelSettings) {
  const { weightText, dimensionsText } = resolveLabelPackageMeta(order);
  const lines: any[] = [];
  if (labelSettings.showWeight) {
    lines.push({
      text: [{ text: "Weight : ", bold: true }, weightText],
      fontSize: 8,
      margin: [4, 0, 0, 2],
    });
  }
  if (labelSettings.showDimensions) {
    lines.push({
      text: [{ text: "Dimensions : ", bold: true }, dimensionsText],
      fontSize: 8,
      margin: [4, 0, 0, 2],
    });
  }
  return lines;
}

function buildLabelOrderIdLines(
  order: any,
  labelSettings: LabelSettings,
  style: Record<string, any> = {}
) {
  const lines: any[] = [];
  const base = {
    alignment: "center",
    fontSize: 7,
    margin: [0, 2, 0, 1],
    ...style,
  };
  if (labelSettings.showOrderReferenceId) {
    lines.push({
      ...base,
      text: `Order Ref. ID: ${order.referenceId || "-"}`,
    });
  }
  if (labelSettings.showOrderNo) {
    lines.push({
      ...base,
      text: `Order No: ${order.orderNumber || "-"}`,
    });
  }
  return lines;
}

async function generateAWBQRCode(awbNumber) {
  try {
    // Options: size, margin, error correction (adjust as needed)
    const qrDataUrl = await QRCode.toDataURL(awbNumber, {
      width: 150,          // width in pixels
      margin: 2,           // margin around QR
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation failed:', err);
    return null;
  }
}
const imageUrlToBase64 = async (url) => {
  let src = String(url || "").trim();
  if (!src) throw new Error("Empty logo URL");
  if (!src.startsWith("data:")) {
    // Resolve stored references (bare filename, /uploads/x, legacy
    // /upload/uploads/x) to the canonical host /uploads/<file> URL that
    // express.static always serves — the old alias-based URLs 404.
    src = resolveAvatarUrl(src);
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Logo fetch failed (${response.status})`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// const generateBarcodeDataURL = async (text, width = 1.8, height = 35) => {
//   if (!text || text === 'N/A' || text === '-') return null;
//   try {
//     const canvas = document.createElement('canvas');
//     JsBarcode(canvas, text, {
//       format: 'CODE128',
//       width: width,
//       height: height,
//       displayValue: true,      // show human‑readable text below bars
//       fontSize: 10,            // small to fit label
//       margin: 4,
//       background: '#ffffff',
//       lineColor: '#000000',
//     });
//     return canvas.toDataURL('image/png');
//   } catch (err) {
//     console.error('Barcode generation failed:', err);
//     return null;
//   }
// };

// ----- Helper: Format currency to Rs. with two decimals -----

const generateBarcodeDataURL = async (text, width = 2.5, height = 50) => {
  if (!text || text === 'N/A' || text === '-') return null;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: width,           // Increased from 1.8 to 2.5
      height: height,         // Increased from 35 to 50
      displayValue: true,
      fontSize: 12,           // Increased from 10
      margin: 8,              // Increased from 4
      background: '#ffffff',
      lineColor: '#000000',
      textMargin: 4,          // Space between barcode and text
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Barcode generation failed:', err);
    return null;
  }
};

// Also update the user 11 specific label function if needed:

async function buildShippingLabel11Large(order) {
  const defaultdata = await getdefaultdata(order.warehouse, order.referenceId);

  // Generate barcodes with larger dimensions
  const awbBarcode = await generateBarcodeDataURL(order.awb, 2.5, 50);

  const paymentMethod = order.financialStatus === "pending" ? "COD" : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean).join("\n");

  const bookedDate = new Date(order.processedAt || new Date()).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody: any[] = [
    [
      { text: "SKU", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "Name", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "QTY", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "HSN\nCode", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "Tax", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      { text: item.sku || "-", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: item.name || "-", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: String(item.quantity || 1), alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: item.hsn || "-", alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: `${item.gstRate || 0}.00%`, alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] }
    ]);
  });

  return [
    {
      // Larger label size for user 11
      pageSize: {
        width: 350,
        height: 520
      },

      pageMargins: [6, 6, 6, 6],

      defaultStyle: {
        fontSize: 8
      },

      table: {
        widths: ["*"],

        body: [
          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: "SHIP TO",
                      bold: true,
                      fontSize: 11,
                      margin: [6, 5, 4, 2],
                      color: "#1e3a8a"
                    },
                    {
                      text: shippingAddress,
                      fontSize: 9,
                      lineHeight: 1.3,
                      margin: [6, 0, 4, 5]
                    }
                  ]
                },
                {
                  width: 150,
                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 13,
                      margin: [5, 4, 4, 2],
                      color: "#1e3a8a"
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [{ text: "PAYMENT : ", bold: true, fontSize: 9 }, paymentMethod],
                      margin: [6, 4, 0, 2]
                    },
                    {
                      text: [{ text: "AWB No. : ", bold: true, fontSize: 9 }, order.awb || "-"],
                      margin: [6, 2, 0, 2]
                    }
                  ]
                },
                {
                  width: 150,
                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 2]
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 140,
                          height: 55,
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 4]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              text: `Booked: ${bookedDate}`,
              fontSize: 8,
              margin: [6, 2, 4, 6],
              color: "#666"
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [60, "*", 35, 50, 45],
                body: tableBody
              },
              layout: {
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
                hLineColor: () => "#000",
                vLineColor: () => "#000"
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT REQUIRE SIGNATURE",
              alignment: "center",
              bold: true,
              fontSize: 7,
              margin: [6, 10, 6, 6],
              color: "#666"
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000"
      },

      pageBreak: "after"
    }
  ];
}

const formatCurrency = (amount) => {
  const numeric = typeof amount === 'number'
    ? amount
    : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  return isNaN(numeric) ? 'Rs. 0.00' : `Rs. ${numeric.toFixed(2)}`;
};



async function generateShippingLabel11(order, _labelSettings = null, options: { returnDoc?: boolean } = {}) {
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.referenceId,
    order.seller || order.user_id
  );
  const labelSettings = mergeLabelSettings(_labelSettings || defaultdata?.labelSettings);
  const packageMetaLines = buildLabelWeightDimensionLines(order, labelSettings);

  const warehouse = defaultdata?.warehouse || {};

  const awbBarcode = labelSettings.showAwbBarcode !== false
    ? await generateBarcodeDataURL(order.awb)
    : null;
  const orderBarcode = labelSettings.showOrderBarcode !== false
    ? await generateBarcodeDataURL(order.referenceId)
    : null;
  const awbQr = labelSettings.showAwbQr !== false
    ? await generateAWBQRCode(order.awb || "N/A")
    : null;

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = new Date(
    order.processedAt || new Date()
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody: any[] = [
    [
      {
        text: "SKU",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "Name",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "QTY",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "HSN\nCode",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "Tax",
        bold: true,
        fontSize: 6,
        alignment: "center"
      }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      {
        text: item.sku || "-",
        fontSize: 5.5
      },
      {
        text: item.name || "-",
        fontSize: 5.5
      },
      {
        text: String(item.quantity || 1),
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: item.hsn || "-",
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: `${item.gstRate || 0}.00%`,
        alignment: "center",
        fontSize: 5.5
      }
    ]);
  });

  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [1, 1, 1, 1],

    defaultStyle: {
      fontSize: 6.5
    },

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            // SHIP TO
            [
              {
                columns: [
                  {
                    width: "*",

             
                stack: [
                  {
                    text: "Ship To",
                    bold: true,
                    fontSize: 8,
                    margin: [4, 3, 4, 1]
                  },

                  {
                    text: shippingAddress,
                    fontSize: 7,
                    lineHeight: 1,
                    margin: [4, 0, 4, 3]
                  }
                ],

               
            },
          
            {
                    width: 118,

                    stack: [
                      {
                        text: order.courier || "Delhivery",
                        alignment: "center",
                        bold: true,
                        fontSize: 12,
                        margin: [5, 2, 4, 1]
                      },


                     
                    ]
                  }
          
          ]}
              
            ],

            // PAYMENT + AWB
            [
              {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: [
                          {
                            text: "Payment : ",
                            bold: true
                          },
                          paymentMethod
                        ],

                        fontSize: 7,
                        margin: [4, 3, 0, 1]
                      },

                      {
                        text: [
                          {
                            text: "AWB No. : ",
                            bold: true
                          },
                          order.awb || "-"
                        ],

                        fontSize: 7,
                        margin: [4, 0, 0, 1]
                      },
                      ...packageMetaLines
                    ]
                  },

                  {
                    width: awbQr ? 150 : 118,

                    stack: [
                      {
                        text: order.courier || "Delhivery",
                        alignment: "center",
                        bold: true,
                        fontSize: 8,
                        margin: [0, 2, 0, 1]
                      },

                      {
                        columns: [
                          {
                            width: "*",
                            stack: [
                              awbBarcode
                                ? {
                                    image: awbBarcode,
                                    width: awbQr ? 90 : 105,
                                    height: 32,
                                    alignment: "center",
                                    margin: [0, 0, 0, 0]
                                  }
                                : {},
                              {
                                text: order.awb || "-",
                                alignment: "center",
                                bold: true,
                                fontSize: 6.5,
                                margin: [0, 1, 0, 2]
                              }
                            ]
                          },
                          awbQr
                            ? {
                                width: 42,
                                stack: [
                                  {
                                    image: awbQr,
                                    width: 40,
                                    alignment: "center",
                                    margin: [0, 0, 2, 0]
                                  }
                                ]
                              }
                            : { width: 0, text: "" }
                        ]
                      }
                    ]
                  }
                ]
              }
            ],
             [ {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: `Booked Date: ${bookedDate}`,
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      },
                      ...buildLabelOrderIdLines(order, labelSettings, {
                        alignment: "left",
                        fontSize: 7,
                        margin: [4, 0, 4, 2],
                      }),
                    ]
                  }
                ]
              
            }],

            // SHIPPER + ORDER BARCODE
          

            // TABLE
            [
              {
                table: {
                  headerRows: 1,
                  widths: [42, "*", 22, 30, 25],
                  body: tableBody
                },

                layout: {
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  hLineColor: () => "#000",
                  vLineColor: () => "#000",

                  paddingLeft: () => 1,
                  paddingRight: () => 1,
                  paddingTop: () => 1,
                  paddingBottom: () => 1
                }
              }
            ],

            // FOOTER
            [
              {
                text:
                  "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",

                alignment: "center",

                bold: true,

                fontSize: 5.5,

                margin: [2, 4, 2, 4]
              }
            ]
          ]
        },

        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => "#000",
          vLineColor: () => "#000",

          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0
        }
      }
    ]
  };

  if (options?.returnDoc) return docDefinition;
  pdfMake
    .createPdf(docDefinition)
    .download(`Label_${order.referenceId}.pdf`);
}
// ----- Main label generation function -----

async function generateShippingLabel19(order, _labelSettings = null, options: { returnDoc?: boolean } = {}) {
  const defaultdata = await getdefaultdata(order.warehouse, order.referenceId, order.seller || order.user_id);
  const labelSettings = mergeLabelSettings(_labelSettings || defaultdata?.labelSettings);
  const packageMetaLines = buildLabelWeightDimensionLines(order, labelSettings);

  // Generate barcodes + AWB QR
  const awbBarcode = labelSettings.showAwbBarcode !== false
    ? await generateBarcodeDataURL(order.awb)
    : null;
  const orderBarcode = labelSettings.showOrderBarcode !== false
    ? await generateBarcodeDataURL(order.referenceId)
    : null;
  const awbQr = labelSettings.showAwbQr !== false
    ? await generateAWBQRCode(order.awb || "N/A")
    : null;

  // Order details
  const referenceId = order.referenceId || "-";
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN");
  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending" ? "COD" : "Prepaid";

  // Address
  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || "",
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean);

  // Warehouse
  const warehouse = defaultdata?.warehouse || {};

  const shipperName = warehouse.name || "HA.OK.DEL";

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : orderDate;

  // Table Body – Tax column removed (only SKU, Name, QTY)
  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  // Amount
  const orderAmount =
    parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  const grandTotal = orderAmount;

  // PDF definition – column widths: SKU, Name, QTY (Tax removed)
  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [4, 4, 4, 4],

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            [
              {
                stack: [
                  // SHIP TO
                  {
                    text: "Ship To",
                    bold: true,
                    fontSize: 9,
                    margin: [4, 4, 4, 2]
                  },

                  {
                    text: shippingAddressLines.join("\n"),
                    fontSize: 7,
                    margin: [4, 0, 4, 6],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            // PAYMENT + BARCODE
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      {
                        text: [
                          { text: "Payment : ", bold: true },
                          paymentMethod
                        ],
                        fontSize: 8,
                        margin: [4, 4, 0, 3]
                      },

                      {
                        text: [
                          { text: "AWB No. : ", bold: true },
                          order.awb || "-"
                        ],
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      },
                      ...packageMetaLines
                    ]
                  },

                  {
                    width: awbQr ? 155 : 120,

                    stack: [
                      {
                        text: order.courier || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 8,
                        margin: [0, 2, 0, 2]
                      },

                      {
                        columns: [
                          {
                            width: "*",
                            stack: [
                              awbBarcode
                                ? {
                                    image: awbBarcode,
                                    width: awbQr ? 95 : 110,
                                    height: 40,
                                    alignment: "center"
                                  }
                                : {},
                              {
                                text: order.awb || "-",
                                alignment: "center",
                                bold: true,
                                fontSize: 7,
                                margin: [0, 2, 0, 2]
                              }
                            ]
                          },
                          awbQr
                            ? {
                                width: 48,
                                stack: [
                                  {
                                    image: awbQr,
                                    width: 44,
                                    alignment: "center",
                                    margin: [0, 0, 2, 0]
                                  }
                                ]
                              }
                            : { width: 0, text: "" }
                        ]
                      }
                    ]
                  }
                ]
              }
            ],

            // SHIPPED BY
            [
              {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: `Shipped By ${shipperName}`,
                        bold: true,
                        fontSize: 8,
                        margin: [4, 4, 4, 2]
                      },

                      {
                        text: `Booked Date: ${bookedDate}`,
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      ...buildLabelOrderIdLines(order, labelSettings, {
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 4, 0, 2],
                      }),

                      orderBarcode
                        ? {
                            image: orderBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      (labelSettings.showOrderNo || labelSettings.showOrderReferenceId || orderBarcode)
                        ? {
                            text: `Order Date: ${orderDate}`,
                            alignment: "center",
                            fontSize: 7,
                            margin: [0, 2, 0, 2]
                          }
                        : {},
                    ]
                  }
                ]
              }
            ],

            // TABLE (Tax column removed)
            [
              {
                margin: [0, 0, 0, 0],

                table: {
                  headerRows: 1,

                  // Widths: SKU, Name, QTY
                  widths: [55, "*", 35],

                  body: [
                    [
                      {
                        text: "SKU",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "Name",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "QTY",
                        bold: true,
                        alignment: "center",
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      }
                    ],

                    ...tableBody,

                    // [
                    //   {
                    //     colSpan: 3,
                    //     text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                    //     alignment: "right",
                    //     bold: true,
                    //     fontSize: 7,
                    //     margin: [0, 4, 6, 4]
                    //   },
                    //   {},
                    //   {}
                    // ]
                  ]
                }
              }
            ],

            // FOOTER
            [
              {
                stack: [
                  {
                    text:
                      "All disputes are subject to jurisdiction. Goods once sold will only be taken back or exchange as per the store's exchange/return policy.",
                    fontSize: 6,
                    margin: [4, 4, 4, 4],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            [
              {
                text:
                  "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
                fontSize: 7,
                bold: true,
                margin: [4, 6, 4, 6]
              }
            ]
          ]
        },

        layout: {
          hLineWidth: function () {
            return 1;
          },

          vLineWidth: function () {
            return 1;
          },

          hLineColor: function () {
            return "#000";
          },

          vLineColor: function () {
            return "#000";
          },

          paddingLeft: function () {
            return 0;
          },

          paddingRight: function () {
            return 0;
          },

          paddingTop: function () {
            return 0;
          },

          paddingBottom: function () {
            return 0;
          }
        }
      }
    ],

    defaultStyle: {
      fontSize: 7
    }
  };

  if (options?.returnDoc) return docDefinition;
  pdfMake.createPdf(docDefinition).download(`Label_${referenceId}.pdf`);
}


async function generateShippingLabeldefault(order, labelSettingsInput = null, options: { returnDoc?: boolean } = {}) {
  const defaultdata = await getdefaultdata(order.warehouse, order.referenceId, order.seller || order.user_id);
  const labelSettings = mergeLabelSettings(labelSettingsInput || defaultdata?.labelSettings);

  // Generate barcodes + AWB QR
  const awbBarcode = labelSettings.showAwbBarcode !== false
    ? await generateBarcodeDataURL(order.awb)
    : null;
  const orderBarcode = labelSettings.showOrderBarcode !== false
    ? await generateBarcodeDataURL(order.referenceId)
    : null;
  const awbQr = labelSettings.showAwbQr !== false
    ? await generateAWBQRCode(order.awb || "N/A")
    : null;

  let logoImage = null;
  if (labelSettings.showLogo && labelSettings.logoUrl) {
    try {
      logoImage = await imageUrlToBase64(labelSettings.logoUrl);
    } catch (e) {
      console.warn('Label logo load failed', e);
    }
  }

  // Order details
  const referenceId = order.referenceId || "-";
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN");
  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending" ? "COD" : "Prepaid";

  // Address
  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || "",
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean);

  // Warehouse / branding
  const warehouse = defaultdata?.warehouse || {};
  const shipperName = (labelSettings.showCompanyName && labelSettings.companyName)
    ? labelSettings.companyName
    : (warehouse.name || "HA.OK.DEL");

  const shipperLines = [shipperName];
  if (labelSettings.showWarehouseAddress) {
    const addr = [
      warehouse.address,
      [warehouse.city, warehouse.state].filter(Boolean).join(", "),
      warehouse.pincode,
    ].filter(Boolean);
    shipperLines.push(...addr);
  }
  if (labelSettings.showSupportPhone && labelSettings.supportPhone) {
    shipperLines.push(`Support: ${labelSettings.supportPhone}`);
  }
  if (labelSettings.showGst && labelSettings.gstOnLabel) {
    shipperLines.push(`GST: ${labelSettings.gstOnLabel}`);
  }

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : orderDate;

  // Table Body – Tax column removed (only SKU, Name, QTY)
  const tableBody = order.items.map((item) => [
    {
      text: labelSettings.showSku === false ? "-" : (item.sku || "-"),
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  // Amount
  const orderAmount =
    parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  const grandTotal = orderAmount;
  const packageMetaLines = buildLabelWeightDimensionLines(order, labelSettings);

  const brandingStack: any[] = [];
  brandingStack.push({
    columns: [
      {
        width: "*",
        stack: [
          {
            text: "Ship To",
            bold: true,
            fontSize: 9,
            margin: [4, 4, 4, 2]
          },
          {
            text: shippingAddressLines.join("\n"),
            fontSize: 7,
            margin: [4, 0, 4, 6],
            lineHeight: 1.1
          }
        ]
      },
      logoImage
        ? {
            width: 78,
            stack: [
              {
                image: logoImage,
                width: 70,
                alignment: "right",
                margin: [0, 4, 4, 2],
              }
            ]
          }
        : { width: 0, text: "" }
    ]
  });

  // PDF definition – column widths: SKU, Name, QTY (Tax removed)
  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [4, 4, 4, 4],

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            [
              {
                stack: brandingStack
              }
            ],

            // PAYMENT + BARCODE
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      {
                        text: [
                          { text: "Payment : ", bold: true },
                          paymentMethod
                        ],
                        fontSize: 8,
                        margin: [4, 4, 0, 3]
                      },

                      {
                        text: [
                          { text: "AWB : ", bold: true },
                          order.awb || "-"
                        ],
                        fontSize: 8,
                        margin: [4, 0, 0, 3]
                      },

                      {
                        text: order.courier || "-",
                        fontSize: 8,
                        bold: true,
                        margin: [4, 0, 0, 2]
                      },
                      ...packageMetaLines
                    ]
                  },

                  {
                    width: awbQr ? 155 : 120,
                    columns: [
                      {
                        width: "*",
                        stack: [
                          awbBarcode
                            ? {
                                image: awbBarcode,
                                width: awbQr ? 95 : 110,
                                height: 40,
                                alignment: "center",
                                margin: [0, 4, 2, 2]
                              }
                            : {}
                        ]
                      },
                      awbQr
                        ? {
                            width: 48,
                            stack: [
                              {
                                image: awbQr,
                                width: 44,
                                alignment: "center",
                                margin: [0, 2, 2, 0]
                              }
                            ]
                          }
                        : { width: 0, text: "" }
                    ]
                  }
                ]
              }
            ],

            // SHIPPED BY
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      {
                        text: "Shipped By",
                        bold: true,
                        fontSize: 8,
                        margin: [4, 4, 0, 2]
                      },
                      {
                        text: shipperLines.join("\n"),
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      },
                      {
                        text: `Booked: ${bookedDate}`,
                        fontSize: 6,
                        margin: [4, 0, 4, 4]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      ...buildLabelOrderIdLines(order, labelSettings, {
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 4, 0, 2],
                      }),

                      orderBarcode
                        ? {
                            image: orderBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      (labelSettings.showOrderNo || labelSettings.showOrderReferenceId || orderBarcode)
                        ? {
                            text: `Order Date: ${orderDate}`,
                            alignment: "center",
                            fontSize: 7,
                            margin: [0, 2, 0, 2]
                          }
                        : {},
                    ]
                  }
                ]
              }
            ],

            // TABLE (Tax column removed)
            [
              {
                margin: [0, 0, 0, 0],

                table: {
                  headerRows: 1,

                  // Widths: SKU, Name, QTY
                  widths: [55, "*", 35],

                  body: [
                    [
                      {
                        text: "SKU",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "Name",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "QTY",
                        bold: true,
                        alignment: "center",
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      }
                    ],

                    ...tableBody,

                    ...(labelSettings.showTotal !== false
                      ? [
                          [
                            {
                              colSpan: 3,
                              text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                              alignment: "right",
                              bold: true,
                              fontSize: 7,
                              margin: [0, 4, 6, 4]
                            },
                            {},
                            {}
                          ]
                        ]
                      : [])
                  ]
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5
                }
              }
            ],

            // FOOTER
            ...(labelSettings.showDisclaimer !== false || labelSettings.footerText
              ? [
                  [
                    {
                      text:
                        labelSettings.footerText ||
                        "This is a system generated shipping label. Please verify package contents before accepting delivery.",
                      fontSize: 5,
                      margin: [4, 4, 4, 4],
                      color: "#444444"
                    }
                  ]
                ]
              : [])
          ]
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8
        }
      }
    ]
  };

  if (options?.returnDoc) return docDefinition;
  pdfMake.createPdf(docDefinition).download(`Label_${referenceId}.pdf`);
}


async function generateShippingLabel(order, options: { returnDoc?: boolean } = {}){
  const sellerId = order.seller || order.user_id || getuserid();
  const settings = await loadSellerLabelSettings(sellerId);
  const template = settings?.template || 'default';

  if (template === 'compact') {
    return await generateShippingLabel11(order, settings, options);
  }
  if (template === 'with_tax') {
    return await generateShippingLabel11(order, { ...settings, showHsnTax: true }, options);
  }
  if (template === 'detailed') {
    return await generateShippingLabel19(order, settings, options);
  }

  // Keep legacy hard-coded layouts for sellers 11/19 when they still use default template
  if (Number(getuser()?.id) === 11) {
    return await generateShippingLabel11(order, settings, options);
  }
  if (Number(getuser()?.id) === 19) {
    return await generateShippingLabel19(order, settings, options);
  }

  return await generateShippingLabeldefault(order, settings, options);
}




async function generateOrderPDF(order) {
  const defaultdata = await getdefaultdata(order.warehouse, order.referenceId);

  const qrDataUrl = await generateAWBQRCode(order.awb || 'N/A');

  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return `₹${amount.toFixed(2)}`;
    }
    const numeric = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    return isNaN(numeric) ? '₹0.00' : `₹${numeric.toFixed(2)}`;
  };

  const referenceId = order.referenceId;
  const orderDate = order.orderDate;
  const customerName = order.customerName;
  const customerPhone = order.customerPhone;
  const customerEmail = order.customerEmail;
  const paymentMethod = order.financialStatus === 'pending' ? 'Cash on Delivery' : 'Prepaid';
  const financialStatus = order.financialStatus === 'paid' ? 'Paid' : 'Pending';
  const shippingAddress = [
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city}, ${order.state} - ${order.pincode}`
  ].filter(Boolean).join(', ');

  // Calculate actual GST amount from items
  let calculatedTotalTax = 0;
  let calculatedSubtotal = 0;
  
  order.items.forEach((item) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const itemGstAmount = (itemSubtotal * item.gstRate) / 100;
    calculatedSubtotal += itemSubtotal;
    calculatedTotalTax += itemGstAmount;
  });

  const itemsTableBody = order.items.map((item, idx) => [
    { text: (idx + 1).toString(), alignment: 'center' },
    { text: item.name },
    { text: item.quantity.toString(), alignment: 'center' },
    { text: formatCurrency(item.unitPrice), alignment: 'right' },
    { text: `${item.gstRate}%`, alignment: 'center' },
    { text: formatCurrency(item.totalPrice || (item.unitPrice * item.quantity + (item.unitPrice * item.quantity * item.gstRate) / 100)), alignment: 'right' }
  ]);

  // Use calculated values instead of order.totalTax
  const subtotal = calculatedSubtotal;
  const totalTax = calculatedTotalTax;
  const discountAmount = Math.max(0, parseFloat(String(order.totalDiscounts || 0)) || 0);
  const shippingAmount = Math.max(0, parseFloat(String(order.totalShippingPrice || 0)) || 0);
  const grandTotal = Math.max(0, subtotal + totalTax + shippingAmount - discountAmount);

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Header with centered logo and right-aligned order details
      {
        columns: [
          { width: 'auto', text: '' }, // left spacer
          {
            width: '*',
            stack: [
              { text: defaultdata.warehouse.name, style: 'sectionHeader', alignment: 'center' },
              { text: 'INVOICE', style: 'header', alignment: 'center' }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: `Order #: ${referenceId}\nDate: ${orderDate}`, alignment: 'right', style: 'subheader' },
              qrDataUrl ? { image: qrDataUrl, width: 70, alignment: 'right', margin: [0, 5, 0, 0] } : {}
            ]
          }
        ]
      },
      { text: '\n' },
      // Company & Customer details
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'SHIP & RETURN ADDRESS', style: 'sectionHeader' },
              { text: defaultdata.warehouse.name, bold: true },
              { text: defaultdata.warehouse.address },
              { text: defaultdata.warehouse.city + " ," + defaultdata.warehouse.state + " - " + defaultdata.warehouse.pincode },
            ]
          },
          {
            width: '*',
            stack: [
              { text: 'SHIP TO', style: 'sectionHeader' },
              { text: customerName, bold: true },
              { text: shippingAddress },
              { text: `Phone: ${customerPhone}` },
              { text: `Email: ${customerEmail || '—'}` }
            ]
          }
        ]
      },
      { text: '\n' },
      // Order summary
      {
        columns: [
          { text: `Payment Method: ${paymentMethod}`, width: '*' },
          { text: `Shipped By: ${order.courier?.toLowerCase().includes("smc") ? "Shree Maruti" : order.courier}`, width: '*' },
          { text: `AWBID: ${order.awb}`, width: '*' }
        ]
      },
      { text: '\n' },
      // Items table
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'S.No', style: 'tableHeader', alignment: 'center' },
              { text: 'Product', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'center' },
              { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
              { text: 'GST', style: 'tableHeader', alignment: 'center' },
              { text: 'Total', style: 'tableHeader', alignment: 'right' }
            ],
            ...itemsTableBody,
            [
              { text: '', colSpan: 5, alignment: 'right' },
              {},
              {},
              {},
              {},
              { text: formatCurrency(grandTotal), alignment: 'right', bold: true }
            ]
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: '\n' },
      // Totals breakdown - Fixed to show correct tax amount
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: 'Subtotal:', alignment: 'right' },
              { text: `Tax (GST):`, alignment: 'right' },
              ...(shippingAmount > 0 ? [{ text: 'Shipping:', alignment: 'right' }] : []),
              ...(discountAmount > 0 ? [{ text: 'Discount:', alignment: 'right', color: '#be123c' }] : []),
              { text: 'Grand Total:', alignment: 'right', bold: true }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: formatCurrency(subtotal), alignment: 'right' },
              { text: formatCurrency(totalTax), alignment: 'right' },
              ...(shippingAmount > 0 ? [{ text: formatCurrency(shippingAmount), alignment: 'right' }] : []),
              ...(discountAmount > 0 ? [{ text: `-${formatCurrency(discountAmount)}`, alignment: 'right', color: '#be123c' }] : []),
              { text: formatCurrency(grandTotal), alignment: 'right', bold: true }
            ]
          }
        ]
      },
      { text: '\n\n' },
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#1e3a8a' },
      subheader: { fontSize: 10, color: '#666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 0, 0, 5], color: '#1e3a8a' },
      tableHeader: { bold: true, fontSize: 11, fillColor: '#eef2ff', color: '#1e3a8a' },
      footer: { fontSize: 9, color: '#888', italics: true }
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.4 }
  };

  pdfMake.createPdf(docDefinition).download(`Invoice_${referenceId}.pdf`);
}


async function generateOrderPDFbulk(orderList) {
  const allContent = [];

  for (let index = 0; index < orderList.length; index++) {
    const order = orderList[index];

    const defaultdata = await getdefaultdata(
      order.warehouse,
      order.referenceId
    );

    const qrDataUrl = await generateAWBQRCode(order.awb || "N/A");

    const formatCurrency = (amount) => {
      if (typeof amount === "number") {
        return `₹${amount.toFixed(2)}`;
      }

      const numeric = parseFloat(
        String(amount).replace(/[^0-9.-]/g, "")
      );

      return isNaN(numeric)
        ? "₹0.00"
        : `₹${numeric.toFixed(2)}`;
    };

    const paymentMethod =
      order.financialStatus === "pending"
        ? "Cash on Delivery"
        : "Prepaid";

    const shippingAddress = [
      order.addressLine1,
      order.addressLine2,
      order.landmark,
      `${order.city}, ${order.state} - ${order.pincode}`,
    ]
      .filter(Boolean)
      .join(", ");

    const itemsTableBody = order.items.map((item, idx) => [
      { text: (idx + 1).toString(), alignment: "center" },
      { text: item.name },
      { text: item.quantity.toString(), alignment: "center" },
      {
        text: formatCurrency(item.unitPrice),
        alignment: "right",
      },
      {
        text: `${item.gstRate}%`,
        alignment: "center",
      },
      {
        text: formatCurrency(item.totalPrice),
        alignment: "right",
      },
    ]);

    const totalTax = parseFloat(order.totalTax) || 0;

    const grandTotal =
      parseFloat(
        String(order.amount).replace(/[^0-9.-]/g, "")
      ) || 0;

    allContent.push(
      // HEADER
      {
        columns: [
          { width: "auto", text: "" },

          {
            width: "*",
            stack: [
              {
                text: defaultdata.warehouse.name,
                style: "sectionHeader",
                alignment: "center",
              },

              {
                text: "INVOICE",
                style: "header",
                alignment: "center",
              },
            ],
          },

          {
            width: "auto",
            stack: [
              {
                text: `Order #: ${order.referenceId}\nDate: ${order.orderDate}`,
                alignment: "right",
                style: "subheader",
              },

              qrDataUrl
                ? {
                    image: qrDataUrl,
                    width: 70,
                    alignment: "right",
                    margin: [0, 5, 0, 0],
                  }
                : {},
            ],
          },
        ],
      },

      { text: "\n" },

      // ADDRESS
      {
        columns: [
          {
            width: "*",

            stack: [
              {
                text: "SHIP & RETURN ADDRESS",
                style: "sectionHeader",
              },

              {
                text: defaultdata.warehouse.name,
                bold: true,
              },

              {
                text: defaultdata.warehouse.address,
              },

              {
                text:
                  defaultdata.warehouse.city +
                  ", " +
                  defaultdata.warehouse.state +
                  " - " +
                  defaultdata.warehouse.pincode,
              },
            ],
          },

          {
            width: "*",

            stack: [
              {
                text: "SHIP TO",
                style: "sectionHeader",
              },

              {
                text: order.customerName,
                bold: true,
              },

              {
                text: shippingAddress,
              },

              {
                text: `Phone: ${order.customerPhone}`,
              },

              {
                text: `Email: ${
                  order.customerEmail || "—"
                }`,
              },
            ],
          },
        ],
      },

      { text: "\n" },

      // ORDER SUMMARY
      {
        columns: [
          {
            text: `Payment Method: ${paymentMethod}`,
            width: "*",
          },

          {
            text: `Shipped By: ${
              order.courier
                .toLowerCase()
                .includes("smc")
                ? "Shree Maruti"
                : order.courier
            }`,
            width: "*",
          },

          {
            text: `AWBID: ${order.awb}`,
            width: "*",
          },
        ],
      },

      { text: "\n" },

      // ITEMS TABLE
      {
        table: {
          headerRows: 1,

          widths: [
            "auto",
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
          ],

          body: [
            [
              {
                text: "S.No",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Product",
                style: "tableHeader",
              },

              {
                text: "Qty",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Unit Price",
                style: "tableHeader",
                alignment: "right",
              },

              {
                text: "GST",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Total",
                style: "tableHeader",
                alignment: "right",
              },
            ],

            ...itemsTableBody,

            [
              {
                text: "",
                colSpan: 5,
                alignment: "right",
              },

              {},
              {},
              {},
              {},

              {
                text: formatCurrency(grandTotal),
                alignment: "right",
                bold: true,
              },
            ],
          ],
        },

        layout: "lightHorizontalLines",
      },

      { text: "\n" },

      // TOTALS
      {
        columns: [
          {
            width: "*",
            text: "",
          },

          {
            width: "auto",

            stack: [
              {
                text: `Tax (GST):`,
                alignment: "right",
              },

              {
                text: "Grand Total:",
                alignment: "right",
                bold: true,
              },
            ],
          },

          {
            width: "auto",

            stack: [
              {
                text: formatCurrency(totalTax),
                alignment: "right",
              },

              {
                text: formatCurrency(grandTotal),
                alignment: "right",
                bold: true,
              },
            ],
          },
        ],
      }
    );

    // PAGE BREAK BETWEEN ORDERS
    if (index !== orderList.length - 1) {
      allContent.push({
        text: "",
        pageBreak: "after",
      });
    }
  }

  const docDefinition = {
    pageSize: "A4",

    pageMargins: [40, 60, 40, 60],

    content: allContent,

    styles: {
      header: {
        fontSize: 24,
        bold: true,
        color: "#1e3a8a",
      },

      subheader: {
        fontSize: 10,
        color: "#666",
      },

      sectionHeader: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 5],
        color: "#1e3a8a",
      },

      tableHeader: {
        bold: true,
        fontSize: 11,
        fillColor: "#eef2ff",
        color: "#1e3a8a",
      },
    },

    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.4,
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Bulk_Invoices.pdf`);
}


async function buildShippingLabelDefault(order) {
  
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.referenceId
  );

  // Generate barcodes with larger dimensions for better scanning
  const awbBarcode = await generateBarcodeDataURL(order.awb, 2.5, 50);
  const orderBarcode = await generateBarcodeDataURL(order.referenceId, 2.5, 45);

  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || "",
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean);

  const warehouse = defaultdata?.warehouse || {};
  const shipperName = warehouse.name || "HA.OK.DEL";

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : order.orderDate;

  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    },
    {
      text: item.name || "-",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    }
  ]);

  const grandTotal = parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  return [
    {
      // INCREASED LABEL SIZE from 288x432 to 350x520
      pageSize: {
        width: 350,   // Was 288
        height: 520   // Was 432
      },
      
      pageMargins: [6, 6, 6, 6],  // Slightly larger margins

      defaultStyle: {
        fontSize: 9  // Increased default font size
      },

      table: {
        widths: ["*"],

        body: [
          [
            {
              stack: [
                {
                  text: "SHIP TO",
                  bold: true,
                  fontSize: 11,  // Larger heading
                  margin: [6, 6, 6, 3],
                  color: "#1e3a8a"
                },
                {
                  text: shippingAddressLines.join("\n"),
                  fontSize: 9,
                  margin: [6, 0, 6, 8],
                  lineHeight: 1.3
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [
                        { text: "PAYMENT : ", bold: true, fontSize: 9 },
                        { text: paymentMethod, fontSize: 9 }
                      ],
                      margin: [6, 4, 0, 3]
                    },
                    {
                      text: [
                        { text: "AWB No. : ", bold: true, fontSize: 9 },
                        { text: order.awb || "-", fontSize: 9 }
                      ],
                      margin: [6, 3, 0, 2]
                    }
                  ]
                },
                {
                  width: 150,  // Increased from 120
                  stack: [
                    {
                      text: order.courier || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 11,
                      margin: [0, 3, 0, 3],
                      color: "#1e3a8a"
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 140,   // Increased from 110
                          height: 55,   // Increased from 40
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 5]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: `SHIPPED BY : ${shipperName}`,
                      bold: true,
                      fontSize: 9,
                      margin: [6, 4, 4, 2]
                    },
                    {
                      text: `Booked : ${bookedDate}`,
                      fontSize: 8,
                      margin: [6, 3, 4, 4],
                      color: "#666"
                    }
                  ]
                },
                {
                  width: 150,  // Increased from 120
                  stack: [
                    {
                      text: `ORDER #`,
                      alignment: "center",
                      bold: true,
                      fontSize: 9,
                      margin: [0, 4, 0, 2]
                    },
                    {
                      text: order.referenceId,
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 0, 0, 3],
                      color: "#1e3a8a"
                    },
                    orderBarcode
                      ? {
                          image: orderBarcode,
                          width: 140,   // Increased from 110
                          height: 55,   // Increased from 40
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: `Date: ${order.orderDate}`,
                      alignment: "center",
                      fontSize: 8,
                      margin: [0, 3, 0, 4]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [70, "*", 35], // SKU, Name, QTY - wider columns
                body: [
                  [
                    {
                      text: "SKU",
                      bold: true,
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    },
                    {
                      text: "PRODUCT NAME",
                      bold: true,
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    },
                    {
                      text: "QTY",
                      bold: true,
                      alignment: "center",
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    }
                  ],
                  ...tableBody,
                  [
                    {
                      colSpan: 3,
                      text: `TOTAL : ₹ ${grandTotal.toFixed(2)}`,
                      alignment: "right",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 8, 12, 8]
                    },
                    {},
                    {}
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
                hLineColor: () => "#000",
                vLineColor: () => "#000"
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT REQUIRE SIGNATURE",
              fontSize: 7,
              bold: true,
              alignment: "center",
              margin: [6, 10, 6, 6],
              color: "#666"
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}

async function buildShippingLabel19(order) {
  
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.referenceId
  );

  const awbBarcode = await generateBarcodeDataURL(order.awb);
  const orderBarcode = await generateBarcodeDataURL(order.referenceId);

  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || "",
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean);

  const warehouse = defaultdata?.warehouse || {};

  const shipperName =
    warehouse.name || "HA.OK.DEL";

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      )
    : order.orderDate;

  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  const grandTotal =
    parseFloat(
      String(order.amount || "0").replace(
        /[^0-9.-]/g,
        ""
      )
    ) || 0;

  return [
    {
      table: {
        widths: ["*"],

        body: [
          [
            {
              stack: [
                {
                  text: "Ship To",
                  bold: true,
                  fontSize: 9,
                  margin: [4, 4, 4, 2]
                },
                {
                  text: shippingAddressLines.join("\n"),
                  fontSize: 7,
                  margin: [4, 0, 4, 6],
                  lineHeight: 1.1
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [
                        { text: "Payment : ", bold: true },
                        paymentMethod
                      ],
                      fontSize: 8,
                      margin: [4, 4, 0, 3]
                    },
                    {
                      text: [
                        { text: "AWB No. : ", bold: true },
                        order.awb || "-"
                      ],
                      fontSize: 7,
                      margin: [4, 0, 0, 2]
                    }
                  ]
                },
                {
                  width: 120,
                  stack: [
                    {
                      text: order.courier || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 8,
                      margin: [0, 2, 0, 2]
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 110,
                          height: 40,
                          alignment: "center"
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 7,
                      margin: [0, 2, 0, 2]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: `Shipped By ${shipperName}`,
                      bold: true,
                      fontSize: 8,
                      margin: [4, 4, 4, 2]
                    },
                    {
                      text: `Booked Date: ${bookedDate}`,
                      fontSize: 7,
                      margin: [4, 0, 4, 4]
                    }
                  ]
                },
                {
                  width: 120,
                  stack: [
                    ...buildLabelOrderIdLines(order, labelSettings, {
                      alignment: "center",
                      fontSize: 7,
                      margin: [0, 4, 0, 2],
                    }),
                    orderBarcode
                      ? {
                          image: orderBarcode,
                          width: 110,
                          height: 40,
                          alignment: "center"
                        }
                      : {},
                    (labelSettings.showOrderNo || labelSettings.showOrderReferenceId || orderBarcode)
                      ? {
                          text: `Order Date: ${order.orderDate}`,
                          alignment: "center",
                          fontSize: 7,
                          margin: [0, 2, 0, 2]
                        }
                      : {},
                  ]
                }
              ]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [55, "*", 25], // SKU, Name, QTY
                body: [
                  [
                    {
                      text: "SKU",
                      bold: true,
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    },
                    {
                      text: "Name",
                      bold: true,
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    },
                    {
                      text: "QTY",
                      bold: true,
                      alignment: "center",
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    }
                  ],
                  ...tableBody,
                  // [
                  //   {
                  //     colSpan: 3,
                  //     text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                  //     alignment: "right",
                  //     bold: true,
                  //     fontSize: 7,
                  //     margin: [0, 4, 6, 4]
                  //   },
                  //   {},
                  //   {}
                  // ]
                ]
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
              fontSize: 7,
              bold: true,
              margin: [4, 6, 4, 6]
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}
// ------------------------------
// MERGE ALL LABELS INTO ONE PDF
// ------------------------------


// ------------------------------
// CREATE LABEL CONTENT ONLY
// ------------------------------
async function buildShippingLabelContent(order) {
  const docDefinition = await generateShippingLabel(order, { returnDoc: true });
  if (!docDefinition?.content) return [];

  const contentItems = Array.isArray(docDefinition.content)
    ? docDefinition.content
    : [docDefinition.content];

  // Attach page metadata so bulk PDF can reuse customized page size/margins
  return contentItems.map((item, index) => ({
    ...item,
    ...(index === 0
      ? {
          __labelPageSize: docDefinition.pageSize,
          __labelPageMargins: docDefinition.pageMargins,
          __labelDefaultStyle: docDefinition.defaultStyle,
        }
      : {}),
    pageBreak: "after",
  }));
}
// ------------------------------
// USER 11 LABEL
// ------------------------------
async function buildShippingLabel11(order) {
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.referenceId
  );

  const awbBarcode = await generateBarcodeDataURL(order.awb);

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = new Date(
    order.processedAt || new Date()
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody: any[] = [
    [
      { text: "SKU", bold: true, fontSize: 6, alignment: "center" },
      { text: "Name", bold: true, fontSize: 6, alignment: "center" },
      { text: "QTY", bold: true, fontSize: 6, alignment: "center" },
      { text: "HSN\nCode", bold: true, fontSize: 6, alignment: "center" },
      { text: "Tax", bold: true, fontSize: 6, alignment: "center" }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      { text: item.sku || "-", fontSize: 5.5 },
      { text: item.name || "-", fontSize: 5.5 },
      {
        text: String(item.quantity || 1),
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: item.hsn || "-",
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: `${item.gstRate || 0}.00%`,
        alignment: "center",
        fontSize: 5.5
      }
    ]);
  });

  return [
    {
      table: {
        widths: ["*"],

        body: [
          [
            {
              columns: [
                {
                  width: "*",

                  stack: [
                    {
                      text: "Ship To",
                      bold: true,
                      fontSize: 8,
                      margin: [4, 3, 4, 1]
                    },

                    {
                      text: shippingAddress,
                      fontSize: 7,
                      lineHeight: 1,
                      margin: [4, 0, 4, 3]
                    }
                  ]
                },

                {
                  width: 118,

                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 12,
                      margin: [5, 2, 4, 1]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",

                  stack: [
                    {
                      text: [
                        { text: "Payment : ", bold: true },
                        paymentMethod
                      ],

                      fontSize: 7,
                      margin: [4, 3, 0, 1]
                    },

                    {
                      text: [
                        { text: "AWB No. : ", bold: true },
                        order.awb || "-"
                      ],

                      fontSize: 7,
                      margin: [4, 0, 0, 1]
                    }
                  ]
                },

                {
                  width: 118,

                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 8,
                      margin: [0, 2, 0, 1]
                    },

                    {
                      image: awbBarcode,
                      width: 105,
                      height: 32,
                      alignment: "center"
                    },

                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 6.5
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              text: `Booked Date: ${bookedDate}`,
              fontSize: 7,
              margin: [4, 0, 4, 4]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [42, "*", 22, 30, 25],
                body: tableBody
              },

              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => "#000",
                vLineColor: () => "#000",

                paddingLeft: () => 1,
                paddingRight: () => 1,
                paddingTop: () => 1,
                paddingBottom: () => 1
              }
            }
          ],

          [
            {
              text:
                "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",

              alignment: "center",

              bold: true,

              fontSize: 5.5,

              margin: [2, 4, 2, 4]
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",

        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}
async function generateBulkShippingLabels(orderList) {
  const allContent = [];
  let pageSize = { width: 288, height: 432 };
  let pageMargins = [4, 4, 4, 4];
  let defaultStyle = { fontSize: 7 };

  for (let i = 0; i < orderList.length; i++) {
    const order = orderList[i];
    const content = await buildShippingLabelContent(order);

    if (content[0]?.__labelPageSize) {
      pageSize = content[0].__labelPageSize;
    }
    if (content[0]?.__labelPageMargins) {
      pageMargins = content[0].__labelPageMargins;
    }
    if (content[0]?.__labelDefaultStyle) {
      defaultStyle = content[0].__labelDefaultStyle;
    }

    const cleaned = content.map(({ __labelPageSize, __labelPageMargins, __labelDefaultStyle, ...rest }) => rest);

    // remove page break from last label
    if (i === orderList.length - 1 && cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1];
      if (last?.pageBreak) delete last.pageBreak;
    }

    allContent.push(...cleaned);
  }

  const docDefinition = {
    pageSize,
    pageMargins,
    defaultStyle,
    content: allContent,
  };

  pdfMake
    .createPdf(docDefinition)
    .download("Bulk_Shipping_Labels.pdf");
}



const cloneorder = async (order) => {
  if (ordersReadOnly) {
    toast({
      title: "View only",
      description: "This account can view orders but cannot clone them.",
    });
    return;
  }
  try {
    let full: any = null;
    try {
      full = await orderApi.getById(order.id);
    } catch {
      full = null;
    }
    const source = full || order;
    setFormErrors({});
    setFormData(buildOrderFormData({ ...source, items: full?.items || order.items || source.items || [] }, "clone"));
    setEditOrder(null);
    setIsClone(true);
    setCreateOpen(true);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error?.message || "Failed to load order for clone",
      variant: "destructive",
    });
  }
};

const openCodEdit = (order: Order) => {
  const hasAwb = order.awb && order.awb !== "-" && order.awb !== "—";
  if (hasAwb) {
    toast({
      title: "Cannot edit COD",
      description: "COD amount cannot be changed after AWB is generated.",
      variant: "destructive",
    });
    return;
  }
  const current =
    (order as any).totalOutstanding && Number((order as any).totalOutstanding) !== 0
      ? Number((order as any).totalOutstanding)
      : Number(String(order.amount || "").replace(/[₹,\s]/g, "")) || 0;
  setCodEditOrder(order);
  setCodEditAmount(String(current));
};

const openAwbEdit = (order: Order) => {
  if (!canEditAwb) {
    toast({
      title: "Not allowed",
      description: "Only admin can update AWB number.",
      variant: "destructive",
    });
    return;
  }
  const current = order.awb && order.awb !== "-" && order.awb !== "—" ? String(order.awb) : "";
  setAwbEditOrder(order);
  setAwbEditValue(current);
};

const openCourierEdit = (order: Order) => {
  if (!canEditCourier) {
    toast({
      title: "Not allowed",
      description: "Only admin can update courier.",
      variant: "destructive",
    });
    return;
  }
  const current =
    order.courier && order.courier !== "-" && order.courier !== "—"
      ? String(order.courier)
      : "";
  const baseName = stripCourierMode(current);
  const known = ADMIN_COURIER_OPTIONS.find(
    (name) =>
      name.toLowerCase() === baseName.toLowerCase() ||
      name.toLowerCase() === current.toLowerCase()
  );
  setCourierEditOrder(order);
  setCourierEditValue(known || baseName || current);
  setCourierEditSelect(known || (baseName || current ? "__custom__" : ""));
  setCourierEditMode(getCourierMode(current, order.shippingMode || order.freightMode));
};

const saveCourierName = async () => {
  if (!courierEditOrder?.id) return;
  if (!canEditCourier) {
    toast({
      title: "Not allowed",
      description: "Only admin can update courier.",
      variant: "destructive",
    });
    return;
  }
  const nextCourier = withCourierMode(courierEditValue.trim(), courierEditMode);
  if (!stripCourierMode(nextCourier)) {
    toast({
      title: "Invalid courier",
      description: "Please select or enter a courier name.",
      variant: "destructive",
    });
    return;
  }
  setCourierEditSaving(true);
  try {
    const updated = await orderApi.update(courierEditOrder.id, {
      courier: nextCourier,
      shippingMode: courierEditMode,
      freightMode: courierEditMode,
    });
    if (updated?.error) {
      throw new Error(
        updated.error ||
          (Array.isArray(updated.errors) && updated.errors[0]?.msg) ||
          "Failed to update courier"
      );
    }
    toast({ title: "Success", description: "Courier updated" });
    setCourierEditOrder(null);
    if (viewOrder?.id === courierEditOrder.id) {
      setViewOrder({
        ...viewOrder,
        courier: nextCourier,
        shippingMode: courierEditMode,
        freightMode: courierEditMode,
      });
    }
    await refreshOrdersAndCounts();
  } catch (error: any) {
    const validationMsg = Array.isArray(error?.response?.data?.errors)
      ? error.response.data.errors.map((e: any) => e.msg).filter(Boolean).join(", ")
      : "";
    toast({
      title: "Error",
      description:
        validationMsg ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update courier",
      variant: "destructive",
    });
  } finally {
    setCourierEditSaving(false);
  }
};

const saveAwbNumber = async () => {
  if (!awbEditOrder?.id) return;
  if (!canEditAwb) {
    toast({
      title: "Not allowed",
      description: "Only admin can update AWB number.",
      variant: "destructive",
    });
    return;
  }
  const nextAwb = awbEditValue.trim();
  if (!nextAwb) {
    toast({
      title: "Invalid AWB",
      description: "Please enter a valid AWB number.",
      variant: "destructive",
    });
    return;
  }
  setAwbEditSaving(true);
  try {
    const updated = await orderApi.update(awbEditOrder.id, {
      awb: nextAwb,
    });
    if (updated?.error) {
      throw new Error(
        updated.error ||
          (Array.isArray(updated.errors) && updated.errors[0]?.msg) ||
          "Failed to update AWB number"
      );
    }
    toast({ title: "Success", description: "AWB number updated" });
    setAwbEditOrder(null);
    if (viewOrder?.id === awbEditOrder.id) {
      setViewOrder({ ...viewOrder, awb: nextAwb });
    }
    await refreshOrdersAndCounts();
  } catch (error: any) {
    const validationMsg = Array.isArray(error?.response?.data?.errors)
      ? error.response.data.errors.map((e: any) => e.msg).filter(Boolean).join(", ")
      : "";
    toast({
      title: "Error",
      description:
        validationMsg ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update AWB number",
      variant: "destructive",
    });
  } finally {
    setAwbEditSaving(false);
  }
};

const saveCodAmount = async () => {
  if (!codEditOrder?.id) return;
  const hasAwb = codEditOrder.awb && codEditOrder.awb !== "-" && codEditOrder.awb !== "—";
  if (hasAwb) {
    toast({
      title: "Cannot edit COD",
      description: "COD amount cannot be changed after AWB is generated.",
      variant: "destructive",
    });
    return;
  }
  const amount = Math.max(0, parseFloat(codEditAmount) || 0);
  if (amount <= 0) {
    toast({ title: "Invalid amount", description: "COD amount must be greater than zero.", variant: "destructive" });
    return;
  }
  setCodEditSaving(true);
  try {
    const updated = await orderApi.update(codEditOrder.id, {
      totalOutstanding: Number(amount.toFixed(2)),
      amount: `₹${amount.toFixed(2)}`,
      financialStatus: "pending",
      paymentGateway: "COD",
    });
    if (updated?.error) {
      throw new Error(
        updated.error ||
          (Array.isArray(updated.errors) && updated.errors[0]?.msg) ||
          "Failed to update COD amount"
      );
    }
    toast({ title: "Success", description: "COD amount updated" });
    setCodEditOrder(null);
    await refreshOrdersAndCounts();
  } catch (error: any) {
    const validationMsg = Array.isArray(error?.response?.data?.errors)
      ? error.response.data.errors.map((e: any) => e.msg).filter(Boolean).join(", ")
      : "";
    toast({
      title: "Error",
      description:
        validationMsg ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update COD amount",
      variant: "destructive",
    });
  } finally {
    setCodEditSaving(false);
  }
};


const trackorder=async(awb, order?)=>{
  try {
    if(!awb){
      toast({
        title: "Error",
        description: "AWB number not available for this order",
        variant: "destructive",
      });
      return
    }
    const response =await apiRequest("GET","tracking/track/"+awb,{},{})
    // console.log(response,"trackingresponse")
    
   // Keep the list row so the modal can show the panel's own Order Status +
   // Sub Status next to the courier's live status (they can legitimately
   // differ, e.g. order Cancelled while courier still says Out for Pickup).
   settrackorderdata({ ...(response?.data?.data || {}), localOrder: order || null })
   settrackorder_(true)


    // window.open(trackingUrl, '_blank');
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to track order",
      variant: "destructive",
    });
  }



  
}


useEffect(()=>{
  // single-order flow loads rates in onAssignCourier; keep for legacy warehouse updates
},[bulkshipmentcreate.warehouselist])


function formatDate(dateString) {
 const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}


console.log(formatDate("2026-05-19T16:53:37.086Z"));

const TrackingModal = ({ open, onOpenChange, trackingData }) => {
  if (!trackingData) return null;

  const {
    awbNumber,
    courier,
    status,
    orderStatus: liveOrderStatus,
    orderCancelReason,
    localOrder,
    from,
    to,
    estimatedDelivery,
    trackingHistory = [],
    lastUpdated,
    orderDetails = {},
  } = trackingData;

  // The panel's own view of the order (kept even when the courier's live
  // status differs — e.g. Cancelled here vs "Out for Pickup" at courier).
  const displayOrderStatus =
    liveOrderStatus || orderDetails?.orderStatus || localOrder?.status || '';
  const subStatus = localOrder ? getOrderSubStatus(localOrder) : '';

  const sortedTrackingHistory = [...trackingHistory].sort((a, b) => {
    const ta = new Date(a?.timestamp || a?.date || 0).getTime();
    const tb = new Date(b?.timestamp || b?.date || 0).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString();
  };

  const getStatusBadgeColor = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('cancel')) return 'destructive';
    if (lowerStatus.includes('rto') || lowerStatus.includes('return to origin')) return 'destructive';
    if (lowerStatus.includes('deliver')) return 'default';
    if (lowerStatus.includes('processing') || lowerStatus.includes('in_process')) return 'outline';
    if (lowerStatus.includes('undeliver') || lowerStatus.includes('ndr')) return 'outline';
    return 'secondary';
  };


  console.log(formData?.packageShipmentType,"packageShipmentTypepackageShipmentTypepackageShipmentType")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📦 Shipment Tracking — {awbNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic shipment info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">AWB Number</p>
              <p className="font-medium">{awbNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Courier</p>
              <p className="font-medium">{courier=="Innufill"?"Shree Maruti":courier || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order Status</p>
              <Badge variant={getStatusBadgeColor(displayOrderStatus) as "default" | "destructive" | "outline" | "secondary"}>{displayOrderStatus || '—'}</Badge>
              {orderCancelReason && String(displayOrderStatus || '').toLowerCase().includes('cancel') && (
                <p className="text-xs text-muted-foreground mt-1">{orderCancelReason}</p>
              )}
              {subStatus && subStatus.toLowerCase() !== String(displayOrderStatus || '').toLowerCase().trim() && (
                <Badge
                  className={`mt-1 block w-fit max-w-full whitespace-normal text-left text-[10px] font-semibold border-0 ${subStatusBadgeClass(subStatus)}`}
                  title={subStatus}
                >
                  {subStatus}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Courier Status</p>
              <Badge variant={getStatusBadgeColor(status) as "default" | "destructive" | "outline" | "secondary"}>{status || '—'}</Badge>
              {displayOrderStatus && status && status.toLowerCase() !== String(displayOrderStatus).toLowerCase() && (
                <p className="text-xs text-muted-foreground mt-1">Live courier scan (differs from order status)</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium">{from || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-medium">{to || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Delivery</p>
              <p className="font-medium">{estimatedDelivery || 'Pending'}</p>
            </div>
          </div>

          {/* Order details */}
          {orderDetails && Object.keys(orderDetails).length > 0 && (
            <div>
              <h3 className="font-medium mb-2">🛍️ Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-medium">{orderDetails.referenceId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{orderDetails.customerName || '—'}</p>
                </div>
                {/* <div>
                  <p className="text-xs text-muted-foreground">Customer Phone</p>
                  <p className="font-medium">{orderDetails.customerPhone || '—'}</p>
                </div> */}
              </div>
            </div>
          )}

          {/* Tracking History Timeline */}
          <div>
            <h3 className="font-medium mb-3">📋 Tracking History</h3>
            {sortedTrackingHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracking history available.</p>
            ) : (
              <div className="space-y-4">
                {sortedTrackingHistory.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5"></div>
                      {idx !== sortedTrackingHistory.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{event.status || 'Unknown'}</p>
                        {event.completed !== undefined && (
                          <Badge variant={event.completed ? 'default' : 'outline'} className="text-xs">
                            {event.completed ? 'Completed' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {event.location || 'Unknown location'}
                      </p>

                       <p className="text-xs text-muted-foreground mt-1">
                        📍 {event.timestamp ? new Date(event.timestamp).toLocaleDateString("en-GB").replace(/\//g, "-") : 'Unknown location'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <div className="text-right text-xs text-muted-foreground border-t pt-3">
              Last updated: {formatDate(lastUpdated)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Using India Post Pincode API


  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-4">
        <OrderWorkspaceToolbar
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          direction={orderDirection}
          onDirectionChange={setOrderDirection}
          scope={orderScope}
          onScopeChange={setOrderScope}
          statusCounts={statusCounts}
          readOnly={ordersReadOnly}
          onCreateOrder={() => { setFormData({ ...emptyOrder }); setIsClone(false); setCreateOpen(true); }}
          onBulkImport={() => setUploadDialogOpen(true)}
          syncSlot={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-medium" disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Orders'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleSync()}><RefreshCw className="mr-2 h-4 w-4" /><span>Sync All Platforms</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSync('Amazon')} disabled={!isIntegrationActive('Amazon')}>
                  <ShoppingBag className="mr-2 h-4 w-4" /><span>Sync Amazon</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('Shopify')} disabled={!isIntegrationActive('Shopify')}>
                  <Store className="mr-2 h-4 w-4" /><span>Sync Shopify</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('WooCommerce')} disabled={!isIntegrationActive('WooCommerce')}>
                  <Globe className="mr-2 h-4 w-4" /><span>Sync WooCommerce</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('Custom')} disabled={!isIntegrationActive('Custom')}>
                  <Wifi className="mr-2 h-4 w-4" /><span>Sync Custom</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <div className="lm-workspace-shell">
        <OrderFilterBar
          dateType={dateType}
          onDateTypeChange={(value) => { setDateType(value); setCurrentPage(1); }}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(value) => {
            // Keep the range sane: a From-date after To-date would silently
            // return 0 rows, so shift To-date along with it.
            setDateFrom(value);
            if (value && dateTo && value > dateTo) setDateTo(value);
            setCurrentPage(1);
          }}
          onDateToChange={(value) => {
            setDateTo(value);
            if (value && dateFrom && value < dateFrom) setDateFrom(value);
            setCurrentPage(1);
          }}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          paymentFilter={paymentmood}
          onPaymentFilterChange={setpaymentmood}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          showMoreFilters={showMoreFilters}
          onToggleMoreFilters={() => setShowMoreFilters(!showMoreFilters)}
          onRefresh={() => refreshOrdersAndCounts()}
          onExport={handleExport}
          refreshing={loading}
          onSettings={() => toast({ title: "Table settings", description: "Column visibility coming soon." })}
        />

        {orderScope === "international" && (
          <div className="px-4 py-10 text-center border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-800">International shipping is not enabled yet</p>
            <p className="text-xs text-slate-500 mt-1">Switch back to Domestic to manage your current orders.</p>
          </div>
        )}

        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 bg-slate-50">
            <Select value={courier__} onValueChange={setcourier__}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Courier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courier</SelectItem>
                <SelectItem value="smc">Shree Maruti</SelectItem>
                <SelectItem value="innufill">Innufill / SMC</SelectItem>
                <SelectItem value="delhivery">Delhivery</SelectItem>
                <SelectItem value="ekart">eKART</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
                <SelectItem value="shadowfax">Shadowfax</SelectItem>
                <SelectItem value="xpressbees">Xpressbees</SelectItem>
                <SelectItem value="bluedart">Blue Dart</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setcourier__("all");
                setSearchQuery("");
                setpaymentmood("all");
                setPlatformFilter("all");
                setDateFrom("");
                setDateTo("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={isSyncing || !isIntegrationActive('Shopify')} onClick={() => setShowShopifyManualSync(true)}>
              <Store className="h-3.5 w-3.5" /> Manual Shopify Sync
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Link className="h-3.5 w-3.5" /> Integrations</Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Platform Integrations</SheetTitle>
                  <SheetDescription>Connect your sales channels to sync orders automatically.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {loadingIntegrations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    Array.isArray(integrations) && integrations.map((integration) => {
                      const Icon = platformIcons[integration.type];
                      const hasCredentials = (() => {
                        switch (integration.type) {
                          case "Amazon": return !!(integration.credentials.sellerId && integration.credentials.accessToken);
                          case "Shopify": return !!(integration.credentials.storeUrl && integration.credentials.accessToken && integration.credentials.clientid);
                          case "WooCommerce": return !!(integration.credentials.storeUrl && integration.credentials.apiKey && integration.credentials.apiSecret);
                          case "Custom": return !!(integration.credentials.storeUrl);
                          default: return false;
                        }
                      })();
                      return (
                        <Card key={integration.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${integration.isActive ? 'bg-green-500' : hasCredentials ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">{integration.name}</h4>
                                  <p className="text-xs text-muted-foreground">{integration.isActive ? 'Connected' : hasCredentials ? 'Configured' : 'Not configured'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openIntegrationConfig(integration)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => toggleIntegration(integration.id)}>
                                  {integration.isActive ? <Unlink className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {bulkshipmentcreate.orderlist.length > 0 && !ordersReadOnly && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 bg-teal-50/40">
            <Badge className="bg-teal-700 hover:bg-teal-700">
              {bulkshipmentcreate.orderlist.length} selected
            </Badge>
            {bulkshipmentcreate.orderlist.some((o) => !isRtoOrderStatus(o.status)) && (
            <Button
              size="sm"
              className="h-8 bg-teal-600 hover:bg-teal-700"
              disabled={assignRatesLoading}
              onClick={async (e) => {
                (e.currentTarget as any).style.cursor = "wait";
                await fungetratelist();
                if (bulkshipmentcreate.orderlist.some((o) => !isRtoOrderStatus(o.status))) {
                  setbulkcreatemodal(true);
                }
                (e.currentTarget as any).style.cursor = "pointer";
              }}
            >
              {assignRatesLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Truck className="h-4 w-4 mr-1.5" />}
              Assign Courier
            </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={async (e) => {
                (e.currentTarget as any).style.cursor = "wait";
                await generateBulkShippingLabels(bulkshipmentcreate.orderlist);
                (e.currentTarget as any).style.cursor = "pointer";
              }}
            >
              Bulk Label Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={async (e) => {
                (e.currentTarget as any).style.cursor = "wait";
                await generateOrderPDFbulk(bulkshipmentcreate.orderlist);
                (e.currentTarget as any).style.cursor = "pointer";
              }}
            >
              Bulk Invoice Download
            </Button>
            {checkmerge() && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => handleCreateMerge()}>
                Merge Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              onClick={() => setBulkAction("cancel")}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setBulkAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Orders
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 ml-auto text-slate-600"
              onClick={() =>
                setbulkshipmentcreate({
                  coureir: [],
                  orderlist: [],
                  id: [],
                  ratelist: {},
                  warehouselist: [],
                  dispatchdate: {},
                  zone: [],
                })
              }
            >
              Clear selection
            </Button>
          </div>
        )}

                <OrdersRichTable
                  orders={paginatedOrders}
                  loading={loading}
                  readOnly={ordersReadOnly}
                  selectedIds={bulkshipmentcreate.id}
                  allSelected={paginatedOrders.length > 0 && paginatedOrders.every(o => bulkshipmentcreate.id.includes(o.id))}
                  onToggleSelectAll={(checked) => {
                    if (checked) {
                      setbulkshipmentcreate({
                        ...bulkshipmentcreate,
                        id: paginatedOrders.map(o => o.id),
                        orderlist: [...paginatedOrders],
                        coureir: new Array(paginatedOrders.length).fill(''),
                        warehouselist: new Array(paginatedOrders.length).fill('').map((_, i) => String(paginatedOrders[i]?.warehouse || '')),
                      });
                    } else {
                      setbulkshipmentcreate({
                        ...bulkshipmentcreate,
                        id: [],
                        orderlist: [],
                        coureir: [],
                        warehouselist: [],
                      });
                    }
                  }}
                  onToggleSelect={(order, checked) => {
                    if (checked) {
                      const id = [...bulkshipmentcreate.id, order.id];
                      const orderlist = [...bulkshipmentcreate.orderlist, order];
                      setbulkshipmentcreate({
                        ...bulkshipmentcreate,
                        id,
                        orderlist,
                        coureir: new Array(id.length).fill(''),
                        warehouselist: new Array(id.length).fill(''),
                      });
                    } else {
                      const idx = bulkshipmentcreate.id.indexOf(order.id);
                      const id = bulkshipmentcreate.id.filter((x) => x !== order.id);
                      const orderlist = bulkshipmentcreate.orderlist.filter((_, i) => i !== idx);
                      setbulkshipmentcreate({
                        ...bulkshipmentcreate,
                        id,
                        orderlist,
                        coureir: new Array(id.length).fill(''),
                        warehouselist: new Array(id.length).fill(''),
                      });
                    }
                  }}
                  warelistbyid={warelistbyid}
                  formatDate={formatDate}
                  onOrderClick={(order) => openViewOrder(order)}
                  onAwbClick={(awb, order) => trackorder(awb, order)}
                  onEditPackage={(order) => openEdit(order)}
                  onEditCod={(order) => openCodEdit(order)}
                  onEditAwb={canEditAwb ? (order) => openAwbEdit(order) : undefined}
                  onEditCourier={canEditCourier ? (order) => openCourierEdit(order) : undefined}
                  onAssignCourier={async (order) => {
                    if (isRtoOrderStatus(order.status)) return;
                    const pincodefrom = warehouselist.find((ware) => String(ware.id) == String(order.warehouse))
                      || warehouselist.find((ware) => ware.isDefault || ware.isDefault)
                      || warehouselist[0]
                      || {};
                    setsingleor(true);
                    setAssignRatesLoading(true);
                    setbulkshipmentcreate({
                      coureir: [""],
                      orderlist: [order],
                      id: [order.id],
                      ratelist: {},
                      warehouselist: [pincodefrom.id || ""],
                      dispatchdate: {},
                      zone: [""],
                    });
                    try {
                      const resolvedWarehouseId = pincodefrom.id || order.warehouse || "";
                      const response2 = await handleCalculate(order, resolvedWarehouseId);



                      console.log(response2,"response2response2response2response2response2")
                      let selectedCourier: number | string = "";
                      if (response2?.rate?.length) {
                        let best = Infinity;
                        selectedCourier = "";
                        response2.rate.forEach((rateVal: number, idx: number) => {
                          if (/rto/i.test(String(response2.type?.[idx] || ""))) return;
                          if (Number(rateVal) < best) {
                            best = Number(rateVal);
                            selectedCourier = idx;
                          }
                        });
                      }
                      if (response2) {
                        const singleRateKey = String(order?.referenceId || order?.id || "unassigned");
                        ratelist[singleRateKey] = JSON.parse(JSON.stringify(response2));


                        console.log(ratelist,"ratelistratelistratelist")
                        setratelist({ ...ratelist });
                      }
                      setbulkshipmentcreate({
                        coureir: [selectedCourier],
                        orderlist: [{ ...order, warehouse: resolvedWarehouseId }],
                        id: [order.id],
                        ratelist: {},
                        warehouselist: [resolvedWarehouseId],
                        dispatchdate: {},
                        zone: [tmpzone || ""],
                      });
                    } finally {
                      setAssignRatesLoading(false);
                    }
                  }}
                  renderActions={(order) => {
                    const hasAwb = order.awb && order.awb !== "-" && order.awb !== "—";
                    const sellerLocked = getuser()?.role !== "admin" && !!hasAwb;
                    return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">Action</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openViewOrder(order)}>View Order</DropdownMenuItem>
                        {canEditAwb && (
                          <DropdownMenuItem onClick={() => openAwbEdit(order)}>Update AWB</DropdownMenuItem>
                        )}
                        {canEditCourier && (
                          <DropdownMenuItem onClick={() => openCourierEdit(order)}>Update Courier</DropdownMenuItem>
                        )}
                        {!ordersReadOnly && !sellerLocked && (
                          <DropdownMenuItem onClick={() => openEdit(order)}>Edit Order</DropdownMenuItem>
                        )}
                        {!ordersReadOnly && (
                          <DropdownMenuItem onClick={() => cloneorder(order)}>Clone Order</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => generateOrderPDF(order)}>Download Invoice</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateShippingLabel(order)}>Download Label</DropdownMenuItem>
                        {!ordersReadOnly && (
                          <DropdownMenuItem onClick={() => {
                            setproof("");
                            setProofLink("");
                            setClaimWeight("");
                            setPreviousWeight(order.totalWeight != null ? String(order.totalWeight) : "");
                            setdisputeOrder(order);
                          }}>Weight Dispute</DropdownMenuItem>
                        )}
                        {!ordersReadOnly && order.status === "Pending" && (
                          <DropdownMenuItem onClick={() => setDeleteOrder(order)}>Delete Order</DropdownMenuItem>
                        )}
                        {!ordersReadOnly && (() => {
                          const s = String(order.status || "").toLowerCase().replace(/[_-]+/g, " ");
                          const hideCancel =
                            s.includes("delivered") ||
                            s.includes("out for delivery") ||
                            s === "ofd" ||
                            s.includes("rto") ||
                            s.includes("cancel");
                          if (hideCancel) return null;
                          // After pickup / in-transit: action becomes Return Order (RTO flow).
                          // Before pickup: stays Cancel Shipment (refund + Cancelled).
                          const norm = s.replace(/\s+/g, " ").trim();
                          const isPickedUp =
                            norm === "pickup" ||
                            norm.includes("picked up") ||
                            norm.includes("pickup complete") ||
                            norm.includes("pickup done");
                          const isInTransit =
                            norm.includes("in transit") || norm.includes("dispatched");
                          const actionLabel = isPickedUp || isInTransit ? "Return Order" : "Cancel Shipment";
                          return (
                            <DropdownMenuItem onClick={() => Shippmentcancel(order)}>{actionLabel}</DropdownMenuItem>
                          );
                        })()}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    );
                  }}
                  renderStatus={(order) =>
                    getuser().role === "admin" ? (
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}>
                        <SelectTrigger className={`h-6 w-24 border-0 text-[10px] mt-1 ${statusStyles[order.status]} rounded-full px-2`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="UNDELIVERED">UNDELIVERED</SelectItem>
                          <SelectItem value="RTO In transit">RTO In transit</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null
                  }
                />
              <div className="flex items-center justify-between px-4 py-3 border-t">
  <div className="text-sm text-muted-foreground">
    {totalOrdersCount === 0
      ? "Showing 0 orders"
      : `Showing ${startIndex + 1} to ${Math.min(endIndex, totalOrdersCount)} of ${totalOrdersCount} orders`}
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
    >
      Previous
    </Button>
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum = i + 1;
        if (totalPages > 5 && currentPage > 3) {
          pageNum = currentPage - 3 + i;
          if (pageNum > totalPages) return null;
        }
        if (pageNum < 1) return null;
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0}
    >
      Next
    </Button>
  </div>
  <Select
    value={itemsPerPage.toString()}
    onValueChange={(value) => {
      setItemsPerPage(Number(value));
      setCurrentPage(1);
    }}
  >
    <SelectTrigger className="w-20">
      <SelectValue placeholder="10" />
    </SelectTrigger>
    <SelectContent>
      {[10, 25, 50, 100].map(size => (
        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
        </div>
      </div>


<Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Order Details — {viewOrder?.referenceId}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><h3 className="font-medium mb-2">Customer Information</h3><p className="text-sm"><span className="text-muted-foreground">Name:</span> 
                {viewOrder.customerName}</p><p className="text-sm">
                  <span className="text-muted-foreground">Phone:</span> {viewOrder.customerPhone}</p>{viewOrder.customerEmail && (<p className="text-sm"><span className="text-muted-foreground">Email:</span> {viewOrder.customerEmail}</p>)}</div>
                <div><h3 className="font-medium mb-2">Shipping Address</h3><p className="text-sm">{viewOrder.addressLine1}</p>{viewOrder.addressLine2 && <p className="text-sm">{viewOrder.addressLine2}</p>}
                {viewOrder.landmark && <p className="text-sm">{viewOrder.landmark}</p>}<p className="text-sm">{viewOrder.city}, {viewOrder.state} - {viewOrder.pincode}</p></div>
              </div>
              <div><h3 className="font-medium mb-3">Order Items</h3><div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">GST</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Dimensions</th>
                      <th className="px-4 py-2 text-right">Weight</th>
                      </tr>
                      </thead>
                      <tbody>{viewOrder.items.map((item, idx) => (<tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">₹{item.unitPrice}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>  
                        <td className="px-4 py-2 text-right">{item.gstRate}%</td>  
                        <td className="px-4 py-2 text-right">₹{(item.unitPrice*item.quantity)+((item.unitPrice*item.quantity)/100*item.gstRate)}</td>
                        <td className="px-4 py-2 text-right text-xs">{item.height && item.width && item.length ? `${item.height}×${item.width}×${item.length} cm` : '-'}</td>
                        <td className="px-4 py-2 text-right">{item.deadWeight ? `${item.deadWeight} kg` : '-'}{item.volumetricWeight && ` / ${item.volumetricWeight} kg (vol)`}</td></tr>))}</tbody>
                        <tfoot className="bg-muted/50">
                        {Number(viewOrder?.totalDiscounts || 0) > 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-right text-rose-600">Discount{Array.isArray((viewOrder as any).discountCodes) && (viewOrder as any).discountCodes[0]?.code ? ` (${(viewOrder as any).discountCodes.map((c: any) => c.code).filter(Boolean).join(", ")})` : ""}:</td>
                            <td className="px-4 py-2 text-right text-rose-600 font-medium">− ₹{Number(viewOrder.totalDiscounts).toFixed(2)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                        {Number(viewOrder?.totalShippingPrice || 0) > 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-right">Shipping:</td>
                            <td className="px-4 py-2 text-right font-medium">₹{Number(viewOrder.totalShippingPrice).toFixed(2)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                        <tr><td colSpan={4} className="px-4 py-2 text-right font-medium">Total:</td><td className="px-4 py-2 text-right font-medium">
                          {
                          (() => {
                            const itemsTotal = viewOrder.items.reduce((acc, item) => acc + ((item.unitPrice*item.quantity)+((item.quantity*item.unitPrice)/100*item.gstRate)), 0);
                            const discount = Number(viewOrder?.totalDiscounts || 0);
                            const shipping = Number(viewOrder?.totalShippingPrice || 0);
                            const computed = Math.max(0, itemsTotal + shipping - discount);
                            const outstanding = Number(viewOrder?.totalOutstanding ?? 0);
                            const amountNum = parseFloat(String(viewOrder?.amount || "0").replace(/[^0-9.-]/g, "")) || 0;
                            if (outstanding > 0) return outstanding;
                            if (amountNum > 0) return amountNum;
                            return computed;
                          })()
                          }</td>
                          <td colSpan={2}></td></tr></tfoot></table></div></div>
              <div className="grid grid-cols-3 gap-4"><div><p className="text-xs text-muted-foreground">Seller</p><p className="font-medium">{allsellerlistid[viewOrder.seller]?.name ?? "—"}</p></div><div><p className="text-xs text-muted-foreground">Courier</p><p className="font-medium flex items-center gap-1.5">{viewOrder.courier}{canEditCourier && (<button type="button" className="text-teal-600 hover:text-teal-800" title="Update Courier" onClick={() => openCourierEdit(viewOrder)}><Pencil className="h-3 w-3" /></button>)}</p></div><div><p className="text-xs text-muted-foreground">AWB</p><p className="font-medium flex items-center gap-1.5">{viewOrder.awb}{canEditAwb && (<button type="button" className="text-teal-600 hover:text-teal-800" title="Update AWB" onClick={() => openAwbEdit(viewOrder)}><Pencil className="h-3 w-3" /></button>)}</p></div><div><p className="text-xs text-muted-foreground">Platform</p><Badge className={platformColors[viewOrder.platform]}>{viewOrder.platform}</Badge></div><div><p className="text-xs text-muted-foreground">Status</p><Badge className={statusStyles[viewOrder.status]}>{viewOrder.status}</Badge></div><div><p className="text-xs text-muted-foreground">Sub Status</p>{(() => { const sub = getOrderSubStatus(viewOrder as any); const same = sub && sub.toLowerCase() === String(viewOrder.status || "").toLowerCase().trim(); return sub && !same ? (<Badge className={`text-[10px] font-semibold border-0 ${subStatusBadgeClass(sub)}`} title={sub}>{sub}</Badge>) : (<p className="font-medium text-muted-foreground">—</p>); })()}</div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>


<TrackingModal trackingData={trackorderdata} open={trackorder_} onOpenChange={settrackorder_} />


      <AssignCourierDialog
        open={bulkcreatemodal || singleor}
        onOpenChange={(open) => {
          if (!open) {
            setbulkshipmentcreate({
              coureir: [],
              orderlist: [],
              id: [],
              ratelist: {},
              warehouselist: [],
              dispatchdate: {},
              zone: [],
            });
            setbulkcreatemodal(false);
            setsingleor(false);
          }
        }}
        orders={bulkshipmentcreate.orderlist}
        warehouses={warehouselist}
        warehouseIds={bulkshipmentcreate.warehouselist}
        courierIndexes={bulkshipmentcreate.coureir}
        zones={bulkshipmentcreate.zone}
        dispatchDates={bulkshipmentcreate.dispatchdate}
        ratelist={ratelist}
        loadingRates={assignRatesLoading}
        shipping={assignShipping}
        onDispatchDateChange={(referenceId, date) => {
          setbulkshipmentcreate((prev) => ({
            ...prev,
            dispatchdate: { ...prev.dispatchdate, [referenceId]: date },
          }));
        }}
        onCourierChange={(orderIndex, courierIndex) => {
          const nextCouriers = [...bulkshipmentcreate.coureir];
          nextCouriers[orderIndex] = courierIndex;
          setbulkshipmentcreate({ ...bulkshipmentcreate, coureir: nextCouriers });
        }}
        onWarehouseChange={async (orderIndex, warehouseId) => {
          const order = bulkshipmentcreate.orderlist[orderIndex];
          if (!order) return;
          const nextWarehouses = [...bulkshipmentcreate.warehouselist];
          const nextOrderList = [...bulkshipmentcreate.orderlist];
          const nextZones = [...(bulkshipmentcreate.zone || [])];
          nextWarehouses[orderIndex] = warehouseId;
          nextOrderList[orderIndex] = {
            ...nextOrderList[orderIndex],
            warehouse: warehouseId === 'null' ? '' : warehouseId,
          };
          const response22 = await handleCalculate(order, warehouseId === 'null' ? '' : warehouseId);
          nextZones[orderIndex] = tmpzone;
          funsettype(orderIndex, response22 || { rate: [], type: [] });
          setratelist({ ...ratelist });
          setbulkshipmentcreate({
            ...bulkshipmentcreate,
            orderlist: nextOrderList,
            warehouselist: nextWarehouses,
            zone: nextZones,
          });
        }}
        onShipNow={createshipmentfuntion}
      />

      {/* <Dialog open={createOpen || !!editOrder} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditOrder(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>{editOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle></DialogHeader>
          <FormFields formData={formData}  allsellerlist={allsellerlist} setFormData={setFormData} handleItemChange={handleItemChange} addItem={addItem} removeItem={removeItem} />
          <DialogFooter><Button variant="outline" onClick={() => { setCreateOpen(false); setEditOrder(null); }}>Cancel</Button><Button onClick={editOrder ? handleUpdate : handleCreate}>{editOrder ? 'Save Changes' : 'Create Order'}</Button></DialogFooter>
        </DialogContent>
      </Dialog> */}

      <Dialog open={createOpen || !!editOrder} onOpenChange={(open) => { 
  if (!open) { 
    setCreateOpen(false); 
    setEditOrder(null);
    setIsClone(false);
    setFormErrors({});
    setOrderSaving(false);
  } 
}}>
  <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
    <div className="h-full flex flex-col">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 px-6 pt-6">
        <Package className="h-5 w-5 text-muted-foreground" />
        {editOrder ? "Edit Order" : isClone ? "Clone Order" : "Create New Order"}
      </DialogTitle>
      <DialogDescription className="px-6 pb-3">
        {editOrder
          ? `Update details for order ${editOrder.referenceId || ""}.`
          : isClone
            ? "Review and edit payment details, then create the cloned order."
            : "Fill in the order, customer, shipping, and item details below."}
      </DialogDescription>
    </DialogHeader>
    <div className="flex-1 overflow-y-auto px-4">
      <FormFields 
        key={editOrder ? `edit-${editOrder.id}` : isClone ? "clone" : "create"}
        formData={formData}  
        allsellerlist={allsellerlist} 
        setFormData={setFormData} 
        handleItemChange={handleItemChange} 
        addItem={addItem} 
        removeItem={removeItem}
        errors={formErrors}
        setErrors={setFormErrors}
      />
    </div>
    <DialogFooter className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-6 py-4">
      <Button variant="outline" disabled={orderSaving} onClick={() => { 
        setCreateOpen(false); 
        setEditOrder(null);
        setIsClone(false);
        setFormErrors({});
      }}>Cancel</Button>
      <Button onClick={editOrder ? handleUpdate : handleCreate} disabled={orderSaving}>
        {orderSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          editOrder ? "Save Changes" : isClone ? "Clone Order" : "Create Order"
        )}
      </Button>
    </DialogFooter>
    </div>
  </DialogContent>
</Dialog>

      <Dialog
        open={!!codEditOrder}
        onOpenChange={(open) => {
          if (!open && !codEditSaving) setCodEditOrder(null);
        }}
      >
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit COD Amount</DialogTitle>
            <DialogDescription>
              Update COD collectable for order {codEditOrder?.orderNumber || codEditOrder?.referenceId}. Only allowed before AWB is generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="inlineCodAmount">COD Amount (₹)</Label>
            <Input
              id="inlineCodAmount"
              type="number"
              min="0"
              step="0.01"
              value={codEditAmount}
              onChange={(e) => setCodEditAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={codEditSaving} onClick={() => setCodEditOrder(null)}>
              Cancel
            </Button>
            <Button disabled={codEditSaving} onClick={saveCodAmount}>
              {codEditSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save COD"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!awbEditOrder}
        onOpenChange={(open) => {
          if (!open && !awbEditSaving) setAwbEditOrder(null);
        }}
      >
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Update AWB Number</DialogTitle>
            <DialogDescription>
              Update AWB for order {awbEditOrder?.orderNumber || awbEditOrder?.referenceId}. Only admin can change this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="inlineAwbNumber">AWB Number</Label>
            <Input
              id="inlineAwbNumber"
              value={awbEditValue}
              onChange={(e) => setAwbEditValue(e.target.value)}
              placeholder="Enter AWB number"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={awbEditSaving} onClick={() => setAwbEditOrder(null)}>
              Cancel
            </Button>
            <Button disabled={awbEditSaving} onClick={saveAwbNumber}>
              {awbEditSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save AWB"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!courierEditOrder}
        onOpenChange={(open) => {
          if (!open && !courierEditSaving) setCourierEditOrder(null);
        }}
      >
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Update Courier</DialogTitle>
            <DialogDescription>
              Update courier for order {courierEditOrder?.orderNumber || courierEditOrder?.referenceId}. Only admin can change this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="inlineCourierSelect">Courier</Label>
              <Select
                value={courierEditSelect || undefined}
                onValueChange={(value) => {
                  setCourierEditSelect(value);
                  if (value === "__custom__") return;
                  setCourierEditValue(value);
                }}
              >
                <SelectTrigger id="inlineCourierSelect">
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_COURIER_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">Other (custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inlineCourierMode">Mode</Label>
              <Select
                value={courierEditMode}
                onValueChange={(value) => setCourierEditMode(value as CourierMode)}
              >
                <SelectTrigger id="inlineCourierMode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(courierEditSelect === "__custom__" || !ADMIN_COURIER_OPTIONS.includes(courierEditValue)) && (
              <div className="space-y-2">
                <Label htmlFor="inlineCourierName">Courier name</Label>
                <Input
                  id="inlineCourierName"
                  value={courierEditValue}
                  onChange={(e) => {
                    setCourierEditValue(e.target.value);
                    setCourierEditSelect("__custom__");
                  }}
                  placeholder="Enter courier name"
                />
              </div>
            )}
            {stripCourierMode(courierEditValue) && (
              <p className="text-xs text-muted-foreground">
                Will save as{" "}
                <span className="font-medium text-foreground">
                  {withCourierMode(courierEditValue.trim(), courierEditMode)}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={courierEditSaving} onClick={() => setCourierEditOrder(null)}>
              Cancel
            </Button>
            <Button disabled={courierEditSaving} onClick={saveCourierName}>
              {courierEditSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Courier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkActionLoading) setBulkAction(null);
        }}
      >
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "delete" ? "Delete selected orders?" : "Cancel selected orders?"}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "delete"
                ? `This will permanently delete the selected Pending orders. Orders with any other status will be skipped. ${bulkshipmentcreate.id.length} order(s) selected.`
                : `This will cancel eligible selected orders and request courier cancellation for shipped orders. Out for Delivery, Delivered, RTO, and already-cancelled orders will be skipped. ${bulkshipmentcreate.id.length} order(s) selected.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => setBulkAction(null)}
            >
              Back
            </Button>
            <Button
              variant={bulkAction === "delete" ? "destructive" : "default"}
              disabled={bulkActionLoading}
              onClick={handleBulkAction}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {bulkAction === "delete" ? "Delete Orders" : "Cancel Orders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteOrder} onOpenChange={(open) => !open && setDeleteOrder(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Delete Order</DialogTitle><DialogDescription>Are you sure you want to delete {deleteOrder?.referenceId}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOrder(null)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>



       <Dialog open={!!disputeOrder} onOpenChange={(open) => !open && setdisputeOrder(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Weight Dispute</DialogTitle>
            <DialogDescription>
              Raise a weight dispute for {disputeOrder?.awb && disputeOrder.awb !== "-" ? disputeOrder.awb : disputeOrder?.referenceId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Upload Proof (optional)</Label>
              <input type="file" className="mt-1 block w-full text-sm" onChange={(e) => { uploaddcoument(e); }} />
              {proof ? <p className="text-xs text-muted-foreground mt-1">Uploaded: {proof}</p> : null}
            </div>
            <div>
              <Label htmlFor="previousweight">Previous Weight (optional — order weight used if empty)</Label>
              <Input
                id="previousweight"
                value={previousWeight}
                onChange={(e) => setPreviousWeight(e.target.value)}
                placeholder="Booked weight (kg)"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="claimweight">Claim Weight *</Label>
              <Input
                id="claimweight"
                value={claimWeight}
                onChange={(e) => setClaimWeight(e.target.value)}
                placeholder="Charged / claimed weight (kg)"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="disputeimagelink">Image Link (optional)</Label>
              <Input
                id="disputeimagelink"
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                placeholder="https://..."
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setdisputeOrder(null)} disabled={disputeSaving}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={disputeSaving}>
              {disputeSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



     

      <Dialog open={showShopifyManualSync} onOpenChange={setShowShopifyManualSync}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Shopify Sync</DialogTitle>
            <DialogDescription>Select date range to sync Shopify orders.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="shopifySyncFromDate">From Date</Label>
              <Input
                id="shopifySyncFromDate"
                type="date"
                value={shopifySyncFromDate}
                onChange={(e) => setShopifySyncFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopifySyncToDate">To Date</Label>
              <Input
                id="shopifySyncToDate"
                type="date"
                value={shopifySyncToDate}
                onChange={(e) => setShopifySyncToDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShopifyManualSync(false)}>Cancel</Button>
            <Button onClick={handleManualShopifySync} disabled={isSyncing || !isIntegrationActive('Shopify')}>
              {isSyncing ? "Syncing..." : "Sync Shopify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSyncResults} onOpenChange={setShowSyncResults}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Sync Results</DialogTitle>
            <DialogDescription>{lastSyncTime && `Last synced: ${lastSyncTime}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">{syncResults.map((result, index) => (<div key={index} className={`p-3 rounded-lg ${result ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">{result ? <CheckCircle className="h-4 w-4 text-green-500" /> :
             <XCircle className="h-4 w-4 text-red-500" />}
             {/* <span className="font-medium">{result.platform}
             </span> */}
             </div><Badge variant={result ? 'default' : 'destructive'}>{result ? 'Success' : 'Failed'}</Badge></div>
             {/* <p className="text-sm mt-2">Orders synced: {result.ordersSynced}</p> */}
             </div>))}</div>
          <DialogFooter><Button onClick={() => setShowSyncResults(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={createOpen__} onOpenChange={setCreateOpen__}   >
              <DialogContent>
                <DialogHeader>
                 
                </DialogHeader>
                <div className="flex ">
                <div id="fileopen" className="flex-grid" style={{maxHeight:"70vh",overflowY:"auto"}}>
      
                </div>



                 <div id="fileopen1" className="flex-grid" style={{maxHeight:"70vh",overflowY:"auto"}}>
      
                </div>
                </div>
                
                
              </DialogContent>
            </Dialog>
      <IntegrationConfigDialog integration={selectedIntegration} open={showIntegrationConfig} onOpenChange={setShowIntegrationConfig} onSave={handleSaveIntegration} onTestConnection={handleTestConnection} />
   
   
   {/* Excel Upload Dialog */}
<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Bulk Order Upload (Excel/CSV)</DialogTitle>
      <DialogDescription>
        Upload an Excel (.xlsx, .xls) or CSV file with your orders.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
          }}
          className="flex-1"
        />
        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Instructions:</strong> Each row = one product line. Rows with same Order Number will be merged into one order.
        Required columns: Order Number, Customer Name, Customer Phone, Pincode, City, State, Address Line 1, Product Name, Quantity, Unit Price.
        Optional: SKU, GST Rate (%) (default 0%), Height/Width/Length (cm), Dead Weight (kg), Payment Method (COD/Prepaid), Platform, Courier, etc.
      </p>

      {uploadProcessing && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2">Processing...</span>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {uploadErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {uploadPreview.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Preview ({uploadPreview.length} orders)</h4>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {uploadPreview.map((order, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{order.referenceId}</td>
                    <td className="px-3 py-2">{order.customerName}<br/><span className="text-xs text-muted-foreground">{order.customerPhone}</span></td>
                    <td className="px-3 py-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i}>{item.name} x{item.quantity}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2">{order.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
      <Button onClick={handleUploadConfirm} disabled={uploadPreview.length === 0 || uploadProcessing}>
        Create {uploadPreview.length} Orders
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </DashboardLayout>
  );
};

export { OrdersPage };
export default OrdersPage;
