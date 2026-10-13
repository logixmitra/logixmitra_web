import { cn } from "@/lib/utils";

const NDR_TABS = [
  { id: "all", label: "All Exceptions" },
  { id: "open", label: "NDR Open" },
  { id: "reattempt", label: "Reattempt" },
  { id: "resolved", label: "NDR Delivered" },
  { id: "rto", label: "RTO" },
  { id: "rto_delivered", label: "RTO Delivered" },
];

interface NdrTabsBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NdrTabsBar = ({ activeTab, onTabChange }: NdrTabsBarProps) => (
  <div className="lm-workspace-shell overflow-x-auto">
    <div className="flex items-center gap-1 border-b border-slate-200 px-2 min-w-max">
      {NDR_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
            activeTab === tab.id
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

export default NdrTabsBar;
