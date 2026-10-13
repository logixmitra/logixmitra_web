import { Wallet, Receipt, Truck, CreditCard, FileText, StickyNote, BookOpen, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const BILLING_TABS = [
  { id: "wallet", label: "Passbook", icon: Wallet },
  { id: "codhistory", label: "COD Remittance", icon: Receipt },
  { id: "shipping", label: "Shipping Charges", icon: Truck },
  { id: "recharges", label: "All Recharges", icon: CreditCard },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "credit", label: "Credit Notes", icon: StickyNote },
  { id: "debit", label: "Debit Notes", icon: StickyNote },
  { id: "ledgers", label: "Ledgers", icon: BookOpen },
  { id: "notifications", label: "Notification Credit History", icon: Bell },
];

interface BillingTabsBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BillingTabsBar = ({ activeTab, onTabChange }: BillingTabsBarProps) => (
  <div className="lm-workspace-shell overflow-x-auto">
    <div className="flex items-center gap-1 border-b border-slate-200 px-2 min-w-max">
      {BILLING_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              isActive
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default BillingTabsBar;
