import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getuser } from "../../../services/getbasicdata";
import pincodelist from "../../apiglobal/pincodelist.json";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { computeOrderFinancials, lineTotal } from "@/lib/orderMoney";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const CHANNELS = ["Manual", "Shopify", "Amazon", "WooCommerce", "Website", "Custom", "Other"];
const PACKAGE_TYPES = ["Box", "Flyer", "Envelope", "Bag"];
const ORDER_TAG_OPTIONS = [
  "New Customer",
  "Repeat Customer",
  "VIP Customer",
  "High Value Order",
  "Fragile",
  "Gift Order",
  "Urgent / Priority",
  "Same Day Dispatch",
  "Exchange Order",
  "Replacement Order",
  "International",
  "Marketplace Order",
  "Manual Order",
  "Test Order",
];

function warehouseId(w: any) {
  return w?.id == null ? "" : String(w.id);
}

function isDefaultWarehouse(w: any) {
  return !!(w?.isDefault || w?.isDefault);
}

async function getPincodeDetails(pincode: string) {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    if (data[0].Status === "Success" && data[0].PostOffice.length > 0) {
      const post = data[0].PostOffice[0];
      return { pincode: post.Pincode, City: post.Region || post.Name, State: post.State };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

type Props = {
  formData: any;
  allsellerlist: any[];
  warehouselist: any[];
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleItemChange: (index: number, field: any, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  errors?: any;
  setErrors?: any;
};

const FieldLabel = ({
  htmlFor,
  required,
  optional,
  children,
  error,
}: {
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  error?: boolean;
}) => (
  <Label htmlFor={htmlFor} className={error ? "text-red-500" : ""}>
    {children}
    {required ? <span className="text-red-500"> *</span> : null}
    {optional ? <span className="text-muted-foreground font-normal"> (Optional)</span> : null}
  </Label>
);

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border bg-card p-4 md:p-5 space-y-4">
    <h3 className="text-sm font-semibold">{n}. {title}</h3>
    {children}
  </section>
);

const OrderFormFields = ({
  formData,
  allsellerlist,
  warehouselist,
  setFormData,
  handleItemChange,
  addItem,
  removeItem,
  errors = {},
  setErrors,
}: Props) => {
  const [fetchingPin, setFetchingPin] = useState(false);

  const getError = (field: string, index?: number) => {
    if (!errors) return null;
    if (index !== undefined && errors.items && errors.items[index]) return errors.items[index][field];
    return errors[field];
  };

  const patch = (next: Record<string, any>) => setFormData((f: any) => ({ ...f, ...next }));

  const defaultWarehouseId = warehouseId(
    (warehouselist || []).find((w: any) => isDefaultWarehouse(w)) || (warehouselist || [])[0]
  );

  useEffect(() => {
    if (formData.warehouse || !defaultWarehouseId) return;
    patch({ warehouse: defaultWarehouseId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWarehouseId, formData.warehouse]);

  const fetchAddress = async () => {
    const pin = String(formData.pincode ?? "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(pin)) {
      if (setErrors) setErrors((prev: any) => ({ ...prev, pincode: "Enter valid 6 digit pincode" }));
      return;
    }
    setFetchingPin(true);
    try {
      for (const x of (pincodelist as any).Sheet1 || []) {
        if (String(x.Pincode) === pin) {
          patch({ pincode: pin, city: x.City, state: x.State });
          if (setErrors) setErrors((p: any) => ({ ...p, pincode: null, city: null, state: null }));
          return;
        }
      }
      const response = await getPincodeDetails(pin);
      patch({ pincode: pin, city: (response as any).City || "", state: (response as any).State || "" });
    } finally {
      setFetchingPin(false);
    }
  };

  const items = Array.isArray(formData?.items) ? formData.items : [];
  const money = computeOrderFinancials(formData);
  const itemSubtotal = money.itemSubtotal;
  const itemDiscount = money.itemDiscount;
  const itemGst = money.itemGst;
  const tax = money.tax;
  const itemGrandTotal = Math.max(0, Number((itemSubtotal - itemDiscount + itemGst).toFixed(2)));
  const orderValue = money.payable;
  const grandTotal = money.payable;
  const isCod = money.isCod;

  const pkgL = Number(formData.pkgLength) || 0;
  const pkgW = Number(formData.pkgWidth) || 0;
  const pkgH = Number(formData.pkgHeight) || 0;
  const dead = Number(formData.shipmentWeight) || 0;
  const volumetric = pkgL && pkgW && pkgH ? Number(((pkgL * pkgW * pkgH) / 5000).toFixed(2)) : 0;
  const chargeable = Math.max(dead, volumetric);
  const tags: string[] = Array.isArray(formData.orderTags) ? formData.orderTags : [];
  const isB2B = String(formData.orderType || "B2C").toUpperCase().startsWith("B2B");

  const itemLineTotal = (item: any) => lineTotal(item);

  const prevItemGst = useRef(itemGst);
  const prevItemDiscount = useRef(itemDiscount);
  useEffect(() => {
    if (prevItemGst.current === itemGst && prevItemDiscount.current === itemDiscount) return;
    const gstChanged = prevItemGst.current !== itemGst;
    const discountChanged = prevItemDiscount.current !== itemDiscount;
    prevItemGst.current = itemGst;
    prevItemDiscount.current = itemDiscount;
    setFormData((f: any) => ({
      ...f,
      ...(gstChanged ? { totalTax: itemGst, paymentTaxManual: false } : {}),
      ...(discountChanged ? { totalDiscounts: itemDiscount, paymentDiscountManual: false } : {}),
      paymentPayableManual: false,
    }));
  }, [itemGst, itemDiscount, setFormData]);

  return (
    <div className="max-h-[74vh] overflow-y-auto p-1 space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        {(["B2C", "B2B"] as const).map((type) => (
          <Button
            key={type}
            type="button"
            variant={(!isB2B && type === "B2C") || (isB2B && type === "B2B") ? "default" : "outline"}
            onClick={() =>
              patch({
                orderType: type === "B2B" ? "B2B" : "B2C",
                packageShipmentType: type === "B2B" ? "HEAVY" : "SMALL",
              })
            }
          >
            {type} Order{type === "B2C" ? " (Default)" : ""}
          </Button>
        ))}
      </div>

      <Section n={1} title="Order Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="orderNumber" required error={!!getError("orderNumber")}>Order Number</FieldLabel>
            <Input id="orderNumber" value={formData.orderNumber} placeholder="ORD-12345" autoComplete="off" className={getError("orderNumber") ? "border-red-500" : ""} onChange={(e) => { patch({ orderNumber: e.target.value }); if (setErrors && errors?.orderNumber) setErrors((p: any) => ({ ...p, orderNumber: null })); }} />
            {getError("orderNumber") && <p className="text-xs text-red-500">{getError("orderNumber")}</p>}
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="orderDate" required>Order Date</FieldLabel>
            <Input id="orderDate" type="date" value={formData.orderDate} onChange={(e) => patch({ orderDate: e.target.value, processedAt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel optional>Channel / Source</FieldLabel>
            <Select value={formData.sourceName || "Manual"} onValueChange={(v) => patch({ sourceName: v })}>
              <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
              <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {getuser()?.role === "admin" && (
            <div className="space-y-2">
              <FieldLabel required error={!!getError("seller")}>Seller</FieldLabel>
              <Select value={formData.seller ? String(formData.seller) : ""} onValueChange={(v) => patch({ seller: v })}>
                <SelectTrigger className={getError("seller") ? "border-red-500" : ""}><SelectValue placeholder="Select seller" /></SelectTrigger>
                <SelectContent>{(allsellerlist || []).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <FieldLabel optional>Order Tags</FieldLabel>
            <Select
              key={tags.join("|")}
              onValueChange={(v) => {
                if (!v || tags.includes(v)) return;
                patch({ orderTags: [...tags, v] });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select tag name" /></SelectTrigger>
              <SelectContent>
                {ORDER_TAG_OPTIONS.filter((t) => !tags.includes(t)).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t} type="button" className="rounded-full bg-muted px-2 py-0.5 text-xs" onClick={() => patch({ orderTags: tags.filter((x) => x !== t) })}>{t} ×</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section n={2} title="Customer Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="customerName" required error={!!getError("customerName")}>Customer Name</FieldLabel>
            <Input id="customerName" value={formData.customerName} className={getError("customerName") ? "border-red-500" : ""} onChange={(e) => { patch({ customerName: e.target.value }); if (setErrors && errors?.customerName) setErrors((p: any) => ({ ...p, customerName: null })); }} />
            {getError("customerName") && <p className="text-xs text-red-500">{getError("customerName")}</p>}
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="customerPhone" required error={!!getError("customerPhone")}>Phone</FieldLabel>
            <Input id="customerPhone" placeholder="9876543210" value={formData.customerPhone} className={getError("customerPhone") ? "border-red-500" : ""} onChange={(e) => { patch({ customerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }); if (setErrors && errors?.customerPhone) setErrors((p: any) => ({ ...p, customerPhone: null })); }} />
            {getError("customerPhone") && <p className="text-xs text-red-500">{getError("customerPhone")}</p>}
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="alternatePhone" optional>Alternate Phone</FieldLabel>
            <Input id="alternatePhone" value={formData.alternatePhone || ""} onChange={(e) => patch({ alternatePhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="customerEmail" optional>Email</FieldLabel>
            <Input id="customerEmail" type="email" value={formData.customerEmail} className={getError("customerEmail") ? "border-red-500" : ""} onChange={(e) => patch({ customerEmail: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section n={3} title="Shipping Address">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="pincode" required error={!!getError("pincode")}>Pincode</FieldLabel>
            <div className="flex gap-2">
              <Input id="pincode" maxLength={6} placeholder="400001" value={formData.pincode} className={getError("pincode") ? "border-red-500" : ""} onChange={(e) => patch({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
              <Button type="button" variant="outline" disabled={fetchingPin} onClick={fetchAddress}>{fetchingPin ? "…" : "Fetch Address"}</Button>
            </div>
            {getError("pincode") && <p className="text-xs text-red-500">{getError("pincode")}</p>}
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="city" required error={!!getError("city")}>City</FieldLabel>
            <Input id="city" value={formData.city} className={getError("city") ? "border-red-500" : ""} onChange={(e) => patch({ city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel required error={!!getError("state")}>State</FieldLabel>
            <Select value={formData.state || ""} onValueChange={(v) => patch({ state: v })}>
              <SelectTrigger className={getError("state") ? "border-red-500" : ""}><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                {formData.state && !INDIAN_STATES.includes(formData.state) ? <SelectItem value={formData.state}>{formData.state}</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel htmlFor="addressLine1" required error={!!getError("addressLine1")}>Address Line 1</FieldLabel>
            <Input id="addressLine1" placeholder="House / Flat / Building, Road, Area" value={formData.addressLine1} className={getError("addressLine1") ? "border-red-500" : ""} onChange={(e) => patch({ addressLine1: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="addressLine2" optional>Address Line 2</FieldLabel>
            <Input id="addressLine2" placeholder="Apartment, Floor, Block" value={formData.addressLine2} onChange={(e) => patch({ addressLine2: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="landmark" optional>Landmark</FieldLabel>
            <Input id="landmark" value={formData.landmark} onChange={(e) => patch({ landmark: e.target.value })} />
          </div>
          <div className="space-y-2">
            <FieldLabel required>Address Type</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {["Home", "Office", "Other"].map((t) => (
                <Button key={t} type="button" variant={(formData.addressType || "Home") === t ? "default" : "outline"} onClick={() => patch({ addressType: t })}>{t}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel required>Country</FieldLabel>
            <Select value={formData.country || "India"} onValueChange={(v) => patch({ country: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="India">India</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section n={4} title="Item Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Product Name *</th>
                <th className="py-2 pr-2">SKU (Optional)</th>
                <th className="py-2 pr-2">Qty *</th>
                <th className="py-2 pr-2">Unit Price (₹) *</th>
                <th className="py-2 pr-2">GST Rate</th>
                <th className="py-2 pr-2">Discount (₹)</th>
                <th className="py-2 pr-2">Total (₹)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const itemErrors = errors?.items?.[index] || {};
                return (
                  <tr key={index} className="border-b align-top">
                    <td className="py-2 pr-2">{index + 1}</td>
                    <td className="py-2 pr-2"><Input className={itemErrors.name ? "border-red-500" : ""} value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} /></td>
                    <td className="py-2 pr-2"><Input value={item.sku || ""} onChange={(e) => handleItemChange(index, "sku", e.target.value)} /></td>
                    <td className="py-2 pr-2 w-20"><Input type="number" min="1" className={itemErrors.quantity ? "border-red-500" : ""} value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)} /></td>
                    <td className="py-2 pr-2 w-28"><Input type="number" min="0" step="0.01" className={itemErrors.unitPrice ? "border-red-500" : ""} value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)} /></td>
                    <td className="py-2 pr-2 w-24">
                      <Select value={String(Math.round(Number(item.gstRate) || 0))} onValueChange={(v) => handleItemChange(index, "gstRate", parseInt(v, 10))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[0, 3, 5, 12, 18, 28, 40].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2 w-24"><Input type="number" min="0" step="0.01" value={item.discount ?? 0} onChange={(e) => handleItemChange(index, "discount", Math.max(0, parseFloat(e.target.value) || 0))} /></td>
                    <td className="py-2 pr-2 font-medium">{itemLineTotal(item).toFixed(2)}</td>
                    <td className="py-2">{items.length > 1 ? <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-2" /> Add Another Item</Button>
        <div className="ml-auto max-w-xs text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{itemSubtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>₹{itemGst.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>₹{itemDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1"><span>Grand Total (₹)</span><span>₹{itemGrandTotal.toFixed(2)}</span></div>
        </div>
      </Section>

      <Section n={5} title="Package / Shipment Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <FieldLabel required>Package Type</FieldLabel>
            <Select value={formData.packageType || "Box"} onValueChange={(v) => patch({ packageType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PACKAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="packageCount" required>Number of Packages</FieldLabel>
            <Input id="packageCount" type="number" min="1" value={formData.packageCount || 1} onChange={(e) => patch({ packageCount: Math.max(1, parseInt(e.target.value) || 1) })} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="shipmentWeight" required error={!!getError("shipmentWeight")}>Dead Weight (kg)</FieldLabel>
            <Input id="shipmentWeight" type="number" min="0" step="0.001" placeholder="0.500" className={getError("shipmentWeight") ? "border-red-500" : ""} value={formData.shipmentWeight} onChange={(e) => {
              const val = e.target.value;
              const n = Number(val) || 0;
              setFormData((f: any) => {
                const nextItems = Array.isArray(f.items) ? [...f.items] : [];
                if (nextItems[0]) nextItems[0] = { ...nextItems[0], deadWeight: n || undefined };
                return { ...f, shipmentWeight: val, totalWeight: n, items: nextItems };
              });
            }} />
            {getError("shipmentWeight") && <p className="text-xs text-red-500">{getError("shipmentWeight")}</p>}
          </div>
          <div className="space-y-2 lg:col-span-4">
            <FieldLabel required>Dimensions</FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              {[["pkgLength", "Length (cm)"], ["pkgWidth", "Width (cm)"], ["pkgHeight", "Height (cm)"]].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min="0" step="0.1" value={formData[key]} onChange={(e) => {
                    const val = e.target.value;
                    setFormData((f: any) => {
                      const merged = { ...f, [key]: val };
                      const l = Number(merged.pkgLength) || 0;
                      const w = Number(merged.pkgWidth) || 0;
                      const h = Number(merged.pkgHeight) || 0;
                      const vol = l && w && h ? Number(((l * w * h) / 5000).toFixed(3)) : 0;
                      const nextItems = Array.isArray(merged.items) ? [...merged.items] : [];
                      if (nextItems[0]) nextItems[0] = { ...nextItems[0], length: l || undefined, width: w || undefined, height: h || undefined };
                      return { ...merged, totalVolumetricWeight: vol, items: nextItems };
                    });
                  }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Volumetric Weight</div>
            <div className="font-semibold">{volumetric.toFixed(2)} kg</div>
            <p className="text-[10px] text-muted-foreground mt-1">(L × W × H) / 5000</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Chargeable Weight</div>
            <div className="font-semibold">{chargeable.toFixed(2)} kg</div>
            <p className="text-[10px] text-muted-foreground mt-1">Max(Dead Weight, Volumetric Weight)</p>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <FieldLabel required error={!!getError("warehouse")}>Pickup Location</FieldLabel>
            <Select
              value={String(formData.warehouse || defaultWarehouseId || "")}
              onValueChange={(v) => patch({ warehouse: v })}
            >
              <SelectTrigger className={getError("warehouse") ? "border-red-500" : ""}>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehouselist || []).map((s: any) => (
                  <SelectItem key={warehouseId(s)} value={warehouseId(s)}>
                    {s.name} {isDefaultWarehouse(s) ? "(Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError("warehouse") && <p className="text-xs text-red-500">{getError("warehouse")}</p>}
          </div>
        </div>
      </Section>

      <Section n={6} title="Payment Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-3">
            <FieldLabel required>Payment Method</FieldLabel>
            <div className="flex gap-2">
              {["Prepaid", "COD"].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={formData.paymentGateway === m ? "default" : "outline"}
                
                  onClick={() =>
                    patch({
                      paymentGateway: m,
                      financialStatus: m === "COD" ? "pending" : "paid",
                      billingParty: "shipper",
                      totalOutstanding: 0,
                      paymentCodManual: false,
                    })
                  }
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="orderShipping" optional>Shipping Charges (₹)</FieldLabel>
            <Input id="orderShipping" type="number" min="0" step="0.01" value={formData.totalShippingPrice ?? 0} onChange={(e) => patch({ totalShippingPrice: Math.max(0, parseFloat(e.target.value) || 0), paymentPayableManual: false })} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="orderTax" optional>Tax (₹)</FieldLabel>
            <Input
              id="orderTax"
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(e) =>
                patch({
                  totalTax: Math.max(0, parseFloat(e.target.value) || 0),
                  paymentTaxManual: true,
                  paymentPayableManual: false,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="orderDiscount" optional>Discount (₹)</FieldLabel>
            <Input
              id="orderDiscount"
              type="number"
              min="0"
              step="0.01"
              value={money.discount}
              onChange={(e) =>
                patch({
                  totalDiscounts: Math.max(0, parseFloat(e.target.value) || 0),
                  paymentDiscountManual: true,
                  paymentPayableManual: false,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="goodsValue" required>Order Value</FieldLabel>
            <Input
              id="goodsValue"
              type="number"
              min="0"
              step="0.01"
              value={formData.paymentPayableManual ? (formData.payableAmount ?? orderValue) : orderValue}
              onChange={(e) =>
                patch({
                  payableAmount: Math.max(0, parseFloat(e.target.value) || 0),
                  paymentPayableManual: true,
                  paymentCodManual: false,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="codAmount" optional>COD Amount (₹)</FieldLabel>
            <Input
              id="codAmount"
              type="number"
              min="0"
              step="0.01"
              disabled={!isCod}
              className={!isCod ? "bg-muted" : ""}
              value={isCod ? (formData.paymentCodManual ? (formData.totalOutstanding ?? 0) : money.outstanding) : ""}
              onChange={(e) =>
                patch({
                  totalOutstanding: Math.max(0, parseFloat(e.target.value) || 0),
                  paymentCodManual: true,
                })
              }
            />
            <p className="text-[11px] text-muted-foreground">Only applicable when COD is selected.</p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-800">Total Order Value</div>
            <div className="text-xl font-bold text-emerald-700">₹ {grandTotal.toFixed(2)}</div>
            <p className="text-[11px] text-sky-700 mt-1">Order value = subtotal + tax + shipping − discount. Shipping, tax, discount, order value and COD amount can be edited.</p>
          </div>
        </div>
      </Section>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs space-y-1 text-muted-foreground">
        <p className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 mt-0.5" /> Pincode Fetch Address auto-fills city and state.</p>
        <p>Volumetric weight = (L × W × H) / 5000. Chargeable weight is the higher of dead weight and volumetric weight.</p>
        <p><span className="text-red-500">*</span> Mandatory field · (Optional) can be left blank.</p>
      </div>
    </div>
  );
};

export default OrderFormFields;
