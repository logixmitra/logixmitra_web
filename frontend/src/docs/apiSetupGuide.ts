import { API_BASE_URL } from "../../services/config";

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  group: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  /** Path relative to the base URL (no leading slash) */
  path: string;
  description: string;
  auth: "public" | "token";
  query?: ApiParam[];
  body?: ApiParam[];
  requestExample?: string;
  responseExample?: string;
  notes?: string[];
}

export const API_GUIDE_META = {
  title: "LogixMitra API Setup Guide",
  product: "LogixMitra Shipping & Order Management",
  version: "v1.0",
  updated: "27 Sep 2026",
  supportEmail: "admin@logixmitra.com",
  supportPhone: "+91 99999 00000",
  tokenValidity: "7 days",
};

export const BASE_URL = API_BASE_URL.replace(/\/+$/, "");

export const endpointUrl = (path: string) => `${BASE_URL}/${path.replace(/^\/+/, "")}`;

export const API_OVERVIEW = [
  "LogixMitra exposes a REST API that lets any external system — your website, ERP, marketplace or courier partner tool — push orders into this panel, fetch warehouse and order data, calculate rates and track shipments by AWB.",
  "All requests and responses are JSON encoded (application/json). The API is stateless: every authenticated request carries a Bearer token in the Authorization header.",
  "Read this guide end to end once, generate your token, then use the copy-ready cURL / Node / PHP snippets under each endpoint.",
];

export const API_PREREQUISITES = [
  "A LogixMitra account (seller or admin) with a valid email and password.",
  "A warehouse created in the panel — every pushed order is mapped to a warehouse id (pickup location).",
  "An HTTPS capable client (server, cron job, Postman or cURL).",
  "For production, ask the LogixMitra team for your live base URL (the panel URL is environment specific).",
];

export const API_QUICK_START = [
  {
    step: "1",
    title: "Check connectivity",
    detail: `GET ${endpointUrl("health")} returns { "success": true } when the API is up.`,
  },
  {
    step: "2",
    title: "Get your token",
    detail: `POST ${endpointUrl("auth/login")} with email + password. Store data.token and send it as "Authorization: Bearer <token>".`,
  },
  {
    step: "3",
    title: "Pick a warehouse",
    detail: `GET ${endpointUrl("auth/getAllWarehouses")} (or create one with POST ${endpointUrl("auth/createWarehouse")}) and note the warehouse id.`,
  },
  {
    step: "4",
    title: "Push an order",
    detail: `POST ${endpointUrl("auth/manualcreateOrder")} with your order object — the order instantly appears in the Orders screen with a generated reference id.`,
  },
  {
    step: "5",
    title: "Track it",
    detail: `Once a courier AWB is assigned, poll GET ${endpointUrl("tracking/track/{awb}")} or POST ${endpointUrl("tracking/track/bulk")} for live status.`,
  },
];

export const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Ready for Dispatch",
  "Shipped",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "UNDELIVERED",
  "RTO",
  "RTO In transit",
  "RTO Delivered",
  "Cancelled",
  "Disputed",
  "Draft Merged",
];

export const ERROR_CODES = [
  { code: "200 / 201", meaning: "Success — request processed (order created).", fix: "Read data from the response body." },
  { code: "207", meaning: "Partial success — bulk push where some orders failed.", fix: "Inspect failedOrders[] and retry only the failed ones." },
  { code: "400", meaning: "Validation error — missing or malformed field.", fix: "Check the message / errors[] array and resend." },
  { code: "401", meaning: "Missing, expired or invalid token.", fix: "Call /auth/login again and use the fresh token." },
  { code: "403", meaning: "Token is valid but the role is not allowed for this resource.", fix: "Use an admin/seller token that owns the data." },
  { code: "404", meaning: "Resource not found (order id, AWB, warehouse).", fix: "Verify the id / AWB and the user_id you are querying." },
  { code: "409", meaning: "Duplicate order number.", fix: "Send a unique orderNumber per order or reuse referenceId lookups." },
  { code: "500", meaning: "Unexpected server error.", fix: "Retry with backoff; if it persists share the request id with support." },
];

export const API_BEST_PRACTICES = [
  "Never expose your password or token in front-end code — call the API from your server.",
  "Send Content-Type: application/json on every POST/PUT/PATCH request.",
  "Do not add a trailing slash to the base URL other than the one already present — mismatched slashes can cause CORS/preflight failures.",
  "Use your own orderNumber as the unique key; LogixMitra also generates a referenceId (used on labels and tracking).",
  "Push in batches (up to a few hundred orders per call is fine) but always read failedOrders[] and retry those.",
  "Poll tracking at a sensible interval (e.g. every 30–60 minutes), not per second.",
  "Keep the token on the server; refresh it once 401 is returned.",
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "health",
    group: "System",
    name: "Health check (Info API)",
    method: "GET",
    path: "health",
    auth: "public",
    description:
      "Ping style endpoint — use it to verify that your base URL is correct and the LogixMitra API is reachable before pushing live data.",
    responseExample: `{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-09-27T09:12:44.501Z"
}`,
  },
  {
    id: "login",
    group: "Authentication",
    name: "Login (get API token)",
    method: "POST",
    path: "auth/login",
    auth: "public",
    description:
      "Exchanges your panel credentials for a JWT access token. Send the token on every protected request as: Authorization: Bearer <token>.",
    body: [
      { name: "email", type: "string", required: true, description: "Your LogixMitra login email." },
      { name: "password", type: "string", required: true, description: "Your LogixMitra password." },
    ],
    requestExample: `{
  "email": "seller@logixmitra.com",
  "password": "YourPassword@123"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "user": {
      "id": 7,
      "name": "Demo Seller",
      "email": "seller@logixmitra.com",
      "role": "seller",
      "roleId": 3,
      "canViewAllOrders": false,
      "permissions": [{ "module": "Orders", "actions": ["create", "read", "update"] }]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
  }
}`,
    notes: [
      `Token is valid for ${API_GUIDE_META.tokenValidity} (configurable by the LogixMitra team).`,
      "A 401 on any protected call means the token expired — log in again and replace the stored token.",
      "Call this from your server, never from browser JavaScript.",
    ],
  },
  {
    id: "listWarehouses",
    group: "Warehouses",
    name: "Get all warehouses",
    method: "GET",
    path: "auth/getAllWarehouses",
    auth: "token",
    description:
      "Returns every warehouse (pickup location) configured in the panel with its owner. Use the warehouse id while pushing orders so the pickup address and COD remittance map correctly.",
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": 4,
      "name": "Main Warehouse",
      "address": "Plot 12, Industrial Area",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "contactPerson": "Demo Seller",
      "phone": "9999990002",
      "user_id": 7,
      "isActive": true,
      "isDefault": true
    }
  ]
}`,
    notes: ["Filter the array by user_id (seller id) when you manage multiple sellers."],
  },
  {
    id: "createWarehouse",
    group: "Warehouses",
    name: "Create warehouse",
    method: "POST",
    path: "auth/createWarehouse",
    auth: "token",
    description:
      "Registers a new pickup location and returns its id. Create it once, then reuse the id in every order push.",
    body: [
      { name: "name", type: "string", required: true, description: "Warehouse / pickup location name." },
      { name: "address", type: "string", required: true, description: "Street address of the warehouse." },
      { name: "city", type: "string", required: true, description: "City of the warehouse." },
      { name: "state", type: "string", required: true, description: "State of the warehouse." },
      { name: "pincode", type: "string", required: true, description: "Pickup pincode (courier serviceability depends on it)." },
      { name: "contactPerson", type: "string", required: false, description: "Person the pickup executive should ask for." },
      { name: "phone", type: "string", required: false, description: "Contact number — digits only." },
      { name: "user_id", type: "number", required: true, description: "Seller / account id that owns this warehouse." },
      { name: "isDefault", type: "boolean", required: false, description: "Marks the default pickup location for that seller." },
      { name: "isActive", type: "boolean", required: false, description: "Defaults to true." },
    ],
    requestExample: `{
  "name": "Main Warehouse",
  "address": "Plot 12, Industrial Area",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "contactPerson": "Demo Seller",
  "phone": "9999990002",
  "user_id": 7,
  "isDefault": true,
  "isActive": true
}`,
    responseExample: `{
  "success": true,
  "data": { "id": 4, "name": "Main Warehouse", "pincode": "110001", "user_id": 7 }
}`,
  },
  {
    id: "pushOrder",
    group: "Orders",
    name: "Push order (single or bulk)",
    method: "POST",
    path: "auth/manualcreateOrder",
    auth: "token",
    description:
      "The core integration endpoint — pushes one or many orders from your website/ERP into the LogixMitra panel. The order appears immediately in the Orders screen with customer address, items, COD amount and pickup warehouse.",
    body: [
      { name: "user_id", type: "number", required: false, description: "Seller/account id that owns the order. Defaults to the token user." },
      { name: "referenceId", type: "string", required: false, description: "Your internal reference. A unique value is generated automatically when omitted." },
      { name: "orderNumber", type: "string", required: false, description: "Your order number; auto-generated (ORD-xxxxxxxx) when omitted. Must be unique." },
      { name: "orderDate", type: "string", required: false, description: "YYYY-MM-DD. Defaults to today." },
      { name: "customerName", type: "string", required: true, description: "Consignee full name." },
      { name: "customerPhone", type: "string", required: true, description: "Consignee 10-digit mobile number." },
      { name: "customerEmail", type: "string", required: false, description: "Consignee email (used for notifications)." },
      { name: "addressLine1", type: "string", required: true, description: "Delivery address line 1." },
      { name: "addressLine2", type: "string", required: false, description: "Delivery address line 2." },
      { name: "landmark", type: "string", required: false, description: "Nearby landmark." },
      { name: "pincode", type: "string", required: true, description: "Delivery pincode." },
      { name: "city", type: "string", required: true, description: "Delivery city." },
      { name: "state", type: "string", required: true, description: "Delivery state." },
      { name: "paymentGateway", type: "string", required: false, description: "\"Prepaid\" (default) or \"COD\"." },
      { name: "totalOutstanding", type: "number", required: false, description: "Amount to collect for COD orders." },
      { name: "amount", type: "string", required: false, description: "Declared order value (printed on the invoice/label)." },
      { name: "subtotalPrice", type: "number", required: false, description: "Items subtotal." },
      { name: "totalTax", type: "number", required: false, description: "Total GST amount." },
      { name: "totalShippingPrice", type: "number", required: false, description: "Shipping charged to the customer." },
      { name: "totalDiscounts", type: "number", required: false, description: "Discount applied." },
      { name: "currency", type: "string", required: false, description: "Defaults to INR." },
      { name: "warehouse", type: "number", required: false, description: "Warehouse id (pickup location). Falls back to the seller's default active warehouse." },
      { name: "courier", type: "string", required: false, description: "Preferred courier name; leave empty to assign later." },
      { name: "platform", type: "string", required: false, description: "Source label, e.g. \"Shopify\", \"WooCommerce\", \"Custom\". Defaults to Manual." },
      { name: "items[]", type: "array", required: true, description: "At least one item — name*, quantity*, unitPrice*, gstRate, discount, deadWeight, length, width, height, sku." },
    ],
    requestExample: `{
  "user_id": 7,
  "referenceId": "WEB-10241",
  "orderNumber": "WEB-10241",
  "orderDate": "2026-09-27",
  "customerName": "Aarav Sharma",
  "customerPhone": "9876543210",
  "customerEmail": "aarav@example.com",
  "addressLine1": "H.No 24, Sector 45",
  "addressLine2": "Near Metro Station",
  "pincode": "122003",
  "city": "Gurugram",
  "state": "Haryana",
  "paymentGateway": "COD",
  "totalOutstanding": 1499,
  "amount": "1499",
  "warehouse": 4,
  "platform": "Custom",
  "items": [
    {
      "name": "Cotton T-Shirt (M)",
      "sku": "TS-M-BLK",
      "quantity": 1,
      "unitPrice": 1500,
      "gstRate": 5,
      "deadWeight": 0.5,
      "length": 30,
      "width": 22,
      "height": 4
    }
  ]
}`,
    responseExample: `{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "3f1c9d5e-1b0e-4a5f-9c8d-6a2f7b4e9d31",
    "orderNumber": "WEB-10241",
    "referenceId": "WEB-10241",
    "awb": "-",
    "status": "Pending",
    "customerName": "Aarav Sharma",
    "pincode": "122003",
    "totalItems": 1,
    "totalWeight": 0.5,
    "warehouse": 4,
    "items": [{ "name": "Cotton T-Shirt (M)", "quantity": 1, "unitPrice": 1500 }]
  }
}`,
    notes: [
      "Single order → post the order object directly. Many orders → post { \"data\": [ order1, order2 ], \"user_id\": 7 }.",
      "Bulk response: 201 with data[] when every order is created, 207 with data[] + failedOrders[] on partial success, 400 when all of them fail.",
      "Volumetric weight is calculated automatically from length × width × height when it is not supplied.",
      "A 409 response means the orderNumber already exists — always send a unique number per order.",
    ],
  },
  {
    id: "listOrders",
    group: "Orders",
    name: "List orders",
    method: "GET",
    path: "orders",
    auth: "token",
    description:
      "Returns orders filtered by your query parameters — the same data you see in the Orders screen. Use it for reconciliation dashboards and COD reports.",
    query: [
      { name: "user_id", type: "number / string", required: false, description: "Filter by seller id (\"all\" is accepted for admin tokens)." },
      { name: "status", type: "string", required: false, description: "Order status, e.g. Pending, Shipped, Delivered, RTO." },
      { name: "awb", type: "string", required: false, description: "Exact AWB number." },
      { name: "search", type: "string", required: false, description: "Free text search on order number, customer, phone, AWB." },
      { name: "courier", type: "string", required: false, description: "Filter by courier name." },
      { name: "platform", type: "string", required: false, description: "Filter by source platform (Manual, Shopify, Custom…)." },
      { name: "financialStatus", type: "string", required: false, description: "prepaid / cod." },
      { name: "dateType", type: "string", required: false, description: "Date field used for the range: \"Order Created\" (order date, falls back to created timestamp), \"Delivered Date\", \"Updated Date\" or \"createdAt\"." },
      { name: "startDate", type: "string", required: false, description: "Range start (YYYY-MM-DD, or ISO timestamp)." },
      { name: "endDate", type: "string", required: false, description: "Range end (YYYY-MM-DD, or ISO timestamp)." },
      { name: "startDateDay", type: "string", required: false, description: "Exact calendar day (YYYY-MM-DD) for the orderDate side of the range — preferred for \"Order Created\"." },
      { name: "endDateDay", type: "string", required: false, description: "Exact calendar day (YYYY-MM-DD) for the orderDate side of the range — preferred for \"Order Created\"." },
      { name: "page", type: "number", required: false, description: "Page number (with paginate=true)." },
      { name: "limit", type: "number", required: false, description: "Records per page (with paginate=true)." },
      { name: "paginate", type: "boolean", required: false, description: "true returns { data, total, page, totalPages }." },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "3f1c9d5e-1b0e-4a5f-9c8d-6a2f7b4e9d31",
      "orderNumber": "WEB-10241",
      "referenceId": "WEB-10241",
      "awb": "DL123456789IN",
      "courier": "Delhivery",
      "status": "In Transit",
      "customerName": "Aarav Sharma",
      "pincode": "122003",
      "totalOutstanding": 1499
    }
  ]
}`,
  },
  {
    id: "getOrderById",
    group: "Orders",
    name: "Get order by id",
    method: "GET",
    path: "orders/{id}",
    auth: "token",
    description: "Returns one order with its items, shipment details, wallet impact and current tracking status. The id is the order UUID returned while pushing the order.",
    responseExample: `{
  "success": true,
  "data": {
    "id": "3f1c9d5e-1b0e-4a5f-9c8d-6a2f7b4e9d31",
    "orderNumber": "WEB-10241",
    "awb": "DL123456789IN",
    "status": "In Transit",
    "customerName": "Aarav Sharma",
    "items": [{ "name": "Cotton T-Shirt (M)", "quantity": 1, "unitPrice": 1500 }]
  }
}`,
    notes: ["The id must be the order UUID (version 4); numeric ids are rejected with 400."],
  },
  {
    id: "updateOrderStatus",
    group: "Orders",
    name: "Update order status",
    method: "PATCH",
    path: "orders/{id}/status",
    auth: "token",
    description: "Updates the order status — handy when your own system needs to mark an order as Processing, Ready for Dispatch or Cancelled.",
    body: [{ name: "status", type: "string", required: true, description: `One of: ${ORDER_STATUSES.join(", ")}.` }],
    requestExample: `{
  "status": "Ready for Dispatch"
}`,
    responseExample: `{
  "success": true,
  "message": "Order status updated"
}`,
  },
  {
    id: "trackOrder",
    group: "Tracking",
    name: "Track order by AWB",
    method: "GET",
    path: "tracking/track/{awbNumber}",
    auth: "public",
    description:
      "Returns the live courier status for one AWB (Air Waybill) number by asking the courier directly, and refreshes the status stored in the panel.",
    responseExample: `{
  "success": true,
  "message": "Tracking information fetched successfully",
  "data": {
    "awb": "DL123456789IN",
    "courier": "Delhivery",
    "currentStatus": "In Transit",
    "statusTime": "2026-09-27 12:59:56",
    "scanDetail": []
  }
}`,
    notes: [
      "Supported couriers: Shree Maruti (InnoFulfill), eKart, Shadowfax, Delhivery, Xpressbees, BlueDart.",
      "404 = no order found for that AWB; 400 = tracking not supported for the courier on that order.",
    ],
  },
  {
    id: "trackBulk",
    group: "Tracking",
    name: "Track multiple orders (bulk)",
    method: "POST",
    path: "tracking/track/bulk",
    auth: "public",
    description: "Tracks up to 20 AWB numbers in a single call — use it from a cron job to keep your own dashboard in sync.",
    body: [{ name: "awbNumbers", type: "string[]", required: true, description: "Array of AWB numbers (max 20 per request)." }],
    requestExample: `{
  "awbNumbers": ["DL123456789IN", "DL987654321IN"]
}`,
    responseExample: `{
  "success": true,
  "data": [
    { "awbNumber": "DL123456789IN", "success": true, "status": "In Transit" },
    { "awbNumber": "DL987654321IN", "success": false, "message": "Order not found" }
  ]
}`,
    notes: ["Events are returned per AWB — treat each entry independently."],
  },
  {
    id: "rateCalculate",
    group: "Rates & Serviceability",
    name: "Calculate shipping rates",
    method: "POST",
    path: "integrations/ratecalculate",
    auth: "public",
    description:
      "Returns live courier rates for a route and parcel, so your checkout can show the shipping charge (and reject unserviceable pincodes) before the order is created.",
    body: [
      { name: "shipmentType", type: "string", required: true, description: "FORWARD or RETURN." },
      { name: "packageType", type: "string", required: false, description: "Parcel type, e.g. SPS." },
      { name: "originPincode", type: "string", required: true, description: "Pickup pincode (warehouse)." },
      { name: "deliveryPincode", type: "string", required: true, description: "Customer pincode." },
      { name: "paymentMode", type: "string", required: true, description: "PREPAID or COD." },
      { name: "weight", type: "number", required: true, description: "Dead weight in kg." },
      { name: "invoiceValue", type: "number", required: false, description: "Declared value (required for COD)." },
      { name: "dimensions", type: "object", required: true, description: "{ length, width, height } in cm." },
      { name: "serviceType", type: "string", required: false, description: "e.g. domestic." },
    ],
    requestExample: `{
  "shipmentType": "FORWARD",
  "packageType": "SPS",
  "originPincode": "110001",
  "deliveryPincode": "122003",
  "paymentMode": "PREPAID",
  "weight": 2,
  "invoiceValue": 1499,
  "dimensions": { "length": 30, "width": 22, "height": 4 },
  "serviceType": "domestic"
}`,
    responseExample: `{
  "success": true,
  "data": [
    { "type": "EKART", "rates": 78.5 },
    { "type": "INNOFULFILL", "rates": 84.2 }
  ]
}`,
    notes: ["data[] carries one row per courier partner — pick the cheapest, the fastest or your contracted partner."],
  },
  {
    id: "pincodeDetail",
    group: "Rates & Serviceability",
    name: "Pincode lookup",
    method: "POST",
    path: "integrations/getpindetail",
    auth: "public",
    description: "Resolves a pincode to city / state / area so you can auto-fill the delivery address while capturing orders.",
    body: [{ name: "pincodefrom", type: "string", required: true, description: "6-digit Indian pincode." }],
    requestExample: `{
  "pincodefrom": "122003"
}`,
    responseExample: `{
  "success": true,
  "data": [
    { "PostOffice": "Sector 45", "District": "Gurgaon", "State": "Haryana", "Pincode": "122003" }
  ]
}`,
  },
  {
    id: "walletByUser",
    group: "Wallet",
    name: "Wallet transactions of a seller",
    method: "GET",
    path: "wallets/users/{id}",
    auth: "token",
    description: "Returns every wallet entry (recharge, shipment debit, COD credit) for the given seller id — handy for finance reconciliation.",
    responseExample: `[
  {
    "id": 42,
    "user_id": 7,
    "transid": "DL123456789IN",
    "amount": 78.5,
    "status": "Debited",
    "description": "Shipping charge for WEB-10241"
  }
]`,
  },
  {
    id: "walletCreate",
    group: "Wallet",
    name: "Create wallet recharge entry",
    method: "POST",
    path: "wallets/create",
    auth: "token",
    description: "Adds a manual recharge request (UPI / NEFT) for a seller. The entry stays pending until an admin approves it in the panel.",
    body: [
      { name: "user_id", type: "number", required: true, description: "Seller / account id." },
      { name: "transid", type: "string", required: true, description: "Your payment reference / UTR number." },
      { name: "amount", type: "number", required: true, description: "Amount to credit." },
    ],
    requestExample: `{
  "user_id": 7,
  "transid": "UTR1029384756",
  "amount": 5000
}`,
    responseExample: `{
  "success": true,
  "data": { "id": 43, "user_id": 7, "transid": "UTR1029384756", "amount": 5000, "status": "Pending" }
}`,
  },
];

/** Groups endpoints in declaration order — used for headings in the UI and the PDF. */
export function groupedEndpoints(): { group: string; endpoints: ApiEndpoint[] }[] {
  const groups: { group: string; endpoints: ApiEndpoint[] }[] = [];
  for (const endpoint of API_ENDPOINTS) {
    const existing = groups.find((item) => item.group === endpoint.group);
    if (existing) existing.endpoints.push(endpoint);
    else groups.push({ group: endpoint.group, endpoints: [endpoint] });
  }
  return groups;
}

/** Sample query string for GET endpoints, e.g. "?status=<status>&paginate=true" */
export function sampleQuery(endpoint: ApiEndpoint): string {
  if (!endpoint.query?.length) return "";
  const parts = endpoint.query.slice(0, 3).map((param) => {
    const value = param.type.includes("number") ? "1" : param.type.includes("boolean") ? "true" : "<" + param.name + ">";
    return param.name + "=" + value;
  });
  return "?" + parts.join("&");
}

export function buildCurl(endpoint: ApiEndpoint): string {
  const url = endpointUrl(endpoint.path) + (endpoint.method === "GET" ? sampleQuery(endpoint) : "");
  const lines = ['curl -X ' + endpoint.method + ' "' + url + '"', '  -H "Accept: application/json"'];
  if (endpoint.method !== "GET") lines.push('  -H "Content-Type: application/json"');
  if (endpoint.auth === "token") lines.push('  -H "Authorization: Bearer $LOGIXMITRA_TOKEN"');
  if (endpoint.requestExample) lines.push("  -d '" + endpoint.requestExample.replace(/\n\s*/g, " ") + "'");
  return lines.join(" \\\n");
}

export function buildNode(endpoint: ApiEndpoint): string {
  const lines = [
    'import axios from "axios";',
    "",
    'const BASE_URL = "' + BASE_URL + '";',
    "const TOKEN = process.env.LOGIXMITRA_TOKEN; // issued by POST /auth/login",
    "",
  ];
  if (endpoint.requestExample) lines.push("const payload = " + endpoint.requestExample + ";", "");
  const options = endpoint.auth === "token" ? '{ headers: { Authorization: "Bearer " + TOKEN } }' : "{}";
  const call =
    endpoint.method === "GET"
      ? 'await axios.get(BASE_URL + "/' + endpoint.path + sampleQuery(endpoint) + '", ' + options + ");"
      : 'await axios.' + endpoint.method.toLowerCase() + '(BASE_URL + "/' + endpoint.path + '", payload, ' + options + ");";
  lines.push("const { data } = " + call, "console.log(data);");
  return lines.join("\n");
}

export function buildPhp(endpoint: ApiEndpoint): string {
  const url = endpointUrl(endpoint.path) + (endpoint.method === "GET" ? sampleQuery(endpoint) : "");
  const lines = [
    "<?php",
    '$baseUrl = "' + BASE_URL + '";',
    "$token = getenv('LOGIXMITRA_TOKEN'); // issued by POST /auth/login",
    "",
    '$ch = curl_init("' + url + '");',
    "curl_setopt_array($ch, [",
    "  CURLOPT_RETURNTRANSFER => true,",
  ];
  if (endpoint.method !== "GET") lines.push("  CURLOPT_POST => true,", "  CURLOPT_POSTFIELDS => json_encode($payload),");
  const accept = '"Accept: application/json"';
  const auth = endpoint.auth === "token" ? '"Authorization: Bearer $token"' : null;
  lines.push("  CURLOPT_HTTPHEADER => [" + [accept, auth].filter(Boolean).join(", ") + "],");
  lines.push("]);", "$response = json_decode(curl_exec($ch), true);", "curl_close($ch);", "print_r($response);");
  return lines.join("\n");
}





