import { ReactNode } from "react";
import { ChevronDown, Plus, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_GROUPS } from "@/config/orderStatusConfig";

export { ORDER_STATUS_GROUPS };

interface OrderWorkspaceToolbarProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  statusCounts?: Record<string, number>;
  direction?: "forward" | "reverse";
  onDirectionChange?: (v: "forward" | "reverse") => void;
  scope?: "domestic" | "international";
  onScopeChange?: (v: "domestic" | "international") => void;
  syncSlot?: ReactNode;
  onCreateOrder?: () => void;
  onBulkImport?: () => void;
  readOnly?: boolean;
}

const OrderWorkspaceToolbar = ({
  statusFilter,
  onStatusChange,
  statusCounts = {},
  direction = "forward",
  onDirectionChange,
  scope = "domestic",
  onScopeChange,
  syncSlot,
  onCreateOrder,
  onBulkImport,
  readOnly = false,
}: OrderWorkspaceToolbarProps) => {
  return (
    <div className="lm-workspace-shell space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {(["forward", "reverse"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDirectionChange?.(d)}
                className={cn(
                  "pb-1 text-sm font-semibold capitalize transition-colors",
                  direction === d
                    ? "border-b-2 border-teal-600 text-teal-700"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(["domestic", "international"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onScopeChange?.(s)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors",
                  scope === s
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {syncSlot ?? (
            <Button size="sm" className="h-9 gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-medium">
              <RefreshCw className="h-4 w-4" /> Sync Orders
            </Button>
          )}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-medium"
            onClick={onBulkImport}
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1 bg-teal-600 hover:bg-teal-700 font-semibold"
            onClick={onCreateOrder}
          >
            <Plus className="h-4 w-4" /> Add Order
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </Button>
        </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-3 border-b border-slate-200 px-4 py-3">
        {ORDER_STATUS_GROUPS.map((group) => (
          <div key={group.label || "misc"} className="flex flex-wrap items-center gap-1.5">
            {group.label && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5 whitespace-nowrap">
                {group.label}
              </span>
            )}
            {group.chips.map((chip) => {
              const count = statusCounts[chip.value] ?? 0;
              const active = statusFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => onStatusChange(chip.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-800"
                  )}
                >
                  {chip.label}
                  <span
                    className={cn(
                      "inline-flex min-w-[18px] items-center justify-center rounded px-1 text-[10px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderWorkspaceToolbar;
