import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CalendarClock, Truck } from "lucide-react";

const EddWidgetPage = () => (
  <DashboardLayout hidePageHeader>
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-teal-50">
          <div className="relative">
            <Truck className="h-10 w-10 text-teal-600" />
            <CalendarClock className="absolute -right-2 -top-2 h-5 w-5 text-orange-500" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Set Up EDD Widget</h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Show customers the exact delivery date based on their pincode and improve conversion rates.
        </p>
        <ul className="mt-6 space-y-2 text-left text-sm text-slate-700">
          {[
            "Improve customer trust",
            "Reduce cart abandonment",
            "Boost sales with accurate delivery dates",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✔</span>
              {item}
            </li>
          ))}
        </ul>
        <Button className="mt-8 w-full bg-teal-700 hover:bg-teal-800 h-11 text-base font-semibold">
          Get Started
        </Button>
      </div>
    </div>
  </DashboardLayout>
);

export default EddWidgetPage;
