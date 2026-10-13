import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: string;
  trend?: "up" | "down" | "neutral";
  /** Optional visual variant accepted by callers; currently unused. */
  variant?: string;
}

const StatCard = ({ title, value, icon, change, trend = "neutral" }: StatCardProps) => (
  <div className="lm-stat">
    <div className="relative z-10 flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {change && (
          <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
            trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {change}
          </p>
        )}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-teal-400">
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;
