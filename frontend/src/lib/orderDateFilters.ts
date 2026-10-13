export interface OrderDateFilters {
  startDate?: string;
  endDate?: string;
  // Exact calendar days (YYYY-MM-DD) picked in the UI. orderDate is a DATEONLY
  // column, so the server filters it with these instead of the ISO timestamps
  // (an ISO UTC instant can land on the previous/next day for IST users).
  startDateDay?: string;
  endDateDay?: string;
  dateType?: string;
}

function toLocalDateBoundary(date: string, endOfDay: boolean): string {
  const [year, month, day] = date.split("-").map(Number);
  const boundary = new Date(year, month - 1, day);
  if (endOfDay) {
    boundary.setHours(23, 59, 59, 999);
  }
  return boundary.toISOString();
}

export function getOrderDateFilters(
  dateFrom: string,
  dateTo: string,
  dateType: string
): OrderDateFilters {
  const isDateOnly = dateType === "Delivered Date";
  return {
    startDate: dateFrom
      ? isDateOnly
        ? dateFrom
        : toLocalDateBoundary(dateFrom, false)
      : undefined,
    endDate: dateTo
      ? isDateOnly
        ? dateTo
        : toLocalDateBoundary(dateTo, true)
      : undefined,
    startDateDay: dateFrom || undefined,
    endDateDay: dateTo || undefined,
    dateType: dateType || undefined,
  };
}
