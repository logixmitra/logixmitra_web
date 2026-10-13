import { LucideIcon } from "lucide-react";

interface StatusMetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  bg: string;
  iconBg: string;
  iconColor: string;
}

const StatusMetricCard = ({ title, value, icon: Icon, bg, iconBg, iconColor }: StatusMetricCardProps) => (
  <div className={`rounded-2xl border border-white/60 p-4 shadow-sm ${bg}`}>
    <div className="flex flex-col items-center text-center gap-3">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
        <Icon className={`h-7 w-7 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600">{title}</p>
        <p className="mt-1 text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

export default StatusMetricCard;
