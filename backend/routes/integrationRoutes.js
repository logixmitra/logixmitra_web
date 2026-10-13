
const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { body, param } = require('express-validator');
const allfuncalculate =require('../services/calculatedServices'); 
const {User,Pincode,Integration,Order,OrderItem}=require('../models')
const orderService = require('../services/orderService');
const { Op } = require('sequelize');

 const validateIntegration = [
  body('type').isIn(['Amazon', 'Shopify', 'WooCommerce', 'Custom']).withMessage('Invalid platform type'),
  body('name').notEmpty().withMessage('Integration name is required'),
  body('credentials').isObject().withMessage('Credentials must be an object')
];

const validateTestConnection = [
  body('platform').isIn(['Amazon', 'Shopify', 'WooCommerce', 'Custom']).withMessage('Invalid platform'),
  body('credentials').isObject().withMessage('Credentials must be an object')
];



const SHOPIFY_API_VERSION = '2026-01';

async function shopifyAdminJson(shop, accessToken, path) {
  const response = await fetch(
    `https://${shop}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/${path}`,
    {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.json().catch(() => ({}));
}

async function shopifyGraphql(shop, accessToken, query, variables) {
  const response = await fetch(
    `https://${shop}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  return response.json().catch(() => ({}));
}

/** Normalize shop domain from URL / subdomain / full myshopify host */
function normalizeShopifyShop(shop) {
  if (!shop) return '';
  return String(shop)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.myshopify\.com.*/i, '')
    .split('/')[0]
    .replace(/\s+/g, '');
}

async function getShopifyAccessToken({ SHOP, CLIENT_ID, CLIENT_SECRET }) {
  const shop = normalizeShopifyShop(SHOP);
  const clientId = CLIENT_ID;
  const clientSecret = CLIENT_SECRET;

  if (!shop || !clientId || !clientSecret) {
    throw new Error('Shopify requires store URL, Client ID, and Client Secret');
  }

  const response = await fetch(
    `https://${shop}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description || payload.error || response.statusText;
    throw new Error(`Shopify token request failed: ${detail}`);
  }

  return { shop, accessToken: payload.access_token };
}

function mapShopifyFulfillmentStatus(fulfillmentStatus, cancelledAt) {
  if (cancelledAt) return 'Cancelled';

  switch (fulfillmentStatus) {
    case 'fulfilled':
      return 'Delivered';
    case 'partial':
      return 'Shipped';
    case 'pending':
    case 'unfulfilled':
    case null:
    case undefined:
      return 'Pending';
    default:
      return 'Pending';
  }
}

function mapShopifyFulfillmentEnum(fulfillmentStatus) {
  const value = String(fulfillmentStatus || '').toLowerCase();
  if (value === 'fulfilled') return 'fulfilled';
  if (value === 'partial') return 'partial';
  if (value === 'restocked') return 'restocked';
  if (value === 'pending') return 'pending';
  return null;
}

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

/** COD fee sellers add in Shopify (shipping rate / fee app / note / line item) */
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
    const attrName = normalizePropName(attr.name);
    if (!isCodTitle(attr.name) && !/^(cod amount|cod charges?|cod fee|cod fees|cod)$/.test(attrName)) continue;
    const val = parseFloat(String(attr.value ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(val) && val > 0) codCharge += val;
  }

  // Some fee apps put amounts under current_total_additional_fees / total_tip_received style fields
  const additionalFees = shopifyOrder.current_total_additional_fees_set?.shop_money?.amount
    || shopifyOrder.total_additional_fees
    || 0;
  const additionalFeesNum = parseFloat(additionalFees) || 0;
  if (additionalFeesNum > 0 && isShopifyCodOrder(shopifyOrder) && codCharge <= 0) {
    codCharge += additionalFeesNum;
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

function collectShopifyMetafields(source) {
  const list = [];
  if (!source) return list;
  if (Array.isArray(source)) list.push(...source);
  if (Array.isArray(source.nodes)) list.push(...source.nodes);
  if (Array.isArray(source.edges)) {
    for (const edge of source.edges) {
      if (edge?.node) list.push(edge.node);
    }
  }
  return list;
}

function findMetafieldValue(metafields, keyPatterns) {
  const patterns = keyPatterns.map((p) => new RegExp(p, 'i'));
  for (const field of collectShopifyMetafields(metafields)) {
    const key = normalizePropName(`${field?.namespace || ''} ${field?.key || ''}`);
    const shortKey = normalizePropName(field?.key);
    if (!patterns.some((re) => re.test(key) || re.test(shortKey))) continue;
    const value = field?.value ?? field?.val;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function extractShopifyHsn(item) {
  const attached = item?._hsn || item?.hsn || item?.hsn_code || item?.hsnCode;
  if (attached && String(attached).trim()) {
    return String(attached).replace(/[^0-9A-Za-z]/g, '');
  }
  const fromProp = findShopifyLineItemProperty(item, [
    'hsn', 'hsn code', 'hsncode', 'hsn_code', 'sac', 'sac code',
    'hsn/sac', 'harmonized system code', 'hs code', 'hsn sac',
  ]);
  if (fromProp) return String(fromProp).replace(/[^0-9A-Za-z]/g, '');
  return '';
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

function gstRateFromTaxLines(taxLines, lineTotal, taxesIncluded) {
  const lines = Array.isArray(taxLines) ? taxLines : [];
  if (!lines.length) return 0;
  let rateSum = 0;
  let hasRate = false;
  for (const tax of lines) {
    const raw = parseFloat(tax?.rate ?? tax?.rate_percentage);
    if (Number.isFinite(raw) && raw > 0) {
      hasRate = true;
      rateSum += raw > 1 ? raw : raw * 100;
    }
  }
  if (hasRate) return snapGstRate(rateSum);

  const taxAmount = lines.reduce((sum, tax) => sum + (parseFloat(tax?.price) || 0), 0);
  if (taxAmount > 0 && lineTotal > 0) {
    const exclusive = taxesIncluded ? Math.max(lineTotal - taxAmount, 0) : lineTotal;
    if (exclusive > 0) return snapGstRate((taxAmount / exclusive) * 100);
  }
  return 0;
}

function extractShopifyGstRate(item, shopifyOrder) {
  const quantity = item?.quantity || 1;
  const lineTotal = (parseFloat(item?.price) || 0) * quantity - (parseFloat(item?.total_discount) || 0);
  const taxesIncluded = !!shopifyOrder?.taxes_included;

  const fromItemLines = gstRateFromTaxLines(item?.tax_lines, lineTotal, taxesIncluded);
  if (fromItemLines) return fromItemLines;

  const fromProp = findShopifyLineItemProperty(item, [
    'gst', 'gst %', 'gst%', 'gst rate', 'gst percent', 'tax rate', 'tax %', 'igst', 'igst %', 'tax',
  ]);
  if (fromProp) return snapGstRate(parseGstPercent(fromProp));

  const cgst = parseGstPercent(findShopifyLineItemProperty(item, ['cgst', 'cgst %', 'cgst rate']));
  const sgst = parseGstPercent(findShopifyLineItemProperty(item, ['sgst', 'sgst %', 'sgst rate']));
  if (cgst || sgst) return snapGstRate(cgst + sgst);

  if (item?._gstFromVariant) return snapGstRate(parseGstPercent(item._gstFromVariant));

  const fromOrderLines = gstRateFromTaxLines(
    shopifyOrder?.tax_lines,
    parseFloat(shopifyOrder?.subtotal_price) || lineTotal,
    taxesIncluded
  );
  if (fromOrderLines) return fromOrderLines;

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

function parsePositiveNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return 0;
    return parsePositiveNumber(value.value ?? value.amount ?? value.weight ?? value.cm ?? '');
  }
  const text = String(value).trim();
  if (isShopifyIdNoise(text)) return 0;
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

const MAX_PACKAGE_DIM_CM = 1;

function isShopifyIdNoise(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/gid:\/\//i.test(s)) return true;
  if (/shopify/i.test(s) && /\d{8,}/.test(s)) return true;
  if (/^\d{8,}$/.test(s.replace(/[,\s]/g, ''))) return true;
  return false;
}

function isPlausibleDimCm(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0.1 && v <= MAX_PACKAGE_DIM_CM;
}

function sanitizeDimCm(n) {
  return isPlausibleDimCm(n) ? Number(Number(n).toFixed(2)) : 0;
}

function detectShopifyUnit(text, fallback) {
  const s = String(text || '').toLowerCase();
  if (/\b(kg|kgs|kilogram)/.test(s)) return 'kg';
  if (/\b(g|gm|grams?)\b/.test(s)) return 'g';
  if (/\b(lb|lbs|pounds?)\b/.test(s)) return 'lb';
  if (/\b(oz|ounces?)\b/.test(s)) return 'oz';
  if (/\b(cm|centimet(?:er|re)s?)\b/.test(s)) return 'cm';
  if (/\b(mm|millimet(?:er|re)s?)\b/.test(s)) return 'mm';
  if (/\b(m|met(?:er|re)s?)\b/.test(s)) return 'm';
  if (/\b(in|inch|inches)\b/.test(s) || /"/.test(s)) return 'in';
  if (/\b(ft|feet|foot)\b/.test(s)) return 'ft';
  return fallback;
}

function normalizeShopifyWeightUnit(unit) {
  const u = String(unit || '').trim().toLowerCase();
  if (!u) return '';
  // Check kilogram before gram: "kilograms" contains "gram".
  if (u === 'kg' || u === 'kgs' || u === 'kilo' || u === 'kilogram' || u === 'kilograms') return 'kg';
  if (u === 'g' || u === 'gm' || u === 'gms' || u === 'gram' || u === 'grams') return 'g';
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return 'lb';
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return 'oz';
  if (u.includes('kilogram') || /(^|[^a-z])kg([^a-z]|$)/.test(u)) return 'kg';
  if (u.includes('gram') || /(^|[^a-z])g([^a-z]|$)/.test(u)) return 'g';
  if (u.includes('pound')) return 'lb';
  if (u.includes('ounce')) return 'oz';
  return u;
}

function shopifyWeightToKg(value, unit) {
  const n = parsePositiveNumber(value);
  if (!n) return 0;
  const u = normalizeShopifyWeightUnit(unit);
  if (u === 'g') return n / 1000;
  if (u === 'kg') return n;
  if (u === 'lb') return n * 0.453592;
  if (u === 'oz') return n * 0.0283495;
  // Shopify REST `grams` / GraphQL value with missing unit: >= 20 is grams.
  if (!u) return n >= 20 ? n / 1000 : n;
  return n;
}

function shopifyLengthToCm(value, unit) {
  if (isShopifyIdNoise(value)) return 0;
  const n = parsePositiveNumber(value);
  if (!n) return 0;
  const u = String(unit || 'cm').toLowerCase();
  if (u === 'mm' || u.includes('millimet')) return sanitizeDimCm(n / 10);
  if (u === 'm' || ((u.startsWith('meter') || u.startsWith('metre')) && !u.includes('milli') && !u.includes('centi'))) {
    return sanitizeDimCm(n * 100);
  }
  if (u === 'in' || u.includes('inch')) return sanitizeDimCm(n * 2.54);
  if (u === 'ft' || u.includes('feet') || u === 'foot') return sanitizeDimCm(n * 30.48);
  if (u.includes('yard')) return sanitizeDimCm(n * 91.44);
  return sanitizeDimCm(n);
}

function roundKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Number(n.toFixed(3));
}

function roundCm(value) {
  return sanitizeDimCm(value);
}

const DEFAULT_SHOPIFY_DIM_CM = 10;

function applyDefaultShopifyDims(length, width, height) {
  return {
    length: length || DEFAULT_SHOPIFY_DIM_CM,
    width: width || DEFAULT_SHOPIFY_DIM_CM,
    height: height || DEFAULT_SHOPIFY_DIM_CM,
  };
}

function parseDimensionTriplet(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const parsed = {
      length: shopifyLengthToCm(value[0], 'cm'),
      width: shopifyLengthToCm(value[1], 'cm'),
      height: shopifyLengthToCm(value[2], 'cm'),
    };
    if (parsed.length && parsed.width && parsed.height) return parsed;
    return null;
  }
  const text = String(value || '');
  if (isShopifyIdNoise(text)) return null;
  if (text.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length >= 3) return parseDimensionTriplet(parsed);
    } catch (_) {
      // ignore
    }
  }
  const nums = text.match(/(\d+(?:\.\d+)?)/g);
  if (!nums || nums.length < 3) return null;
  const unit = detectShopifyUnit(text, 'cm');
  const parsed = {
    length: shopifyLengthToCm(nums[0], unit),
    width: shopifyLengthToCm(nums[1], unit),
    height: shopifyLengthToCm(nums[2], unit),
  };
  if (parsed.length && parsed.width && parsed.height) return parsed;
  return null;
}

function metafieldDimKind(key) {
  const k = normalizePropName(key);
  if (k === 'l' || /(^| )(length|len|pkg length|package length|parcel length)( |$)/.test(k)) return 'length';
  if (k === 'b' || k === 'w' || /(^| )(width|breadth|bredth|breath|pkg width|package width|parcel width)( |$)/.test(k)) return 'width';
  if (k === 'h' || /(^| )(height|ht|depth|pkg height|package height|parcel height)( |$)/.test(k)) return 'height';
  return '';
}

function mergeShopifyDimensions(target, incoming) {
  if (!incoming) return target;
  const length = sanitizeDimCm(incoming.length);
  const width = sanitizeDimCm(incoming.width);
  const height = sanitizeDimCm(incoming.height);
  if (length > (target.length || 0)) target.length = length;
  if (width > (target.width || 0)) target.width = width;
  if (height > (target.height || 0)) target.height = height;
  return target;
}

function extractDimensionsFromMetafields(metafields) {
  const result = { length: 0, width: 0, height: 0 };
  for (const field of collectShopifyMetafields(metafields)) {
    const key = field?.key || '';
    const raw = field?.value;
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    if (isShopifyIdNoise(raw)) continue;

    const combinedKey = normalizePropName(key);
    const parsedTriplet = parseDimensionTriplet(raw);
    const looksLikeDims =
      /dimension|size|lwh|lxwxh|package/.test(combinedKey) ||
      /[x×*]/.test(String(raw)) ||
      /\d+\s+\d+\s+\d+/.test(String(raw));
    if (parsedTriplet && looksLikeDims) {
      mergeShopifyDimensions(result, parsedTriplet);
    }

    try {
      const json = typeof raw === 'string' && (raw.trim().startsWith('{') || raw.trim().startsWith('['))
        ? JSON.parse(raw)
        : raw;
      const fieldType = String(field?.type || '').toLowerCase();
      if (fieldType === 'weight') {
        continue;
      }
      if (Array.isArray(json)) {
        mergeShopifyDimensions(result, parseDimensionTriplet(json));
      } else if (json && typeof json === 'object') {
        const unit = detectShopifyUnit(`${key} ${json.unit || ''}`, json.unit || 'cm');
        if (json.value != null && (json.unit || fieldType === 'dimension') && metafieldDimKind(key)) {
          const kind = metafieldDimKind(key);
          result[kind] = result[kind] || shopifyLengthToCm(json.value, unit);
        }
        mergeShopifyDimensions(result, {
          length: shopifyLengthToCm(json.length ?? json.l, unit),
          width: shopifyLengthToCm(json.width ?? json.breadth ?? json.b, unit),
          height: shopifyLengthToCm(json.height ?? json.h, unit),
        });
      }
    } catch (_) {
      // ignore non-JSON metafields
    }

    const kind = metafieldDimKind(key);
    if (!kind) continue;
    if (parsedTriplet && parsedTriplet.length && parsedTriplet.width && parsedTriplet.height) {
      mergeShopifyDimensions(result, parsedTriplet);
      continue;
    }
    const unit = detectShopifyUnit(`${key} ${raw}`, 'cm');
    result[kind] = result[kind] || shopifyLengthToCm(raw, unit);
  }
  return result;
}

function extractWeightFromMetafields(metafields) {
  for (const field of collectShopifyMetafields(metafields)) {
    const key = normalizePropName(field?.key);
    if (!key || /unit/.test(key)) continue;
    if (!/(^| )(weight|dead weight|package weight|item weight|product weight|wt)( |$)/.test(key)) continue;
    const raw = field?.value;
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const fieldType = String(field?.type || '').toLowerCase();
    if (fieldType === 'weight' || (typeof raw === 'string' && raw.trim().startsWith('{'))) {
      try {
        const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const kg = roundKg(shopifyWeightToKg(json?.value ?? json?.amount, json?.unit));
        if (kg) return kg;
      } catch (_) {
        // fall through to numeric parse
      }
    }
    const kg = roundKg(shopifyWeightToKg(raw, detectShopifyUnit(`${field?.key} ${raw}`, '')));
    if (kg) return kg;
  }
  return 0;
}

function extractDimensionsFromProperties(item) {
  const result = { length: 0, width: 0, height: 0 };
  const props = Array.isArray(item?.properties) ? item.properties : [];
  for (const prop of props) {
    const name = prop?.name || prop?.key || '';
    const raw = prop?.value ?? prop?.val;
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    if (isShopifyIdNoise(raw)) continue;
    const parsed = parseDimensionTriplet(raw);
    const looksLikeDims =
      /dimension|size|lwh|lxwxh|package/.test(normalizePropName(name)) ||
      /[x×*]/.test(String(raw)) ||
      /\d+\s+\d+\s+\d+/.test(String(raw));
    if (parsed && looksLikeDims) {
      mergeShopifyDimensions(result, parsed);
    }
    const kind = metafieldDimKind(name);
    if (!kind) continue;
    if (parsed && parsed.length && parsed.width && parsed.height) {
      mergeShopifyDimensions(result, parsed);
      continue;
    }
    const unit = detectShopifyUnit(`${name} ${raw}`, 'cm');
    result[kind] = result[kind] || shopifyLengthToCm(raw, unit);
  }
  return result;
}

function extractShopifyItemWeightKg(item) {
  const attached = parsePositiveNumber(item?._weightKg);
  if (attached) return roundKg(attached);
  const grams = parsePositiveNumber(item?.grams);
  if (grams) return roundKg(grams / 1000);
  const fromProp = findShopifyLineItemProperty(item, [
    'weight', 'dead weight', 'package weight', 'item weight', 'product weight', 'wt',
  ]);
  if (fromProp) return roundKg(shopifyWeightToKg(fromProp, detectShopifyUnit(fromProp, '')));
  return 0;
}

function extractShopifyItemDimensionsCm(item) {
  const result = { length: 0, width: 0, height: 0 };
  mergeShopifyDimensions(result, {
    length: parsePositiveNumber(item?._length),
    width: parsePositiveNumber(item?._width),
    height: parsePositiveNumber(item?._height),
  });
  mergeShopifyDimensions(result, extractDimensionsFromProperties(item));
  return {
    length: roundCm(result.length),
    width: roundCm(result.width),
    height: roundCm(result.height),
  };
}

function extractShopifyItemDiscount(item) {
  const direct = parseFloat(item?.total_discount);
  if (Number.isFinite(direct) && direct > 0) return Number(direct.toFixed(2));
  const allocations = Array.isArray(item?.discount_allocations) ? item.discount_allocations : [];
  const fromAlloc = allocations.reduce((sum, row) => {
    const amount = parseFloat(row?.amount ?? row?.amount_set?.shop_money?.amount) || 0;
    return sum + amount;
  }, 0);
  return Number(fromAlloc.toFixed(2));
}

function resolveShopifyPackageMetrics(shopifyOrder) {
  const items = (shopifyOrder.line_items || []).filter((item) => !isCodTitle(item.title || item.name));
  const lines = items.map((item) => ({
    qty: item.quantity || 1,
    unitWeight: extractShopifyItemWeightKg(item),
    dims: extractShopifyItemDimensionsCm(item),
  }));

  // Dead weight: add unit weight of every quantity / every product.
  // 1 product qty 1 → unit weight
  // 1 product qty N → unit * N
  // multiple products → sum(unit * qty) of all products
  const summedWeight = lines.reduce((sum, line) => sum + (line.unitWeight * line.qty), 0);
  const orderKg = parsePositiveNumber(shopifyOrder.total_weight) / 1000;
  const deadWeight = roundKg(summedWeight > 0 ? summedWeight : orderKg) || 0.5;

  // Dimensions: never multiply by quantity.
  // 1 product (any qty) → that product's exact L/W/H
  // multiple products → max length, max breadth, max height independently
  let length = 0;
  let width = 0;
  let height = 0;
  for (const line of lines) {
    if (line.dims.length > length) length = line.dims.length;
    if (line.dims.width > width) width = line.dims.width;
    if (line.dims.height > height) height = line.dims.height;
  }

  const defaults = applyDefaultShopifyDims(roundCm(length), roundCm(width), roundCm(height));
  length = defaults.length;
  width = defaults.width;
  height = defaults.height;

  const volumetricWeight = (length && width && height)
    ? Number(((length * width * height) / 5000).toFixed(3))
    : deadWeight;

  return {
    deadWeight,
    length: length || 0,
    width: width || 0,
    height: height || 0,
    volumetricWeight,
  };
}

function resolveShopifyOrderDiscount(shopifyOrder) {
  const orderLevel = Math.max(
    parseFloat(shopifyOrder.current_total_discounts) || 0,
    parseFloat(shopifyOrder.total_discounts) || 0,
    parseFloat(shopifyOrder.current_total_discounts_set?.shop_money?.amount) || 0,
    parseFloat(shopifyOrder.total_discounts_set?.shop_money?.amount) || 0
  );
  const lineLevel = (shopifyOrder.line_items || []).reduce(
    (sum, item) => sum + extractShopifyItemDiscount(item),
    0
  );
  return Number(Math.max(orderLevel, lineLevel).toFixed(2));
}

function mergeShopifyCatalogEntry(catalog, id, incoming) {
  if (!id || !incoming) return;
  const prev = catalog[id] || {};
  const dims = {
    length: prev.length || 0,
    width: prev.width || 0,
    height: prev.height || 0,
  };
  mergeShopifyDimensions(dims, incoming);
  catalog[id] = {
    sku: incoming.sku || prev.sku || '',
    hsn: incoming.hsn || prev.hsn || '',
    gstRate: incoming.gstRate || prev.gstRate || 0,
    inventoryItemId: incoming.inventoryItemId || prev.inventoryItemId,
    productId: incoming.productId || prev.productId,
    weightKg: incoming.weightKg || prev.weightKg || 0,
    length: dims.length,
    width: dims.width,
    height: dims.height,
  };
}

function applyShopifyMetafieldsToCatalog(catalog, id, metafields) {
  if (!id) return;
  const dims = extractDimensionsFromMetafields(metafields);
  const weightKg = extractWeightFromMetafields(metafields);
  const hsn = String(findMetafieldValue(metafields, ['hsn', 'sac', 'harmonized']) || '').replace(/[^0-9A-Za-z]/g, '');
  const gstRaw = findMetafieldValue(metafields, ['gst', 'igst', 'tax.?rate', 'tax percent']);
  mergeShopifyCatalogEntry(catalog, id, {
    hsn,
    gstRate: gstRaw ? snapGstRate(parseGstPercent(gstRaw)) : 0,
    weightKg,
    length: dims.length,
    width: dims.width,
    height: dims.height,
  });
}

async function fetchShopifyVariantCatalog(shop, accessToken, variantIds, productIds = [], variantProductMap = {}) {
  const unique = [...new Set((variantIds || []).filter(Boolean).map(String))];
  const uniqueProducts = [...new Set((productIds || []).filter(Boolean).map(String))];
  const catalog = {};
  if (unique.length === 0) return catalog;

  for (const [variantId, productId] of Object.entries(variantProductMap || {})) {
    if (variantId && productId) {
      mergeShopifyCatalogEntry(catalog, String(variantId), { productId: String(productId) });
    }
  }

  const applyNode = (node) => {
    if (!node?.id) return;
    const numericId = String(node.id).split('/').pop();
    const productId = node.product?.id ? String(node.product.id).split('/').pop() : '';
    const sku = String(node.sku || node.inventoryItem?.sku || node.barcode || '').trim();
    const metafieldSources = [
      node.metafields,
      node.product?.metafields,
      node.inventoryItem?.metafields,
    ];
    const hsn = String(
      node.inventoryItem?.harmonizedSystemCode ||
      findMetafieldValue(node.metafields, ['hsn', 'sac', 'harmonized']) ||
      findMetafieldValue(node.product?.metafields, ['hsn', 'sac', 'harmonized']) ||
      findMetafieldValue(node.inventoryItem?.metafields, ['hsn', 'sac', 'harmonized']) ||
      ''
    ).replace(/[^0-9A-Za-z]/g, '');
    const gstRaw =
      findMetafieldValue(node.metafields, ['gst', 'igst', 'tax.?rate', 'tax percent']) ||
      findMetafieldValue(node.product?.metafields, ['gst', 'igst', 'tax.?rate', 'tax percent']);
    const measured = node.inventoryItem?.measurement?.weight || {};
    const weightKg = roundKg(
      shopifyWeightToKg(measured.value, measured.unit) ||
      shopifyWeightToKg(node.weight, node.weightUnit) ||
      metafieldSources.reduce((found, source) => found || extractWeightFromMetafields(source), 0)
    );
    const dims = { length: 0, width: 0, height: 0 };
    for (const source of metafieldSources) {
      mergeShopifyDimensions(dims, extractDimensionsFromMetafields(source));
    }
    mergeShopifyCatalogEntry(catalog, numericId, {
      sku,
      hsn,
      gstRate: gstRaw ? snapGstRate(parseGstPercent(gstRaw)) : 0,
      inventoryItemId: node.inventoryItem?.id
        ? String(node.inventoryItem.id).split('/').pop()
        : undefined,
      productId,
      weightKg,
      length: dims.length,
      width: dims.width,
      height: dims.height,
    });
  };

  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const ids = chunk.map((id) => `gid://shopify/ProductVariant/${id}`);
    try {
      // Weight/SKU first without metafields so a metafields scope error cannot drop catalog data.
      const payload = await shopifyGraphql(
        shop,
        accessToken,
        `query VariantCatalog($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              sku
              barcode
              inventoryItem {
                id
                sku
                harmonizedSystemCode
                measurement { weight { value unit } }
              }
              product { id }
            }
          }
        }`,
        { ids }
      );
      if (payload.errors) {
        console.error('Shopify variant catalog GraphQL errors:', JSON.stringify(payload.errors));
      }
      const nodes = payload.data?.nodes || [];
      for (const node of nodes) applyNode(node);
    } catch (err) {
      console.error('Shopify variant catalog fetch failed:', err.message);
    }

    try {
      const metafieldPayload = await shopifyGraphql(
        shop,
        accessToken,
        `query VariantMetafields($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              metafields(first: 50) { nodes { namespace key value type } }
              inventoryItem { metafields(first: 50) { nodes { namespace key value type } } }
              product { id metafields(first: 50) { nodes { namespace key value type } } }
            }
          }
        }`,
        { ids }
      );
      for (const node of metafieldPayload.data?.nodes || []) {
        applyNode(node);
      }
    } catch (err) {
      console.error('Shopify variant metafields GraphQL failed:', err.message);
    }
  }

  const missing = unique.filter((id) => !catalog[id]?.sku || !catalog[id]?.weightKg || !catalog[id]?.inventoryItemId);
  for (const id of missing.slice(0, 100)) {
    try {
      const payload = await shopifyAdminJson(shop, accessToken, `variants/${id}.json`);
      const variant = payload.variant || {};
      const sku = String(variant.sku || variant.barcode || '').trim();
      const weightKg = roundKg(
        (parsePositiveNumber(variant.grams) ? parsePositiveNumber(variant.grams) / 1000 : 0) ||
        shopifyWeightToKg(variant.weight, variant.weight_unit)
      );
      if (sku || variant.inventory_item_id || weightKg || variant.product_id) {
        mergeShopifyCatalogEntry(catalog, id, {
          sku,
          inventoryItemId: variant.inventory_item_id,
          productId: variant.product_id ? String(variant.product_id) : undefined,
          weightKg,
        });
      }
    } catch (err) {
      console.error('Shopify variant REST fetch failed:', id, err.message);
    }
  }

  // Draft-order line items often have grams: 0. Product variants still have the real weight.
  for (let i = 0; i < uniqueProducts.length; i += 50) {
    const chunk = uniqueProducts.slice(i, i + 50);
    if (!chunk.length) continue;
    try {
      const payload = await shopifyAdminJson(
        shop,
        accessToken,
        `products.json?ids=${encodeURIComponent(chunk.join(','))}&limit=250`
      );
      let products = payload.products || [];
      if (!products.length) {
        for (const productId of chunk) {
          const one = await shopifyAdminJson(shop, accessToken, `products/${productId}.json`);
          if (one.product) products.push(one.product);
        }
      }
      for (const product of products) {
        for (const variant of product.variants || []) {
          const id = String(variant.id);
          if (!unique.includes(id) && !catalog[id]) continue;
          const weightKg = roundKg(
            (parsePositiveNumber(variant.grams) ? parsePositiveNumber(variant.grams) / 1000 : 0) ||
            shopifyWeightToKg(variant.weight, variant.weight_unit)
          );
          mergeShopifyCatalogEntry(catalog, id, {
            sku: String(variant.sku || variant.barcode || '').trim(),
            inventoryItemId: variant.inventory_item_id,
            productId: String(product.id),
            weightKg,
          });
        }
      }
    } catch (err) {
      console.error('Shopify products REST fetch failed:', err.message);
    }
  }

  const needInventory = unique.filter((id) => catalog[id]?.inventoryItemId && (!catalog[id]?.hsn || !catalog[id]?.weightKg || !catalog[id]?.sku));
  for (const id of needInventory.slice(0, 100)) {
    const inventoryItemId = catalog[id].inventoryItemId;
    try {
      const payload = await shopifyAdminJson(shop, accessToken, `inventory_items/${inventoryItemId}.json`);
      const inventory = payload.inventory_item || {};
      const hsn = String(inventory.harmonized_system_code || '').replace(/[^0-9A-Za-z]/g, '');
      const sku = String(inventory.sku || '').trim();
      const weightKg = roundKg(shopifyWeightToKg(inventory.weight, inventory.weight_unit));
      mergeShopifyCatalogEntry(catalog, id, { hsn, sku, weightKg });
    } catch (err) {
      console.error('Shopify inventory item fetch failed:', inventoryItemId, err.message);
    }
  }

  const metafieldTargets = [];
  for (const id of unique.slice(0, 100)) {
    metafieldTargets.push({ kind: 'variants', id });
    if (catalog[id]?.productId) metafieldTargets.push({ kind: 'products', id: String(catalog[id].productId) });
  }
  for (const productId of uniqueProducts.slice(0, 100)) {
    metafieldTargets.push({ kind: 'products', id: productId });
  }
  const seenMeta = new Set();
  for (const target of metafieldTargets) {
    const key = `${target.kind}:${target.id}`;
    if (seenMeta.has(key)) continue;
    seenMeta.add(key);
    try {
      const payload = await shopifyAdminJson(shop, accessToken, `${target.kind}/${target.id}/metafields.json`);
      const metafields = payload.metafields || [];
      if (target.kind === 'variants') {
        applyShopifyMetafieldsToCatalog(catalog, target.id, metafields);
      } else {
        for (const variantId of unique) {
          if (String(catalog[variantId]?.productId) === String(target.id)) {
            applyShopifyMetafieldsToCatalog(catalog, variantId, metafields);
          }
        }
      }
    } catch (err) {
      console.error('Shopify metafields REST fetch failed:', target.kind, target.id, err.message);
    }
  }

  return catalog;
}

async function attachShopifyVariantCatalog(shop, accessToken, orders) {
  const variantIds = [];
  const productIds = [];
  const variantProductMap = {};
  for (const order of orders || []) {
    for (const item of order.line_items || []) {
      if (item.variant_id) variantIds.push(item.variant_id);
      if (item.product_id) productIds.push(item.product_id);
      if (item.variant_id && item.product_id) {
        variantProductMap[String(item.variant_id)] = String(item.product_id);
      }
    }
  }
  if (variantIds.length === 0) return;

  const catalog = await fetchShopifyVariantCatalog(shop, accessToken, variantIds, productIds, variantProductMap);
  for (const order of orders || []) {
    for (const item of order.line_items || []) {
      const mapped = catalog[String(item.variant_id)];
      if (!mapped) continue;
      if (mapped.sku) item.sku = extractShopifySku(item) || mapped.sku;
      if (mapped.hsn) item._hsn = mapped.hsn;
      if (mapped.gstRate) item._gstFromVariant = mapped.gstRate;
      if (mapped.weightKg) item._weightKg = mapped.weightKg;
      if (mapped.length) item._length = roundCm(mapped.length);
      if (mapped.width) item._width = roundCm(mapped.width);
      if (mapped.height) item._height = roundCm(mapped.height);
    }
  }
}

function convertShopifyOrderToModel(shopifyOrder, dbOrderId = null, sellerId = null) {
  const orderId = dbOrderId || '';

  const customerName = shopifyOrder.shipping_address
    ? `${shopifyOrder.shipping_address.first_name || ''} ${shopifyOrder.shipping_address.last_name || ''}`.trim()
    : (shopifyOrder.customer
      ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim()
      : '');

  const customerPhone =
    shopifyOrder.shipping_address?.phone ||
    shopifyOrder.billing_address?.phone ||
    shopifyOrder.customer?.phone ||
    null;

  const customerEmail =
    shopifyOrder.email ||
    shopifyOrder.contact_email ||
    shopifyOrder.customer?.email ||
    null;

  const shippingAddress = shopifyOrder.shipping_address || {};
  const billingAddress = shopifyOrder.billing_address || {};
  const totalItems = shopifyOrder.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Order Date = order banne ka date (created_at). processedAt (fulfilment
  // date) alag field me jaata hai — orderDate ko usse override nahi karna,
  // warna Order Date column galat date dikhata hai.
  const orderDate = shopifyOrder.created_at ? shopifyOrder.created_at.split('T')[0] : null;
  const processedAt = shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null;
  const cancelledAt = shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at) : null;
  const safeOrderDate = orderDate
    || (processedAt && !Number.isNaN(processedAt.getTime())
      ? processedAt.toISOString().split('T')[0]
      : null)
    || new Date().toISOString().split('T')[0];

  const isCod = isShopifyCodOrder(shopifyOrder);
  const { codCharge, fromLineItems } = extractShopifyCodCharge(shopifyOrder);
  const totalPrice = parseFloat(shopifyOrder.total_price) || 0;
  const outstandingRaw = parseFloat(shopifyOrder.total_outstanding);
  const totalDiscounts = resolveShopifyOrderDiscount(shopifyOrder);
  const discountCodes = (shopifyOrder.discount_codes || []).map((d) => ({
    code: d.code || '',
    amount: parseFloat(d.amount) || 0,
    type: d.type || 'fixed_amount',
  }));
  // Also capture discount_applications titles when codes are empty
  if (discountCodes.length === 0 && Array.isArray(shopifyOrder.discount_applications)) {
    for (const app of shopifyOrder.discount_applications) {
      const isPercent = String(app.value_type || app.type || '').toLowerCase().includes('percentage');
      discountCodes.push({
        code: app.code || app.title || app.description || 'Discount',
        amount: isPercent ? 0 : (parseFloat(app.value) || 0),
        type: app.value_type || app.type || 'fixed_amount',
      });
    }
  }
  const collectable = isCod
    ? (!Number.isNaN(outstandingRaw) && outstandingRaw > 0 ? outstandingRaw : totalPrice)
    : (!Number.isNaN(outstandingRaw) ? outstandingRaw : 0);

  const pkg = resolveShopifyPackageMetrics(shopifyOrder);

  const convertedOrder = {
    user_id: sellerId,
    shopifyid: shopifyOrder.id,
    orderNumber: shopifyOrder.order_number?.toString() || shopifyOrder.name?.replace('#', '') || null,
    sellerOrderId: shopifyOrder.name || shopifyOrder.order_number?.toString() || null,
    customerName,
    customerPhone,
    alternatePhone: (billingAddress.phone && billingAddress.phone !== customerPhone) ? billingAddress.phone : null,
    customerEmail,
    customerId: shopifyOrder.customer?.id ? String(shopifyOrder.customer.id) : null,
    seller: sellerId || 'My Store',
    courier: '-',
    status: mapShopifyFulfillmentStatus(shopifyOrder.fulfillment_status, shopifyOrder.cancelled_at),
    amount: totalPrice.toString(),
    orderDate: safeOrderDate,
    awb: '-',
    platform: 'Shopify',
    pincode: shippingAddress.zip || billingAddress.zip || null,
    city: shippingAddress.city || billingAddress.city || null,
    state: shippingAddress.province || billingAddress.province || null,
    addressLine1: shippingAddress.address1 || billingAddress.address1 || null,
    addressLine2: shippingAddress.address2 || billingAddress.address2 || null,
    landmark: null,
    addressType: shippingAddress.company ? 'Office' : 'Home',
    country: shippingAddress.country || billingAddress.country || 'India',
    orderTags: String(shopifyOrder.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    packageType: 'Box',
    packageCount: 1,
    shippingMode: 'Surface',
    orderType: 'B2C',
    totalItems,
    totalWeight: pkg.deadWeight,
    totalVolumetricWeight: pkg.volumetricWeight,
    packages: [{
      boxNo: 1,
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      deadWeight: pkg.deadWeight,
      volumetricWeight: pkg.volumetricWeight,
    }],
    shopifyOrderId: shopifyOrder.id,
    financialStatus: isCod ? 'pending' : 'paid',
    fulfillmentStatus: mapShopifyFulfillmentEnum(shopifyOrder.fulfillment_status),
    paymentGateway: isCod ? 'COD' : 'Prepaid',
    subtotalPrice: parseFloat(shopifyOrder.subtotal_price) || 0,
    totalTax: parseFloat(shopifyOrder.total_tax) || 0,
    totalDiscounts,
    discountCodes,
    totalShippingPrice: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount) || 0,
    totalOutstanding: collectable,
    codCharge: isCod ? codCharge : 0,
    currency: shopifyOrder.currency || 'INR',
    taxesIncluded: shopifyOrder.taxes_included || false,
    taxExempt: shopifyOrder.tax_exempt || false,
    confirmationNumber: shopifyOrder.confirmation_number || null,
    checkoutId: shopifyOrder.checkout_id || null,
    checkoutToken: shopifyOrder.checkout_token || null,
    orderStatusUrl: shopifyOrder.order_status_url || null,
    sourceName: shopifyOrder.source_name || null,
    browserIp: shopifyOrder.browser_ip || null,
    userAgent: shopifyOrder.client_details?.user_agent || null,
    shippingAddress,
    billingAddress,
    customerData: shopifyOrder.customer || null,
    processedAt,
    cancelledAt,
    cancelReason: shopifyOrder.cancel_reason || null,
    trackingnumber: null
  };

  Object.keys(convertedOrder).forEach((key) => {
    if (convertedOrder[key] === undefined) delete convertedOrder[key];
  });

  const taxesIncluded = !!shopifyOrder.taxes_included;
  const convertedOrderItems = shopifyOrder.line_items?.map((item) => {
    const quantity = item.quantity || 1;
    const gstRate = extractShopifyGstRate(item, shopifyOrder);
    const unitPrice = toExclusiveUnitPrice(parseFloat(item.price) || 0, gstRate, taxesIncluded);
    const itemDiscount = extractShopifyItemDiscount(item);
    const isCodItem = isCodTitle(item.title || item.name);
    const unitWeight = extractShopifyItemWeightKg(item);
    const dims = extractShopifyItemDimensionsCm(item);
    // Item keeps exact product L/W/H (not multiplied by qty).
    // Shopify often omits package dims — default those to 10×10×10 cm.
    const defaulted = applyDefaultShopifyDims(roundCm(dims.length), roundCm(dims.width), roundCm(dims.height));
    const length = isCodItem ? 0 : defaulted.length;
    const width = isCodItem ? 0 : defaulted.width;
    const height = isCodItem ? 0 : defaulted.height;
    const deadWeight = isCodItem
      ? null
      : (roundKg(unitWeight) || 0);

    return {
      orderId,
      name: item.title || item.name,
      sku: extractShopifySku(item),
      unitPrice,
      quantity,
      gstRate,
      discount: itemDiscount,
      hsnCode: extractShopifyHsn(item),
      totalPrice: unitPrice * quantity,
      height: isCodItem ? 0 : (height || 0),
      width: isCodItem ? 0 : (width || 0),
      length: isCodItem ? 0 : (length || 0),
      deadWeight,
      volumetricWeight: isCodItem || !(length && width && height)
        ? null
        : Number(((length * width * height) / 5000).toFixed(3))
    };
  }) || [];

  // If seller added COD as shipping/fee (not a product line), add it as an order item
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

  return { order: convertedOrder, orderItems: convertedOrderItems };
}

async function fetchShopifyOrdersFromApi({ shop, accessToken, dateFrom, dateTo }) {
  const params = new URLSearchParams({
    status: 'any',
    limit: '250',
  });

  if (dateFrom) params.set('created_at_min', new Date(dateFrom).toISOString());
  if (dateTo) params.set('created_at_max', new Date(dateTo).toISOString());

  let url = `https://${shop}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params.toString()}`;
  const allOrders = [];

  while (url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.errors || data.error || response.statusText;
      throw new Error(`Shopify orders fetch failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }

    if (Array.isArray(data.orders)) {
      allOrders.push(...data.orders);
    }

    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const nextMatch = linkHeader.split(',').find((s) => s.includes('rel="next"'));
      url = nextMatch ? nextMatch.match(/<(.*)>/)?.[1] || null : null;
    } else {
      url = null;
    }
  }

  return allOrders;
}

async function syncShopifyOrders(tmpdata) {
  // Prefer credentials from saved integration when user_id is present
  let shop = tmpdata.SHOP || tmpdata.storeUrl;
  let clientId = tmpdata.CLIENT_ID || tmpdata.clientid || tmpdata.clientId;
  let clientSecret = tmpdata.CLIENT_SECRET || tmpdata.clientSecret || tmpdata.accessToken;

  if (tmpdata.user_id) {
    const integration = await Integration.findOne({
      where: { user_id: tmpdata.user_id, type: 'Shopify' },
      order: [['updatedAt', 'DESC']],
    });
    if (integration?.credentials) {
      const creds = integration.credentials;
      shop = shop || creds.storeUrl;
      clientId = clientId || creds.clientid || creds.clientId;
      clientSecret = clientSecret || creds.accessToken || creds.clientSecret;
    }
  }

  const { shop: normalizedShop, accessToken } = await getShopifyAccessToken({
    SHOP: shop,
    CLIENT_ID: clientId,
    CLIENT_SECRET: clientSecret,
  });

  // Existing Shopify order numbers / IDs for this user (dedupe)
  let ordernumlist = Array.isArray(tmpdata.ordernumlist) ? tmpdata.ordernumlist.map(String) : [];
  try {
    if (tmpdata.user_id) {
      const existing = await Order.findAll({
        where: {
          platform: 'Shopify',
          [Op.or]: [
            { user_id: tmpdata.user_id },
            { seller: String(tmpdata.user_id) },
          ],
        },
        attributes: ['orderNumber', 'shopifyOrderId'],
      });
      const fromDb = existing.flatMap((o) =>
        [o.orderNumber, o.shopifyOrderId].filter(Boolean).map(String)
      );
      ordernumlist = Array.from(new Set([...ordernumlist, ...fromDb]));
    }
  } catch (e) {
    console.error('Failed loading existing Shopify order numbers:', e.message);
  }

  const allOrders = await fetchShopifyOrdersFromApi({
    shop: normalizedShop,
    accessToken,
    dateFrom: tmpdata.dateFrom || tmpdata.created_at_min,
    dateTo: tmpdata.dateTo || tmpdata.created_at_max,
  });

  await attachShopifyVariantCatalog(normalizedShop, accessToken, allOrders);

  const syncedOrders = [];
  const errors = [];






const fs = require("fs/promises");

        await fs.writeFile(
          "./allldata.json",
          JSON.stringify(allOrders, null, 2),
          "utf8",
        );







  for (const shopifyOrder of allOrders) {
    const converted = convertShopifyOrderToModel(shopifyOrder, null, tmpdata.user_id);
    const orderNumber = converted.order.orderNumber != null ? String(converted.order.orderNumber) : null;
    const shopifyOrderId = converted.order.shopifyOrderId != null ? String(converted.order.shopifyOrderId) : null;

    if (!orderNumber) continue;
    if (ordernumlist.includes(orderNumber) || (shopifyOrderId && ordernumlist.includes(shopifyOrderId))) {
      try {
        const existing = await Order.findOne({
          where: {
            platform: 'Shopify',
            [Op.and]: [
              {
                [Op.or]: [
                  { user_id: tmpdata.user_id },
                  { seller: String(tmpdata.user_id) },
                ],
              },
              {
                [Op.or]: [
                  { orderNumber },
                  ...(shopifyOrderId ? [{ shopifyOrderId }, { shopifyid: shopifyOrderId }] : []),
                ],
              },
            ],
          },
        });
        const canRefresh =
          existing &&
          String(existing.status || '').toLowerCase() === 'pending' &&
          (!existing.awb || existing.awb === '-');
        if (canRefresh) {
          await existing.update({
            totalWeight: converted.order.totalWeight,
            totalVolumetricWeight: converted.order.totalVolumetricWeight,
            packages: converted.order.packages,
            totalTax: converted.order.totalTax,
            taxesIncluded: converted.order.taxesIncluded,
            totalItems: converted.order.totalItems,
          });
          await OrderItem.destroy({ where: { orderId: existing.id } });
          await OrderItem.bulkCreate(
            converted.orderItems.map((item) => ({ ...item, orderId: existing.id }))
          );
        }
      } catch (err) {
        console.error('Shopify order refresh failed:', orderNumber, err.message);
      }
      continue;
    }
    // Import open/unfulfilled orders only
    if (converted.order.status !== 'Pending') continue;

    try {
      await orderService.createOrder({
        order: converted.order,
        items: converted.orderItems,
        seller: tmpdata.user_id,
        user_id: tmpdata.user_id,
      });
      syncedOrders.push(converted.order);
      ordernumlist.push(orderNumber);
      if (shopifyOrderId) ordernumlist.push(shopifyOrderId);
    } catch (err) {
      errors.push(`Order ${orderNumber}: ${err.message}`);
      console.error('Shopify order import failed:', orderNumber, err.message);
    }
  }

  try {
    if (tmpdata.user_id) {
      const integration = await Integration.findOne({
        where: { user_id: tmpdata.user_id, type: 'Shopify' },
      });
      if (integration) {
        await integration.update({ lastSync: new Date(), isActive: true });
      }
    }
  } catch (e) {
    console.error('Failed to update Shopify lastSync:', e.message);
  }

  return {
    fetchedCount: allOrders.length,
    syncedCount: syncedOrders.length,
    orders: syncedOrders,
    errors,
  };
}

// Routes
router.get('/', integrationController.getAll);
router.get('/:id', param('id').isUUID(), integrationController.getById);
router.post('/', validateIntegration, integrationController.create);
router.post('/syncsopify', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncShopifyOrders({
      SHOP: body.SHOP || body.storeUrl,
      CLIENT_ID: body.CLIENT_ID || body.clientid || body.clientId,
      CLIENT_SECRET: body.CLIENT_SECRET || body.clientSecret || body.accessToken,
      user_id: body.user_id,
      ordernumlist: body.ordernumlist || [],
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
    });

    res.json({
      success: true,
      message: `Synced ${result.syncedCount} of ${result.fetchedCount} Shopify orders`,
      data: result.orders,
      syncedCount: result.syncedCount,
      fetchedCount: result.fetchedCount,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error syncing Shopify orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Shopify orders',
      error: error.message,
    });
  }
});




 async function getWoocomarceData(tmpdata) {
    
   const consumerKey = tmpdata.apiKey;
const consumerSecret = tmpdata.apiSecret;
const siteUrl = tmpdata.storeUrl.trim()+'/wp-json/wc/v3/orders';

// Encode credentials to Base64
const token = btoa(`${consumerKey}:${consumerSecret}`);


    let response = await fetch(siteUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
    response=await response.json()
return response

}





 router.post('/syncwoocomerce', async (req, res)=>{
    try {
    

    let data=await getWoocomarceData(req.body)

      res.json({
        success: true,
        message: ' successfully',
        data:data
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      });
    }
 });



  router.post('/getlabel', async (req, res)=>{
    try {
    

  let response=await allfuncalculate.getLabel(req)

      res.json({
        success: true,
        message: ' successfully',
        data:response
       
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      });
    }
 });






 async function rateCalculated(tmpdata) {


  let ekartRates = await allfuncalculate.getEkartrateCalculated(tmpdata);
  let innofulfillRates = await allfuncalculate.getInnofulfillData(tmpdata);

  let returndata=[]
  console.log("EKART Rates:", ekartRates);
  console.log("Innofulfill Rates:", innofulfillRates);

if(ekartRates?.total){
  returndata.push({type:"EKART",rates:ekartRates.total});
}
if(innofulfillRates?.shippingCharge){
  returndata.push({type:"INNOFULFILL",rates:Number(innofulfillRates.shippingCharge)+Number(innofulfillRates.fuelCharges)});
}
   


   return returndata

   /* 
 
 {
    "shipmentType": "FORWARD",
    "packageType": "SPS",
    "originPincode": "201303",
    "deliveryPincode": "202024",
    "paymentMode": "PREPAID",
    "weight": 2,
    "invoiceValue": 50,
    "dimensions": {
        "length": 12,
        "width": 12,
        "height": 10
    },
    "serviceType": "domestic"
}


*/







     
















 }

  router.post('/ratecalculate', async (req, res)=>{
    try {
    

    let data=await rateCalculated(req.body)

      res.json({
        success: true,
        message: ' successfully',
        data:data
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      }); 
    }
 });


   router.post('/ratechartset', async (req, res)=>{
    try {
    const user = await User.findByPk(req.body.user_id);         
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    await user.update({ ratechart: req.body.data});
      res.json({
        success: true,
        message: ' successfully' 
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      }); 
    }
 });

router.post('/pincodechartget_', async (req, res) => {
  try {
    const { pincodedate, courier_name } = req.query;

    
    // Validate required parameter
    if (!pincodedate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameter: pincodedate'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(pincodedate)) {
      return res.status(400).json({
        success: false,
        message: 'pincodedate must be in YYYY-MM-DD format'
      });
    }

    // Build query conditions
    const whereClause = { pincodedate };
    if (courier_name) {
      whereClause.courier_name = courier_name;
    }

    const records = await Pincode.findAll({
      where: whereClause,
      order: [['courier_name', 'ASC']]
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No rate data found for pincodedate: ${pincodedate}${courier_name ? ` and courier: ${courier_name}` : ''}`
      });
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching rate data by date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

   router.post('/pincodechartset', async (req, res)=>{
   try {
    const { courier_name, data, pincodedate } = req.body;

    // Basic validation
    if (!courier_name || !data || !pincodedate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: courier_name, data, pincodedate'
      });
    }

    // Validate date format (basic)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(pincodedate)) {
      return res.status(400).json({
        success: false,
        message: 'pincodedate must be in YYYY-MM-DD format'
      });
    }

    // Check if record exists with same courier_name and pincodedate
    const existing = await Pincode.findOne({
      where: {
        courier_name: courier_name,
        pincodedate: pincodedate
      }
    });

    let result;
    if (existing) {
      // Update existing record
      existing.data = data;
      await existing.save();
      result = existing;
      res.status(200).json({
        success: true,
        message: 'Rate chart updated successfully',
        data: result
      });
    } else {
      // Create new record
      const newRecord = await Pincode.create({
        courier_name,
        data,
        pincodedate
      });
      result = newRecord;
      res.status(201).json({
        success: true,
        message: 'Rate chart created successfully',
        data: result
      });
    }
  } catch (error) {
    console.error('Upsert error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
 });
 router.post('/getpindetail', async (req, res)=>{
    try {
  let response = await fetch(`https://api.postalpincode.in/pincode/${req.body.pincodefrom}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json', 
      },
    });

     let response2 = await fetch(`https://api.postalpincode.in/pincode/${req.body.pincodeto}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
      res.json({
        success: true,
        message: ' successfully' ,
        data:await response.json(),
        data2:await response2.json()
      });

    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration',
        error: error.message
      }); 
    }
 });




router.put('/:id', param('id').isUUID(), validateIntegration, integrationController.update);
router.delete('/:id', param('id').isUUID(), integrationController.delete);
router.post('/test', validateTestConnection, integrationController.testConnection);

module.exports = router;
