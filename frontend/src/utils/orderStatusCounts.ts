import { ORDER_STATUS_GROUPS } from "@/config/orderStatusConfig";

// Booking stages count as Courier Assigned unless the order belongs to the
// more specific Pickups & Manifests tab.
function isPrePickupStatus(s: string): boolean {
  if (!s) return false;
  return (
    s.includes("ready for dispatch") ||
    s.includes("ready to ship") ||
    s.includes("courier assigned") ||
    s.includes("label created") ||
    s.includes("manifest") ||
    s.includes("pickup scheduled") ||
    s.includes("out for pickup") ||
    s.includes("pickups") ||
    s.includes("shipment expected") ||
    s.includes("rescheduled") ||
    s === "shipped" ||
    s.includes("booked") ||
    s.includes("assigned")
  );
}

function hasAssignedAwb(order: { awb?: string | null }): boolean {
  const awb = String(order.awb || "").trim();
  return Boolean(awb) && awb !== "-";
}

function isCourierAssigned(order: { status?: string; awb?: string | null }): boolean {
  if (!hasAssignedAwb(order)) return false;
  const s = (order.status || "").toLowerCase().trim();
  if (
    isCancelledStatus(s) ||
    isRtoOrderStatus(s) ||
    isNdrStatus(s) ||
    isOutForPickup(order) ||
    isForwardInTransitStatus(s) ||
    isOutForDeliveryStatus(s) ||
    isDeliveredStatus(s)
  ) {
    return false;
  }
  return true;
}

export function isRtoOrderStatus(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return s.includes("rto") || s.includes("return to origin");
}

function isRtoInTransitStatus(s: string): boolean {
  if (!s) return false;
  if (s.includes("rto delivered")) return false;
  return (
    s.includes("rto in transit") ||
    s.includes("rto initiated") ||
    s === "rto" ||
    s.includes("return to origin") ||
    (s.includes("rto") && !s.includes("delivered"))
  );
}

function isRtoDeliveredStatus(s: string): boolean {
  return s.includes("rto delivered");
}

function isCancelledStatus(s: string): boolean {
  if (!s) return false;
  if (s.includes("rto") || s.includes("return to origin")) return false;
  return (
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("cancelled") ||
    s.includes("canceled")
  );
}

function isNdrStatus(s: string): boolean {
  if (!s) return false;
  if (s.includes("rto") || s.includes("return to origin")) return false;
  return s.includes("undelivered") || s.includes("ndr") || s.includes("reattempt");
}

function isForwardInTransitStatus(s: string): boolean {
  if (
    !s ||
    isRtoOrderStatus(s) ||
    isNdrStatus(s) ||
    isCancelledStatus(s) ||
    isOutForDeliveryStatus(s) ||
    isDeliveredStatus(s)
  ) {
    return false;
  }
  if (s.includes("in transit")) return !isPrePickupStatus(s);
  return (
    s.includes("shipped") ||
    s.includes("dispatched") ||
    s.includes("picked up") ||
    s.includes("pickup complete") ||
    s.includes("pickup done")
  );
}

function isOutForDeliveryStatus(s: string): boolean {
  return Boolean(s) && !isCancelledStatus(s) && !isRtoOrderStatus(s) &&
    !isNdrStatus(s) && !isDeliveredStatus(s) && s.includes("out for delivery");
}

function isDeliveredStatus(s: string): boolean {
  return Boolean(s) && !isCancelledStatus(s) && !isRtoOrderStatus(s) &&
    !isNdrStatus(s) && s.includes("delivered");
}

function isOutForPickup(order: { status?: string; awb?: string | null }): boolean {
  const s = (order.status || "").toLowerCase().trim();
  if (!hasAssignedAwb(order)) return false;
  if (
    isCancelledStatus(s) ||
    isNdrStatus(s) ||
    s.includes("picked up") ||
    s.includes("pickup complete") ||
    s.includes("pickup done") ||
    s.includes("in transit") ||
    s.includes("shipped") ||
    s.includes("dispatched") ||
    s.includes("out for delivery") ||
    s.includes("delivered") ||
    isRtoOrderStatus(s)
  ) {
    return false;
  }
  return (
    s.includes("pickup") ||
    s.includes("manifest") ||
    s.includes("label created")
  );
}

function matchesStatusChip(
  order: { status?: string; awb?: string | null },
  chipValue: string
): boolean {
  const s = (order.status || "").toLowerCase().trim();

  if (chipValue === "Cancelled") {
    return isCancelledStatus(s);
  }

  if (chipValue === "READY FOR DISPATCH") {
    return isCourierAssigned(order);
  }

  if (chipValue === "Out for Pickup") {
    return isOutForPickup(order);
  }

  if (chipValue === "Out for Delivery") {
    return isOutForDeliveryStatus(s);
  }

  if (chipValue === "Delivered") {
    return isDeliveredStatus(s);
  }

  if (chipValue === "In Transit") {
    return isForwardInTransitStatus(s);
  }

  if (chipValue === "Pending") {
    return (
      !hasAssignedAwb(order) &&
      !isOutForPickup(order) &&
      !isForwardInTransitStatus(s) &&
      !isOutForDeliveryStatus(s) &&
      !isDeliveredStatus(s) &&
      !isNdrStatus(s) &&
      !isRtoOrderStatus(s) &&
      !isCancelledStatus(s)
    );
  }

  if (chipValue === "UNDELIVERED") {
    return isNdrStatus(s);
  }

  if (chipValue === "RTO In transit") {
    return isRtoInTransitStatus(s);
  }

  if (chipValue === "RTO Delivered") {
    return isRtoDeliveredStatus(s);
  }

  return s === chipValue.toLowerCase().trim() || (order.status || "") === chipValue;
}

function matchesDirectionAll(
  order: { status?: string },
  direction: "forward" | "reverse"
): boolean {
  const s = (order.status || "").toLowerCase();
  const isRto = isRtoOrderStatus(s);
  if (direction === "forward") {
    // All Orders includes RTO as well as forward shipments
    return true;
  }
  // Mirrors API reverseStatusPattern
  return (
    isRto ||
    s.includes("undelivered") ||
    s.includes("ndr") ||
    s.includes("reattempt")
  );
}

export function computeStatusCounts(
  orders: { status?: string; awb?: string | null }[],
  direction: "forward" | "reverse" = "forward"
): Record<string, number> {
  const allForDirection = orders.filter((o) => matchesDirectionAll(o, direction)).length;
  const counts: Record<string, number> = { all: allForDirection };

  for (const group of ORDER_STATUS_GROUPS) {
    for (const chip of group.chips) {
      if (chip.value === "all") {
        counts.all = allForDirection;
        continue;
      }
      counts[chip.value] = orders.filter((o) => matchesStatusChip(o, chip.value)).length;
    }
  }
  return counts;
}

/** Cleanup for raw courier scan text (e.g. "OUT_FOR_DELIVERY" -> "Out for delivery"). */
const fmtSubStatusText = (v: any): string =>
  String(v ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();

// Preferred order: human-readable remark keys first, raw status codes last.
const SUB_STATUS_TEXT_KEYS = [
  "Instructions", "instructions", "Instruction",
  "description", "Description", "activityDescription",
  "remark", "remarks", "Remarks", "Remark",
  "message", "Message", "msg",
  "Scan", "scan", "statusText", "status_display", "statusDisplay",
  "event", "Event",
  "status", "Status", "state", "State",
];

// Timestamp keys seen across courier payloads (Delhivery, Xpressbees,
// Shadowfax, generic {event_time,...} rows, etc.)
const SUB_STATUS_TS_KEYS = [
  "timestamp", "ScanDateTime", "StatusDateTime", "date", "created",
  "createdAt", "event_time", "time", "datetime", "scanDate",
  "scanDateTime", "updated_at",
];

const SUB_STATUS_HISTORY_KEYS = [
  "history", "scans", "tracking_history", "data", "activities",
  "tracking", "trackingDetails", "results", "orderStateInfo", "statuses",
];

function parseTrackingHistory(order: any): any[] {
  const raw = order?.tracking_history;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === "object") {
    for (const k of SUB_STATUS_HISTORY_KEYS) {
      if (Array.isArray(raw[k])) return raw[k];
    }
    return [raw];
  }
  return [];
}

/**
 * Latest courier tracking sub-status for an order (e.g. Delhivery
 * "Shipment not received from client").
 *
 * Resolution order:
 * 1. Delivered orders -> concrete delivery date/time (covers delivered
 *    orders that have no tracking_history at all).
 * 2. Newest tracking_history entry — every remark-style key seen across
 *    courier payloads, skipping entries that echo the main order status.
 * 3. Stored fields: ndrreason, subStatus-style columns, cancelReason.
 * 4. Booked but never scanned (pre-pickup + AWB) -> explicit
 *    "Awaiting first courier scan" note instead of a blank sub-status.
 */
export function getOrderSubStatus(order: any): string {
  const pickText = (...vals: any[]): string => {
    for (const v of vals) {
      const t = fmtSubStatusText(v);
      if (t && t !== "-" && t.toLowerCase() !== "unknown" && t.toLowerCase() !== "null") return t;
    }
    return "";
  };

  const mainStatus = String(order?.status || "").trim();
  const main = mainStatus.toLowerCase();

  const tsOf = (e: any): number => {
    for (const k of SUB_STATUS_TS_KEYS) {
      const t = e?.[k] ?? e?.ScanDetail?.[k];
      if (t) {
        const n = new Date(t).getTime();
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };
  const parseHistory = () => parseTrackingHistory(order);
  // Location attached to a scan entry (any known courier key).
  const locOf = (e: any): string => {
    const detail = e?.ScanDetail || e?.scanDetail || e || {};
    const loc = pickText(
      detail.location, e?.location,
      detail.ScannedLocation, detail.scannedLocation,
      detail.hub, e?.hub
    );
    if (!loc) return "";
    return loc.length > 70 ? `${loc.slice(0, 67).trimEnd()}...` : loc;
  };
  // Newest courier scan whose text differs from the main status (and
  // optionally satisfies a predicate, e.g. "must mention cancellation").
  // An entry that only echoes the main status is still useful when it has a
  // location ("UNDELIVERED at DELHI YASHWANT PLACE" under an UNDELIVERED
  // badge) — without that it would be skipped and a STALE earlier scan
  // ("OUT FOR DELIVERY" / "PICKED UP") would surface instead.
  const findScanText = (rows: any[], predicate?: (t: string) => boolean): string => {
    const sorted = [...rows].sort((a, b) => tsOf(b) - tsOf(a));
    for (const e of sorted) {
      const detail = e?.ScanDetail || e?.scanDetail || e || {};
      for (const k of SUB_STATUS_TEXT_KEYS) {
        const txt = pickText(detail[k], e?.[k]);
        if (!txt) continue;
        if (txt.toLowerCase() === main) {
          const loc = locOf(e);
          if (loc) return `${txt} at ${loc}`;
          // Cancelled order whose history only echoes "CANCELLED": show the
          // date of that scan so the pill isn't blank (it differs from the
          // plain status text, so the UI will render it).
          if (predicate && predicate(txt.toLowerCase()) && tsOf(e)) {
            return `${txt} on ${new Date(tsOf(e)).toISOString().slice(0, 10)}`;
          }
          continue;
        }
        if (predicate && !predicate(txt.toLowerCase())) continue;
        return txt;
      }
    }
    return "";
  };

  // Cancelled orders: show WHY it was cancelled — never a stale pre-cancel
  // scan like "Out For Pickup"/"PICKUP_SCHEDULED" under a Cancelled status.
  if (main.includes("cancel")) {
    const reason = pickText(order?.cancelReason, order?.reason);
    if (reason) return reason;
    const cancelScan = findScanText(parseHistory(), (t) => t.includes("cancel"));
    if (cancelScan) return cancelScan;
    // No reason and no cancel scan recorded: the last update on a cancelled
    // order is the cancellation itself — show its date instead of blank.
    if (order?.updatedAt) {
      const d = new Date(order.updatedAt);
      if (!Number.isNaN(d.getTime())) {
        return `Cancelled on ${d.toISOString().slice(0, 10)}`;
      }
    }
    return "";
  }

  // Delivered orders: prefer the concrete delivery timestamp over stale scans.
  if (main.includes("deliver") && !main.includes("undeliver") && order?.deliveredDate) {
    const time = order?.deliveredTime ? String(order.deliveredTime).slice(0, 5) : "";
    const label = main.includes("rto") ? "RTO delivered" : "Delivered";
    return `${label} on ${order.deliveredDate}${time ? `, ${time}` : ""}`;
  }

  // Undelivered / NDR: surface the failed-delivery reason or scan — never a
  // contradicting active scan like "Out For Delivery" under an UNDELIVERED
  // badge (that mismatch is exactly what looks broken in the list).
  if (main.includes("undeliver") || main.includes("ndr")) {
    const ndrReason = pickText(
      order?.ndrreason,
      order?.subStatus,
      order?.sub_status,
      order?.statusDetail
    );
    if (ndrReason) return ndrReason;
    const ndrScan = findScanText(parseHistory(), (t) =>
      /undeliv|ndr|refus|not attempt|attempt|fail|unable|no one|customer|reject/.test(t)
    );
    if (ndrScan) return ndrScan;
    return "Undelivered - attempt unsuccessful";
  }

  // Newest courier scan.
  const history = parseHistory();
  const fromScan = findScanText(history);
  if (fromScan) return fromScan;

  // Stored sub-status style fields.
  const fallback = pickText(
    order?.ndrreason,
    order?.subStatus,
    order?.sub_status,
    order?.statusDetail,
    order?.currentStatus,
    order?.trackingStatus,
    order?.courierStatus,
    order?.shipmentStatus,
    order?.latestStatus
  );
  if (fallback) return fallback;

  // No scans yet. If an AWB exists the courier owes us data, so explain the
  // gap instead of leaving a blank sub-status (blank only when no AWB either).
  const awb = String(order?.awb || "").trim();
  const hasAwb = Boolean(awb) && awb !== "-";
  const isPrePickup = main === "pending" || main === "new" || isPrePickupStatus(main);
  if (!history.length && hasAwb) {
    const courier = String(order?.courier || "").trim();
    const validCourier = courier && courier !== "-" && courier !== "—";
    if (isPrePickup) {
      return validCourier
        ? `Awaiting first courier scan from ${courier}`
        : "Awaiting first courier scan";
    }
    if (main.includes("deliver") && !main.includes("undeliver")) {
      return "Delivery date not recorded";
    }
    return validCourier
      ? `No scan history from ${courier}`
      : "No scan history available";
  }

  return "";
}

/**
 * Highlight colours for the sub-status pill — mirrors the status badge
 * palette used in the Courier / AWB column so both read the same way.
 */
export function subStatusBadgeClass(sub: string): string {
  const s = (sub || "").toLowerCase();
  if (s.includes("rto") || s.includes("return") || s.includes("undeliver") ||
      s.includes("not attempted") || s.includes("refused") || s.includes("lost")) return "bg-orange-100 text-orange-800";
  if (s.includes("deliver")) return "bg-teal-100 text-teal-800";
  if (s.includes("pickup") || s.includes("manifest") || s.includes("booked") ||
      s.includes("ready for dispatch") || s.includes("label")) return "bg-amber-100 text-amber-800";
  if (s.includes("transit") || s.includes("vehicle") || s.includes("departed") ||
      s.includes("bag") || s.includes("facility") || s.includes("trip") ||
      s.includes("hub") || s.includes("dispatch")) return "bg-blue-100 text-blue-800";
  if (s.includes("cancel")) return "bg-rose-100 text-rose-800";
  if (s.includes("awaiting") || s.includes("no scan")) return "bg-slate-100 text-slate-700";
  if (s.includes("exception") || s.includes("not received") || s.includes("not contactable") ||
      s.includes("not ready")) return "bg-rose-100 text-rose-800";
  return "bg-violet-100 text-violet-800";
}
