import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, AlertTriangle, TrendingUp, IndianRupee, Clock, Shield, Edit } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface SellerCredit {
  id: string;
  seller: string;
  company: string;
  creditLimit: number;
  utilized: number;
  dueAmount: number;
  dueDate: string;
  earlyCodEligible: boolean;
  earlyCodExposure: number;
  riskLevel: "low" | "medium" | "high";
  status: "healthy" | "warning" | "critical";
}

const initialCredits: SellerCredit[] = [
  { id: "cr1", seller: "Sneha Gupta", company: "FashionHub", creditLimit: 100000, utilized: 45000, dueAmount: 12000, dueDate: "2026-03-05", earlyCodEligible: true, earlyCodExposure: 23000, riskLevel: "low", status: "healthy" },
  { id: "cr2", seller: "Rahul Verma", company: "TechWorld", creditLimit: 200000, utilized: 180000, dueAmount: 45000, dueDate: "2026-03-02", earlyCodEligible: true, earlyCodExposure: 52000, riskLevel: "medium", status: "warning" },
  { id: "cr3", seller: "Meera Nair", company: "HomeDecor", creditLimit: 50000, utilized: 42000, dueAmount: 8900, dueDate: "2026-02-28", earlyCodEligible: false, earlyCodExposure: 0, riskLevel: "high", status: "critical" },
  { id: "cr4", seller: "Vikram Singh", company: "GadgetZone", creditLimit: 30000, utilized: 28000, dueAmount: 15000, dueDate: "2026-03-01", earlyCodEligible: false, earlyCodExposure: 0, riskLevel: "high", status: "critical" },
  { id: "cr5", seller: "Arjun Kapoor", company: "SportsGear", creditLimit: 150000, utilized: 65000, dueAmount: 0, dueDate: "-", earlyCodEligible: true, earlyCodExposure: 15000, riskLevel: "low", status: "healthy" },
  { id: "cr6", seller: "Lakshmi Iyer", company: "OrganicBites", creditLimit: 25000, utilized: 18000, dueAmount: 4300, dueDate: "2026-03-10", earlyCodEligible: false, earlyCodExposure: 0, riskLevel: "medium", status: "warning" },
];

const riskStyles = { low: "bg-success/10 text-success", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };
const statusStyles = { healthy: "bg-success/10 text-success", warning: "bg-warning/10 text-warning", critical: "bg-destructive/10 text-destructive" };

const CreditExposurePage = () => {
  const { toast } = useToast();
  const [credits, setCredits] = useState(initialCredits);
  const [editCredit, setEditCredit] = useState<SellerCredit | null>(null);
  const [newLimit, setNewLimit] = useState(0);

  const totalExposure = credits.reduce((a, c) => a + c.utilized, 0);
  const totalDue = credits.reduce((a, c) => a + c.dueAmount, 0);
  const totalEarlyCod = credits.reduce((a, c) => a + c.earlyCodExposure, 0);
  const criticalCount = credits.filter(c => c.status === "critical").length;

  const updateLimit = () => {
    if (!editCredit) return;
    setCredits(prev => prev.map(c => c.id === editCredit.id ? { ...c, creditLimit: newLimit } : c));
    setEditCredit(null);
    toast({ title: "Credit limit updated" });
  };

  return (
    <DashboardLayout title="Credit & Exposure" subtitle="Monitor seller credit limits and financial exposure">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Exposure" value={`₹${(totalExposure / 100000).toFixed(1)}L`} icon={<CreditCard className="h-5 w-5" />} variant="accent" />
          <StatCard title="Due Payments" value={`₹${(totalDue / 1000).toFixed(0)}K`} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="Early COD Exposure" value={`₹${(totalEarlyCod / 1000).toFixed(0)}K`} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard title="Critical Accounts" value={String(criticalCount)} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
        </div>

        <Tabs defaultValue="credit">
          <TabsList>
            <TabsTrigger value="credit">Credit Limits</TabsTrigger>
            <TabsTrigger value="exposure">Early COD Exposure</TabsTrigger>
            <TabsTrigger value="due">Due Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="credit" className="mt-4">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Seller", "Credit Limit", "Utilized", "Utilization %", "Risk", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map(c => {
                      const utilPct = Math.round((c.utilized / c.creditLimit) * 100);
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-foreground">{c.company}</p>
                            <p className="text-xs text-muted-foreground">{c.seller}</p>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-foreground">₹{c.creditLimit.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-foreground">₹{c.utilized.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Progress value={utilPct} className="h-2 w-20" />
                              <span className={`text-xs font-medium ${utilPct > 85 ? "text-destructive" : utilPct > 60 ? "text-warning" : "text-success"}`}>{utilPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4"><Badge className={`text-xs ${riskStyles[c.riskLevel]}`}>{c.riskLevel}</Badge></td>
                          <td className="py-3 px-4"><Badge className={`text-xs ${statusStyles[c.status]}`}>{c.status}</Badge></td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditCredit(c); setNewLimit(c.creditLimit); }}>
                              <Edit className="h-3.5 w-3.5" /> Edit Limit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exposure" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {credits.filter(c => c.earlyCodEligible).map(c => (
                <Card key={c.id} className="shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {c.company.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">{c.company}</h3>
                        <p className="text-xs text-muted-foreground">{c.seller}</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Early COD Exposure</span>
                        <span className="font-medium text-accent">₹{c.earlyCodExposure.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit Utilized</span>
                        <span className="font-medium text-foreground">₹{c.utilized.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Level</span>
                        <Badge className={`text-xs ${riskStyles[c.riskLevel]}`}>{c.riskLevel}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="due" className="mt-4">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Seller", "Due Amount", "Due Date", "Status", "Risk"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {credits.filter(c => c.dueAmount > 0).map(c => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-foreground">{c.company}</p>
                          <p className="text-xs text-muted-foreground">{c.seller}</p>
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-foreground">₹{c.dueAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{c.dueDate}</td>
                        <td className="py-3 px-4"><Badge className={`text-xs ${statusStyles[c.status]}`}>{c.status}</Badge></td>
                        <td className="py-3 px-4"><Badge className={`text-xs ${riskStyles[c.riskLevel]}`}>{c.riskLevel}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editCredit} onOpenChange={() => setEditCredit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Credit Limit — {editCredit?.company}</DialogTitle>
            <DialogDescription>Adjust seller credit limit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Limit: ₹{editCredit?.creditLimit.toLocaleString()}</Label>
              <Input type="number" value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCredit(null)}>Cancel</Button>
            <Button onClick={updateLimit}>Update Limit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreditExposurePage;
