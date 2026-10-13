import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Database, Activity, AlertTriangle, CheckCircle, HardDrive, Cpu, MemoryStick, Clock, Download, RefreshCw } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface QueueItem {
  name: string;
  pending: number;
  processing: number;
  failed: number;
  throughput: string;
}

interface ErrorLog {
  id: string;
  level: "error" | "warning" | "critical";
  message: string;
  service: string;
  count: number;
  lastOccurred: string;
}

interface BackupRecord {
  id: string;
  type: "full" | "incremental";
  size: string;
  status: "completed" | "in_progress" | "failed";
  startedAt: string;
  completedAt: string;
  duration: string;
}

const queues: QueueItem[] = [
  { name: "Order Processing", pending: 12, processing: 3, failed: 0, throughput: "245/hr" },
  { name: "Shipment Allocation", pending: 8, processing: 5, failed: 1, throughput: "180/hr" },
  { name: "COD Settlement", pending: 3, processing: 1, failed: 0, throughput: "45/hr" },
  { name: "NDR Processing", pending: 6, processing: 2, failed: 0, throughput: "120/hr" },
  { name: "Webhook Delivery", pending: 15, processing: 8, failed: 3, throughput: "520/hr" },
  { name: "Email Notifications", pending: 22, processing: 4, failed: 0, throughput: "380/hr" },
];

const errorLogs: ErrorLog[] = [
  { id: "e1", level: "critical", message: "Database connection pool exhausted", service: "DB Service", count: 3, lastOccurred: "5 mins ago" },
  { id: "e2", level: "error", message: "BlueDart API timeout (>5000ms)", service: "Courier API", count: 12, lastOccurred: "15 mins ago" },
  { id: "e3", level: "warning", message: "High memory usage on worker-03 (>85%)", service: "Worker", count: 1, lastOccurred: "30 mins ago" },
  { id: "e4", level: "error", message: "Webhook delivery failed for wh3", service: "Webhook", count: 15, lastOccurred: "2 hours ago" },
  { id: "e5", level: "warning", message: "Slow query detected (settlement_report, 3.2s)", service: "DB Service", count: 5, lastOccurred: "1 hour ago" },
];

const backups: BackupRecord[] = [
  { id: "b1", type: "full", size: "4.2 GB", status: "completed", startedAt: "2026-02-28 06:00", completedAt: "2026-02-28 06:25", duration: "25 min" },
  { id: "b2", type: "incremental", size: "320 MB", status: "completed", startedAt: "2026-02-28 12:00", completedAt: "2026-02-28 12:04", duration: "4 min" },
  { id: "b3", type: "incremental", size: "180 MB", status: "completed", startedAt: "2026-02-27 18:00", completedAt: "2026-02-27 18:02", duration: "2 min" },
  { id: "b4", type: "full", size: "4.1 GB", status: "completed", startedAt: "2026-02-27 06:00", completedAt: "2026-02-27 06:22", duration: "22 min" },
];

const levelStyles = {
  critical: "bg-destructive text-destructive-foreground",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
};

const SystemMonitoringPage = () => {
  const { toast } = useToast();

  return (
    <DashboardLayout title="System Monitoring" subtitle="Server health, queues, and system status">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Server Status" value="Healthy" icon={<Server className="h-5 w-5" />} variant="success" />
          <StatCard title="DB Connections" value="42/100" icon={<Database className="h-5 w-5" />} variant="accent" />
          <StatCard title="Queue Backlog" value={String(queues.reduce((a, q) => a + q.pending, 0))} icon={<Activity className="h-5 w-5" />} />
          <StatCard title="Errors (24h)" value={String(errorLogs.reduce((a, e) => a + e.count, 0))} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
        </div>

        {/* Server Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Cpu className="h-5 w-5 text-success" /></div>
                <div>
                  <h3 className="font-display font-bold text-foreground">CPU Usage</h3>
                  <p className="text-xs text-muted-foreground">Across all servers</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">web-01</span><span className="text-foreground font-medium">32%</span></div>
                <Progress value={32} className="h-2" />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">web-02</span><span className="text-foreground font-medium">45%</span></div>
                <Progress value={45} className="h-2" />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">worker-01</span><span className="text-foreground font-medium">68%</span></div>
                <Progress value={68} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center"><MemoryStick className="h-5 w-5 text-info" /></div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Memory</h3>
                  <p className="text-xs text-muted-foreground">RAM utilization</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">web-01</span><span className="text-foreground font-medium">4.2 / 8 GB</span></div>
                <Progress value={52} className="h-2" />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">web-02</span><span className="text-foreground font-medium">5.6 / 8 GB</span></div>
                <Progress value={70} className="h-2" />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">worker-01</span><span className="text-foreground font-medium">6.8 / 8 GB</span></div>
                <Progress value={85} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><HardDrive className="h-5 w-5 text-accent" /></div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Database</h3>
                  <p className="text-xs text-muted-foreground">PostgreSQL health</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Connections</span><span className="text-foreground font-medium">42 / 100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DB Size</span><span className="text-foreground font-medium">12.4 GB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Query Time</span><span className="text-foreground font-medium">45ms</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Slow Queries</span><span className="text-warning font-medium">3</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Replication Lag</span><span className="text-success font-medium">0ms</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queues">
          <TabsList>
            <TabsTrigger value="queues">Queue Monitoring</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
            <TabsTrigger value="backups">Backup & Restore</TabsTrigger>
          </TabsList>

          <TabsContent value="queues" className="mt-4">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Queue", "Pending", "Processing", "Failed", "Throughput", "Status"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queues.map(q => (
                      <tr key={q.name} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{q.name}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{q.pending}</td>
                        <td className="py-3 px-4 text-sm text-info font-medium">{q.processing}</td>
                        <td className="py-3 px-4 text-sm text-destructive font-medium">{q.failed}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{q.throughput}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${q.failed > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                            {q.failed > 0 ? "Issues" : "Healthy"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Level", "Message", "Service", "Count", "Last Occurred"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4"><Badge className={`text-xs capitalize ${levelStyles[e.level]}`}>{e.level}</Badge></td>
                        <td className="py-3 px-4 text-sm text-foreground max-w-md">{e.message}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{e.service}</td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{e.count}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{e.lastOccurred}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backups" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => toast({ title: "Backup initiated", description: "Full backup has been started." })}>
                <RefreshCw className="h-4 w-4" /> Trigger Backup
              </Button>
            </div>
            <Card className="shadow-card">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Type", "Size", "Status", "Started", "Completed", "Duration", "Actions"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map(b => (
                      <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4"><Badge variant="outline" className="text-xs capitalize">{b.type}</Badge></td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{b.size}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${b.status === "completed" ? "bg-success/10 text-success" : b.status === "in_progress" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{b.startedAt}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{b.completedAt}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{b.duration}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" className="gap-1"><Download className="h-3.5 w-3.5" /> Restore</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SystemMonitoringPage;
