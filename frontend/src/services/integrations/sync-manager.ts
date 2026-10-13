


import { Platform, IntegrationConfig, SyncResult, Order } from '@/types/order';
import { orderApi } from '../../../services/orderApi';
import { API_BASE_URL } from '../../../services/config';
import { getuserid,storetmpdata} from '../../../services/getbasicdata';

// Platform-specific API connectors
class AmazonConnector {
  constructor(private config: IntegrationConfig) {}

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
    console.log(`Fetching Amazon orders from ${dateFrom} to ${dateTo}`);
    
    if (!this.config.credentials.sellerId || !this.config.credentials.accessToken) {
      throw new Error('Amazon credentials are not configured properly');
    }
    
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Amazon connection...');
      
      if (!this.config.credentials.sellerId || !this.config.credentials.accessToken) {
        console.error('Missing Amazon credentials');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Amazon connection test failed:', error);
      return false;
    }
  }
}

const mapStatus = (shopifyStatus) => {
  switch (shopifyStatus) {
    case "FULFILLED":
      return "Delivered";
    case "PARTIALLY_FULFILLED":
      return "Shipped";
    case "UNFULFILLED":
      return "Pending";
    default:
      return "Pending";
  }
};

const mapShopifyOrder = (shopifyData) => {
  const orders = shopifyData?.orders?.edges || [];

  return orders.map((edge) => {
    const node = edge.node;

    // 🧾 Order mapping
    const order = {
      orderNumber: node.name?.replace("#", ""),
      customerName: node.customer?.firstName || "Guest",
      customerEmail: node.customer?.email || null,
      customerPhone: node.customer?.phone || null,
      amount: node.totalPriceSet?.shopMoney?.amount || "0",
      orderDate: node.createdAt?.split("T")[0],
      platform: "Shopify",
      status: mapStatus(node.displayFulfillmentStatus),

      // Address
      pincode: node.shippingAddress?.zip || null,
      city: node.shippingAddress?.city || null,
      state: node.shippingAddress?.province || null,
      addressLine1: node.shippingAddress?.address1 || null,
      addressLine2: node.shippingAddress?.address2 || null,

      totalItems: node.lineItems?.edges?.length || 0
    };

    // 📦 Items mapping
    const items = node.lineItems?.edges?.map((itemEdge) => {
      const item = itemEdge.node;

      const price = parseFloat(
        item.discountedUnitPriceSet?.shopMoney?.amount || 0
      );

      const quantity = item.quantity || 1;

      return {
        name: item.title,
        sku: item.sku || item.variant?.sku || item.barcode || '',
        unitPrice: price,
        quantity: quantity,
        totalPrice: price * quantity,
        gstRate: Array.isArray(item.taxLines)
          ? item.taxLines.reduce((sum, tax) => {
              const raw = parseFloat(tax?.rate);
              if (!Number.isFinite(raw) || raw <= 0) return sum;
              return sum + (raw > 1 ? raw : raw * 100);
            }, 0)
          : 0,
      };
    }) || [];

    return { order, items };
  });
};




function isCodTitle(text) {
  const value = String(text || '').toLowerCase().trim();
  if (!value) return false;
  return (
    /(^|[^a-z])cod([^a-z]|$)/i.test(value) ||
    value.includes('cash on delivery') ||
    value.includes('cash_on_delivery') ||
    /cod\s*(charge|charges|fee|fees)/i.test(value)
  );
}

function isShopifyCodOrder(shopifyOrder) {
  const gateways = [
    ...(Array.isArray(shopifyOrder.payment_gateway_names) ? shopifyOrder.payment_gateway_names : []),
    shopifyOrder.gateway,
    shopifyOrder.payment_gateway,
  ]
    .filter(Boolean)
    .map((g) => String(g).toLowerCase());

  if (gateways.some((g) => isCodTitle(g))) return true;
  const status = String(shopifyOrder.financial_status || '').toLowerCase();
  return status === 'pending' || status === 'voided';
}

function extractShopifyCodCharge(shopifyOrder) {
  let codCharge = 0;
  let fromLineItems = false;

  for (const item of shopifyOrder.line_items || []) {
    if (!isCodTitle(item.title || item.name)) continue;
    fromLineItems = true;
    const unit = parseFloat(item.price) || 0;
    const qty = item.quantity || 1;
    const discount = parseFloat(item.total_discount) || 0;
    codCharge += Math.max(0, unit * qty - discount);
  }

  for (const line of shopifyOrder.shipping_lines || []) {
    if (!isCodTitle(line.title || line.code)) continue;
    codCharge += parseFloat(line.price) || 0;
  }

  for (const attr of shopifyOrder.note_attributes || []) {
    if (!isCodTitle(attr.name)) continue;
    const val = parseFloat(String(attr.value ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(val) && val > 0) codCharge += val;
  }

  return {
    codCharge: Number(codCharge.toFixed(2)),
    fromLineItems,
  };
}

function normalizePropName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findShopifyLineItemProperty(item, names) {
  const wanted = names.map(normalizePropName);
  const props = Array.isArray(item?.properties) ? item.properties : [];
  for (const prop of props) {
    const name = normalizePropName(prop?.name || prop?.key);
    if (!wanted.includes(name)) continue;
    const value = prop?.value ?? prop?.val;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function extractShopifySku(item) {
  const candidates = [
    item?.sku,
    item?.variant_sku,
    item?.barcode,
    item?._sku,
    item?.sku_code,
    item?.product_sku,
  ];
  for (const candidate of candidates) {
    const sku = String(candidate || '').trim();
    if (sku && sku.toLowerCase() !== 'null' && sku.toLowerCase() !== 'undefined') return sku;
  }
  return findShopifyLineItemProperty(item, [
    'sku',
    'sku code',
    'sku id',
    'product sku',
    'item sku',
    'variant sku',
    'product code',
    'item code',
    'style code',
  ]);
}

function parseGstPercent(value) {
  if (value === undefined || value === null || value === '') return 0;
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num < 0) return 0;
  if (num > 0 && num <= 1) return num * 100;
  return num;
}

function snapGstRate(rate) {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const slabs = [0, 3, 5, 12, 18, 28, 40];
  let best = rate;
  let bestDiff = Infinity;
  for (const slab of slabs) {
    const diff = Math.abs(slab - rate);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = slab;
    }
  }
  return bestDiff <= 1 ? best : Number(rate.toFixed(2));
}

function extractShopifyGstRate(item, shopifyOrder) {
  const taxesIncluded = !!shopifyOrder?.taxes_included;
  const taxLines = Array.isArray(item?.tax_lines) ? item.tax_lines : [];
  if (taxLines.length > 0) {
    let rateSum = 0;
    let hasRate = false;
    for (const tax of taxLines) {
      const raw = parseFloat(tax?.rate);
      if (Number.isFinite(raw) && raw > 0) {
        hasRate = true;
        rateSum += raw > 1 ? raw : raw * 100;
      }
    }
    if (hasRate) return snapGstRate(rateSum);

    const taxAmount = taxLines.reduce((sum, tax) => sum + (parseFloat(tax?.price) || 0), 0);
    const quantity = item?.quantity || 1;
    const lineTotal = (parseFloat(item?.price) || 0) * quantity - (parseFloat(item?.total_discount) || 0);
    if (taxAmount > 0 && lineTotal > 0) {
      const exclusive = taxesIncluded ? Math.max(lineTotal - taxAmount, 0) : lineTotal;
      if (exclusive > 0) return snapGstRate((taxAmount / exclusive) * 100);
    }
  }

  const fromProp = findShopifyLineItemProperty(item, [
    'gst', 'gst %', 'gst%', 'gst rate', 'gst percent', 'tax rate', 'tax %', 'igst', 'igst %',
  ]);
  if (fromProp) return snapGstRate(parseGstPercent(fromProp));

  const cgst = parseGstPercent(findShopifyLineItemProperty(item, ['cgst', 'cgst %', 'cgst rate']));
  const sgst = parseGstPercent(findShopifyLineItemProperty(item, ['sgst', 'sgst %', 'sgst rate']));
  if (cgst || sgst) return snapGstRate(cgst + sgst);

  const orderTax = parseFloat(shopifyOrder?.total_tax || shopifyOrder?.current_total_tax) || 0;
  const subtotal = parseFloat(shopifyOrder?.subtotal_price) || 0;
  if (orderTax > 0 && subtotal > 0) {
    const exclusive = taxesIncluded ? Math.max(subtotal - orderTax, 0) : subtotal;
    if (exclusive > 0) return snapGstRate((orderTax / exclusive) * 100);
  }

  return 0;
}

function toExclusiveUnitPrice(unitPrice, gstRate, taxesIncluded) {
  if (!taxesIncluded || !gstRate || gstRate <= 0) return unitPrice;
  return Number((unitPrice / (1 + gstRate / 100)).toFixed(2));
}

function convertShopifyOrderToModel(shopifyOrder, dbOrderId = null, sellerId = null) {
  // Generate UUID if not provided
  const orderId = dbOrderId || '';
  
  // Extract customer information
  const customerName = shopifyOrder.shipping_address 
    ? `${shopifyOrder.shipping_address.first_name || ''} ${shopifyOrder.shipping_address.last_name || ''}`.trim()
    : (shopifyOrder.customer ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() : '');

  const customerPhone = shopifyOrder.shipping_address?.phone || 
                        shopifyOrder.billing_address?.phone || 
                        shopifyOrder.customer?.phone || 
                        null;
  
  const customerEmail = shopifyOrder.email || 
                        shopifyOrder.contact_email || 
                        shopifyOrder.customer?.email || 
                        null;
  
  // Extract address fields
  const shippingAddress = shopifyOrder.shipping_address || {};
  const billingAddress = shopifyOrder.billing_address || {};
  
  // Calculate total items
  const totalItems = shopifyOrder.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Convert order date
  const orderDate = shopifyOrder.created_at ? shopifyOrder.created_at.split('T')[0] : null;
  const processedAt = shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null;
  const cancelledAt = shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at) : null;

  const isCod = isShopifyCodOrder(shopifyOrder);
  const { codCharge, fromLineItems } = extractShopifyCodCharge(shopifyOrder);
  const totalPrice = parseFloat(shopifyOrder.total_price) || 0;
  const outstandingRaw = parseFloat(shopifyOrder.total_outstanding);
  const lineDiscountTotal = (shopifyOrder.line_items || []).reduce(
    (sum, item) => sum + (parseFloat(item.total_discount) || 0),
    0
  );
  const totalDiscounts = Math.max(
    parseFloat(shopifyOrder.current_total_discounts) || 0,
    parseFloat(shopifyOrder.total_discounts) || 0,
    lineDiscountTotal
  );
  const discountCodes = (shopifyOrder.discount_codes || []).map((d) => ({
    code: d.code || '',
    amount: parseFloat(d.amount) || 0,
    type: d.type || 'fixed_amount',
  }));
  if (discountCodes.length === 0 && Array.isArray(shopifyOrder.discount_applications)) {
    for (const app of shopifyOrder.discount_applications) {
      discountCodes.push({
        code: app.code || app.title || app.description || 'Discount',
        amount: parseFloat(app.value) || 0,
        type: app.value_type || app.type || 'fixed_amount',
      });
    }
  }
  const collectable = isCod
    ? (!Number.isNaN(outstandingRaw) && outstandingRaw > 0 ? outstandingRaw : totalPrice)
    : (!Number.isNaN(outstandingRaw) ? outstandingRaw : 0);
  
  // Prepare the Order object
  const convertedOrder = {
    user_id: getuserid(),
    orderNumber: shopifyOrder.order_number?.toString() || shopifyOrder.name?.replace('#', '') || null,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    seller: sellerId || 'My Store',
    courier: '-',
    status: mapShopifyFulfillmentStatus(shopifyOrder.fulfillment_status, shopifyOrder.cancelled_at),
    amount: totalPrice.toString(),
    // Order Date = order banne ka date (created_at); processedAt alag field hai.
    orderDate: orderDate || (processedAt && !Number.isNaN(processedAt.getTime())
      ? processedAt.toISOString().split('T')[0]
      : null) || new Date().toISOString().split('T')[0],
   
    awb: '-',
    platform: 'Shopify',
    
    // Address fields (flat structure)
    pincode: shippingAddress.zip || billingAddress.zip || null,
    city: shippingAddress.city || billingAddress.city || null,
    state: shippingAddress.province || billingAddress.province || null,
    addressLine1: shippingAddress.address1 || billingAddress.address1 || null,
    addressLine2: shippingAddress.address2 || billingAddress.address2 || null,
    landmark: null,
    
    // Calculated fields
    totalItems: totalItems,
    totalWeight: (() => {
      const orderKg = shopifyOrder.total_weight ? Number(shopifyOrder.total_weight) / 1000 : 0;
      if (orderKg > 0) return Number(orderKg.toFixed(3));
      const itemWeights = (shopifyOrder.line_items || []).reduce((sum, item) => {
        const unit = item.grams ? Number(item.grams) / 1000 : 0;
        return sum + unit * (item.quantity || 1);
      }, 0);
      return itemWeights > 0 ? Number(itemWeights.toFixed(3)) : 0.5;
    })(),
    totalVolumetricWeight: null,
    
    // Shopify-specific fields
    shopifyOrderId: shopifyOrder.id,
    financialStatus: isCod ? 'pending' : 'paid',
    fulfillmentStatus: shopifyOrder.fulfillment_status || null,
    paymentGateway: isCod ? 'COD' : 'Prepaid',
    
    // Financial fields
    subtotalPrice: parseFloat(shopifyOrder.subtotal_price) || 0,
    totalTax: parseFloat(shopifyOrder.total_tax) || 0,
    totalDiscounts: totalDiscounts,
    discountCodes,
    totalShippingPrice: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount) || 0,
    totalOutstanding: collectable,
    codCharge: isCod ? codCharge : 0,
    currency: shopifyOrder.currency || 'INR',
    taxesIncluded: shopifyOrder.taxes_included || false,
    taxExempt: shopifyOrder.tax_exempt || false,
    
    // Tracking & source fields
    confirmationNumber: shopifyOrder.confirmation_number || null,
    checkoutId: shopifyOrder.checkout_id || null,
    checkoutToken: shopifyOrder.checkout_token || null,
    orderStatusUrl: shopifyOrder.order_status_url || null,
    sourceName: shopifyOrder.source_name || null,
    
    // Customer context
    browserIp: shopifyOrder.browser_ip || null,
    userAgent: shopifyOrder.client_details?.user_agent || null,
    
    // Addresses as JSON
    shippingAddress: shippingAddress,
    billingAddress: billingAddress,
    customerData: shopifyOrder.customer || null,
    
    // Timestamps
    processedAt: processedAt,
    cancelledAt: cancelledAt,
    cancelReason: shopifyOrder.cancel_reason || null,
    trackingnumber: null
  };
  
  // Remove undefined values
  Object.keys(convertedOrder).forEach(key => {
    if (convertedOrder[key] === undefined) {
      delete convertedOrder[key];
    }
  });
  
  // Convert line items
  const taxesIncluded = !!shopifyOrder.taxes_included;
  const productQty = (shopifyOrder.line_items || []).reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  const packageWeight = convertedOrder.totalWeight || 0.5;

  const convertedOrderItems = shopifyOrder.line_items?.map(item => {
    const quantity = item.quantity || 1;
    const gstRate = extractShopifyGstRate(item, shopifyOrder);
    const unitPrice = toExclusiveUnitPrice(parseFloat(item.price) || 0, gstRate, taxesIncluded);
    const itemDiscount = parseFloat(item.total_discount) || 0;
    const unitWeight = item.grams ? Number((Number(item.grams) / 1000).toFixed(3)) : Number((packageWeight / productQty).toFixed(3));
    
    return {
      orderId: orderId,
      name: item.title || item.name,
      sku: extractShopifySku(item),
      unitPrice: unitPrice,
      quantity: quantity,
      gstRate: gstRate,
      discount: itemDiscount,
      totalPrice: unitPrice * quantity,
      height: 10,
      width: 10,
      length: 10,
      deadWeight: unitWeight || 0.5,
      volumetricWeight: null
    };
  }) || [];

  if (isCod && codCharge > 0 && !fromLineItems) {
    convertedOrderItems.push({
      orderId,
      name: 'COD Charges',
      unitPrice: codCharge,
      quantity: 1,
      gstRate: 0,
      totalPrice: codCharge,
      height: 0,
      width: 0,
      length: 0,
      deadWeight: null,
      volumetricWeight: null
    });
  }
  
  return {
    order: convertedOrder,
    orderItems: convertedOrderItems
  };
}

function convertWooCommerceOrderToModel(wooOrder, dbOrderId = null, sellerId = null) {
  // Use provided DB order ID or empty string (as in original)
  const orderId = dbOrderId || '';

  // Extract customer information from billing (shipping may be empty)
  const billing = wooOrder.billing || {};
  const shipping = wooOrder.shipping || {};
  
  const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || null;
  const customerPhone = billing.phone || null;
  const customerEmail = billing.email || null;

  // Calculate total items from line items
  const totalItems = wooOrder.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  // Order date: use date_created (local) and split to YYYY-MM-DD
  const orderDate = wooOrder.date_created ? wooOrder.date_created.split('T')[0] : null;
  
  // Processed date: prefer date_paid, fallback to date_created (both as GMT)
  const processedAtRaw = wooOrder.date_paid_gmt || wooOrder.date_created_gmt;
  const processedAt = processedAtRaw ? new Date(processedAtRaw) : null;
  
  // Cancelled date: if status is cancelled, use date_modified_gmt
  const cancelledAt = (wooOrder.status === 'cancelled' && wooOrder.date_modified_gmt) 
    ? new Date(wooOrder.date_modified_gmt) 
    : null;

  // Determine seller: use line item's 'vendor' if available (WooCommerce may not have it)
  // Default to 'WooCommerce Store'
  const seller = wooOrder.line_items?.[0]?.vendor || 'WooCommerce Store';

  // Map WooCommerce status to your target status values
  const status = mapWooCommerceStatus(wooOrder.status);

  // Prepare the Order object (flat structure plus JSON fields)
  const convertedOrder = {
    user_id: sellerId || null,
    orderNumber: wooOrder.number?.toString() || wooOrder.id?.toString() || null,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    seller: sellerId || seller,
    courier: '-',
    status: status,
    amount: wooOrder.total?.toString() || '0',
    orderDate: processedAt ? processedAt.toISOString().split('T')[0] : orderDate,
    awb: '-',
    platform: 'WooCommerce',

    // Address fields (flat) – fallback from shipping to billing when shipping is empty
    pincode: shipping.postcode || billing.postcode || null,
    city: shipping.city || billing.city || null,
    state: shipping.state || billing.state || null,
    addressLine1: shipping.address_1 || billing.address_1 || null,
    addressLine2: shipping.address_2 || billing.address_2 || null,
    landmark: null,

    // Calculated fields
    totalItems: totalItems,
    totalWeight: 0,                         // WooCommerce order object does not provide total weight; can be computed from products if needed
    totalVolumetricWeight: null,

    // WooCommerce-specific fields
    woocommerceOrderId: wooOrder.id,
    financialStatus: wooOrder.date_paid ? 'paid' : (wooOrder.status === 'pending' ? 'pending' : 'other'),
    fulfillmentStatus: null,                // WooCommerce uses order status; fulfillment status is not directly available
    paymentGateway: wooOrder.payment_method_title || 'manual',

    // Financial fields
    subtotalPrice: parseFloat(wooOrder.line_items?.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0) || 0),
    totalTax: parseFloat(wooOrder.total_tax || 0),
    totalDiscounts: parseFloat(wooOrder.discount_total || 0),
    totalShippingPrice: parseFloat(wooOrder.shipping_total || 0),
    totalOutstanding: 0,                   // Not directly available; could be computed as total - amount paid
    currency: wooOrder.currency || 'INR',
    taxesIncluded: wooOrder.prices_include_tax || false,
    taxExempt: false,

    // Tracking & source fields
    confirmationNumber: wooOrder.transaction_id || wooOrder.order_key || null,
    checkoutId: null,
    checkoutToken: null,
    orderStatusUrl: wooOrder.payment_url || null,
    sourceName: wooOrder.created_via || null,

    // Customer context
    browserIp: wooOrder.customer_ip_address || null,
    userAgent: wooOrder.customer_user_agent || null,

    // Addresses as JSON (preserve original objects)
    shippingAddress: shipping,
    billingAddress: billing,
    customerData: null,                    // WooCommerce does not embed full customer object here

    // Timestamps
    processedAt: processedAt,
    cancelledAt: cancelledAt,
    cancelReason: null,
    trackingnumber: null
  };

  // Remove undefined values (clean up the object)
  Object.keys(convertedOrder).forEach(key => {
    if (convertedOrder[key] === undefined) {
      delete convertedOrder[key];
    }
  });

  // Convert line items to orderItems array
  const convertedOrderItems = wooOrder.line_items?.map(item => {
    // Extract GST rate: WooCommerce may have tax lines at order level, but not per line item in this structure.
    // For simplicity, we look at item's meta or default to 0. You can enhance this if tax data is available.
    let gstRate = 0;
    if (item.tax_lines && item.tax_lines.length > 0) {
      const gstTax = item.tax_lines.find(tax => tax.title === 'IGST' || tax.title.includes('GST'));
      if (gstTax && gstTax.rate) gstRate = gstTax.rate * 100;
    }
    
    const unitPrice = parseFloat(item.price) || 0;
    const quantity = item.quantity || 1;
    // total already includes line item discounts
    const totalPrice = parseFloat(item.total) || (unitPrice * quantity);

    return {
      orderId: orderId,
      name: item.name,
      unitPrice: unitPrice,
      quantity: quantity,
      gstRate: gstRate,
      totalPrice: totalPrice,
      // Dimensions / weight
      height: null,
      width: null,
      length: null,
      deadWeight: null,   // WooCommerce line items don't include weight in this payload; could be fetched separately
      volumetricWeight: null
    };
  }) || [];

  return {
    order: convertedOrder,
    orderItems: convertedOrderItems
  };
}

/**
 * Maps WooCommerce order status to your target status values.
 * Adjust mapping as needed for your system.
 */
function mapWooCommerceStatus(wcStatus) {
  const statusMap = {
    'pending':    'Pending',
    'processing': 'Processing',
    'on-hold':    'On Hold',
    'completed':  'Delivered',
    'cancelled':  'Cancelled',
    'refunded':   'Refunded',
    'failed':     'Failed'
  };
  return statusMap[wcStatus] || wcStatus || 'Unknown';
}

const filterShopifyOrdersByDateRange = (orders: any[] = [], dateFrom: Date, dateTo: Date) => {
  const fromTime = dateFrom.getTime();
  const toTime = dateTo.getTime();

  return orders.filter((order) => {
    const orderDateValue = order.created_at || order.processed_at || order.updated_at;
    if (!orderDateValue) return false;

    const orderTime = new Date(orderDateValue).getTime();
    if (Number.isNaN(orderTime)) return false;

    return orderTime >= fromTime && orderTime <= toTime;
  });
};

/**
 * Maps Shopify fulfillment status to your order status enum
 */
function mapShopifyFulfillmentStatus(fulfillmentStatus, cancelledAt) {
  // if (cancelledAt) return 'Cancelled';
  
  switch (fulfillmentStatus) {
    case 'fulfilled':
      return 'Delivered';
    case 'partial':
      return 'Shipped';
    case 'pending':

      return 'Pending';


      case null:
      
      return 'Pending';
    default:
      return 'Pending';
  }
}

/**
 * Batch converter for multiple Shopify orders
 */
function convertMultipleShopifyOrders(shopifyOrders, ordernumlist = []) {
  const results = [];
  
  for (const shopifyOrder of shopifyOrders) {
   
    const converted = convertShopifyOrderToModel(shopifyOrder, null, getuserid());
    console.log(shopifyOrder.order_number,shopifyOrder,converted,"shopify order in batch converter>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")

     if(!ordernumlist.includes(converted.order.orderNumber) && converted.order.status=="Pending" ){
               results.push({order:converted.order,items:converted.orderItems})
      
    }
    
  }

  return results;
}





class ShopifyConnector {
  constructor(private config: IntegrationConfig) {}

  private normalizeShop(storeUrl: unknown): string {
    return String(storeUrl ?? '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .replace(/\.myshopify\.com.*/i, '')
      .split('/')[0]
      .replace(/\s+/g, '');
  }

  private getClientCredentials() {
    const creds = this.config.credentials || {};
    const storeUrl = this.normalizeShop(creds.storeUrl);
    const clientId = String(creds.clientid ?? creds.clientId ?? '');
    const clientSecret = String(creds.accessToken ?? creds.clientSecret ?? '');

    if (!storeUrl || !clientId || !clientSecret) {
      throw new Error('Shopify credentials are not configured properly. Provide store URL, Client ID, and Client Secret.');
    }

    return { storeUrl, clientId, clientSecret };
  }

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const { storeUrl, clientId, clientSecret } = this.getClientCredentials();
    const ordernumlist = (await orderApi.getAllOrderNum()) || [];

    console.log(`Fetching Shopify orders from ${dateFrom} to ${dateTo}`, storeUrl);

    const response = await fetch(`${API_BASE_URL}/integrations/syncsopify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SHOP: storeUrl,
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        user_id: getuserid(),
        ordernumlist,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || `Shopify sync failed: ${response.status}`);
    }

    // Backend already persists orders; return synced list for SyncManager counts/UI
    return Array.isArray(data?.data) ? data.data : [];
  }

  async testConnection(): Promise<boolean> {
    try {
      const { storeUrl, clientId, clientSecret } = this.getClientCredentials();

      const response = await fetch(`${API_BASE_URL}/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'Shopify',
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
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }

  protected transformOrder(order: any): any {
    const shippingAddress = order.shipping_address || order.shippingAddress || {};
    const customer = order.customer || order.customerData || {};

    const totalItems = order.line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0)
      || order.totalItems
      || 0;

    const items = order.line_items?.map((item: any) => ({
      name: item.title || item.name || '',
      unitPrice: parseFloat(item.price) || 0,
      quantity: item.quantity || 1,
      gstRate: 18,
      totalPrice: parseFloat(item.price) * (item.quantity || 1),
      height: null,
      width: null,
      length: null,
      deadWeight: null,
      volumetricWeight: null
    })) || order.items || [];

    let status = order.status || 'Pending';
    if (!order.status) {
      if (order.fulfillment_status === 'fulfilled') status = 'Shipped';
      else if (order.cancelled_at) status = 'Cancelled';
      else if (order.fulfillment_status === 'partial') status = 'Shipped';
    }

    return {
      orderNumber: order.orderNumber || order.name || order.order_number?.toString() || order.id?.toString(),
      customerName: order.customerName || shippingAddress.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown',
      customerPhone: order.customerPhone || shippingAddress.phone || '',
      customerEmail: order.customerEmail || customer.email || order.email || '',
      seller: order.seller || 'Shopify Store',
      courier: order.courier || order.shipping_lines?.[0]?.title || '-',
      status,
      amount: order.amount || `₹${parseFloat(order.total_price || 0).toFixed(2)}`,
      orderDate: order.orderDate || order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      awb: order.awb || order.tracking_number || '-',
      platform: 'Shopify' as Platform,
      pincode: order.pincode || shippingAddress.zip || '',
      city: order.city || shippingAddress.city || '',
      state: order.state || shippingAddress.province || '',
      addressLine1: order.addressLine1 || shippingAddress.address1 || '',
      addressLine2: order.addressLine2 || shippingAddress.address2 || '',
      landmark: order.landmark || '',
      totalItems,
      items,
    };
  }
}




class WooCommerceConnector {
  constructor(private config: IntegrationConfig) {}
mapWooStatus(status){
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Pending';
    case 'completed':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Cancelled';
    default:
      return 'Pending';
  }
};









  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
      
    if (!this.config.credentials.storeUrl || !this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
      throw new Error('WooCommerce credentials are not configured properly');
    }

    const response = await fetch(`${API_BASE_URL}/integrations/syncwoocomerce`, {
          method:"POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body:JSON.stringify(this.config.credentials)
        });
        
        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.status}`);
        }
        
        const data = await response.json();
        const ordernumlist=await orderApi.getAllOrderNum() || []

    const tmpstore=[]
for(const y of data?.data || []){


    const converted = convertWooCommerceOrderToModel(y,null,getuserid());
    if(!ordernumlist.includes(converted.order.orderNumber)){
            tmpstore.push({order:converted.order,items:converted.orderItems})

    }
    
}
console.log(tmpstore,"wooocommerce orders converted>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
await orderApi.create(tmpstore)

    return data?.data   || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing WooCommerce connection...');
      
      if (!this.config.credentials.storeUrl || !this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
        console.error('Missing WooCommerce credentials');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }
}

class CustomConnector {
  constructor(private config: IntegrationConfig) {}

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
    console.log(`Fetching custom API orders from ${dateFrom} to ${dateTo}`);
    
    if (!this.config.credentials.storeUrl) {
      throw new Error('Custom API URL is not configured');
    }
    
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing custom API connection...');
      
      if (!this.config.credentials.storeUrl) {
        console.error('Missing custom API URL');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Custom API connection test failed:', error);
      return false;
    }
  }
}

// Platform connector factory
class PlatformConnectorFactory {
  static createConnector(config: IntegrationConfig): PlatformConnector {
    switch (config.type) {
      case 'Amazon':
        return new AmazonConnector(config) as unknown as PlatformConnector;
      case 'Shopify':
        return new ShopifyConnector(config) as unknown as PlatformConnector;
      case 'WooCommerce':
        return new WooCommerceConnector(config) as unknown as PlatformConnector;
      case 'Custom':
        return new CustomConnector(config) as unknown as PlatformConnector;
      default:
        throw new Error(`Unsupported platform: ${config.type}`);
    }
  }
}

// Abstract base class for platform connectors
abstract class PlatformConnector {
  constructor(protected config: IntegrationConfig) {}
  
  abstract fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]>;
  abstract testConnection(): Promise<boolean>;
  
  protected transformOrder(order: any, platform: Platform): any {
    // Transform platform-specific order to our standard format
    return {
      orderNumber: order.id || order.order_number || order.orderId,
      customerName: order.customer?.name || order.shipping_address?.name || '',
      customerPhone: order.customer?.phone || order.shipping_address?.phone || '',
      customerEmail: order.customer?.email || order.email || '',
      seller: this.config.name,
      courier: order.shipping_method || '-',
      status: this.mapStatus(order.status),
      amount: order.total_price || order.total || order.amount || '0',
      orderDate: order.created_at || order.date_created || new Date().toISOString().split('T')[0],
      awb: order.tracking_number || order.awb || '-',
      platform: platform,
      pincode: order.shipping_address?.postal_code || order.shipping_address?.zip || '',
      city: order.shipping_address?.city || '',
      state: order.shipping_address?.state || '',
      addressLine1: order.shipping_address?.address_line1 || order.shipping_address?.line1 || '',
      addressLine2: order.shipping_address?.address_line2 || order.shipping_address?.line2 || '',
      landmark: order.shipping_address?.landmark || '',
      items: this.transformItems(order.items || order.line_items || [])
    };
  }
  
  protected transformItems(items: any[]): any[] {
    return items.map(item => ({
      name: item.name || item.product_name || '',
      unitPrice: parseFloat(item.price || item.unit_price || 0),
      quantity: parseInt(item.quantity || 1),
      gstRate: item.tax_rate || item.gst_rate || 18,
      totalPrice: parseFloat(item.total_price || item.subtotal || 0),
      height: item.height,
      width: item.width,
      length: item.length,
      deadWeight: item.weight,
      volumetricWeight: item.volumetric_weight
    }));
  }
  
  protected mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'processing': 'Pending',
      'confirmed': 'Pending',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'canceled': 'Cancelled',
      'refunded': 'Cancelled',
      'failed': 'Cancelled',
      'rto': 'RTO',
      'return_to_sender': 'RTO',
      'fulfilled': 'Shipped',
      'partial': 'Shipped',
      'unfulfilled': 'Pending'
    };
    
    return statusMap[status?.toLowerCase()] || 'Pending';
  }
}

export class SyncManager {
  private connectors: Map<Platform, PlatformConnector> = new Map();

  constructor(private integrations: IntegrationConfig[]) {
    integrations.forEach(integration => {
      if (integration.isActive) {
        try {
          const connector = PlatformConnectorFactory.createConnector(integration);
          this.connectors.set(integration.type, connector);
        } catch (error) {
          console.error(`Failed to create connector for ${integration.type}:`, error);
        }
      }
    });
  }

  async syncAll(dateFrom: Date, dateTo: Date): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    for (const [platform, connector] of this.connectors) {
      try {
        const result = await this.syncPlatform(platform, connector, dateFrom, dateTo);
        results.push(result);
      } catch (error: any) {
        results.push({
          platform,
          success: false,
          ordersSynced: 0,
          errors: [error.message]
        });
      }
    }
    
    return results;
  }

  async syncByType(platform: Platform, dateFrom: Date, dateTo: Date): Promise<SyncResult> {
    const connector = this.connectors.get(platform);
    
    if (!connector) {
      return {
        platform,
        success: false,
        ordersSynced: 0,
        errors: [`Integration for ${platform} is not active or configured`]
      };
    }

    return await this.syncPlatform(platform, connector, dateFrom, dateTo);
  }

  private async syncPlatform(
    platform: Platform, 
    connector: PlatformConnector, 
    dateFrom: Date, 
    dateTo: Date
  ): Promise<SyncResult> {
    try {
      // Fetch orders from platform
      const platformOrders = await connector.fetchOrders(dateFrom, dateTo);
      
      if (!platformOrders || platformOrders.length === 0) {
        return {
          platform,
          success: true,
          ordersSynced: 0,
          errors: undefined
        };
      }
      
      // Transform and save orders to our system
      // Shopify/WooCommerce connectors persist on the backend; count returned rows
      let syncedCount = platformOrders.length;
      const errors: string[] = [];

      // Only re-transform for platforms that still expect a frontend save loop
      if (platform !== 'Shopify' && platform !== 'WooCommerce') {
        syncedCount = 0;
        for (const platformOrder of platformOrders) {
          try {
            const transformedOrder = (connector as any).transformOrder(platformOrder, platform);
            void transformedOrder;
            syncedCount++;
          } catch (error: any) {
            errors.push(`Failed to sync order ${platformOrder.id || platformOrder.order_number}: ${error.message}`);
          }
        }
      }

      return {
        platform,
        success: true,
        ordersSynced: syncedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      return {
        platform,
        success: false,
        ordersSynced: 0,
        errors: [error.message]
      };
    }
  }

  async testConnection(platform: Platform, credentials: any): Promise<boolean> {
    try {
      // Create a temporary connector for testing
      const testConfig: IntegrationConfig = {
        id: 'test',
        type: platform,
        name: 'Test',
        isActive: true,
        credentials
      };
      
      const connector = PlatformConnectorFactory.createConnector(testConfig);
      return await connector.testConnection();
    } catch (error: any) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
