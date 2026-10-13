export function lineGross(item: any): number {
  const unit = Number(item?.unitPrice) || 0;
  const qty = Number(item?.quantity) || 0;
  return unit * qty;
}

export function lineNet(item: any): number {
  const discount = Number(item?.discount) || 0;
  return Math.max(0, lineGross(item) - discount);
}

export function lineGst(item: any): number {
  return (lineGross(item) * (Number(item?.gstRate) || 0)) / 100;
}

export function lineTotal(item: any): number {
  const discount = Number(item?.discount) || 0;
  return Number(Math.max(0, lineGross(item) + lineGst(item) - discount).toFixed(2));
}

export function isCodPayment(gateway: unknown): boolean {
  const g = String(gateway || "").toLowerCase();
  return g === "cod" || g.includes("cash on delivery") || g.includes("cod");
}

function differs(a: number, b: number) {
  return Math.abs(Number(a) - Number(b)) > 0.009;
}

function parseSavedAmount(value: unknown): number {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Single source of truth for create / edit / clone order payment math. */
export function computeOrderFinancials(formData: any) {
  const items = Array.isArray(formData?.items) ? formData.items : [];
  const itemSubtotal = items.reduce(
    (acc: number, item: any) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );
  const itemDiscount = items.reduce((acc: number, item: any) => acc + (Number(item.discount) || 0), 0);
  const itemGst = items.reduce((acc: number, item: any) => acc + lineGst(item), 0);
  const shipping = Math.max(0, Number(formData?.totalShippingPrice) || 0);
  const tax = formData?.paymentTaxManual
    ? Math.max(0, Number(formData.totalTax) || 0)
    : itemGst;
  const discount = formData?.paymentDiscountManual
    ? Math.max(0, Number(formData.totalDiscounts) || 0)
    : itemDiscount;
  const goodsBase = itemSubtotal;
  const computedPayable = Math.max(
    0,
    Number((itemSubtotal + tax + shipping - discount).toFixed(2))
  );
  const payable = formData?.paymentPayableManual
    ? Math.max(0, Number(formData.payableAmount) || 0)
    : computedPayable;
  const isCod = isCodPayment(formData?.paymentGateway);
  const outstanding = isCod
    ? formData?.paymentCodManual
      ? Math.max(0, Number(formData.totalOutstanding) || 0)
      : payable
    : 0;

  return {
    itemSubtotal: Number(itemSubtotal.toFixed(2)),
    itemDiscount: Number(itemDiscount.toFixed(2)),
    itemGst: Number(itemGst.toFixed(2)),
    orderDiscount: Number(discount.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    goodsBase: Number(goodsBase.toFixed(2)),
    payable,
    outstanding: Number(Number(outstanding).toFixed(2)),
    isCod,
  };
}

/** Preserve saved payment overrides on edit/clone; otherwise keep fields in sync with items. */
export function withPaymentManualFlags(formData: any) {
  const auto = computeOrderFinancials({
    ...formData,
    paymentTaxManual: false,
    paymentDiscountManual: false,
    paymentCodManual: false,
    paymentPayableManual: false,
  });
  const savedTax = Number(formData?.totalTax);
  const savedDisc = Number(formData?.totalDiscounts);
  const taxManual = Number.isFinite(savedTax) && savedTax > 0 && differs(savedTax, auto.itemGst);
  const discountManual = Number.isFinite(savedDisc) && savedDisc > 0 && differs(savedDisc, auto.itemDiscount);
  const withOverrides = computeOrderFinancials({
    ...formData,
    paymentTaxManual: taxManual,
    paymentDiscountManual: discountManual,
    paymentCodManual: false,
    paymentPayableManual: false,
  });
  const savedCod = Number(formData?.totalOutstanding);
  const savedPayable = parseSavedAmount(formData?.payableAmount ?? formData?.amount);
  const payableManual =
    Number.isFinite(savedPayable) &&
    savedPayable > 0 &&
    differs(savedPayable, withOverrides.payable);
  const withPayable = computeOrderFinancials({
    ...formData,
    paymentTaxManual: taxManual,
    paymentDiscountManual: discountManual,
    paymentCodManual: false,
    paymentPayableManual: payableManual,
    payableAmount: payableManual ? savedPayable : withOverrides.payable,
  });
  const codManual =
    withPayable.isCod &&
    Number.isFinite(savedCod) &&
    savedCod > 0 &&
    differs(savedCod, withPayable.payable);
  return {
    ...formData,
    paymentTaxManual: taxManual,
    paymentDiscountManual: discountManual,
    paymentCodManual: codManual,
    paymentPayableManual: payableManual,
    payableAmount: payableManual ? savedPayable : withPayable.payable,
  };
}
