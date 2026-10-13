import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatusMetricCard from "@/components/dashboard/StatusMetricCard";
import {
  Package, Truck, MapPin, CheckCircle, XCircle, RotateCcw,
  FileText, CalendarDays,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { API_BASE_URL } from "../../services/config";
import { useNavigate } from "react-router-dom";

const STATUS_CARDS = [
  { key: "newOrders", title: "New Orders", icon: Package, bg: "bg-sky-50", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { key: "courierAssigned", title: "Courier Assigned", icon: Truck, bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { key: "inTransit", title: "In Transit", icon: MapPin, bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { key: "delivered", title: "Delivered", icon: CheckCircle, bg: "bg-orange-50", iconBg: "bg-orange-100", iconColor: "text-orange-500" },
  { key: "undelivered", title: "Undelivered", icon: XCircle, bg: "bg-rose-50", iconBg: "bg-rose-100", iconColor: "text-rose-500" },
  { key: "rto", title: "RTO", icon: RotateCcw, bg: "bg-violet-50", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
];

const statusPill = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("deliver")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("transit") || s.includes("ship")) return "bg-sky-100 text-sky-700";
  if (s.includes("rto") || s.includes("return")) return "bg-rose-100 text-rose-700";
  if (s.includes("pending") || s.includes("new")) return "bg-teal-100 text-teal-700";
  return "bg-slate-100 text-slate-600";
};

const EMPTY = {
  statusBuckets: { newOrders: 0, courierAssigned: 0, inTransit: 0, delivered: 0, undelivered: 0, rto: 0 },
  walletTransactions: [] as any[],
  shipmentAnalytics: [] as any[],
  recentOrders: [] as any[],
};

/** Normalize axios / fetch payloads and legacy API shapes into dashboard state */
function normalizeDashboardPayload(raw: any) {
  // axios: res.data = { success, data }; some callers pass res.data already
  const root = raw?.data?.data ?? raw?.data ?? raw ?? {};
  const payload = root?.statusBuckets || root?.recentOrders || root?.shipmentAnalytics
    ? root
    : (root?.data && typeof root.data === "object" ? root.data : root);

  const statusBuckets = {
    ...EMPTY.statusBuckets,
    ...(payload.statusBuckets || {}),
  };

  // Legacy fallback: derive buckets from orderStatusData if statusBuckets missing/zeroed
  const legacy = Array.isArray(payload.orderStatusData) ? payload.orderStatusData : [];
  const bucketSum = Object.values(statusBuckets).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  if (bucketSum === 0 && legacy.length > 0) {
    for (const row of legacy) {
      const name = String(row?.name || "").toLowerCase();
      const value = Number(row?.value) || 0;
      if (name.includes("deliver") && !name.includes("undeliver")) statusBuckets.delivered += value;
      else if (name.includes("transit")) statusBuckets.inTransit += value;
      else if (name.includes("rto") || name.includes("cancel")) statusBuckets.rto += value;
      else if (name.includes("undeliver") || name.includes("ndr")) statusBuckets.undelivered += value;
      else if (name.includes("pending") || name.includes("new")) statusBuckets.newOrders += value;
    }
  }

  const shipmentAnalytics = Array.isArray(payload.shipmentAnalytics) && payload.shipmentAnalytics.length
    ? payload.shipmentAnalytics
    : [
        { name: "Delivered", value: statusBuckets.delivered, fill: "#34d399" },
        { name: "In Transit", value: statusBuckets.inTransit, fill: "#60a5fa" },
        { name: "RTO", value: statusBuckets.rto, fill: "#f87171" },
      ].filter((x) => x.value > 0);

  const getOrderTime = (o: any) => {
    const value = o?.createdAt || o?.created_at || o?.updatedAt || o?.updated_at || o?.orderDate || o?.order_date || 0;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };

  // Order details wala number (30,31,32...) nikalo — same date par
  // sabse bada number sabse upar aayega (34, 33, 32...)
  const getOrderSeq = (o: any) => {
    const raw = o?.orderNumber ?? o?.order_number ?? o?.id ?? "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return 0;
    const tail = digits.slice(-10);
    const n = Number(tail);
    return Number.isFinite(n) ? n : 0;
  };

  const recentOrders = (Array.isArray(payload.recentOrders) ? payload.recentOrders : [])
    .map((o: any) => ({
      id: o.id || o.orderNumber || "-",
      customer: o.customer || o.customerName || "-",
      product: o.product || o.courier || "Manual",
      type: o.type || "Forward",
      status: o.status || "Pending",
      _time: getOrderTime(o),
      _seq: getOrderSeq(o),
    }))
    .sort((a, b) => {
      if ((b._time || 0) !== (a._time || 0)) return (b._time || 0) - (a._time || 0);
      // Same date/time -> order details number ke hisaab se bada number upar
      return (b._seq || 0) - (a._seq || 0);
    })
    .map(({ _time, _seq, ...rest }) => rest);

  return {
    statusBuckets,
    walletTransactions: Array.isArray(payload.walletTransactions) ? payload.walletTransactions : [],
    shipmentAnalytics,
    recentOrders,
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");
  const [dateRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB").replace(/\//g, "-");
    return `${fmt(from)} to ${fmt(to)}`;
  });

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/auth/getDashboardData`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "undefined" && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json())
      .then((res) => {
        setData(normalizeDashboardPayload(res));
      })
      .catch((err) => {
        console.error("Dashboard load failed:", err);
        setData(EMPTY);
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(
    () => (data.shipmentAnalytics.length ? data.shipmentAnalytics : [
      { name: "Delivered", value: data.statusBuckets.delivered, fill: "#34d399" },
      { name: "In Transit", value: data.statusBuckets.inTransit, fill: "#60a5fa" },
      { name: "RTO", value: data.statusBuckets.rto, fill: "#f87171" },
    ]),
    [data]
  );

  return (
    <DashboardLayout hidePageHeader>
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* Toolbar row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 bg-white border border-slate-200 p-1 rounded-xl">
              <TabsTrigger value="analytics" className="rounded-lg text-sm data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="status" className="rounded-lg text-sm data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Order Status
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {dateRange}
          </div>
        </div>

        {/* Status metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {STATUS_CARDS.map((card) => (
            <StatusMetricCard
              key={card.key}
              title={card.title}
              value={data.statusBuckets[card.key as keyof typeof data.statusBuckets] ?? 0}
              icon={card.icon}
              bg={card.bg}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
            />
          ))}
        </div>

        {/* Middle section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Wallet transactions */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">Wallet Transactions</h3>
              <button
                onClick={() => navigate("/dashboard/wallet-recharge")}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
              {data.walletTransactions.length > 0 ? (
                data.walletTransactions.map((tx: { id: number; title: string; date: string; amount: string; isCredit: boolean }) => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{tx.title}</p>
                      <p className="text-xs text-slate-400">{tx.date}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.isCredit ? "text-emerald-600" : "text-rose-500"}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">
                  {loading ? "Loading…" : "No wallet transactions yet"}
                </div>
              )}
            </div>
          </div>

          {/* Shipment analytics */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">Shipment Analytics</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill || "#14b8a6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-4">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.fill }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent orders table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Order ID</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentOrders.length > 0 ? (
                  data.recentOrders.map((order: { id: string; customer: string; product: string; type: string; status: string }) => (
                    <tr key={order.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{order.customer}</td>
                      <td className="px-5 py-3.5 text-slate-600">{order.product}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate("/dashboard/orders")}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {order.id}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                          {order.type || "Forward"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      {loading ? "Loading…" : "No orders yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
