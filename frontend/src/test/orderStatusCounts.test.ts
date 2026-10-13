import { describe, expect, it } from "vitest";
import { ORDER_STATUS_GROUPS } from "@/config/orderStatusConfig";
import { computeStatusCounts } from "@/utils/orderStatusCounts";

describe("computeStatusCounts", () => {
  it("counts each order in only one status tab", () => {
    const orders = [
      { status: "READY FOR DISPATCH", awb: "AWB-1" },
      { status: "Out for Pickup", awb: "AWB-2" },
      { status: "Courier Assigned", awb: "AWB-3" },
      { status: "Pickup Cancelled", awb: "AWB-4" },
      { status: "Out for Pickup Cancelled", awb: "AWB-5" },
      { status: "Delivered", awb: "AWB-6" },
      { status: "UNDELIVERED", awb: "AWB-7" },
      { status: "RTO In transit", awb: "AWB-8" },
      { status: "Reattempt", awb: "AWB-9" },
      { status: "RTO Delivered", awb: "AWB-10" },
      { status: "Processing", awb: "-" },
      { status: "Picked Up at hub", awb: "AWB-11" },
      { status: "Shipment Shipped", awb: "AWB-12" },
      { status: "Manifest Created", awb: "AWB-13" },
      { status: "Legacy Status", awb: "-" },
      { status: "Legacy AWB Status", awb: "AWB-14" },
      { status: "Ready for Dispatch", awb: "-" },
      { status: "Out for Delivery", awb: "AWB-15" },
      { status: "Out for Delivery Delivered", awb: "AWB-16" },
    ];

    const counts = computeStatusCounts(orders);
    const tabTotal = ORDER_STATUS_GROUPS
      .flatMap((group) => group.chips)
      .filter((chip) => chip.value !== "all")
      .reduce((total, chip) => total + counts[chip.value], 0);

    expect(counts.all).toBe(orders.length);
    expect(counts["READY FOR DISPATCH"]).toBe(3);
    expect(counts["Out for Pickup"]).toBe(2);
    expect(counts.UNDELIVERED).toBe(2);
    expect(counts["RTO In transit"]).toBe(1);
    expect(counts["RTO Delivered"]).toBe(1);
    expect(counts.Cancelled).toBe(2);
    expect(counts["In Transit"]).toBe(2);
    expect(counts.Pending).toBe(3);
    expect(counts["Out for Delivery"]).toBe(1);
    expect(counts.Delivered).toBe(2);
    expect(tabTotal).toBe(counts.all);
  });
});
