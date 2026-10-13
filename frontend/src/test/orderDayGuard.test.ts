import { describe, expect, it } from "vitest";
import {
  filterOrdersByDateRange,
  localDayOf,
  orderFilterDayOf,
  orderInDateRange,
} from "@/lib/orderDayGuard";

describe("orderDayGuard", () => {
  it("keeps rows whose orderDate is inside the picked range", () => {
    const inRange = { orderDate: "2026-10-09", status: "Delivered" };
    const outRange = { orderDate: "2026-10-08", status: "Cancelled" };

    expect(orderInDateRange(inRange, "2026-10-09", "2026-10-09", "Order Created")).toBe(true);
    expect(orderInDateRange(outRange, "2026-10-09", "2026-10-09", "Order Created")).toBe(false);
  });

  it("falls back to createdAt local day when orderDate is missing", () => {
    // 9 Oct 01:30 IST == 8 Oct 20:00Z — local day must win.
    const row = { createdAt: "2026-10-08T20:00:00.000Z" };

    expect(orderFilterDayOf(row, "Order Created")).toBe(localDayOf(row.createdAt));
    expect(orderInDateRange(row, "2026-10-09", "2026-10-09", "Order Created")).toBe(
      localDayOf(row.createdAt) === "2026-10-09"
    );
  });

  it("uses deliveredDate / updatedAt for those date types", () => {
    expect(
      orderFilterDayOf({ deliveredDate: "2026-10-05" }, "Delivered Date")
    ).toBe("2026-10-05");
    expect(
      orderInDateRange({ deliveredDate: "2026-10-05" }, "2026-10-09", "2026-10-09", "Delivered Date")
    ).toBe(false);
    expect(
      orderInDateRange({ updatedAt: "2026-10-09T10:00:00.000Z" }, "2026-10-09", "2026-10-09", "Updated Date")
    ).toBe(true);
  });

  it("keeps rows with no usable date and passes through when no filter", () => {
    const rows = [{ status: "Pending" }, { orderDate: "2026-10-08", status: "Cancelled" }];

    expect(orderInDateRange(rows[0], "2026-10-09", "2026-10-09", "Order Created")).toBe(true);
    expect(filterOrdersByDateRange(rows, "", "", "Order Created")).toBe(rows);
  });

  it("filters a mixed list down to the picked day (All/Cancelled scenario)", () => {
    const rows = [
      { orderDate: "2026-10-09", status: "Delivered" },
      { orderDate: "2026-10-08", status: "Cancelled" },
      { orderDate: "2026-10-09", status: "Cancelled" },
    ];

    const filtered = filterOrdersByDateRange(rows, "2026-10-09", "2026-10-09", "Order Created");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => String(r.orderDate) === "2026-10-09")).toBe(true);
  });
});
