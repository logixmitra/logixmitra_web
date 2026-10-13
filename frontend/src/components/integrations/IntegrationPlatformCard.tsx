import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationPlatformCardProps {
  name: string;
  color: string;
  logoText: string;
  integrated?: boolean;
  actionLabel?: string;
  onAction: () => void;
  className?: string;
}

const IntegrationPlatformCard = ({
  name,
  color,
  logoText,
  integrated = false,
  actionLabel = "Integrate",
  onAction,
  className,
}: IntegrationPlatformCardProps) => (
  <div
    className={cn(
      "relative flex flex-col items-center rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-sm transition-shadow hover:shadow-md",
      className
    )}
  >
    {integrated && (
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        integrated
      </span>
    )}
    <div
      className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {logoText}
    </div>
    <h3 className="mb-5 text-sm font-semibold text-slate-800">{name}</h3>
    <button
      type="button"
      onClick={onAction}
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
    >
      {actionLabel}
      <ArrowRight className="h-4 w-4" />
    </button>
  </div>
);

export default IntegrationPlatformCard;
