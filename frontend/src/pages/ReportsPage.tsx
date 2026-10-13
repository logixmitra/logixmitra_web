import { useState,useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, TrendingUp, Truck, Users, BarChart3 } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { apiRequest } from "../apiglobal/apiconfig"
import { getuser } from "../../services/getbasicdata";
const revenueData = [
  { month: "Sep", revenue: 285000, profit: 42000, orders: 620 },
  { month: "Oct", revenue: 342000, profit: 51000, orders: 710 },
  { month: "Nov", revenue: 310000, profit: 46000, orders: 680 },
  { month: "Dec", revenue: 428000, profit: 64000, orders: 890 },
  { month: "Jan", revenue: 385000, profit: 57000, orders: 780 },
  { month: "Feb", revenue: 420000, profit: 63000, orders: 841 },
];

const courierReportData = [
  { courier: "BlueDart", shipments: 4521, delivered: 4259, rto: 262, avgDays: 3.2 },
  { courier: "Delhivery", shipments: 3876, delivered: 3558, rto: 318, avgDays: 3.8 },
  { courier: "DTDC", shipments: 2943, delivered: 2605, rto: 338, avgDays: 4.1 },
  { courier: "Ecom Express", shipments: 3210, delivered: 2956, rto: 254, avgDays: 3.5 },
  { courier: "Xpressbees", shipments: 2156, delivered: 1934, rto: 222, avgDays: 4.0 },
];

const sellerReportData = [
  { seller: "FashionHub", orders: 432, revenue: "₹8.5L", rtoRate: 4.2, score: 92 },
  { seller: "TechWorld", orders: 287, revenue: "₹12.3L", rtoRate: 3.1, score: 95 },
  { seller: "HomeDecor", orders: 156, revenue: "₹4.2L", rtoRate: 6.8, score: 78 },
  { seller: "GadgetZone", orders: 89, revenue: "₹3.1L", rtoRate: 15.2, score: 42 },
  { seller: "SportsGear", orders: 203, revenue: "₹6.8L", rtoRate: 3.8, score: 88 },
  { seller: "OrganicBites", orders: 45, revenue: "₹1.2L", rtoRate: 8.5, score: 65 },
];

const rtoTrendData = [
  { month: "Sep", rtoRate: 8.2 },
  { month: "Oct", rtoRate: 7.8 },
  { month: "Nov", rtoRate: 9.1 },
  { month: "Dec", rtoRate: 8.5 },
  { month: "Jan", rtoRate: 7.2 },
  { month: "Feb", rtoRate: 6.9 },
];

const EMPTY_REPORTS = {
  courierReportData: [],
  sellerReportData: [],
  rtoTrendData: [],
  revenueData: [],
};

const normalizeReportData = (payload: Record<string, unknown> = {}) => ({
  revenueData: Array.isArray(payload.revenueData) ? payload.revenueData : [],
  courierReportData: Array.isArray(payload.courierReportData)
    ? payload.courierReportData
    : Array.isArray(payload.courierReport)
      ? (payload.courierReport as Array<Record<string, unknown>>).map((c) => ({
          courier: c.courier || c.name || "Unknown",
          shipments: c.shipments ?? c.orders ?? 0,
          delivered: c.delivered ?? 0,
          rto: c.rto ?? 0,
          avgDays: c.avgDays ?? 3.5,
        }))
      : [],
  sellerReportData: Array.isArray(payload.sellerReportData)
    ? payload.sellerReportData
    : Array.isArray(payload.sellerReport)
      ? (payload.sellerReport as Array<Record<string, unknown>>).map((s) => ({
          seller: s.seller || "Unknown",
          orders: s.orders ?? 0,
          revenue: s.revenue ?? "₹0",
          rtoRate: s.rtoRate ?? 0,
          score: s.score ?? 80,
        }))
      : [],
  rtoTrendData: Array.isArray(payload.rtoTrendData)
    ? payload.rtoTrendData
    : Array.isArray(payload.rtoTrend)
      ? (payload.rtoTrend as Array<Record<string, unknown>>).map((r) => ({
          month: r.month,
          rtoRate: r.rtoRate ?? r.count ?? 0,
        }))
      : [],
});

const ReportsPage = () => {
  const { toast } = useToast();

  const handleExport = (reportName: string) => {
    toast({ title: "Export started", description: `${reportName} report is being generated as CSV.` });
  };

  const [alldata, setalldata] = useState(EMPTY_REPORTS);

  const getdata = async () => {
    try {
      const response = await apiRequest("GET", "auth/getReportData", {}, { user_id: getuser().id });
      const payload = response?.data?.data ?? response?.data ?? {};
      setalldata(normalizeReportData(payload));
    } catch (error) {
      console.error("Reports fetch error:", error);
      setalldata(EMPTY_REPORTS);
    }
  };

  useEffect(() => {
    getdata();
  }, []);

  return (
    <DashboardLayout title="Reports" subtitle="Business intelligence and exportable analytics">
      <div className="space-y-6">
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-card">Revenue</TabsTrigger>
            <TabsTrigger value="courier" className="data-[state=active]:bg-card">Courier</TabsTrigger>
            {getuser().role == "admin" && <TabsTrigger value="seller" className="data-[state=active]:bg-card">Sellers</TabsTrigger>}
            <TabsTrigger value="rto" className="data-[state=active]:bg-card">RTO</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("Revenue")}><Download className="h-4 w-4" /> Export</Button>
            </div>
            <div className="lm-panel">
              <div className="lm-panel-head"><h3 className="text-sm font-semibold">Revenue & Profit</h3></div>
              <div className="lm-panel-body">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={alldata.revenueData ?? []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(186, 72%, 42%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(186, 72%, 42%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 69%, 31%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(152, 69%, 31%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="month" stroke="hsl(220, 10%, 46%)" />
                    <YAxis stroke="hsl(220, 10%, 46%)" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(186, 72%, 42%)" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(152, 69%, 31%)" fill="url(#profGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courier" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("Courier")}><Download className="h-4 w-4" /> Export</Button>
            </div>
            <div className="lm-panel overflow-hidden">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    {["Courier", "Shipments", "Delivered", "RTO", "Delivery %", "Avg Days"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(alldata.courierReportData ?? []).map(c => (
                    <tr key={c.courier}>
                      <td className="font-medium">{c.courier}</td>
                      <td>{c.shipments.toLocaleString()}</td>
                      <td className="text-success font-medium">{c.delivered.toLocaleString()}</td>
                      <td className="text-destructive font-medium">{c.rto}</td>
                      <td>{c.shipments > 0 ? ((c.delivered / c.shipments) * 100).toFixed(1) : "0.0"}%</td>
                      <td className="text-muted-foreground">{c.avgDays}d</td>
                    </tr>
                  ))}
                  {(alldata.courierReportData ?? []).length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No courier data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

         {getuser().role=="admin" &&
          <TabsContent value="seller" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("Seller")}><Download className="h-4 w-4" /> Export</Button>
            </div>
            <div className="lm-panel overflow-hidden">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    {["Seller", "Orders", "Revenue", "RTO Rate", "Score"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(alldata.sellerReportData ?? []).map(s => (
                    <tr key={s.seller}>
                      <td className="font-medium">{s.seller}</td>
                      <td>{s.orders}</td>
                      <td>{s.revenue}</td>
                      <td className={s.rtoRate > 10 ? "text-destructive font-medium" : "text-muted-foreground"}>{s.rtoRate}%</td>
                      <td>
                        <span className={`font-semibold ${s.score >= 80 ? "text-success" : s.score >= 50 ? "text-warning" : "text-destructive"}`}>{s.score}/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>}

          <TabsContent value="rto" className="space-y-4">
            <div className="lm-panel">
              <div className="lm-panel-head"><h3 className="text-sm font-semibold">RTO Rate Trend</h3></div>
              <div className="lm-panel-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={alldata.rtoTrendData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 90%)" />
                    <XAxis dataKey="month" stroke="hsl(240, 4%, 46%)" />
                    <YAxis stroke="hsl(240, 4%, 46%)" />
                    <Tooltip />
                    <Line type="monotone" dataKey="rtoRate" name="RTO %" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ fill: "hsl(262, 83%, 58%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
