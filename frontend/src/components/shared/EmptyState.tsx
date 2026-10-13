import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState = ({
  title = "No data available",
  description = "No data available for the applied filters. Please adjust the filter and try again.",
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
      <SearchX className="h-10 w-10 text-teal-600/70" strokeWidth={1.5} />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
  </div>
);

export default EmptyState;
