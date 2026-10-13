import { ReactNode } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import { Order } from "@/types/order";
import { cn } from "@/lib/utils";
import { sanePackageDim, volumetricFromSaneDims, resolveDisplayDims } from "@/components/orders/packageDims";
import { isRtoOrderStatus, getOrderSubStatus, subStatusBadgeClass } from "@/utils/orderStatusCounts";

const COLUMNS = [
  "Order Date",
  "Order Details",
  "Product Details",
  "Package Details",
  "Payment",
  "Courier / AWB",
  "Shipping Details",
  "Pickup Address",
  "Action",
];

function fmtOrderDate(order: Order, formatDate: (s: string) => string) {
  // Rule:
  // 1) orderDateTime (full timestamp) ho -> usi se date + REAL time.
  // 2) Sirf orderDate (date-only) ho -> date + createdAt ka time
  //    (kyonki Date-only me time hota hi nahi — createdAt se actual time).
  // 3) Dono na ho -> createdAt, phir bhi kuch na mile to "—".
  const platform = order.platform || "Custom";
  const dateTimeRaw = (order as any).orderDateTime;
  if (dateTimeRaw) {
    const d = new Date(dateTimeRaw);
    if (!Number.isNaN(d.getTime())) {
      return {
        date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }),
        platform,
      };
    }
  }
  const raw = (order as any).orderDate || order.createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  // Date-only value ka time fake hota hai (00:00Z -> 05:30 am) — uski jagah
  // createdAt ka real time dikhao.
  const str = String(raw);
  const noTime = /^\d{4}-\d{2}-\d{2}($|T00:00)/.test(str);
  const timeRaw = noTime && (order as any).createdAt ? (order as any).createdAt : raw;
  const t = new Date(timeRaw);
  const time = Number.isNaN(t.getTime())
    ? ""
    : t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date, time, platform };
}
// function fmtOrderDate(order: Order, formatDate: (s: string) => string) {
//   // Order Date column = actual order date (orderDate) for every platform;
//   // createdAt (sync time) sirf fallback hai.
//   const raw = (order as any).orderDate || order.createdAt;
//   if (!raw) return "—";
//   const str = String(raw);
//   const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
//   const platform = order.platform || "Custom";
//   // Date-only values (YYYY-MM-DD, ya UTC midnight) ka fake time mat dikhao —
//   // warna har row 05:30 am (UTC+5:30) dikhti hai chahe order kabhi bhi ho.
//   if (parts && (!parts[4] || (parts[4] === "00" && parts[5] === "00"))) {
//     const d = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
//     const date = d.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//       timeZone: "UTC",
//     });
//     return { date, time: "", platform };
//   }
//   const d = new Date(raw);
//   if (Number.isNaN(d.getTime())) return "—";
//   const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
//   const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
//   return { date, time, platform };
// }
function parsePackages(order: Order): any[] {
  const raw = (order as any).packages;
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

function fmtPackageDetails(order: Order) {
  const pkgs = parsePackages(order);
  const items = (Array.isArray(order.items) ? order.items : []).filter((it: any) => {
    const name = String(it?.name || "").toLowerCase();
    return !/(^|[^a-z])cod([^a-z]|$)|cash on delivery|cod\s*(charge|charges|fee|fees)/i.test(name);
  });
  const item = items[0];
  const isHeavy =
    String((order as any).orderType || "") === "B2B_MPS" ||
    pkgs.length > 1;

  const pkgDead = pkgs.reduce((s, p) => s + (Number(p?.deadWeight) || 0), 0);
  const firstPkg = pkgs[0] || {};
  const pkgL = sanePackageDim(firstPkg.length);
  const pkgW = sanePackageDim(firstPkg.width);
  const pkgH = sanePackageDim(firstPkg.height);

  // Prefer package dims/weight when present; otherwise fall back to items / order totals
  // (SMALL orders often save empty packages while real dims live on items)
  let itemL = 0;
  let itemW = 0;
  let itemH = 0;
  for (const it of items) {
    itemL = Math.max(itemL, sanePackageDim(it?.length));
    itemW = Math.max(itemW, sanePackageDim(it?.width));
    itemH = Math.max(itemH, sanePackageDim(it?.height));
  }
  const itemDead =
    items.reduce((s, it) => s + (Number(it?.deadWeight) || 0) * (Number(it?.quantity) || 1), 0) ||
    Number(item?.deadWeight) ||
    0;

  const dead =
    Number((order as any).totalWeight) ||
    pkgDead ||
    itemDead ||
    0;
  const resolved = resolveDisplayDims(pkgL || itemL, pkgW || itemW, pkgH || itemH, dead);
  const l = resolved.length;
  const w = resolved.width;
  const h = resolved.height;
  const vol = volumetricFromSaneDims(l, w, h) || dead;

  const boxCount = pkgs.length > 0 ? pkgs.length : 1;
  const dims =
    l && w && h
      ? boxCount > 1
        ? `${l} x ${w} x ${h} (cm) +${boxCount - 1} more`
        : `${l} x ${w} x ${h} (cm)`
      : boxCount > 1
        ? `${boxCount} boxes`
        : "—";

  return {
    dims,
    deadWt: dead ? `${Number(dead).toFixed(2)} kg` : "—",
    volWt: vol ? `${Number(vol).toFixed(3)} kg` : "—",
    isHeavy,
    boxCount,
  };
}

function statusBadgeClass(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s.includes("new")) return "bg-emerald-100 text-emerald-800";
  if (s.includes("deliver")) return "bg-teal-100 text-teal-800";
  if (s.includes("transit")) return "bg-blue-100 text-blue-800";
  if (s.includes("rto") || s.includes("undeliver")) return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-700";
}

function resolveProductSku(product: any): string | null {
  if (!product || typeof product !== "object") return null;
  const candidates = [
    product.sku,
    product.SKU,
    product.productSku,
    product.product_sku,
    product.skuCode,
    product.sku_id,
    product.productId,
    product.product_id,
    product.variant_sku,
    product.barcode,
    product.itemSku,
    product.ItemSku,
    product.code,
  ];
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== "");
  return value === undefined || value === null ? null : String(value).trim();
}

function resolveProductName(product: any): string {
  if (!product || typeof product !== "object") return "—";
  return String(
    product.name ||
    product.productName ||
    product.title ||
    product.itemName ||
    product.product_name ||
    "—"
  ).trim() || "—";
}

interface OrdersRichTableProps {
  orders: Order[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (order: Order, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  warelistbyid: Record<string, { name?: string; city?: string; pincode?: string }>;
  formatDate: (s: string) => string;
  renderActions: (order: Order) => ReactNode;
  renderStatus?: (order: Order) => ReactNode;
  onAwbClick?: (awb: string, order?: Order) => void;
  onOrderClick?: (order: Order) => void;
  onAssignCourier?: (order: Order) => void;
  onEditPackage?: (order: Order) => void;
  onEditCod?: (order: Order) => void;
  onEditAwb?: (order: Order) => void;
  onEditCourier?: (order: Order) => void;
  readOnly?: boolean;
}

const OrdersRichTable = ({
  orders,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  warelistbyid,
  formatDate,
  renderActions,
  renderStatus,
  onAwbClick,
  onOrderClick,
  onAssignCourier,
  onEditPackage,
  onEditCod,
  onEditAwb,
  onEditCourier,
  readOnly = false,
}: OrdersRichTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="w-10 px-3 py-2.5">
              {!readOnly && (
              <input
                type="checkbox"
                checked={allSelected && orders.length > 0}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="rounded"
              />
              )}
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="py-12 text-center text-sm text-slate-500">
                Loading orders...
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length + 1}>
                <EmptyState />
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const dt = fmtOrderDate(order, formatDate);
              const items = Array.isArray(order.items) ? order.items : [];
              // Product Details: sirf pehla product dikhao (pehle jaisa) —
              // poora items list render karne se ek order me 4-5 product stack hote hain.
              const product = items[0];
              const pkg = fmtPackageDetails(order);
              const dims = pkg.dims;
              const deadWt = pkg.deadWt;
              const volWt = pkg.volWt;
              const amount = (order as any).totalOutstanding && Number((order as any).totalOutstanding) !== 0
                ? (order as any).totalOutstanding
                : order.amount;
              const isCod =
                (order as any).financialStatus === "pending" ||
                String((order as any).paymentGateway || "").toUpperCase().includes("COD");
              const hasAwb = !!(order.awb && order.awb !== "-" && order.awb !== "—");
              const warehouse =
                warelistbyid[String((order as any).warehouse || "")] ||
                warelistbyid[`seller:${String((order as any).seller || (order as any).user_id || "")}`];
              const addr = [
                order.addressLine1,
                order.city,
                order.state,
                order.pincode,
              ].filter(Boolean).join(", ");

              return (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-slate-100 hover:bg-teal-50/30 transition-colors align-top",
                    order.status === "Draft Merged" && "opacity-60 pointer-events-none bg-orange-50"
                  )}
                >
                  <td className="px-3 py-3">
                    {!readOnly && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={(e) => onToggleSelect(order, e.target.checked)}
                      className="rounded"
                    />
                    )}
                  </td>

                  {/* Order Date */}
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {typeof dt === "object" ? (
                      <>
                        <div className="font-medium text-slate-800">{dt.date}</div>
                        {dt.time && <div>{dt.time}</div>}
                        <div className="mt-1 text-slate-400">{dt.platform}</div>
                      </>
                    ) : dt}
                  </td>

                  {/* Order Details */}
                  <td className="px-3 py-3 min-w-[140px]">
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-600 hover:underline"
                      onClick={() => onOrderClick?.(order)}
                    >
                      {order.orderNumber}
                    </button>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Ref. ID: {(order as any).referenceId || order.orderNumber || "—"}
                    </div>
                    {(() => {
                      const sub = getOrderSubStatus(order as any);
                      const same = sub && sub.toLowerCase() === String(order.status || "").toLowerCase().trim();
                      return sub && !same ? (
                        <Badge
                          className={cn(
                            "mt-1 max-w-full whitespace-normal text-left line-clamp-2 text-[10px] font-semibold border-0",
                            subStatusBadgeClass(sub)
                          )}
                          title={sub}
                        >
                          {sub}
                        </Badge>
                      ) : null;
                    })()}
                  </td>

                  {/* Product Details */}
                  <td className="px-3 py-3 min-w-[130px] text-xs">
                    <div className="font-medium text-slate-800 line-clamp-2">
                      {resolveProductName(product)}
                    </div>
                    <div className="text-slate-400 mt-0.5">SKU: {resolveProductSku(product) || "—"}</div>
                    <div className="text-slate-500 mt-0.5">QTY: {product?.quantity ?? order.totalItems ?? 1}</div>
                  </td>

                  {/* Package Details */}
                  <td className="px-3 py-3 min-w-[120px] text-xs text-slate-600">
                    {pkg.isHeavy && (
                      <Badge variant="outline" className="mb-1 text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                        Heavy · {pkg.boxCount} box{pkg.boxCount > 1 ? "es" : ""}
                      </Badge>
                    )}
                    <div>{dims}</div>
                    <div className="mt-0.5">Dead wt.: {deadWt}</div>
                    <div className="mt-0.5">Volumetric: {volWt}</div>
                    {!readOnly && (
                    <button
                      type="button"
                      className="mt-1 text-teal-600 hover:text-teal-800"
                      onClick={() => onEditPackage?.(order)}
                      title="Edit package"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    )}
                  </td>

                  {/* Payment */}
                  <td className="px-3 py-3 min-w-[100px] text-xs">
                    <div className="text-slate-700">Invoice: ₹ {amount}</div>
                    {isCod && (
                      <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                        <span>COD: ₹ {amount}</span>
                        {!hasAwb && !readOnly && (
                          <button
                            type="button"
                            className="text-teal-600 hover:text-teal-800"
                            title="Edit COD amount"
                            onClick={() => onEditCod?.(order)}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    {Number((order as any).totalDiscounts || 0) > 0 && (
                      <div className="text-rose-600 mt-0.5">
                        Discount: − ₹ {Number((order as any).totalDiscounts).toFixed(2)}
                        {Array.isArray((order as any).discountCodes) && (order as any).discountCodes[0]?.code
                          ? ` (${(order as any).discountCodes.map((c: any) => c.code).filter(Boolean).join(", ")})`
                          : ""}
                      </div>
                    )}
                    {Number((order as any).codCharge || 0) > 0 && (
                      <div className="text-amber-700 mt-0.5">
                        COD Charge: ₹ {Number((order as any).codCharge).toFixed(2)}
                      </div>
                    )}
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {isCod ? "COD" : "Prepaid"}
                    </Badge>
                  </td>

                  {/* Courier / AWB */}
                  <td className="px-3 py-3 min-w-[130px] text-xs">
                    <div className="font-medium text-slate-800 flex items-center gap-1.5">
                      <span>
                        {order.courier && order.courier !== "-" && order.courier !== "—"
                          ? order.courier
                          : "—"}
                      </span>
                      {onEditCourier && !readOnly && (
                        <button
                          type="button"
                          className="text-teal-600 hover:text-teal-800"
                          title="Update Courier"
                          onClick={() => onEditCourier(order)}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {hasAwb ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:underline font-medium"
                          onClick={() => onAwbClick?.(order.awb, order)}
                        >
                          {order.awb}
                        </button>
                      ) : (
                        <span className="text-slate-400">No AWB</span>
                      )}
                      {onEditAwb && !readOnly && (
                        <button
                          type="button"
                          className="text-teal-600 hover:text-teal-800"
                          title="Update AWB"
                          onClick={() => onEditAwb(order)}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Badge className={cn("mt-1.5 text-[10px] font-semibold border-0", statusBadgeClass(order.status))}>
                      {order.status || "—"}
                    </Badge>
                  </td>

                  {/* Shipping Details */}
                  <td className="px-3 py-3 min-w-[160px] text-xs">
                    <div className="font-medium text-slate-800">{order.customerName}</div>
                    <div className="text-slate-500">{order.customerPhone}</div>
                    {order.customerEmail && (
                      <div className="text-slate-400 truncate max-w-[150px]">{order.customerEmail}</div>
                    )}
                    <div className="text-slate-500 mt-1 line-clamp-2">{addr || "—"}</div>
                  </td>

                  {/* Pickup Address */}
                  <td className="px-3 py-3 min-w-[120px] text-xs text-slate-600">
                    <div className="font-medium text-slate-700">
                      {warehouse?.name || "—"}
                    </div>
                    <div className="mt-0.5 line-clamp-2">
                      {[warehouse?.address, warehouse?.city, warehouse?.state, warehouse?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {!readOnly && !isRtoOrderStatus(order.status) && !(order.awb && order.awb !== "-" && order.awb !== "—") && (
                      <Button
                        size="sm"
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1"
                        onClick={() => onAssignCourier?.(order)}
                      >
                        Assign Courier
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    )}
                     { renderActions(order)}
                  
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersRichTable;
