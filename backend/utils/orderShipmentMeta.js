function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function saneDim(value, fallback = 0) {
  const n = toNum(value, 0);
  if (n < 0.1 || n > 306) return fallback;
  return Number(n.toFixed(2));
}

const DEFAULT_PACKAGE_DIM_CM = 10;

function parsePackages(order = {}) {
  let packages = order.packages;
  if (typeof packages === "string") {
    try {
      packages = JSON.parse(packages);
    } catch {
      packages = [];
    }
  }
  return Array.isArray(packages) ? packages : [];
}

function firstPackage(order = {}) {
  return parsePackages(order)[0] || null;
}

function firstItem(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items[0] || {};
}

function cleanPhone(phone) {
  return String(phone || "")
    .replace(/^\+91/, "")
    .replace(/\D/g, "")
    .slice(-10);
}

function normalizeItems(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const pkg = firstPackage(order);
  return items.map((item, index) => {
    const quantity = Math.max(1, toNum(item.quantity, 1));
    const unitPrice = toNum(item.unitPrice ?? item.price, 0);
    const gstRate = toNum(item.gstRate ?? item.gst, 0);
    const discount = toNum(item.discount, 0);
    const gross = unitPrice * quantity;
    const gstAmount = (gross * gstRate) / 100;
    const totalPrice = toNum(item.totalPrice, Number(Math.max(0, gross + gstAmount - discount).toFixed(2)));
    const length = saneDim(item.length, saneDim(pkg?.length, 0));
    const width = saneDim(item.width, saneDim(pkg?.width, 0));
    const height = saneDim(item.height, saneDim(pkg?.height, 0));
    const deadWeight = toNum(item.deadWeight ?? item.weight, toNum(pkg?.deadWeight, 0));
    return {
      ...item,
      name: item.name || `Item ${index + 1}`,
      sku: item.sku || item.productId || `SKU-${index + 1}`,
      hsnCode: item.hsnCode || item.hsn || item.hsn_code || "",
      quantity,
      unitPrice,
      gstRate,
      discount,
      totalPrice,
      length,
      width,
      height,
      deadWeight,
      volumetricWeight: toNum(
        item.volumetricWeight,
        length && width && height ? Number(((length * width * height) / 5000).toFixed(3)) : 0
      ),
    };
  });
}

function resolvePackageMeta(order = {}) {
  const pkg = firstPackage(order);
  const item = firstItem(order);
  const items = normalizeItems(order);
  let length =
    saneDim(order.pkgLength, saneDim(pkg?.length, saneDim(item.length, 0)));
  let width =
    saneDim(order.pkgWidth, saneDim(pkg?.width, saneDim(item.width, 0)));
  let height =
    saneDim(order.pkgHeight, saneDim(pkg?.height, saneDim(item.height, 0)));
  const itemDead = items.reduce((sum, it) => {
    const name = String(it.name || "").toLowerCase();
    if (/(^|[^a-z])cod([^a-z]|$)|cash on delivery|cod\s*(charge|charges|fee|fees)/i.test(name)) return sum;
    return sum + toNum(it.deadWeight, 0) * Math.max(1, toNum(it.quantity, 1));
  }, 0);
  const packages = parsePackages(order);
  const pkgDead = packages.reduce((sum, p) => sum + toNum(p.deadWeight, 0), 0);
  const deadWeight =
    toNum(order.totalWeight, 0) ||
    toNum(order.shipmentWeight, 0) ||
    pkgDead ||
    itemDead ||
    0.5;
  const storedVol = toNum(order.totalVolumetricWeight, 0) || toNum(pkg?.volumetricWeight, 0);
  if (!(length > 0 && width > 0 && height > 0)) {
    length = length || DEFAULT_PACKAGE_DIM_CM;
    width = width || DEFAULT_PACKAGE_DIM_CM;
    height = height || DEFAULT_PACKAGE_DIM_CM;
  }
  const volumetric = (length && width && height)
    ? Number(((length * width * height) / 5000).toFixed(3))
    : (storedVol > 0 && storedVol < 500 ? Number(storedVol.toFixed(3)) : deadWeight);
  const packageCount = Math.max(
    1,
    toNum(order.packageCount, packages.length || 1) || 1
  );
  const shippingMode = String(
    order.shippingMode || order.freightMode || "Surface"
  )
    .toUpperCase()
    .includes("AIR")
    ? "AIR"
    : "SURFACE";

  return {
    length,
    width,
    height,
    deadWeight,
    volumetricWeight: volumetric,
    chargeableWeight: Math.max(deadWeight, volumetric, 0.5),
    packageCount,
    packageType: order.packageType || pkg?.packageType || "Box",
    shippingMode,
  };
}

function isCodOrder(order = {}) {
  const gateway = String(order.paymentGateway || "").toLowerCase();
  const financial = String(order.financialStatus || "").toLowerCase();
  return (
    financial === "pending" ||
    gateway === "cod" ||
    gateway.includes("cash on delivery") ||
    gateway.includes("cod")
  );
}

function resolveOrderAmount(order = {}) {
  const fromAmount = toNum(order.amount, 0);
  if (fromAmount > 0) return Number(fromAmount.toFixed(2));
  const items = normalizeItems(order);
  const itemsTotal = items.reduce((sum, item) => sum + toNum(item.totalPrice, 0), 0);
  const shipping = resolveShippingCharges(order);
  const discount = toNum(order.totalDiscounts, 0);
  return Math.max(0, Number((itemsTotal + shipping - discount).toFixed(2)));
}

function resolveCodAmount(order = {}) {
  if (!isCodOrder(order)) return 0;
  const outstanding = toNum(order.totalOutstanding, 0);
  if (outstanding > 0) return Number(outstanding.toFixed(2));
  return outstanding
}

function resolveDiscount(order = {}) {
  const direct = toNum(order.totalDiscounts, 0);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemDiscount = items.reduce((sum, item) => sum + toNum(item.discount, 0), 0);
  if (direct > 0 || itemDiscount > 0) return Number((direct + (direct > 0 ? 0 : itemDiscount)).toFixed(2));
  const codes = Array.isArray(order.discountCodes) ? order.discountCodes : [];
  const fromCodes = codes.reduce((sum, code) => sum + toNum(code?.amount, 0), 0);
  return Number(Math.max(0, fromCodes).toFixed(2));
}

function resolveShippingCharges(order = {}) {
  return toNum(order.totalShippingPrice, 0);
}

function resolveTax(order = {}) {
  const direct = toNum(order.totalTax, 0);
  if (direct > 0) return Number(direct.toFixed(2));
  const items = normalizeItems(order);
  const fromItems = items.reduce((sum, item) => {
    const line = Math.max(0, item.unitPrice * item.quantity);
    return sum + (line * item.gstRate) / 100;
  }, 0);
  return Number(fromItems.toFixed(2));
}

function resolveCountry(order = {}) {
  return order.country || order.shippingAddress?.country || "India";
}

function resolveAddressType(order = {}) {
  const raw = String(order.addressType || order.shippingAddress?.address_type || "Home").toLowerCase();
  if (raw.includes("office") || raw.includes("work") || raw === "o") return "Office";
  if (raw.includes("other")) return "Other";
  return "Home";
}

function resolveAddressTypeForCourier(order = {}, courier = "") {
  const type = resolveAddressType(order);
  const c = String(courier || "").toLowerCase();
  if (c.includes("delhivery")) return type === "Office" ? "office" : "home";
  if (c.includes("shadowfax")) return type === "Office" ? "office" : "residential";
  if (c.includes("bluedart") || c.includes("blue dart")) return type === "Office" ? "O" : "R";
  if (c.includes("ekart")) return type === "Office" ? "Office" : "Home";
  return type;
}

function resolveAlternatePhone(order = {}) {
  return cleanPhone(order.alternatePhone || order.shippingAddress?.phone2 || "");
}

function resolveOrderTags(order = {}) {
  if (Array.isArray(order.orderTags)) return order.orderTags.filter(Boolean);
  if (typeof order.orderTags === "string" && order.orderTags.trim()) {
    return order.orderTags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function extraOrderPersistFields(orderData = {}) {
  return {
    alternatePhone: orderData.alternatePhone || null,
    customerId: orderData.customerId || null,
    sellerOrderId: orderData.sellerOrderId || null,
    orderTags: Array.isArray(orderData.orderTags)
      ? orderData.orderTags
      : typeof orderData.orderTags === "string" && orderData.orderTags.trim()
        ? orderData.orderTags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    addressType: orderData.addressType || "Home",
    country: orderData.country || "India",
    packageType: orderData.packageType || "Box",
    packageCount: toNum(orderData.packageCount, 1) || 1,
    shippingMode: orderData.shippingMode || "Surface",
    courierService: orderData.courierService || null,
    expectedDeliveryDate: orderData.expectedDeliveryDate || null,
    freightMode: orderData.freightMode || orderData.shippingMode || null,
    sourceName: orderData.sourceName || null,
    zone: orderData.zone || orderData.shippingZone || null,
  };
}

function normalizeOrderForShipment(order = {}) {
  const items = normalizeItems(order);
  const withItems = { ...order, items };
  const pkg = resolvePackageMeta(withItems);
  const discount = resolveDiscount(withItems);
  const tax = resolveTax(withItems);
  const shipping = resolveShippingCharges(withItems);
  const isCod = isCodOrder(withItems);
  const amount = resolveOrderAmount(withItems);
  const packages = parsePackages(order);
  const resolvedPackages =
    packages.length > 0
      ? packages
      : Array.from({ length: pkg.packageCount }, (_, i) => ({
          boxNo: i + 1,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          deadWeight: pkg.deadWeight / pkg.packageCount,
          volumetricWeight: pkg.volumetricWeight,
        }));

  return {
    ...order,
    items,
    packages: resolvedPackages,
    customerName: order.customerName || "",
    customerPhone: cleanPhone(order.customerPhone),
    customerEmail: order.customerEmail || "",
    alternatePhone: resolveAlternatePhone(order),
    addressLine1: order.addressLine1 || "",
    addressLine2: order.addressLine2 || "",
    landmark: order.landmark || "",
    pincode: String(order.pincode || "").replace(/\D/g, "").slice(0, 6),
    city: order.city || "",
    state: order.state || "",
    country: resolveCountry(order),
    addressType: resolveAddressType(order),
    warehouse: order.warehouse || null,
    packageType: pkg.packageType,
    packageCount: pkg.packageCount,
    shippingMode: pkg.shippingMode === "AIR" ? "Air" : "Surface",
    freightMode: pkg.shippingMode === "AIR" ? "Air" : "Surface",
    totalWeight: pkg.deadWeight,
    totalVolumetricWeight: pkg.volumetricWeight,
    totalDiscounts: discount,
    totalTax: tax,
    totalShippingPrice: shipping,
    totalOutstanding: isCod ? resolveCodAmount(withItems) : 0,
    paymentGateway: isCod ? "COD" : order.paymentGateway || "Prepaid",
    financialStatus: isCod ? "pending" : order.financialStatus || "paid",
    amount: order.amount || `₹${amount.toFixed(2)}`,
    orderTags: resolveOrderTags(order),
    expectedDeliveryDate: order.expectedDeliveryDate || null,
    _shipment: {
      ...pkg,
      isCod,
      amount,
      discount,
      tax,
      shipping,
      codAmount: isCod ? resolveCodAmount(withItems) : 0,
    },
  };
}

module.exports = {
  toNum,
  toNum: toNum,
  parsePackages,
  parsePackages: parsePackages,
  normalizeItems,
  normalizeItems: normalizeItems,
  resolvePackageMeta,
  resolvePackageMeta: resolvePackageMeta,
  isCodOrder,
  isCodOrder: isCodOrder,
  resolveOrderAmount,
  resolveCodAmount,
  resolveCodAmount: resolveCodAmount,
  resolveDiscount,
  resolveDiscount: resolveDiscount,
  resolveShippingCharges,
  resolveShippingCharges: resolveShippingCharges,
  resolveTax,
  resolveCountry,
  resolveAddressType,
  resolveAddressType: resolveAddressType,
  resolveAddressTypeForCourier,
  resolveAlternatePhone,
  resolveAlternatePhone: resolveAlternatePhone,
  resolveOrderTags,
  extraOrderPersistFields,
  extraOrderPersistFields: extraOrderPersistFields,
  extraOrderPersistFields: extraOrderPersistFields,
  normalizeOrderForShipment,
  normalizeOrderForShipment: normalizeOrderForShipment,
};
