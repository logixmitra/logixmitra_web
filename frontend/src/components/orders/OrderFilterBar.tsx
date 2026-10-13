import { Calendar, Download, Filter, RefreshCw, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OrderFilterBarProps {
  dateType?: string;
  onDateTypeChange?: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (v: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (v: string) => void;
  showMoreFilters?: boolean;
  onToggleMoreFilters?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  refreshing?: boolean;
}

const OrderFilterBar = ({
  dateType = "Order Created",
  onDateTypeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  searchQuery,
  onSearchQueryChange,
  paymentFilter,
  onPaymentFilterChange,
  platformFilter,
  onPlatformFilterChange,
  showMoreFilters,
  onToggleMoreFilters,
  onRefresh,
  onExport,
  onSettings,
  refreshing,
}: OrderFilterBarProps) => {
  const formatDate = (date: string) => date.split("-").reverse().join("-");
  const dateLabel = dateFrom && dateTo
    ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}`
    : dateFrom
      ? `From ${formatDate(dateFrom)}`
      : dateTo
        ? `To ${formatDate(dateTo)}`
        : "Select date";

  return (
    <div className="border-b border-slate-200 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={dateType} onValueChange={onDateTypeChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Order Created">Order Created</SelectItem>
            <SelectItem value="Delivered Date">Delivered Date</SelectItem>
            <SelectItem value="Updated Date">Updated Date</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 h-9 min-w-[200px]">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-600 truncate">{dateLabel}</span>
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-9 w-36 text-xs"
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-9 w-36 text-xs"
          title="To date"
        />

        <Input
          placeholder="Search by AWB, Order ID, Customer, Phone, Email, Pincode, Reference"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-9 w-[420px] text-xs"
        />

        <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
          <SelectTrigger className="h-9 w-[120px] text-xs border-slate-200">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="pending">COD</SelectItem>
            <SelectItem value="paid">Prepaid</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
          <SelectTrigger className="h-9 w-[120px] text-xs border-slate-200">
            <SelectValue placeholder="Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
            <SelectItem value="Amazon">Amazon</SelectItem>
            <SelectItem value="Shopify">Shopify</SelectItem>
            <SelectItem value="WooCommerce">WooCommerce</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 gap-1.5 text-xs", showMoreFilters && "border-teal-600 text-teal-700")}
          onClick={onToggleMoreFilters}
        >
          <Filter className="h-3.5 w-3.5" /> More Filters
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onExport} title="Export">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" title="Table Settings" onClick={onSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showMoreFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <span className="text-xs text-slate-500">Advanced filters active</span>
          {(dateFrom || dateTo || searchQuery || paymentFilter !== "all" || platformFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                onDateFromChange("");
                onDateToChange("");
                onSearchQueryChange("");
                onPaymentFilterChange("all");
                onPlatformFilterChange("all");
              }}
            >
              <X className="h-3 w-3" /> Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderFilterBar;
