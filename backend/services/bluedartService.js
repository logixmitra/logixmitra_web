const axios = require('axios');
require('dotenv').config();
const {
  normalizeOrderForShipment,
  resolvePackageMeta,
  isCodOrder,
  resolveCodAmount,
  resolveOrderAmount,
} = require('../utils/orderShipmentMeta');

function transportationBase() {
  const raw = (
    process.env.BLUEDART_BASE_URL ||
    'https://apigateway.bluedart.com'
  ).replace(/\/$/, '');
  if (raw.includes('/in/transportation')) return raw.replace(/\/$/, '');
  return `${raw}/in/transportation`;
}

const BASE_URL = transportationBase();
const CLIENT_ID = process.env.BLUEDART_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BLUEDART_CLIENT_SECRET || '';
const LOGIN_ID = process.env.BLUEDART_LOGIN_ID || 'GG940111';
const LICENCE_KEY =
  process.env.BLUEDART_LICENSE_KEY ||
  process.env.BLUEDART_LICENCE_KEY ||
  'kh7mnhqkmgegoksipxr0urmqesesseup';
const CUSTOMER_CODE = process.env.BLUEDART_CUSTOMER_CODE || '940111';
const VENDOR_CODE = process.env.BLUEDART_VENDOR_CODE || '125465';
const ORIGIN_AREA = process.env.BLUEDART_ORIGIN_AREA || 'GGN';
const API_TYPE = process.env.BLUEDART_API_TYPE || 'S';

let cachedToken = null;
let tokenExpiresAt = 0;

function getProfile() {
  return {
    LoginID: LOGIN_ID,
    LicenceKey: LICENCE_KEY,
    Api_type: API_TYPE,
  };
}

function ensureConfigured() {
  const missing = [];
  if (!CLIENT_ID) missing.push('BLUEDART_CLIENT_ID');
  if (!CLIENT_SECRET) missing.push('BLUEDART_CLIENT_SECRET');
  if (!LOGIN_ID) missing.push('BLUEDART_LOGIN_ID');
  if (!LICENCE_KEY) missing.push('BLUEDART_LICENSE_KEY');
  if (!CUSTOMER_CODE) missing.push('BLUEDART_CUSTOMER_CODE');
  if (missing.length) {
    throw new Error(`BlueDart credentials not configured. Set ${missing.join(', ')} in .env`);
  }
}

function truncate(value, max) {
  return String(value || '').slice(0, max);
}

function formatDate(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(date.getTime())) return `/Date(${Date.now()})/`;
  return `/Date(${date.getTime()})/`;
}

function toPickupTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

function pickupSchedule() {
  const now = new Date();
  const pickup = new Date(now);
  const hhmm = now.getHours() * 100 + now.getMinutes();
  if (hhmm >= 1800) {
    pickup.setDate(pickup.getDate() + 1);
    pickup.setHours(16, 0, 0, 0);
  } else if (hhmm >= 1600) {
    pickup.setMinutes(pickup.getMinutes() + 30);
  } else {
    pickup.setHours(16, 0, 0, 0);
  }
  return { date: pickup, time: toPickupTime(pickup) };
}

function productCodeForCourier(courierName, shippingMode) {
  const lower = `${courierName || ''} ${shippingMode || ''}`.toLowerCase();
  if (lower.includes('surface') || lower.includes('economy')) return 'E';
  if (process.env.BLUEDART_PRODUCT_CODE) return process.env.BLUEDART_PRODUCT_CODE;
  return 'A';
}

function creditReference(order) {
  return truncate(
    String(order.referenceId || order.orderNumber || `ORD${Date.now()}`).replace(/[^a-zA-Z0-9]/g, ''),
    20
  );
}

async function getBluedartToken(force = false) {
  ensureConfigured();

  if (!force && cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.get(`${BASE_URL}/token/v1/login`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ClientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  const data = response.data || {};
  if (response.status >= 400) {
    throw new Error(data?.message || data?.error || `BlueDart token HTTP ${response.status}`);
  }

  const token =
    (typeof data === 'string' ? data : null) ||
    data.JWTToken ||
    data.jwtToken ||
    data.token ||
    data.access_token ||
    data?.data?.JWTToken ||
    data?.data?.token;

  if (!token) {
    throw new Error('BlueDart token not received');
  }

  const expiresIn = Number(data.expires_in || data.expiresIn || 3300);
  cachedToken = token;
  tokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000;
  return token;
}

async function withAuth(requestFn) {
  let token = await getBluedartToken();
  const response = await requestFn(token);
  if (response?.status === 401 || response?.status === 403) {
    token = await getBluedartToken(true);
    return requestFn(token);
  }
  return response;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    JWTToken: token,
    ClientID: CLIENT_ID,
  };
}

async function getBlueDartLocation(pinCode, token) {
  try {
    const response = await axios.post(
      `${BASE_URL}/finder/v1/GetServicesforPincode`,
      {
        pinCode: String(pinCode || ''),
        profile: getProfile(),
      },
      {
        headers: authHeaders(token),
        timeout: 30000,
        validateStatus: () => true,
      }
    );
    if (response.status >= 400) {
      throw new Error(`Blue Dart pincode finder HTTP ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Blue Dart Location Error:', error.response?.data || error.message);
    throw error;
  }
}

function extractAreaCode(locationData) {
  return (
    locationData?.GetServicesforPincodeResult?.AreaCode ||
    locationData?.GetServicesforPincodeResult?.OriginArea ||
    locationData?.AreaCode ||
    locationData?.data?.GetServicesforPincodeResult?.AreaCode ||
    ''
  );
}

async function formatBluedartShipmentRequest(warehouse, order, courierName) {
  order = normalizeOrderForShipment(order || {});
  const prepaid = !isCodOrder(order);
  const pkg = resolvePackageMeta(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const collectable = prepaid ? 0 : resolveCodAmount(order);
  const declared = resolveOrderAmount(order) || 1000;
  const itemCount =
    order.totalItems ||
    items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) ||
    1;
  const ref = creditReference(order);
  const pickup = pickupSchedule();
  const sellerName = warehouse?.name || warehouse?.contactPerson || 'Shipper';
  const sellerPhone = String(warehouse?.phone || warehouse?.returnPhone || '');
  const sellerPincode = String(warehouse?.pincode || warehouse?.returnPincode || '');
  const gstTin = warehouse?.gstTin || warehouse?.gst || '';
  const shipperAddress1 = warehouse?.address || warehouse?.returnAddress || '';
  const shipperCity = warehouse?.city || warehouse?.returnCity || '';
  const shipperState = warehouse?.state || warehouse?.returnState || '';
  const shipperLine3 = `${shipperCity}, ${shipperState}`.replace(/^,\s*|,\s*$/g, '').trim();
  const senderLine = [shipperAddress1, warehouse?.landmark || warehouse?.addressLine2 || '', shipperCity]
    .filter(Boolean)
    .join(', ');
  const consigneeLine1 = order.addressLine1 || order.city || '';
  const consigneeLine2 = order.addressLine2 || order.landmark || '';
  const consigneeCityState = [order.city, order.state].filter(Boolean).join(', ');
  const weightKg = Math.max(Number(pkg.chargeableWeight || pkg.deadWeight) || 0.5, 0.05);
  const hsnOf = (item) => {
    const raw = String(item?.hsnCode || item?.hsn || '').trim();
    if (!raw) return '';
    return /^hsn-/i.test(raw) ? raw : `HSN-${raw}`;
  };

  let originArea = ORIGIN_AREA || warehouse?.originArea || warehouse?.areaCode || 'GGN';
  try {
    const token = await getBluedartToken();
    const locationData = await getBlueDartLocation(sellerPincode, token);
    originArea = extractAreaCode(locationData) || originArea;
  } catch (error) {
    console.error('Error fetching Blue Dart location data:', error.message);
  }

  return {
    Request: {
      Consignee: {
        AvailableDays: '7',
        AvailableTiming: '',
        ConsigneeAddress1: truncate(consigneeLine1, 30),
        ConsigneeAddress2: truncate(consigneeLine2, 30),
        ConsigneeAddress3: truncate(consigneeCityState, 30),
        ConsigneeAddressType: '',
        ConsigneeAddressinfo: '',
        ConsigneeAttention: '',
        ConsigneeEmailID: truncate(order.customerEmail || '', 50),
        ConsigneeFullAddress: [consigneeLine1, consigneeLine2, consigneeCityState, order.pincode]
          .filter(Boolean)
          .join(', '),
        ConsigneeGSTNumber: '',
        ConsigneeLatitude: '',
        ConsigneeLongitude: '',
        ConsigneeMaskedContactNumber: '',
        ConsigneeMobile: truncate(String(order.customerPhone || ''), 15),
        ConsigneeName: truncate(order.customerName || 'Customer', 30),
        ConsigneePincode: String(order.pincode || ''),
        ConsigneeTelephone: '',
      },
      Returnadds: {
        ManifestNumber: '',
        ReturnAddress1: truncate(warehouse?.returnAddress || shipperAddress1, 30),
        ReturnAddress2: '',
        ReturnAddress3: truncate(
          `${warehouse?.returnCity || shipperCity}, ${warehouse?.returnState || shipperState}`.replace(/^,\s*|,\s*$/g, '').trim(),
          30
        ),
        ReturnAddressinfo: '',
        ReturnContact: truncate(warehouse?.landmark || warehouse?.contactPerson || sellerName, 20),
        ReturnEmailID: truncate(warehouse?.email || order.customerEmail || '', 50),
        ReturnLatitude: '',
        ReturnLongitude: '',
        ReturnMaskedContactNumber: '',
        ReturnMobile: truncate(sellerPhone, 15),
        ReturnPincode: String(warehouse?.returnPincode || sellerPincode),
        ReturnTelephone: '',
      },
      Services: {
        AWBNo: '',
        ActualWeight: weightKg.toFixed(2),
        CollectableAmount: collectable,
        Commodity: {
          CommodityDetail1: truncate(String(items[0]?.hsnCode || items[0]?.hsn || items[0]?.sku || 'Goods').replace(/^HSN-/i, ''), 30),
          CommodityDetail2: '',
          CommodityDetail3: '',
        },
        CreditReferenceNo: ref,
        CreditReferenceNo2: truncate(String(sellerName).replace(/\s+/g, '-').toLowerCase(), 20),
        CreditReferenceNo3: '',
        CurrencyCode: 'INR',
        DeclaredValue: declared,
        DeliveryTimeSlot: '',
        Dimensions: [
          {
            Breadth: Number(pkg.width) || 10,
            Count: 1,
            Height: Number(pkg.height) || 10,
            Length: Number(pkg.length) || 10,
          },
        ],
        FavouringName: '',
        ForwardAWBNo: '',
        ForwardLogisticCompName: '',
        InsurancePaidBy: '',
        InvoiceNo: '',
        IsChequeDD: '',
        IsDedicatedDeliveryNetwork: false,
        IsForcePickup: false,
        IsPartialPickup: false,
        IsReversePickup: false,
        ItemCount: Number(itemCount) || 1,
        OTPBasedDelivery: '0',
        OTPCode: '',
        Officecutofftime: '',
        PDFOutputNotRequired: true,
        PackType: '',
        ParcelShopCode: '',
        PayableAt: '',
        PickupDate: formatDate(pickup.date),
        PickupMode: '',
        PickupTime: '1600',
        PickupType: '',
        PieceCount: '1',
        PreferredPickupTimeSlot: '',
        ProductCode: productCodeForCourier(courierName, pkg.shippingMode) || 'A',
        ProductFeature: '',
        ProductType: prepaid ? 1 : 0,
        RegisterPickup: true,
        SpecialInstruction: '',
        SubProductCode: prepaid ? 'P' : 'C',
        TotalCashPaytoCustomer: 0,
        itemdtl: (items.length ? items : [{}]).map((item, index) => {
          const qty = Number(item.quantity || 1);
          const lineValue = Number(item.totalPrice || (item.unitPrice || 0) * qty || declared);
          const itemName = String(item.name || `Item ${index + 1}`).toUpperCase();
          return {
            CGSTAmount: 0,
            HSCode: hsnOf(item),
            IGSTAmount: 0,
            IGSTRate: 0,
            Instruction: '',
            InvoiceDate: formatDate(order.createdAt || order.orderDate || pickup.date),
            InvoiceNumber: '',
            ItemID: truncate(item.sku || `sku-${index + 1}`, 15),
            ItemName: truncate(itemName, 50),
            ItemValue: lineValue,
            Itemquantity: qty,
            PlaceofSupply: order.state || shipperState || '',
            ProductDesc1: truncate(itemName, 50),
            ProductDesc2: '',
            ReturnReason: '',
            SGSTAmount: 0,
            SKUNumber: item.sku || `sku-${index + 1}`,
            SellerGSTNNumber: gstTin,
            SellerName: senderLine || sellerName,
            TaxableAmount: lineValue,
            TotalValue: lineValue,
            cessAmount: '0.0',
            countryOfOrigin: 'IN',
            docType: 'INV',
            subSupplyType: 1,
            supplyType: '0',
          };
        }),
        noOfDCGiven: 0,
      },
      Shipper: {
        CustomerAddress1: truncate(shipperAddress1, 30),
        CustomerAddress2: '',
        CustomerAddress3: truncate(shipperLine3.toUpperCase(), 30),
        CustomerAddressinfo: '',
        CustomerCode: CUSTOMER_CODE,
        CustomerEmailID: truncate(warehouse?.email || '', 50),
        CustomerGSTNumber: gstTin,
        CustomerLatitude: '',
        CustomerLongitude: '',
        CustomerMaskedContactNumber: '',
        CustomerMobile: truncate(sellerPhone, 15),
        CustomerName: truncate(sellerName, 30),
        CustomerPincode: sellerPincode,
        CustomerTelephone: truncate(warehouse?.telephone || warehouse?.altPhone || sellerPhone, 15),
        IsToPayCustomer: false,
        OriginArea:   'GGN',  ///truncate(originArea || 'GGN', 3),
        Sender: truncate(senderLine || sellerName, 50),
        VendorCode: VENDOR_CODE,
      },
    },
    Profile: getProfile(),
  };
}

function extractAwb(payload) {
  const result =
    payload?.GenerateWayBillResult ||
    payload?.GenerateWaybillResult ||
    payload?.data?.GenerateWayBillResult ||
    payload?.data ||
    payload ||
    {};
  return (
    result.AWBNo ||
    result.AWBNO ||
    result.AwbNo ||
    result.awbNo ||
    payload?.AWBNo ||
    payload?.AWBNO ||
    null
  );
}

function extractError(payload) {
  const result =
    payload?.GenerateWayBillResult ||
    payload?.GenerateWaybillResult ||
    payload?.CancelWaybillResult ||
    payload?.data ||
    payload ||
    {};
  if (result.IsError === true || result.isError === true || payload?.IsError === true) {
    const status = result.Status || payload?.Status;
    if (Array.isArray(status) && status.length) {
      return status.map((s) => s.StatusInformation || s.StatusCode || JSON.stringify(s)).join(', ');
    }
    return result.StatusInformation || result.message || payload?.message || 'BlueDart returned an error';
  }
  if (Array.isArray(result.Status) && result.Status.some((s) => String(s.StatusType || '').toLowerCase() === 'error')) {
    return result.Status.map((s) => s.StatusInformation || s.StatusCode).filter(Boolean).join(', ');
  }
  return payload?.message || payload?.error || null;
}

async function createShipment(order, warehouse, courierName) {
  try {
    ensureConfigured();
    if (!warehouse) {
      return { success: false, message: 'Warehouse not found for BlueDart shipment' };
    }

    const body = await formatBluedartShipmentRequest(warehouse, order, courierName);
    const response = await withAuth((token) =>
      axios.post(`${BASE_URL}/waybill/v1/GenerateWayBill`, body, {
        headers: authHeaders(token),
        timeout: 60000,
        validateStatus: () => true,
      })
    );


    

    const data = response.data || {};
    const awb = extractAwb(data);
    const errorMsg = extractError(data);

    if (response.status >= 400 || !awb) {
      return {
        success: false,
        awb: null,
        AWBNo: null,
        message: errorMsg || `BlueDart waybill HTTP ${response.status}`,
        description: errorMsg || `BlueDart waybill HTTP ${response.status}`,
        raw: data,
        data,
        payload: body,
      };
    }

    return {
      success: true,
      awb: String(awb),
      AWBNo: String(awb),
      message: 'Shipment created successfully',
      raw: data,
      data,
      payload: body,
    };
  } catch (error) {
    console.error('BlueDart create shipment error:', error.response?.data || error.message);
    return {
      success: false,
      message:
        extractError(error.response?.data) ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create BlueDart shipment',
      data: error.response?.data,
    };
  }
}

async function cancelShipment(awb) {
  try {
    ensureConfigured();
    if (!awb || awb === '-') {
      return { success: false, message: 'AWB is required' };
    }

    const body = {
      Request: { AWBNo: String(awb) },
      Profile: getProfile(),
    };

    const response = await withAuth((token) =>
      axios.post(`${BASE_URL}/waybill/v1/CancelWaybill`, body, {
        headers: authHeaders(token),
        timeout: 30000,
        validateStatus: () => true,
      })
    );

    const data = response.data || {};
    const errorMsg = extractError(data);
    const ok = response.status < 400 && !errorMsg;

    return {
      success: ok,
      message: ok ? 'Cancelled' : errorMsg || `BlueDart cancel HTTP ${response.status}`,
      raw: data,
      data,
    };
  } catch (error) {
    console.error('BlueDart cancel error:', error.response?.data || error.message);
    return {
      success: false,
      message:
        extractError(error.response?.data) ||
        error.message ||
        'Failed to cancel BlueDart shipment',
      data: error.response?.data,
    };
  }
}

function firstShipment(data) {
  if (Array.isArray(data?.ShipmentData) && data.ShipmentData[0]?.Shipment) {
    return data.ShipmentData[0].Shipment;
  }
  if (Array.isArray(data?.ShipmentData) && data.ShipmentData[0]) {
    return data.ShipmentData[0];
  }
  if (Array.isArray(data?.ShipmentData?.Shipment)) {
    return data.ShipmentData.Shipment[0];
  }
  if (Array.isArray(data?.data?.ShipmentData?.Shipment)) {
    return data.data.ShipmentData.Shipment[0];
  }
  return data?.ScanDetail || data?.data || data;
}

function normalizeScans(data) {
  const shipment = firstShipment(data);
  let scans = shipment?.Scans || shipment?.ScanDetail || data?.ScanDetail || [];
  if (scans && !Array.isArray(scans) && scans.ScanDetail) {
    scans = Array.isArray(scans.ScanDetail) ? scans.ScanDetail : [scans.ScanDetail];
  }
  if (!Array.isArray(scans)) scans = [];

  return scans.map((scan) => {
    const detail = scan.ScanDetail || scan;
    const status = detail.Scan || detail.Status || detail.ScanCode || 'Unknown';
    return {
      status,
      location: detail.ScannedLocation || detail.ScanLocation || detail.Location || 'Unknown',
      timestamp: detail.ScanDateTime || `${detail.ScanDate || ''} ${detail.ScanTime || ''}`.trim(),
      description: detail.Scan || detail.Instructions || detail.Status || '',
      completed: String(status).toUpperCase().includes('DELIVER'),
    };
  });
}

function mapBluedartStatus(raw) {
  const value = String(raw || '').toUpperCase();
  if (value.includes('DELIVER') && value.includes('RTO')) return 'RTO Delivered';
  if (value.includes('RTO') && value.includes('TRANSIT')) return 'RTO In transit';
  if (value.includes('RTO')) return 'RTO';
  if (value.includes('DELIVER')) return 'Delivered';
  if (value.includes('OUT FOR DELIVERY') || value.includes('OFD') || value === 'UD') return 'Out for Delivery';
  if (value.includes('PICKUP') || value.includes('PICKED') || value === 'PU') return 'Pickup';
  if (value.includes('UNDELIVER') || value.includes('NDR')) return 'UNDELIVERED';
  if (value.includes('CANCEL')) return 'Cancelled';
  if (value.includes('TRANSIT') || value.includes('SHIPMENT') || value === 'IT') return 'In Transit';
  return raw || 'In Transit';
}

async function trackShipment(awb) {
  try {
    ensureConfigured();
    if (!awb || awb === '-') {
      return { success: false, error: 'AWB is required' };
    }

    const response = await withAuth((token) =>
      axios.get(`${BASE_URL}/tracking/v1`, {
        headers: authHeaders(token),
        params: {
          handler: 'tnt',
          action: 'custawbquery',
          loginid: LOGIN_ID,
          lickey: LICENCE_KEY,
          awb: 'awb',
          numbers: String(awb),
          verno: '1',
          scan: '1',
          format: 'json',
        },
        timeout: 30000,
        validateStatus: () => true,
      })
    );

    const data = response.data || {};
    if (response.status >= 400) {
      return {
        success: false,
        error: data?.message || data?.error || `BlueDart tracking HTTP ${response.status}`,
        data,
      };
    }

    const history = normalizeScans(data);
    const latest = history[history.length - 1] || history[0];
    const shipment = firstShipment(data);
    const shipmentStatus =
      shipment?.Status ||
      data?.ShipmentData?.[0]?.Shipment?.Status ||
      data?.ShipmentData?.[0]?.Status ||
      latest?.status;

    return {
      success: true,
      data,
      status: mapBluedartStatus(shipmentStatus),
      currentStatus: shipmentStatus,
      history,
    };
  } catch (error) {
    console.error('BlueDart track error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = {
  getBluedartToken,
  getToken: getBluedartToken,
  formatBluedartShipmentRequest,
  createShipment,
  cancelShipment,
  trackShipment,
  mapBluedartStatus,
};
