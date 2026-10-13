import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileText, Shield, Activity, Database } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ip: string;
  timestamp: string;
  type: "auth" | "settlement" | "adjustment" | "api" | "system" | "user";
}

const mockLogs: AuditLog[] = [
  { id: "log1", user: "Rajesh Kumar", action: "Login", module: "Authentication", details: "Admin login successful", ip: "192.168.1.45", timestamp: "2026-02-28 14:32:15", type: "auth" },
  { id: "log2", user: "Amit Patel", action: "Settlement Approved", module: "Finance", details: "COD settlement ₹23,450 for FashionHub approved", ip: "192.168.1.52", timestamp: "2026-02-28 14:15:22", type: "settlement" },
  { id: "log3", user: "Priya Sharma", action: "Seller Blocked", module: "Seller Mgmt", details: "GadgetZone seller account blocked due to high RTO", ip: "192.168.1.48", timestamp: "2026-02-28 13:45:10", type: "user" },
  { id: "log4", user: "System", action: "Auto Allocation", module: "Orders", details: "ORD-7821 auto-allocated to BlueDart", ip: "-", timestamp: "2026-02-28 13:30:05", type: "system" },
  { id: "log5", user: "Amit Patel", action: "Manual Adjustment", module: "Finance", details: "₹320 debit adjustment for weight dispute DSP-002", ip: "192.168.1.52", timestamp: "2026-02-28 12:20:33", type: "adjustment" },
  { id: "log6", user: "System", action: "API Key Generated", module: "API", details: "New API key generated for TechWorld", ip: "-", timestamp: "2026-02-28 11:45:18", type: "api" },
  { id: "log7", user: "Rajesh Kumar", action: "Role Updated", module: "RBAC", details: "Support Agent role permissions modified", ip: "192.168.1.45", timestamp: "2026-02-28 11:10:42", type: "user" },
  { id: "log8", user: "Priya Sharma", action: "KYC Approved", module: "Seller Mgmt", details: "OrganicBites KYC documents verified", ip: "192.168.1.48", timestamp: "2026-02-28 10:55:30", type: "user" },
  { id: "log9", user: "System", action: "Backup Complete", module: "System", details: "Database backup completed successfully", ip: "-", timestamp: "2026-02-28 06:00:00", type: "system" },
  { id: "log10", user: "Ananya Reddy", action: "Ticket Resolved", module: "Support", details: "Ticket #TKT-005 marked as resolved", ip: "192.168.1.55", timestamp: "2026-02-27 16:30:20", type: "user" },
];

const typeStyles = {
  auth: "bg-info/10 text-info",
  settlement: "bg-success/10 text-success",
  adjustment: "bg-warning/10 text-warning",
  api: "bg-accent/10 text-accent",
  system: "bg-muted text-muted-foreground",
  user: "bg-primary/10 text-primary",
};

const AuditLogsPage = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = mockLogs.filter(l => {
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || l.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <DashboardLayout title="Audit Logs & Compliance" subtitle="Track all system activities and user actions">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Logs" value={String(mockLogs.length)} icon={<FileText className="h-5 w-5" />} variant="accent" />
          <StatCard title="Auth Events" value={String(mockLogs.filter(l => l.type === "auth").length)} icon={<Shield className="h-5 w-5" />} />
          <StatCard title="Financial Actions" value={String(mockLogs.filter(l => l.type === "settlement" || l.type === "adjustment").length)} icon={<Activity className="h-5 w-5" />} variant="success" />
          <StatCard title="System Events" value={String(mockLogs.filter(l => l.type === "system").length)} icon={<Database className="h-5 w-5" />} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User Action</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Export started" })}><Download className="h-4 w-4" /> Export</Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Timestamp", "User", "Action", "Module", "Details", "Type", "IP"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{l.timestamp}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{l.user}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{l.action}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{l.module}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{l.details}</td>
                    <td className="py-3 px-4"><Badge className={`text-xs ${typeStyles[l.type]}`}>{l.type}</Badge></td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogsPage;
