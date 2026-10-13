
import axios from 'axios';
import { getuserid, getuser, canViewAllOrders } from './getbasicdata';
import * as XLSX from 'xlsx';
import { API_BASE_URL, APP_NAME, SUPPORT_EMAIL, WEBSITE_URL } from './config';

const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const apiRequest = async (method, url, data = {}, params = {}) => {
  const token = localStorage.getItem("token");
  const query = new URLSearchParams(params).toString();
  const fullUrl = query ? `${API_URL}/${url}?${query}` : `${API_URL}/${url}`;
  const response = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: method !== "GET" ? JSON.stringify(data) : undefined,
  });
  return response.json();
};

export const orderApi = {
  getAll: async (filters = {}) => {
    if (!canViewAllOrders()) {
      filters.user_id = getuserid();
    }
    filters.paginate = filters.paginate ?? 'true';
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean).toString();
    const url = `/orders?${params}`;
    const response = await api.get(url);
    const payload = response.data;
    if (payload?.pagination) {
      return {
        orders: payload.data || [],
        pagination: payload.pagination,
      };
    }
    return { orders: Array.isArray(payload) ? payload : payload?.data || [], pagination: null };
  },

  getAllOrderNum: async (filters = {}) => {
    filters.user_id = getuserid();
    filters.paginate = 'false';
    const params = new URLSearchParams(filters || {}).toString();
    const response = await api.get(`/orders?${params}`);
    const list = response.data?.data || response.data || [];
    // Prefer Shopify/Woo order numbers for sync dedupe; fall back to referenceId
    return list.flatMap((item) =>
      [item.orderNumber, item.shopifyOrderId, item.woocommerceOrderId, item.referenceId]
        .filter((v) => v !== undefined && v !== null && v !== '')
        .map(String)
    );
  },

  // Get order by ID
  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getUserOrdersWithShipment: async (id) => {
    const response = await api.get(`/orders/getUserOrdersWithShipment/${getuserid()}`);
    return response?.data || [];
  },

  getCodRemittance: async (id) => {
    const response = await api.get(`/orders/getCodRemittance/${getuserid()}`);
    return response?.data || [];
  },

  // Create new order
  create: async (data) => {
    let payload = {
      data: data,
      user_id: getuserid()
    };
    const response = await api.post('/orders', payload);
    return response.data;
  },

  mancreate: async (data) => {
    let payload = {
      data: data,
      user_id: getuserid()
    };
    const response = await api.post('/auth/manualcreateOrder', payload);
    return response.data;
  },

  mergecreate: async (data) => {
    let payload = {
      data: data,
      user_id: getuserid()
    };
    const response = await api.post('/auth/mergecreateOrder', payload);
    return response.data;
  },

  // Update order
  update: async (id, data) => {
    const payload = {
      data,
      user_id: getuserid()
    };
    const response = await api.put(`/orders/${id}`, payload);
    return response.data;
  },

  clone: async (id, data = {}) => {
    const response = await api.post(`/orders/${id}/clone`, data);
    return response.data;
  },

  bulkshipmentcreate: async (data) => {
    let payload = {
      data: data,
      user_id: getuserid()
    };
    const response = await api.put(`/orders/bulkshipmentcreate`, payload);
    return response.data;
  },

  Shippmentcancel: async (referenceId,user_id) => {
    let payload = {
      referenceId,
      user_id: user_id 
    };
    const response = await api.put(`/orders/cancelshipment`, payload);
    return response.data;
  },

  // Delete order
  delete: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },

  bulkDelete: async (ids) => {
    const response = await api.post('/orders/bulk-delete', { ids });
    return response.data;
  },

  bulkCancel: async (ids, reason = 'Customer requested cancellation') => {
    const response = await api.post('/orders/bulk-cancel', { ids, reason });
    return response.data;
  },

  uploadWeightDisputes: async (rows) => {
    const response = await api.post('/orders/weight-dispute-upload', { rows });
    return response.data;
  },

  // Update order status
  updateStatus: async (id, status) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  // Exact server-side chip counts (same where-builder as the list query).
  getStatusCounts: async (filters = {}) => {
    if (!canViewAllOrders()) {
      filters.user_id = getuserid();
    }
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean).toString();
    const response = await api.get(`/orders/status-counts${params ? `?${params}` : ''}`);
    return response.data?.counts || response.data || {};
  },

  // Get order statistics
  getStats: async () => {
    const response = await api.get('/orders/stats');
    return response.data;
  },

  // Helper function to map status to shipment status format
  mapStatusToShipmentStatus: (status) => {
    const statusMap = {
      'Pending': 'pending',
      'Processing': 'processing',
      'Shipped': 'shipped',
      'In Transit': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Ready for Dispatch': 'ready_for_dispatch',
      'pickup cancelled': 'pickup_cancelled',
      'UNDELIVERED': 'undelivered',
      'Out for Pickup': 'out_for_pickup',
      'Pickup Scheduled': 'pickup_scheduled',
      'OUTSCAN TO CP': 'outscan_to_cp',
      'INSCANNED AT CP': 'inscanned_at_cp',
      'Delivered': 'delivered',
      'RTO': 'rto',
      'RTO In transit': 'rto_in_transit',
      'RTO Delivered': 'rto_delivered',
      'Cancelled': 'cancelled',
      'Disputed': 'disputed',
      'Approved': 'approved',
      'Rejected': 'rejected',
      'Draft Merged': 'draft_merged'
    };
    return statusMap[status] || status?.toLowerCase()?.replace(/ /g, '_') || '';
  },

  // Format date to DD/MM/YYYY
  formatDateToExcel: (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // Export orders to Excel in Order Report format with colorful LogixMitra branding
  export: async (orders) => {
    if (!orders || orders.length === 0) {
      alert('No orders to export');
      return;
    }

    // Helper function to parse amount from various formats
    const parseAmount = (amount) => {
      if (!amount) return 0;
      if (typeof amount === 'number') return amount;
      if (typeof amount === 'string') {
        // Remove ₹ symbol, commas, and any non-numeric characters except decimal point
        const cleaned = amount.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Helper function to find last space within character limit
    const findLastSpaceWithinLimit = (str, limit) => {
      let lastSpace = -1;
      for (let i = 0; i <= limit && i < str.length; i++) {
        if (str[i] === ' ') {
          lastSpace = i;
        }
      }
      return lastSpace;
    };

    // Helper function to intelligently split address with 60 char limit for line 1 (INCLUDING SPACES)
    const splitAddress = (address) => {
      if (!address) return { line1: '', line2: '' };
      
      let addressLine1 = '';
      let addressLine2 = '';
      let fullAddress = address.trim();
      
      // FIRST CHECK: If full address is 60 characters or less, put it all in line 1
      if (fullAddress.length <= 60) {
        return { line1: fullAddress, line2: '' };
      }
      
      // Define keywords that indicate a landmark or additional info
      const landmarkKeywords = [
        'near', 'opposite', 'behind', 'above', 'below', 'beside', 'next to',
        'landmark', 'nearby', 'adjacent', 'opp', 'opp.',
        'in front of', 'back side', 'side of', 'close to'
      ];
      
      // Define patterns to split (look for landmark indicators)
      let splitIndex = -1;
      
      for (const keyword of landmarkKeywords) {
        const lowerAddr = fullAddress.toLowerCase();
        const keywordIndex = lowerAddr.indexOf(` ${keyword} `);
        if (keywordIndex !== -1) {
          splitIndex = keywordIndex + 1; // +1 to include the space
          break;
        }
      }
      
      // Also check for common patterns like "near X", "opp X", etc.
      if (splitIndex === -1) {
        const patterns = [/ near /i, / opposite /i, / behind /i, / above /i, / below /i, / beside /i];
        for (const pattern of patterns) {
          const match = fullAddress.match(pattern);
          if (match) {
            splitIndex = match.index;
            break;
          }
        }
      }
      
      // If we found a landmark keyword, split the address
      if (splitIndex !== -1 && splitIndex < fullAddress.length - 5) {
        let tempLine1 = fullAddress.substring(0, splitIndex).trim();
        let remaining = fullAddress.substring(splitIndex).trim();
        
        // Capitalize the first letter of the remaining string
        if (remaining.length > 0) {
          remaining = remaining.charAt(0).toUpperCase() + remaining.slice(1);
        }
        
        // Check if line1 exceeds 60 characters (INCLUDING SPACES)
        if (tempLine1.length > 60) {
          // Find last space within 60 characters
          let lastSpace = findLastSpaceWithinLimit(tempLine1, 60);
          
          if (lastSpace !== -1 && lastSpace > 30) {
            addressLine1 = tempLine1.substring(0, lastSpace).trim();
            // Move the remaining part to line2
            const extraPart = tempLine1.substring(lastSpace).trim();
            if (extraPart) {
              remaining = extraPart + ' ' + remaining;
              remaining = remaining.trim();
            }
          } else {
            addressLine1 = tempLine1.substring(0, 57) + '...';
          }
        } else {
          addressLine1 = tempLine1;
        }
        
        addressLine2 = remaining;
      } 
      // Check for comma separation
      else if (fullAddress.includes(',')) {
        const parts = fullAddress.split(',');
        let tempLine1 = parts[0].trim();
        
        // Check if line1 exceeds 60 characters (INCLUDING SPACES)
        if (tempLine1.length > 60) {
          let lastSpace = findLastSpaceWithinLimit(tempLine1, 60);
          
          if (lastSpace !== -1 && lastSpace > 30) {
            addressLine1 = tempLine1.substring(0, lastSpace).trim();
            const extraPart = tempLine1.substring(lastSpace).trim();
            addressLine2 = extraPart + ', ' + parts.slice(1).join(', ').trim();
          } else {
            addressLine1 = tempLine1.substring(0, 57) + '...';
            addressLine2 = parts.slice(1).join(', ').trim();
          }
        } else {
          addressLine1 = tempLine1;
          addressLine2 = parts.slice(1).join(', ').trim();
        }
      }
      // Check for "|" separation
      else if (fullAddress.includes('|')) {
        const parts = fullAddress.split('|');
        let tempLine1 = parts[0].trim();
        
        if (tempLine1.length > 60) {
          let lastSpace = findLastSpaceWithinLimit(tempLine1, 60);
          
          if (lastSpace !== -1 && lastSpace > 30) {
            addressLine1 = tempLine1.substring(0, lastSpace).trim();
            const extraPart = tempLine1.substring(lastSpace).trim();
            addressLine2 = extraPart + '|' + parts.slice(1).join('|').trim();
          } else {
            addressLine1 = tempLine1.substring(0, 57) + '...';
            addressLine2 = parts.slice(1).join('|').trim();
          }
        } else {
          addressLine1 = tempLine1;
          addressLine2 = parts.slice(1).join('|').trim();
        }
      }
      // If address is too long (> 60 chars), try to split at a natural breaking point
      else if (fullAddress.length > 60) {
        // Try to find a space within 60 characters
        let splitPoint = -1;
        for (let i = 55; i <= 60; i++) {
          if (i < fullAddress.length && fullAddress[i] === ' ') {
            splitPoint = i;
            break;
          }
        }
        
        if (splitPoint !== -1 && splitPoint > 30) {
          addressLine1 = fullAddress.substring(0, splitPoint).trim();
          addressLine2 = fullAddress.substring(splitPoint).trim();
        } else {
          // Force split at 60 characters
          addressLine1 = fullAddress.substring(0, 57) + '...';
          addressLine2 = fullAddress.substring(60).trim();
        }
      }
      // If no split needed, put everything in line 1 (but limit to 60 chars)
      else {
        addressLine1 = fullAddress;
      }
      
      // FINAL CHECK: Ensure address line 1 is not more than 60 characters (INCLUDING SPACES)
      if (addressLine1.length > 60) {
        let lastSpace = findLastSpaceWithinLimit(addressLine1, 60);
        
        if (lastSpace !== -1 && lastSpace > 30) {
          const extraPart = addressLine1.substring(lastSpace).trim();
          addressLine1 = addressLine1.substring(0, lastSpace).trim();
          if (extraPart) {
            addressLine2 = extraPart + ' ' + (addressLine2 || '');
            addressLine2 = addressLine2.trim();
          }
        } else {
          addressLine1 = addressLine1.substring(0, 57) + '...';
        }
      }
      
      // Clean up - remove multiple spaces
      addressLine1 = addressLine1.replace(/\s+/g, ' ');
      if (addressLine2) {
        addressLine2 = addressLine2.replace(/\s+/g, ' ');
      }
      
      return { line1: addressLine1, line2: addressLine2 };
    };

    // Fetch warehouses and sellers data for lookup
    let warehouses = {};
    let sellers = {};
    
    try {
      // Fetch warehouses from getAllWarehouses API
      const warehouseResponse = await apiRequest("GET", "auth/getAllWarehouses", {}, {});
      if (warehouseResponse?.success && warehouseResponse?.data) {
        warehouseResponse.data.forEach(warehouse => {
          warehouses[warehouse.id] = warehouse;
          // Also store by user_id for fallback
          if (warehouse.user_id) {
            warehouses[`user_${warehouse.user_id}`] = warehouse;
          }
        });
      }
      
      // Fetch sellers from sellers API
      const sellerResponse = await api.get('/sellers');
      if (sellerResponse?.data?.success && sellerResponse?.data?.data) {
        sellerResponse.data.data.forEach(seller => {
          sellers[seller.id] = seller;
        });
      }
    } catch (error) {
      console.error("Error fetching warehouse/seller data:", error);
    }

    // Map orders to match the Excel format
    const exportData = orders.map((order, index) => {
      // Get warehouse details - try multiple strategies
      let warehouse = {};
      const warehouseId = order.warehouse;
      
      // Strategy 1: Direct match by warehouse ID
      if (warehouseId && warehouses[warehouseId]) {
        warehouse = warehouses[warehouseId];
      }
      // Strategy 2: Match by user_id (seller ID)
      else {
        const sellerIdForWarehouse = order.seller || order.user_id;
        const warehouseBySeller = Object.values(warehouses).find(w => w.user_id == sellerIdForWarehouse);
        if (warehouseBySeller) {
          warehouse = warehouseBySeller;
        }
      }
      
      // Build complete warehouse address
      const warehouseAddress = [
        warehouse.address,
        warehouse.city,
        warehouse.state,
        warehouse.pincode
      ].filter(Boolean).join(', ');
      
      // Get seller details
      const sellerId = order.seller || order.user_id;
      const seller = sellers[sellerId] || {};
      
      // Seller company name - use company field first, then name
      const sellerCompany = seller.company || seller.name || order.sellerName || order.seller || '';
      const sellerCode = seller.id || order.sellerCode || order.user_id || '';
      
      // Calculate total items quantity
      const totalQuantity = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      
      // Get product info and SKUs
      const productInfo = order.items?.map((item) => item.name || '').join(', ') || '';
      const productSKU = order.items?.map((item) => item.sku || '').join(', ') || '';
      const productQuantity = order.items?.map((item) => item.quantity || 1).join(', ') || '';
      
      // Calculate order invoice amount - properly parse from multiple possible fields
      let invoiceAmount = 0;
      
      // Try to get amount from various fields
      const amountFields = ['totalOutstanding', 'amount', 'orderAmount', 'total'];
      
      for (const field of amountFields) {
        if (order[field] && order[field] !== '0' && order[field] !== 0) {
          const parsed = parseAmount(order[field]);
          if (parsed > 0) {
            invoiceAmount = parsed;
            break;
          }
        }
      }
      
      // If still 0, try to calculate from items
      if (invoiceAmount === 0 && order.items && order.items.length > 0) {
        invoiceAmount = order.items.reduce((sum, item) => {
          const price = parseAmount(item.price) || 0;
          const quantity = item.quantity || 1;
          return sum + (price * quantity);
        }, 0);
      }

      // Determine payment mode
      const paymentMode = order.financialStatus === 'paid' ? 'Prepaid' : 
                          (order.financialStatus === 'pending' ? 'COD' : 
                          (order.paymentMethod === 'COD' ? 'COD' : 
                          (order.paymentMethod === 'Prepaid' ? 'Prepaid' : 'COD')));
      
      // Calculate billing weight
      const billingWeight = order.totalWeight || order.items?.reduce((sum, item) => {
        const deadWeight = parseFloat(item.deadWeight) || 0;
        const volumetricWeight = item.volumetricWeight || 
          (item.height && item.width && item.length ? (parseFloat(item.height) * parseFloat(item.width) * parseFloat(item.length)) / 5000 : 0);
        const chargeableWeight = Math.max(deadWeight, volumetricWeight);
        return sum + (chargeableWeight * (item.quantity || 1));
      }, 0) || 0;

      // Get dimensions from items
      let dimensions = { length: 0, width: 0, height: 0 };
      if (order.items && order.items.length > 0) {
        dimensions = {
          length: order.items.reduce((max, item) => Math.max(max, parseFloat(item.length) || 0), 0),
          width: order.items.reduce((max, item) => Math.max(max, parseFloat(item.width) || 0), 0),
          height: order.items.reduce((max, item) => Math.max(max, parseFloat(item.height) || 0), 0)
        };
      }
      
      // If no dimensions found, use defaults
      if (dimensions.length === 0) dimensions.length = 10;
      if (dimensions.width === 0) dimensions.width = 10;
      if (dimensions.height === 0) dimensions.height = 10;

      // Determine collectable amount (for COD orders)
      const collectableAmount = paymentMode === 'COD' ? invoiceAmount : 0;

      // Get address parts
      let addressLine1 = '';
      let addressLine2 = '';

      // Check for various possible address field names
      const addrLine1 = order.addressLine1 || order.address1 || order.address?.address1 || order.shipping_address?.address1 || '';
      const addrLine2 = order.addressLine2 || order.address2 || order.address?.address2 || order.shipping_address?.address2 || '';
      const landmark = order.landmark || order.address?.landmark || order.shipping_address?.landmark || '';
      const area = order.area || order.locality || order.address?.area || '';
      const street = order.street || order.address?.street || '';

      // If we have explicit addressLine2 or landmark
      if (addrLine2 || landmark || area || street) {
        let tempLine1 = addrLine1;
        
        // Check if line1 exceeds 60 characters (INCLUDING SPACES)
        if (tempLine1.length > 60) {
          let lastSpace = findLastSpaceWithinLimit(tempLine1, 60);
          
          if (lastSpace !== -1 && lastSpace > 30) {
            addressLine1 = tempLine1.substring(0, lastSpace).trim();
            const extraPart = tempLine1.substring(lastSpace).trim();
            const addressLine2Parts = [];
            if (extraPart) addressLine2Parts.push(extraPart);
            if (addrLine2) addressLine2Parts.push(addrLine2);
            if (landmark) addressLine2Parts.push(`Landmark: ${landmark}`);
            if (area) addressLine2Parts.push(`Area: ${area}`);
            if (street) addressLine2Parts.push(street);
            addressLine2 = addressLine2Parts.join(', ');
          } else {
            addressLine1 = tempLine1.substring(0, 57) + '...';
            const addressLine2Parts = [];
            if (addrLine2) addressLine2Parts.push(addrLine2);
            if (landmark) addressLine2Parts.push(`Landmark: ${landmark}`);
            if (area) addressLine2Parts.push(`Area: ${area}`);
            if (street) addressLine2Parts.push(street);
            addressLine2 = addressLine2Parts.join(', ');
          }
        } else {
          addressLine1 = tempLine1;
          const addressLine2Parts = [];
          if (addrLine2) addressLine2Parts.push(addrLine2);
          if (landmark) addressLine2Parts.push(`Landmark: ${landmark}`);
          if (area) addressLine2Parts.push(`Area: ${area}`);
          if (street) addressLine2Parts.push(street);
          addressLine2 = addressLine2Parts.join(', ');
        }
      } 
      // If only addressLine1 exists, try to intelligently split it
      else if (addrLine1) {
        const splitResult = splitAddress(addrLine1);
        addressLine1 = splitResult.line1;
        addressLine2 = splitResult.line2;
      }
      // If addressLine1 is empty but we have address field
      else if (order.address) {
        const splitResult = splitAddress(order.address);
        addressLine1 = splitResult.line1;
        addressLine2 = splitResult.line2;
      }
      // If still no address
      else if (order.shipping_address?.address) {
        const splitResult = splitAddress(order.shipping_address.address);
        addressLine1 = splitResult.line1;
        addressLine2 = splitResult.line2;
      }
      
      // FINAL CHECK: Ensure address line 1 is not more than 60 characters (INCLUDING SPACES)
      if (addressLine1.length > 60) {
        let lastSpace = findLastSpaceWithinLimit(addressLine1, 60);
        
        if (lastSpace !== -1 && lastSpace > 30) {
          const extraPart = addressLine1.substring(lastSpace).trim();
          addressLine1 = addressLine1.substring(0, lastSpace).trim();
          if (extraPart) {
            addressLine2 = extraPart + ' ' + (addressLine2 || '');
            addressLine2 = addressLine2.trim();
          }
        } else {
          addressLine1 = addressLine1.substring(0, 57) + '...';
        }
      }
      
      // If still empty, set default
      if (!addressLine1 && !addressLine2) {
        addressLine1 = 'Address not provided';
      }

      return {
        "Sr No.": index + 1,
        "referenceId": order.referenceId || '',
        "Seller Code": sellerCode,
        "Seller Name": sellerCompany,
        "referenceId": order.referenceId || '',
        "Order Booked Date": orderApi.formatDateToExcel(order.orderDate || order.createdAt),
        "Pickup Date": orderApi.formatDateToExcel(order.processedAt || order.orderDate),
        "Parent Courier": order.courier || '',
        "Courier": order.courier || '',
        "Order Type": "Forward",
        "AWB Number": order.awb || '',
        "Shipment Status": orderApi.mapStatusToShipmentStatus(order.status),
        "RTO AWB Number": order.rtoAwb || 'None',
        "Payment Mode": paymentMode,
        "Collectable Amount": collectableAmount > 0 ? collectableAmount.toFixed(2) : '',
        "Billing Weight (Kg)": billingWeight.toFixed(2),
        "Dimension(L * B * H)(CM)": `${dimensions.length.toFixed(2)} x ${dimensions.width.toFixed(2)} x ${dimensions.height.toFixed(2)}`,
        "Customer Name": order.customerName || '',
        "Phone Number": order.customerPhone || '',
        "Address Line 1": addressLine1,
        "Address Line 2": addressLine2,
        "City": order.city || '',
        "State": order.state || '',
        "Pincode": order.pincode || '',
        "Product Info": productInfo,
        "Product Quantity": productQuantity,
        "Product SKU": productSKU,
        "Order Invoice Amount": invoiceAmount.toFixed(2),
        "Warehouse Name": warehouse.name || '',
        "Warehouse Address": warehouseAddress,
        "Warehouse City": warehouse.city || '',
        "Warehouse State": warehouse.state || '',
        "Warehouse Pincode": warehouse.pincode || '',
        "Status": order.status || '',
        "Last Updated": orderApi.formatDateToExcel(order.updatedAt)
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Define column widths
    const colWidths = {
      "Sr No.": 8,
      "Order ID": 20,
      "Seller Code": 15,
      "Seller Name": 25,
      "Order Number": 20,
      "Order Booked Date": 18,
      "Pickup Date": 15,
      "Parent Courier": 18,
      "Courier": 15,
      "Order Type": 12,
      "AWB Number": 20,
      "Shipment Status": 18,
      "RTO AWB Number": 18,
      "Payment Mode": 15,
      "Collectable Amount": 18,
      "Billing Weight (Kg)": 18,
      "Dimension(L * B * H)(CM)": 24,
      "Customer Name": 25,
      "Phone Number": 15,
      "Address Line 1": 45,
      "Address Line 2": 35,
      "City": 20,
      "State": 20,
      "Pincode": 12,
      "Product Info": 50,
      "Product Quantity": 15,
      "Product SKU": 25,
      "Order Invoice Amount": 20,
      "Warehouse Name": 20,
      "Warehouse Address": 40,
      "Warehouse City": 20,
      "Warehouse State": 20,
      "Warehouse Pincode": 18,
      "Status": 15,
      "Last Updated": 18
    };
    
    ws['!cols'] = Object.values(colWidths).map(w => ({ wch: w }));
    
    // Colorful header styling
    const headerColors = {
      "Sr No.": "4F46E5",
      "Order ID": "3B82F6",
      "Seller Code": "8B5CF6",
      "Seller Name": "8B5CF6",
      "Order Number": "3B82F6",
      "Order Booked Date": "10B981",
      "Pickup Date": "10B981",
      "Parent Courier": "EF4444",
      "Courier": "EF4444",
      "Order Type": "6366F1",
      "AWB Number": "8B5CF6",
      "Shipment Status": "06B6D4",
      "RTO AWB Number": "EC4899",
      "Payment Mode": "F97316",
      "Collectable Amount": "10B981",
      "Billing Weight (Kg)": "6366F1",
      "Dimension(L * B * H)(CM)": "8B5CF6",
      "Customer Name": "3B82F6",
      "Phone Number": "3B82F6",
      "Address Line 1": "8B5CF6",
      "Address Line 2": "8B5CF6",
      "City": "10B981",
      "State": "10B981",
      "Pincode": "F59E0B",
      "Product Info": "EC4899",
      "Product Quantity": "EC4899",
      "Product SKU": "EC4899",
      "Order Invoice Amount": "10B981",
      "Warehouse Name": "F97316",
      "Warehouse Address": "F97316",
      "Warehouse City": "F97316",
      "Warehouse State": "F97316",
      "Warehouse Pincode": "F97316",
      "Status": "06B6D4",
      "Last Updated": "6B7280"
    };
    
    // Style the header row
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:AO1');
    const headersList = Object.keys(exportData[0] || {});
    
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[address]) continue;
      const headerText = headersList[C] || '';
      const bgColor = headerColors[headerText] || "1E3A8A";
      ws[address].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: bgColor }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "FFFFFF" } },
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
          left: { style: "thin", color: { rgb: "FFFFFF" } },
          right: { style: "thin", color: { rgb: "FFFFFF" } }
        }
      };
    }
    
    // Color code rows based on status
    const getStatusBgColor = (status) => {
      switch(status) {
        case 'Delivered': return "D1FAE5";
        case 'RTO': return "FEE2E2";
        case 'Pending': return "FEF3C7";
        case 'Shipped': return "DBEAFE";
        case 'In Transit': return "E0E7FF";
        case 'Cancelled': return "F3F4F6";
        default: return "FFFFFF";
      }
    };
    
    // Apply row colors based on status
    for (let R = 1; R <= exportData.length; ++R) {
      const statusIndex = headersList.indexOf('Status');
      if (statusIndex !== -1) {
        const statusCell = XLSX.utils.encode_cell({ r: R, c: statusIndex });
        if (ws[statusCell]) {
          const statusValue = ws[statusCell].v;
          const bgColor = getStatusBgColor(statusValue);
          for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cellAddress]) {
              if (!ws[cellAddress].s) ws[cellAddress].s = {};
              ws[cellAddress].s.fill = { fgColor: { rgb: bgColor }, patternType: "solid" };
              ws[cellAddress].s.border = {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
              };
            }
          }
        }
      }
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // ===== SHEET 1: DASHBOARD =====
    const dashboardData = [
      ["", "", "", "", "", ""],
      ["🎯 LOGIXMITRA", "", "", "", "", ""],
      ["Order Management Dashboard", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["📊 KEY METRICS", "", "", "", "", ""],
      ["Metric", "Value", "", "Platform Breakdown", "Count", ""],
      ["Total Orders", orders.length, "", "Manual", orders.filter(o => o.platform === "Manual").length, ""],
      ["Total Delivered", orders.filter(o => o.status === "Delivered").length, "", "Amazon", orders.filter(o => o.platform === "Amazon").length, ""],
      ["Total RTO", orders.filter(o => o.status === "RTO").length, "", "Shopify", orders.filter(o => o.platform === "Shopify").length, ""],
      ["Total Pending", orders.filter(o => o.status === "Pending").length, "", "WooCommerce", orders.filter(o => o.platform === "WooCommerce").length, ""],
      ["", "", "", "Custom", orders.filter(o => o.platform === "Custom").length, ""],
      ["💰 FINANCIAL", "", "", "", "", ""],
      ["Total COD Orders", orders.filter(o => o.financialStatus === "pending" || o.paymentMethod === "COD").length, "", "", "", ""],
      ["Total Prepaid Orders", orders.filter(o => o.financialStatus === "paid" || o.paymentMethod === "Prepaid").length, "", "", "", ""],
      ["", "", "", "", "", ""],
      ["📈 STATUS BREAKDOWN", "", "", "", "", ""],
      ["Status", "Count", "Percentage", "", "", ""],
      ["Delivered", orders.filter(o => o.status === "Delivered").length, ((orders.filter(o => o.status === "Delivered").length / orders.length) * 100).toFixed(1) + "%", "", "", ""],
      ["RTO", orders.filter(o => o.status === "RTO").length, ((orders.filter(o => o.status === "RTO").length / orders.length) * 100).toFixed(1) + "%", "", "", ""],
      ["Pending", orders.filter(o => o.status === "Pending").length, ((orders.filter(o => o.status === "Pending").length / orders.length) * 100).toFixed(1) + "%", "", "", ""],
      ["Shipped", orders.filter(o => o.status === "Shipped").length, ((orders.filter(o => o.status === "Shipped").length / orders.length) * 100).toFixed(1) + "%", "", "", ""],
      ["In Transit", orders.filter(o => o.status === "In Transit").length, ((orders.filter(o => o.status === "In Transit").length / orders.length) * 100).toFixed(1) + "%", "", "", ""],
      ["", "", "", "", "", ""],
      ["📅 REPORT DETAILS", "", "", "", "", ""],
      ["Generated On:", new Date().toLocaleString(), "", "", "", ""],
      ["Generated By:", `${APP_NAME} Logistics Platform`, "", "", "", ""],
      ["", "", "", "", "", ""],
      ["🚀 LOGIXMITRA - Complete Logistics Solutions", "", "", "", "", ""],
      [`🌐 ${WEBSITE_URL} | 📧 ${SUPPORT_EMAIL}`, "", "", "", "", ""]
    ];
    
    const dashboardWs = XLSX.utils.aoa_to_sheet(dashboardData);
    
    dashboardWs['!merges'] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
      { s: { r: 11, c: 0 }, e: { r: 11, c: 5 } },
      { s: { r: 16, c: 0 }, e: { r: 16, c: 5 } },
      { s: { r: 24, c: 0 }, e: { r: 24, c: 5 } },
      { s: { r: 28, c: 0 }, e: { r: 28, c: 5 } },
      { s: { r: 29, c: 0 }, e: { r: 29, c: 5 } }
    ];
    
    // Style dashboard title
    const dashTitleCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (dashboardWs[dashTitleCell]) {
      dashboardWs[dashTitleCell].s = {
        font: { bold: true, sz: 22, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    XLSX.utils.book_append_sheet(wb, dashboardWs, "📊 Dashboard");
    
    // ===== SHEET 2: ORDER REPORT =====
    XLSX.utils.book_append_sheet(wb, ws, "📋 Order Report");
    
    // ===== SHEET 3: STATUS SUMMARY =====
    const statusSummaryData = [
      ["STATUS WISE ORDER SUMMARY"],
      ["", ""],
      ["Status", "Count"],
      ["Delivered", orders.filter(o => o.status === "Delivered").length],
      ["RTO", orders.filter(o => o.status === "RTO").length],
      ["Pending", orders.filter(o => o.status === "Pending").length],
      ["Shipped", orders.filter(o => o.status === "Shipped").length],
      ["In Transit", orders.filter(o => o.status === "In Transit").length],
      ["Cancelled", orders.filter(o => o.status === "Cancelled").length],
      ["", ""],
      ["PAYMENT MODE SUMMARY", ""],
      ["Payment Mode", "Count"],
      ["COD", orders.filter(o => o.financialStatus === "pending" || o.paymentMethod === "COD").length],
      ["Prepaid", orders.filter(o => o.financialStatus === "paid" || o.paymentMethod === "Prepaid").length],
      ["", ""],
      ["TOP CITIES", ""],
      ["City", "Order Count"],
      ...Object.entries(orders.reduce((acc, order) => {
        if (order.city) acc[order.city] = (acc[order.city] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => [city, count]),
      ["", ""],
      [`Generated by ${APP_NAME} - ` + new Date().toLocaleString()]
    ];
    
    const statusSummaryWs = XLSX.utils.aoa_to_sheet(statusSummaryData);
    statusSummaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(wb, statusSummaryWs, "📈 Status Summary");
    
    // Set column widths for dashboard
    dashboardWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }];
    
    // Add workbook properties
    wb.Props = {
      Title: `${APP_NAME} Order Management Report`,
      Subject: "Complete Order Analytics Report",
      Author: `${APP_NAME} Logistics Platform`,
      Company: APP_NAME,
      Category: "Order Management",
      CreatedDate: new Date()
    };
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${APP_NAME}_Order_Report_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }
};