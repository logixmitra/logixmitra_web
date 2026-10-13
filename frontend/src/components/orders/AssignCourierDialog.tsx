import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sanePackageDim, volumetricOrDeadWeight } from "@/components/orders/packageDims";
import {
  CheckCircle2, Loader2, MapPin, Package, Truck, Warehouse, Zap,
} from "lucide-react";

type RateInfo = {
  type?: string[];
  rate?: Array<number | string>;
  data?: any[];
};

type WarehouseOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
  city?: string;
  pincode?: string;
};

type AssignOrder = {
  id: string;
  referenceId: string;
  city?: string;
  pincode?: string;
  amount?: string | number;
  orderDate?: string;
  customerName?: string;
  customerPhone?: string;
  financialStatus?: string;
  platform?: string;
  totalWeight?: number | string;
  packages?: Array<{
    length?: number;
    width?: number;
    height?: number;
    deadWeight?: number;
    volumetricWeight?: number;
  }>;
  items?: Array<{
    name?: string;
    quantity?: number;
    deadWeight?: number | string;
    volumetricWeight?: number | string;
    height?: number;
    width?: number;
    length?: number;
  }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: AssignOrder[];
  warehouses: WarehouseOption[];
  warehouseIds: string[];
  courierIndexes: Array<number | string>;
  zones: Array<string | undefined>;
  dispatchDates: Record<string, string>;
  ratelist: Record<string, RateInfo>;
  loadingRates?: boolean;
  shipping?: boolean;
  onWarehouseChange: (orderIndex: number, warehouseId: string) => Promise<void> | void;
  onCourierChange: (orderIndex: number, courierIndex: number) => void;
  onDispatchDateChange: (referenceId: string, date: string) => void;
  onShipNow: () => Promise<void> | void;
};

function isRtoCourier(name?: string) {
  return /rto/i.test(String(name || ""));
}

function getCourierServiceMode(name?: string): "Air" | "Surface" | null {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  if (/(?:^|[\s_/\-(])air(?:[\s_/\-)]|$)|express/.test(n)) return "Air";
  if (/(?:^|[\s_/\-(])surface(?:[\s_/\-)]|$)|ground/.test(n)) return "Surface";
  return null;
}

function getCourierDisplayName(name?: string) {
  const raw = (name || "").trim();
  if (!raw) return "Courier";
  const stripped = raw.replace(/[\s_/\-]*(air|surface|express|ground)[\s_/\-]*$/i, "").trim();
  return stripped || raw;
}

function formatRate(value: number | string | undefined) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `₹${n.toFixed(2)}`;
}

function isNonProductItem(item?: { name?: string }) {
  const name = String(item?.name || "").toLowerCase();
  return /(^|[^a-z])cod([^a-z]|$)|cash on delivery|cod\s*(charge|charges|fee|fees)/i.test(name);
}

function parseAssignPackages(raw: unknown): Array<{ length?: number; width?: number; height?: number; deadWeight?: number; volumetricWeight?: number }> {
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

function getOrderWeights(order: AssignOrder) {
  const items = (order.items || []).filter((item) => !isNonProductItem(item));
  const pkgs = parseAssignPackages(order.packages);
  const firstPkg = pkgs[0] || {};

  // Prefer Shopify package totals: summed dead weight, exact or max L/W/H (not qty-multiplied).
  let dead = Number(order.totalWeight) || Number(firstPkg.deadWeight) || 0;
  let length = sanePackageDim(firstPkg.length);
  let width = sanePackageDim(firstPkg.width);
  let height = sanePackageDim(firstPkg.height);

  for (const item of items) {
    length = Math.max(length, sanePackageDim(item.length));
    width = Math.max(width, sanePackageDim(item.width));
    height = Math.max(height, sanePackageDim(item.height));
  }
  if (dead <= 0) {
    dead = items.reduce(
      (sum, item) => sum + (Number(item.deadWeight) || 0) * (Number(item.quantity) || 1),
      0
    );
  }
  if (!length || !width || !height) {
    length = length || 10;
    width = width || 10;
    height = height || 10;
  }

  const volumetric = volumetricOrDeadWeight(
    length,
    width,
    height,
    dead,
    firstPkg.volumetricWeight
  );
  const chargeable = Math.max(dead, volumetric, 0);
  return {
    dead,
    volumetric,
    chargeable: chargeable > 0 ? chargeable : 0.1,
  };
}

function formatKg(value: number) {
  return `${Number(value).toFixed(2)} kg`;
}

const AssignCourierDialog = ({
  open,
  onOpenChange,
  orders,
  warehouses,
  warehouseIds,
  courierIndexes,
  zones,
  dispatchDates,
  ratelist,
  loadingRates,
  shipping,
  onWarehouseChange,
  onCourierChange,
  onDispatchDateChange,
  onShipNow,
}: Props) => {
  const [busyWarehouseIndex, setBusyWarehouseIndex] = useState<number | null>(null);
  const hasUnassignedWarehouse = orders.some((_, index) => {
    const id = warehouseIds[index];
    return !id || id === "null";
  });

  const totals = useMemo(() => {
    let selectedRate = 0;
    let selectedCount = 0;
    let totalChargeableWeight = 0;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      totalChargeableWeight += getOrderWeights(order).chargeable;
      const rates = ratelist[order.referenceId]?.rate || [];
      const idx = Number(courierIndexes[i]);
      if (!Number.isNaN(idx) && rates[idx] != null) {
        selectedRate += Number(rates[idx]) || 0;
        selectedCount += 1;
      }
    }
    return { selectedRate, selectedCount, totalChargeableWeight };
  }, [orders, ratelist, courierIndexes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="h-full min-h-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-teal-700" />
              Assign Courier
            </DialogTitle>
            <DialogDescription>
              Compare courier rates for {orders.length} selected order{orders.length === 1 ? "" : "s"} and ship with the best option.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-3 border-b bg-slate-50/80 flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="outline" className="bg-white">{orders.length} orders</Badge>
            <Badge variant="outline" className="bg-white">
              Couriers selected: {totals.selectedCount}/{orders.length}
            </Badge>
            <Badge variant="outline" className="bg-white">
              Weight: {formatKg(totals.totalChargeableWeight)}
            </Badge>
            <div className="ml-auto font-semibold text-teal-700">
              Est. shipping: {formatRate(totals.selectedRate)}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
            {loadingRates && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-700" />
                Fetching courier rates...
              </div>
            )}

            {!loadingRates && orders.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No orders selected for courier assignment.
              </div>
            )}

            {orders.map((order, index) => {
              const rates = ratelist[order.referenceId] || {};
              const types = rates.type || [];
              const priceList = rates.rate || [];
              const selectedIdx = Number(courierIndexes[index]);
              const cheapestIdx = priceList.reduce((best, value, i) => {
                if (isRtoCourier(types[i])) return best;
                if (best < 0) return i;
                return Number(value) < Number(priceList[best]) ? i : best;
              }, -1);
              const productNames = (order.items || []).map((it) => it.name).filter(Boolean).join(", ");
              const isCod = (order.financialStatus || "").toLowerCase() === "pending";
              const weights = getOrderWeights(order);

              return (
                <div key={order.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50/70 flex flex-wrap items-start gap-3 justify-between">
                    <div className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-slate-900">{order.referenceId}</span>
                        <Badge className={cn("text-[10px]", isCod ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100")}>
                          {isCod ? "COD" : "Prepaid"}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">{productNames || "No products"}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {order.customerName || "Customer"} · {order.city || "—"}, {order.pincode || "—"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 min-w-[320px] flex-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Weight</Label>
                        <div className="min-h-9 rounded-md border bg-white px-3 py-1 flex flex-col justify-center">
                          <span className="text-sm font-semibold text-slate-800 leading-tight">
                            {formatKg(weights.chargeable)}
                          </span>
                          <span className="text-[10px] text-slate-500 leading-tight truncate">
                            Dead {formatKg(weights.dead)} · Vol {formatKg(weights.volumetric)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Pickup warehouse</Label>
                        <Select
                          value={warehouseIds[index] || "null"}
                          onValueChange={async (v) => {
                            setBusyWarehouseIndex(index);
                            try {
                              await onWarehouseChange(index, v);
                            } finally {
                              setBusyWarehouseIndex(null);
                            }
                          }}
                          disabled={busyWarehouseIndex === index || shipping}
                        >
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Select warehouse</SelectItem>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}{w.isDefault ? " (Default)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Dispatch date</Label>
                        <Input
                          type="date"
                          className="h-9 bg-white"
                          value={dispatchDates[order.referenceId] || order.orderDate || ""}
                          onChange={(e) => onDispatchDateChange(order.referenceId, e.target.value)}
                          disabled={shipping}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Zone</Label>
                        <div className="h-9 rounded-md border bg-white px-3 flex items-center text-sm font-medium text-slate-700">
                          {zones[index] || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-teal-700" />
                        Available couriers
                      </div>
                      {busyWarehouseIndex === index && (
                        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating rates...
                        </span>
                      )}
                    </div>

                    {types.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No courier rates found for this warehouse/pincode. Try another warehouse.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {types.map((typeName, courierIdx) => {
                          if (isRtoCourier(typeName)) return null;
                          const selected = selectedIdx === courierIdx;
                          const cheapest = cheapestIdx === courierIdx;
                          const serviceMode = getCourierServiceMode(typeName);
                          const displayName = getCourierDisplayName(typeName);
                          return (
                            <button
                              key={`${order.id}-${courierIdx}`}
                              type="button"
                              disabled={shipping}
                              onClick={() => onCourierChange(index, courierIdx)}
                              className={cn(
                                "text-left rounded-xl border p-3 transition-all",
                                selected
                                  ? "border-teal-600 bg-teal-50 shadow-[0_0_0_1px_rgba(13,148,136,0.35)]"
                                  : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-sm text-slate-900">{displayName}</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {cheapest && (
                                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                                        <Zap className="h-3 w-3 mr-1" /> Cheapest
                                      </Badge>
                                    )}
                                    {serviceMode && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {serviceMode}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {selected && <CheckCircle2 className="h-5 w-5 text-teal-700 shrink-0" />}
                              </div>
                              <div className="mt-3 text-lg font-bold text-teal-700">
                                {formatRate(priceList[courierIdx])}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Incl. applicable charges</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 space-x-0 sm:space-x-0 border-t px-6 py-4 bg-background">
            {hasUnassignedWarehouse && orders.length > 0 && (
              <p className="mr-auto text-xs text-amber-700">
                Select pickup warehouse for all orders before shipping.
              </p>
            )}
            <Button variant="outline" disabled={shipping} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 min-w-[140px]"
              disabled={shipping || orders.length === 0 || totals.selectedCount === 0 || hasUnassignedWarehouse}
              onClick={onShipNow}
            >
              {shipping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Shipping...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Ship Now
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCourierDialog;
