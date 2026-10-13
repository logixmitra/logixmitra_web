import { describe, expect, it } from "vitest";
import { getOrderDateFilters } from "@/lib/orderDateFilters";

describe("getOrderDateFilters", () => {
  it("supports a From-only timestamp filter at local start of day", () => {
    const filters = getOrderDateFilters("2026-10-07", "", "Order Created");
    const expected = new Date(2026, 9, 7).toISOString();

    expect(filters.startDate).toBe(expected);
    expect(filters.endDate).toBeUndefined();
    // The picked calendar day travels separately: orderDate is DATEONLY, so
    // the server compares it against "2026-10-07", not a UTC instant.
    expect(filters.startDateDay).toBe("2026-10-07");
    expect(filters.endDateDay).toBeUndefined();
  });

  it("supports a To-only timestamp filter through local end of day", () => {
    const filters = getOrderDateFilters("", "2026-10-07", "Updated Date");
    const expected = new Date(2026, 9, 7, 23, 59, 59, 999).toISOString();

    expect(filters.startDate).toBeUndefined();
    expect(filters.endDate).toBe(expected);
    expect(filters.startDateDay).toBeUndefined();
    expect(filters.endDateDay).toBe("2026-10-07");
  });

  it("keeps the full local date range for timestamp filters", () => {
    const filters = getOrderDateFilters("2026-10-01", "2026-10-07", "Order Created");

    expect(filters.startDate).toBe(new Date(2026, 9, 1).toISOString());
    expect(filters.endDate).toBe(new Date(2026, 9, 7, 23, 59, 59, 999).toISOString());
    expect(filters.startDateDay).toBe("2026-10-01");
    expect(filters.endDateDay).toBe("2026-10-07");
    expect(filters.dateType).toBe("Order Created");
  });

  it("keeps Delivered Date bounds as calendar dates", () => {
    expect(getOrderDateFilters("2026-10-01", "2026-10-07", "Delivered Date")).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      startDateDay: "2026-10-01",
      endDateDay: "2026-10-07",
      dateType: "Delivered Date",
    });
  });

  it("omits every field when no dates are picked", () => {
    const filters = getOrderDateFilters("", "", "Order Created");

    expect(filters.startDate).toBeUndefined();
    expect(filters.endDate).toBeUndefined();
    expect(filters.startDateDay).toBeUndefined();
    expect(filters.endDateDay).toBeUndefined();
  });
});
