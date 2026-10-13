import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Shield, ShieldAlert, TrendingUp, Ban, CheckCircle } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface SellerRisk {
  id: string;
  seller: string;
  company: string;
  riskScore: number;
  rtoRate: number;
  codSpike: boolean;
  category: "low" | "medium" | "high" | "critical";
  status: "whitelisted" | "monitored" | "blacklisted";
  totalOrders: number;
  flagReason: string;
}

const initialRisks: SellerRisk[] = [
  { id: "r1", seller: "Vikram Singh", company: "GadgetZone", riskScore: 82, rtoRate: 15.2, codSpike: true, category: "critical", status: "monitored", totalOrders: 89, flagReason: "High RTO + COD spike detected" },
  { id: "r2", seller: "Deepak Jha", company: "BookBarn", riskScore: 68, rtoRate: 12.8, codSpike: false, category: "high", status: "blacklisted", totalOrders: 12, flagReason: "Rejected KYC + High RTO" },
  { id: "r3", seller: "Lakshmi Iyer", company: "OrganicBites", riskScore: 45, rtoRate: 8.5, codSpike: false, category: "medium", status: "monitored", totalOrders: 45, flagReason: "KYC pending + moderate RTO" },
  { id: "r4", seller: "Sneha Gupta", company: "FashionHub", riskScore: 28, rtoRate: 4.2, codSpike: true, category: "medium", status: "monitored", totalOrders: 432, flagReason: "COD spike detected today" },
  { id: "r5", seller: "Rahul Verma", company: "TechWorld", riskScore: 12, rtoRate: 3.1, codSpike: false, category: "low", status: "whitelisted", totalOrders: 287, flagReason: "Low risk - stable performance" },
  { id: "r6", seller: "Arjun Kapoor", company: "SportsGear", riskScore: 15, rtoRate: 3.8, codSpike: false, category: "low", status: "whitelisted", totalOrders: 203, flagReason: "Low risk - good metrics" },
];

const categoryStyles = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const statusStyles = {
  whitelisted: "bg-success/10 text-success",
  monitored: "bg-warning/10 text-warning",
  blacklisted: "bg-destructive/10 text-destructive",
};

const RiskFraudPage = () => {
  const { toast } = useToast();
  const [risks, setRisks] = useState(initialRisks);

  const stats = {
    critical: risks.filter(r => r.category === "critical").length,
    high: risks.filter(r => r.category === "high").length,
    blacklisted: risks.filter(r => r.status === "blacklisted").length,
    codSpikes: risks.filter(r => r.codSpike).length,
  };

  const toggleStatus = (id: string, newStatus: "whitelisted" | "monitored" | "blacklisted") => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    toast({ title: `Seller ${newStatus}`, description: `Status updated to ${newStatus}.` });
  };

  return (
    <DashboardLayout title="Risk & Fraud Engine" subtitle="Monitor seller risks and fraud alerts">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Critical Risk" value={String(stats.critical)} icon={<ShieldAlert className="h-5 w-5" />} variant="warning" />
          <StatCard title="High Risk" value={String(stats.high)} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
          <StatCard title="Blacklisted" value={String(stats.blacklisted)} icon={<Ban className="h-5 w-5" />} variant="accent" />
          <StatCard title="COD Spikes" value={String(stats.codSpikes)} icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        <div className="grid gap-4">
          {risks.sort((a, b) => b.riskScore - a.riskScore).map(risk => (
            <Card key={risk.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${risk.category === "critical" || risk.category === "high" ? "bg-destructive/10" : risk.category === "medium" ? "bg-warning/10" : "bg-success/10"}`}>
                      <Shield className={`h-6 w-6 ${risk.category === "critical" || risk.category === "high" ? "text-destructive" : risk.category === "medium" ? "text-warning" : "text-success"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display font-bold text-foreground">{risk.company}</h3>
                        <Badge className={`text-xs ${categoryStyles[risk.category]}`}>{risk.category}</Badge>
                        <Badge className={`text-xs ${statusStyles[risk.status]}`}>{risk.status}</Badge>
                        {risk.codSpike && <Badge className="text-xs bg-accent/10 text-accent">COD Spike</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{risk.seller} · {risk.totalOrders} orders</p>
                      <p className="text-sm text-muted-foreground mt-1">{risk.flagReason}</p>
                      <div className="flex items-center gap-6 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Risk Score</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={risk.riskScore} className="h-2 w-24" />
                            <span className="text-sm font-bold text-foreground">{risk.riskScore}/100</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">RTO Rate</p>
                          <p className="text-sm font-bold text-destructive">{risk.rtoRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {risk.status !== "whitelisted" && (
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(risk.id, "whitelisted")}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Whitelist
                      </Button>
                    )}
                    {risk.status !== "blacklisted" && (
                      <Button size="sm" variant="destructive" onClick={() => toggleStatus(risk.id, "blacklisted")}>
                        <Ban className="h-3.5 w-3.5 mr-1" /> Blacklist
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RiskFraudPage;
