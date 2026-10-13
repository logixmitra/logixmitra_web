import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import NdrTabsBar from "@/components/ndr/NdrTabsBar";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RotateCcw, Package, AlertTriangle, RefreshCw } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { orderApi } from "../../services/orderApi";
import { isOrdersReadOnly } from "../../services/getbasicdata";

const statusStyles: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  reattempt: "bg-info/10 text-info",
  rto: "bg-destructive/10 text-destructive",
  rto_delivered: "bg-destructive/10 text-destructive",
  resolved: "bg-success/10 text-success",
};

/** True for NDR + RTO exception orders (excludes normal delivered). */
const isExceptionOrder = (order: { status?: string }) => {
  const s = (order?.status || "").toLowerCase();
  return (
    s.includes("rto") ||
    s.includes("return to origin") ||
    s.includes("ndr") ||
    s.includes("undelivered") ||
    s.includes("reattempt")
  );
};

const isRtoStatus = (s: string) =>
  s.includes("rto") || s.includes("return to origin");

const normalizeNdrStatus = (
  status?: string
): "open" | "reattempt" | "rto" | "rto_delivered" | "resolved" => {
  const s = (status || "").toLowerCase();
  if (s.includes("rto delivered")) return "rto_delivered";
  if (isRtoStatus(s)) return "rto";
  if (s.includes("reattempt")) return "reattempt";
  if ((s.includes("delivered") || s.includes("ndr delivered")) && !s.includes("undelivered")) return "resolved";
  return "open";
};

const NdrRtoPage = () => {
  const { toast } = useToast();
  const readOnly = isOrdersReadOnly();
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const result = await orderApi.getAll({ paginate: "false", direction: "reverse" });
      const orders = result?.orders ?? (Array.isArray(result) ? result : []);
      setCases(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error("Error fetching orders for NDR/RTO:", error);
      setCases([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const ndrCases = cases.filter(isExceptionOrder);

  const filtered = ndrCases.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c?.referenceId?.toLowerCase()?.includes(q) ||
      c?.orderNumber?.toLowerCase()?.includes(q) ||
      c?.customerName?.toLowerCase()?.includes(q) ||
      c?.awb?.toLowerCase()?.includes(q);
    const ndrStatus = normalizeNdrStatus(c.status);
    const matchStatus = statusFilter === "all" || ndrStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    open: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "open").length,
    reattempt: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "reattempt").length,
    rto: ndrCases.filter((c) => {
      const st = normalizeNdrStatus(c.status);
      return st === "rto" || st === "rto_delivered";
    }).length,
    resolved: ndrCases.filter((c) => normalizeNdrStatus(c.status) === "resolved").length,
  };

  const applyNdrAction = async (id: string, nextStatus: string, successTitle: string, destructive = false) => {
    setActionLoading(id + nextStatus);
    try {
      await orderApi.update(id, { status: nextStatus });
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
      toast({ title: successTitle, variant: destructive ? "destructive" : "default" });
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error?.response?.data?.error || error?.message || "Could not update NDR case",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReattempt = (id: string) => applyNdrAction(id, "Reattempt", "Reattempt scheduled");
  const handleMarkRTO = (id: string) => applyNdrAction(id, "RTO In transit", "Marked as RTO", true);
  const handleResolve = (id: string) => applyNdrAction(id, "NDR Delivered", "Case resolved");

  const rtoReasonData = ndrCases.reduce((acc: Record<string, number>, c) => {
    const reason = c?.ndrreason || c?.status || "Unknown";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const rtoReasonChart = Object.entries(rtoReasonData).map(([reason, count]) => ({ reason, count }));

  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-4">
        <NdrTabsBar activeTab={statusFilter} onTabChange={setStatusFilter} />

        <div className="lm-workspace-shell p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Open NDR" value={String(stats.open)} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard title="Reattempt" value={String(stats.reattempt)} icon={<RefreshCw className="h-5 w-5" />} />
          <StatCard title="RTO" value={String(stats.rto)} icon={<RotateCcw className="h-5 w-5" />} />
          <StatCard title="Resolved" value={String(stats.resolved)} icon={<Package className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="cases">
          <TabsList>
            <TabsTrigger value="cases">NDR Cases</TabsTrigger>
            <TabsTrigger value="analytics">RTO Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by order id or awb..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full data-table">
                  <thead className="lm-table-head">
                    <tr className="border-b border-border">
                      {["NDR ID", "Order", "Customer", "Courier", "Reason", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7}><EmptyState title="No NDR/RTO cases found" /></td>
                      </tr>
                    ) : (
                      filtered.map((c) => {
                        const ndrStatus = normalizeNdrStatus(c.status);
                        const busy = actionLoading?.startsWith(c.id);
                        return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{c.awb || c.referenceId || "-"}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c.orderNumber}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-foreground">{c.customerName}</p>
                          <p className="text-xs text-muted-foreground">{c.customerPhone}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c.courier}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c?.ndrreason || c?.status || "-"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[ndrStatus]}`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(ndrStatus === "open" || ndrStatus === "reattempt") && (
                              <>
                                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => handleReattempt(c.id)}>Reattempt</Button>
                                <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => handleMarkRTO(c.id)}>RTO</Button>
                              </>
                            )}
                            {ndrStatus !== "resolved" && ndrStatus !== "rto" && ndrStatus !== "rto_delivered" && (
                              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => handleResolve(c.id)}>Resolve</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setSelectedCase(c)}>View</Button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display text-lg">RTO Reason Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rtoReasonChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="reason" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">NDR Details — {selectedCase?.awb}</DialogTitle>
            <DialogDescription>Order: {selectedCase?.referenceId}</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Customer</p><p className="font-medium text-foreground">{selectedCase.customerName}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium text-foreground">{selectedCase.customerPhone}</p></div>
                <div><p className="text-muted-foreground">Courier</p><p className="font-medium text-foreground">{selectedCase.courier}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium text-foreground">{selectedCase.status}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium text-foreground">{[selectedCase.addressLine1, selectedCase.city, selectedCase.state, selectedCase.pincode].filter(Boolean).join(", ") || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">NDR Reason</p><p className="font-medium text-foreground">{selectedCase.ndrreason || "-"}</p></div>
              </div>
              {!readOnly && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { handleReattempt(selectedCase.id); setSelectedCase(null); }}>Reattempt</Button>
                <Button size="sm" variant="destructive" onClick={() => { handleMarkRTO(selectedCase.id); setSelectedCase(null); }}>Mark RTO</Button>
                <Button size="sm" onClick={() => { handleResolve(selectedCase.id); setSelectedCase(null); }}>Resolve</Button>
              </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default NdrRtoPage;
