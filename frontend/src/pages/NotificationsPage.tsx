import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertTriangle, CheckCircle, Clock, Mail, MessageSquare, Trash2 } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
  category: "rto" | "settlement" | "kyc" | "cod" | "system" | "ticket";
  read: boolean;
  timestamp: string;
}

const initialNotifications: Notification[] = [
  { id: "n1", title: "High RTO Alert", message: "GadgetZone RTO rate has exceeded 15% threshold.", type: "alert", category: "rto", read: false, timestamp: "2 mins ago" },
  { id: "n2", title: "Settlement Pending", message: "₹23,450 settlement for FashionHub awaiting approval.", type: "warning", category: "settlement", read: false, timestamp: "15 mins ago" },
  { id: "n3", title: "KYC Pending", message: "StyleMart has submitted KYC documents for verification.", type: "info", category: "kyc", read: false, timestamp: "1 hour ago" },
  { id: "n4", title: "COD Delay", message: "HomeDecor COD remittance overdue by 2 days.", type: "alert", category: "cod", read: false, timestamp: "2 hours ago" },
  { id: "n5", title: "Ticket Escalated", message: "Support ticket #TKT-003 escalated to manager.", type: "warning", category: "ticket", read: true, timestamp: "3 hours ago" },
  { id: "n6", title: "Backup Complete", message: "Daily database backup completed successfully.", type: "success", category: "system", read: true, timestamp: "6 hours ago" },
  { id: "n7", title: "New Seller Registered", message: "OrganicBites has registered and awaiting approval.", type: "info", category: "kyc", read: true, timestamp: "1 day ago" },
  { id: "n8", title: "Settlement Approved", message: "₹31,200 settlement for GadgetZone has been processed.", type: "success", category: "settlement", read: true, timestamp: "1 day ago" },
];

interface NotifSettings {
  highRto: boolean;
  settlementPending: boolean;
  kycPending: boolean;
  codDelay: boolean;
  ticketEscalation: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

const typeStyles = {
  alert: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

const NotificationsPage = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [settings, setSettings] = useState<NotifSettings>({
    highRto: true, settlementPending: true, kycPending: true, codDelay: true, ticketEscalation: true, emailEnabled: true, smsEnabled: false,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read" });
  };

  const deleteNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    toast({ title: "All notifications cleared" });
  };

  return (
    <DashboardLayout title="Notifications & Alerts" subtitle="System alerts and notification preferences">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Unread" value={String(unreadCount)} icon={<Bell className="h-5 w-5" />} variant="accent" />
          <StatCard title="Alerts" value={String(notifications.filter(n => n.type === "alert").length)} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
          <StatCard title="Total" value={String(notifications.length)} icon={<MessageSquare className="h-5 w-5" />} />
          <StatCard title="Email Alerts" value={settings.emailEnabled ? "On" : "Off"} icon={<Mail className="h-5 w-5" />} variant="success" />
        </div>

        <Tabs defaultValue="notifications">
          <TabsList>
            <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-4 space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={markAllRead}>Mark All Read</Button>
              <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive">Clear All</Button>
            </div>

            <div className="space-y-2">
              {notifications.map(n => (
                <Card key={n.id} className={`shadow-card ${!n.read ? "border-l-4 border-l-accent" : ""}`}>
                  <CardContent className="p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1" onClick={() => markRead(n.id)}>
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeStyles[n.type]}`}>
                        {n.type === "alert" ? <AlertTriangle className="h-4 w-4" /> : n.type === "success" ? <CheckCircle className="h-4 w-4" /> : n.type === "warning" ? <Clock className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</h4>
                          <Badge variant="outline" className="text-xs">{n.category}</Badge>
                          {!n.read && <div className="h-2 w-2 rounded-full bg-accent" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.timestamp}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteNotif(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No notifications</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display text-lg">Alert Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Alert Types</h4>
                  {([
                    { key: "highRto" as const, label: "High RTO Alerts", desc: "Alert when seller RTO exceeds threshold" },
                    { key: "settlementPending" as const, label: "Settlement Pending", desc: "Notify when settlements need approval" },
                    { key: "kycPending" as const, label: "KYC Pending", desc: "Alert for pending KYC verifications" },
                    { key: "codDelay" as const, label: "COD Delay", desc: "Notify when COD remittance is overdue" },
                    { key: "ticketEscalation" as const, label: "Ticket Escalation", desc: "Alert when support tickets are escalated" },
                  ]).map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={settings[item.key]} onCheckedChange={v => setSettings(s => ({ ...s, [item.key]: v }))} />
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Channels</h4>
                  <div className="flex items-center justify-between py-2">
                    <div><p className="text-sm font-medium text-foreground">Email Notifications</p><p className="text-xs text-muted-foreground">Send alerts via email</p></div>
                    <Switch checked={settings.emailEnabled} onCheckedChange={v => setSettings(s => ({ ...s, emailEnabled: v }))} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div><p className="text-sm font-medium text-foreground">SMS Notifications</p><p className="text-xs text-muted-foreground">Send alerts via SMS</p></div>
                    <Switch checked={settings.smsEnabled} onCheckedChange={v => setSettings(s => ({ ...s, smsEnabled: v }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
