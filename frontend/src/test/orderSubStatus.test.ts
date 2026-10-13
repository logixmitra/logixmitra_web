import { describe, it, expect } from "vitest";
import { getOrderSubStatus, subStatusBadgeClass } from "@/utils/orderStatusCounts";

describe("getOrderSubStatus", () => {
  it("reads the latest Delhivery ScanDetail instruction", () => {
    const order = {
      status: "In Transit",
      tracking_history: [
        { ScanDetail: { Instructions: "Shipment picked up", ScanDateTime: "2026-09-01T10:00:00" } },
        { ScanDetail: { Instructions: "Vehicle Departed", ScanDateTime: "2026-09-02T08:30:00" } },
      ],
    };
    expect(getOrderSubStatus(order)).toBe("Vehicle Departed");
  });

  it("reads generic {status, description, timestamp} entries", () => {
    const order = {
      status: "Delivered",
      deliveredDate: null,
      tracking_history: [
        { status: "In Transit", description: "Bag Received at Facility", timestamp: "2026-09-02T08:30:00" },
      ],
    };
    expect(getOrderSubStatus(order)).toBe("Bag Received at Facility");
  });

  it("sorts by event_time when timestamp keys are missing", () => {
    const order = {
      status: "In Transit",
      tracking_history: [
        { event_time: "2026-09-01T10:00:00", message: "Older scan" },
        { event_time: "2026-09-05T18:00:00", message: "Newest scan" },
      ],
    };
    expect(getOrderSubStatus(order)).toBe("Newest scan");
  });

  it("reads status codes as a last resort and de-underscored them", () => {
    const order = {
      status: "Delivered",
      deliveredDate: null,
      tracking_history: [{ event_time: "2026-09-05T18:00:00", status: "OUT_FOR_DELIVERY" }],
    };
    expect(getOrderSubStatus(order)).toBe("OUT FOR DELIVERY");
  });

  it("skips history entries that echo the main order status", () => {
    const order = {
      status: "In Transit",
      tracking_history: [
        { event_time: "2026-09-05T18:00:00", message: "In Transit" },
        { event_time: "2026-09-04T17:00:00", message: "Manifested at hub" },
      ],
    };
    expect(getOrderSubStatus(order)).toBe("Manifested at hub");
  });

  it("shows the delivery timestamp for delivered orders without tracking history", () => {
    const order = {
      status: "Delivered",
      deliveredDate: "2026-07-29",
      deliveredTime: "13:50:00",
      tracking_history: null,
    };
    expect(getOrderSubStatus(order)).toBe("Delivered on 2026-07-29, 13:50");
  });

  it("falls back to ndrreason / cancelReason style fields", () => {
    expect(
      getOrderSubStatus({ status: "UNDELIVERED", tracking_history: null, ndrreason: "Customer not contactable" })
    ).toBe("Customer not contactable");
    expect(
      getOrderSubStatus({ status: "Cancelled", tracking_history: null, cancelReason: "Customer requested cancellation" })
    ).toBe("Customer requested cancellation");
  });

  it("cancelled orders show the cancel reason, never a stale pre-cancel scan", () => {
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        cancelReason: "Customer requested cancellation",
        tracking_history: [
          { event_time: "2026-10-05T10:00:00", status: "Out For Pickup" },
          { event_time: "2026-10-04T10:00:00", status: "PICKUP_SCHEDULED" },
        ],
      })
    ).toBe("Customer requested cancellation");
  });

  it("cancelled orders without a reason only surface cancel-related scans", () => {
    // Latest scan is a stale pre-cancel activity -> skip it, use the cancel scan.
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        tracking_history: [
          { event_time: "2026-10-05T10:00:00", status: "Out For Pickup" },
          { event_time: "2026-10-04T10:00:00", status: "Pickup Cancelled" },
        ],
      })
    ).toBe("Pickup Cancelled");
    // No cancel-related scan at all -> blank instead of a misleading scan.
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        tracking_history: [{ event_time: "2026-10-05T10:00:00", status: "PICKUP_SCHEDULED" }],
      })
    ).toBe("");
  });

  it("explains booked orders that have no courier scans yet", () => {
    expect(
      getOrderSubStatus({ status: "Pending", awb: "DL123", courier: "Delhivery", tracking_history: null })
    ).toBe("Awaiting first courier scan from Delhivery");
    // No AWB -> nothing meaningful to show
    expect(getOrderSubStatus({ status: "Pending", awb: "-", tracking_history: null })).toBe("");
  });

  it("explains AWB orders that lost their stored scans instead of going blank", () => {
    // Delivered + AWB + no stored history + no deliveredDate (DB backfill gap).
    expect(
      getOrderSubStatus({
        status: "Delivered",
        awb: "SF38647192023",
        courier: "Shadowfax",
        deliveredDate: null,
        tracking_history: null,
      })
    ).toBe("Delivery date not recorded");
    // Active shipment + AWB but courier never returned scans to us.
    expect(
      getOrderSubStatus({ status: "In Transit", awb: "59757110003264", courier: "Delhivery Surface", tracking_history: [] })
    ).toBe("No scan history from Delhivery Surface");
    // RTO leg without scans.
    expect(
      getOrderSubStatus({ status: "RTO In transit", awb: "DL99", courier: "Delhivery Air", tracking_history: null })
    ).toBe("No scan history from Delhivery Air");
  });

  it("handles JSON-string and nested-object tracking histories", () => {
    const arr = [{ event_time: "2026-09-05T18:00:00", message: "Trip Arrived" }];
    expect(
      getOrderSubStatus({ status: "In Transit", tracking_history: JSON.stringify(arr) })
    ).toBe("Trip Arrived");
    expect(
      getOrderSubStatus({ status: "In Transit", tracking_history: { history: arr } })
    ).toBe("Trip Arrived");
  });

  it("uses the newest echo scan with its location instead of a stale earlier scan", () => {
    // SMC-style history: latest entry echoes the status but carries the hub.
    expect(
      getOrderSubStatus({
        status: "In Transit",
        tracking_history: [
          { state: "IN_TRANSIT", status: "IN_TRANSIT", location: "GURGAON SEC 18 HUB", timestamp: "2026-10-03T13:20:05Z" },
          { state: "PICKED_UP", status: "PICKED_UP", location: "DELHI SURFACE ECOM CP", timestamp: "2026-10-03T09:35:17Z" },
        ],
      })
    ).toBe("IN TRANSIT at GURGAON SEC 18 HUB");
  });

  it("never surfaces a contradicting active scan under an UNDELIVERED order", () => {
    // XpressBees-style history ends at OFD but the order was marked undelivered.
    expect(
      getOrderSubStatus({
        status: "UNDELIVERED",
        ndrreason: "",
        tracking_history: [
          { event_time: "2026-08-29 11:54", message: "Out For Delivery" },
          { event_time: "2026-08-26 06:22", message: "In Transit" },
        ],
      })
    ).toBe("Undelivered - attempt unsuccessful");
    // Undelivered scan with location wins.
    expect(
      getOrderSubStatus({
        status: "UNDELIVERED",
        tracking_history: [
          { state: "UNDELIVERED", status: "UNDELIVERED", location: "DELHI YASHWANT PLACE ECOM CP", timestamp: "2026-10-05T12:27:05Z" },
          { state: "OUT_FOR_DELIVERY", status: "OUT_FOR_DELIVERY", location: "DELHI YASHWANT PLACE ECOM CP", timestamp: "2026-10-05T05:44:07Z" },
        ],
      })
    ).toBe("UNDELIVERED at DELHI YASHWANT PLACE ECOM CP");
    // Stored NDR reason beats scans.
    expect(
      getOrderSubStatus({ status: "UNDELIVERED", ndrreason: "Customer not contactable", tracking_history: null })
    ).toBe("Customer not contactable");
  });

  it("shows the cancel date when only a CANCELLED echo scan exists", () => {
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        tracking_history: [
          { state: "CANCELLED", status: "CANCELLED", location: "Unknown", timestamp: "2026-08-28T08:35:13Z" },
          { state: "ORDER_CREATED", status: "ORDER_CREATED", location: "Unknown", timestamp: "2026-08-27T11:17:02Z" },
        ],
      })
    ).toBe("CANCELLED on 2026-08-28");
  });

  it("falls back to the updatedAt date for cancelled orders with no reason or scan", () => {
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        updatedAt: "2026-09-05T00:26:55.000Z",
        tracking_history: [{ event_time: "2026-09-05 00:12", message: "Data Received" }],
      })
    ).toBe("Cancelled on 2026-09-05");
    // No updatedAt at all -> blank instead of a misleading pre-cancel scan.
    expect(
      getOrderSubStatus({
        status: "Cancelled",
        tracking_history: [{ event_time: "2026-10-05T10:00:00", status: "PICKUP_SCHEDULED" }],
      })
    ).toBe("");
  });
});

describe("subStatusBadgeClass", () => {
  it("maps sub-status text to highlighted badge colours", () => {
    expect(subStatusBadgeClass("Delivered on 2026-07-29")).toContain("teal");
    expect(subStatusBadgeClass("Vehicle Departed")).toContain("blue");
    expect(subStatusBadgeClass("RTO in transit")).toContain("orange");
    expect(subStatusBadgeClass("Customer requested cancellation")).toContain("rose");
    expect(subStatusBadgeClass("Manifested at hub")).toContain("amber");
    expect(subStatusBadgeClass("Awaiting first courier scan")).toContain("slate");
    expect(subStatusBadgeClass("something else")).toContain("violet");
  });
});
