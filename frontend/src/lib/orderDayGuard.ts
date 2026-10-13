// Shared calendar-day rule for the Orders date filters.
//
// Mirrors the table's Order Date column: orderDate when set, otherwise
// createdAt in the viewer's timezone. Delivered Date uses deliveredDate,
// Updated Date uses updatedAt.
//
// Used by BOTH the list and the status-chip counts so a stale API build
// (one that ignores startDateDay/endDateDay) can never desync them —
// the classic "select 9 Oct, list is right but All/Cancelled show old
// totals" bug.
export function localDayOf(value: any): string {
  if (value === null || value === undefined || value === "") return "";
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function orderFilterDayOf(order: any, dateType: string): string {
  if (dateType === "Delivered Date") {
    return order?.deliveredDate ? String(order.deliveredDate).slice(0, 10) : "";
  }
  if (dateType === "Updated Date") return localDayOf(order?.updatedAt);
  return order?.orderDate ? String(order.orderDate).slice(0, 10) : localDayOf(order?.createdAt);
}

export function orderInDateRange(
  order: any,
  dateFrom: string,
  dateTo: string,
  dateType: string
): boolean {
  const day = orderFilterDayOf(order, dateType);
  if (!day) return true; // row has no usable date — keep it
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

export function filterOrdersByDateRange<T>(
  orders: T[],
  dateFrom: string,
  dateTo: string,
  dateType: string
): T[] {
  if ((!dateFrom && !dateTo) || !Array.isArray(orders)) return orders;
  return orders.filter((o) => orderInDateRange(o, dateFrom, dateTo, dateType));
}
