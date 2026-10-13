import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, MessageSquare, Clock, CheckCircle, AlertCircle, Plus, Eye, ArrowUpRight, UserPlus, Trash2 } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

type TicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";
type Priority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  user: string;
  assignedTo: string;
  status: TicketStatus;
  priority: Priority;
  created: string;
  lastReply: string;
  messages: { sender: string; message: string; timestamp: string }[];
}

const initialTickets: Ticket[] = [
  { id: "TKT-001", subject: "Order #1245 not delivered", description: "Customer reports order not received after 7 days", user: "Rahul Sharma", assignedTo: "Ananya Reddy", status: "open", priority: "high", created: "2026-02-28", lastReply: "2 hours ago", messages: [{ sender: "Rahul Sharma", message: "My order hasn't been delivered yet. It's been 7 days.", timestamp: "2026-02-28 10:00" }, { sender: "Ananya Reddy", message: "We're checking with the courier. Will update shortly.", timestamp: "2026-02-28 12:00" }] },
  { id: "TKT-002", subject: "Refund not received", description: "Refund for cancelled order pending since 5 days", user: "Priya Patel", assignedTo: "Ananya Reddy", status: "in_progress", priority: "medium", created: "2026-02-27", lastReply: "5 hours ago", messages: [{ sender: "Priya Patel", message: "My refund is still pending.", timestamp: "2026-02-27 14:00" }] },
  { id: "TKT-003", subject: "Seller verification issue", description: "KYC documents keep getting rejected", user: "Amit Kumar", assignedTo: "Divya Joshi", status: "resolved", priority: "low", created: "2026-02-26", lastReply: "1 day ago", messages: [] },
  { id: "TKT-004", subject: "Courier pickup delay", description: "Courier hasn't picked up for 3 days", user: "Sneha Gupta", assignedTo: "-", status: "open", priority: "high", created: "2026-02-28", lastReply: "30 min ago", messages: [{ sender: "Sneha Gupta", message: "Courier hasn't shown up for pickup in 3 days!", timestamp: "2026-02-28 13:00" }] },
  { id: "TKT-005", subject: "COD remittance pending", description: "COD payment not settled for February", user: "Vikram Singh", assignedTo: "Amit Patel", status: "escalated", priority: "urgent", created: "2026-02-25", lastReply: "3 hours ago", messages: [] },
  { id: "TKT-006", subject: "Weight dispute on ORD-7821", description: "Charged for 1.2kg but actual was 0.5kg", user: "FashionHub", assignedTo: "Ananya Reddy", status: "in_progress", priority: "medium", created: "2026-02-27", lastReply: "1 day ago", messages: [] },
  { id: "TKT-007", subject: "API integration help needed", description: "Need assistance with webhook setup", user: "TechWorld", assignedTo: "-", status: "open", priority: "low", created: "2026-02-28", lastReply: "-", messages: [] },
];

const staff = ["Ananya Reddy", "Divya Joshi", "Amit Patel", "Karan Mehta"];

const statusStyles: Record<TicketStatus, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-info/10 text-info",
  escalated: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

const priorityStyles: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive text-destructive-foreground",
};

const SupportPage = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [replyText, setReplyText] = useState("");
  const [formData, setFormData] = useState({ subject: "", description: "", user: "", priority: "medium" as Priority });

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || t.user.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    escalated: tickets.filter(t => t.status === "escalated").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  const handleCreate = () => {
    const newTicket: Ticket = {
      id: `TKT-${String(tickets.length + 8).padStart(3, "0")}`,
      subject: formData.subject,
      description: formData.description,
      user: formData.user,
      assignedTo: "-",
      status: "open",
      priority: formData.priority,
      created: new Date().toISOString().split("T")[0],
      lastReply: "-",
      messages: [],
    };
    setTickets(prev => [newTicket, ...prev]);
    setCreateOpen(false);
    setFormData({ subject: "", description: "", user: "", priority: "medium" });
    toast({ title: "Ticket created", description: newTicket.id });
  };

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    toast({ title: `Ticket ${newStatus.replace("_", " ")}` });
  };

  const handleAssign = () => {
    if (!assignOpen) return;
    setTickets(prev => prev.map(t => t.id === assignOpen.id ? { ...t, assignedTo: assignTo } : t));
    setAssignOpen(null);
    setAssignTo("");
    toast({ title: "Ticket assigned" });
  };

  const handleEscalate = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "escalated" as const, priority: "urgent" as const } : t));
    toast({ title: "Ticket escalated to Manager", variant: "destructive" });
  };

  const handleReply = () => {
    if (!viewTicket || !replyText) return;
    const newMessage = { sender: "Support Agent", message: replyText, timestamp: new Date().toISOString().replace("T", " ").substring(0, 16) };
    setTickets(prev => prev.map(t => t.id === viewTicket.id ? { ...t, messages: [...t.messages, newMessage], lastReply: "Just now", status: t.status === "open" ? "in_progress" as const : t.status } : t));
    setViewTicket(prev => prev ? { ...prev, messages: [...prev.messages, newMessage] } : null);
    setReplyText("");
    toast({ title: "Reply sent" });
  };

  const deleteTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    toast({ title: "Ticket deleted", variant: "destructive" });
  };

  return (
    <DashboardLayout title="Support & Tickets" subtitle="Manage support tickets, assign staff, and track resolution">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Open" value={String(stats.open)} icon={<AlertCircle className="h-5 w-5" />} variant="warning" />
          <StatCard title="In Progress" value={String(stats.inProgress)} icon={<Clock className="h-5 w-5" />} variant="accent" />
          <StatCard title="Escalated" value={String(stats.escalated)} icon={<ArrowUpRight className="h-5 w-5" />} variant="warning" />
          <StatCard title="Resolved" value={String(stats.resolved)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Ticket</Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Ticket ID", "Subject", "User", "Assigned To", "Priority", "Status", "Last Reply", "Actions"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono font-medium text-foreground">{t.id}</td>
                      <td className="py-3 px-4 text-sm text-foreground max-w-xs truncate">{t.subject}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{t.user}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{t.assignedTo}</td>
                      <td className="py-3 px-4"><Badge className={`text-xs capitalize ${priorityStyles[t.priority]}`}>{t.priority}</Badge></td>
                      <td className="py-3 px-4">
                        <Select value={t.status} onValueChange={v => handleStatusChange(t.id, v as TicketStatus)}>
                          <SelectTrigger className={`h-7 w-28 border-0 text-xs font-medium rounded-full px-2.5 ${statusStyles[t.status]}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["open", "in_progress", "escalated", "resolved", "closed"] as TicketStatus[]).map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{t.lastReply}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTicket(t)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAssignOpen(t); setAssignTo(t.assignedTo === "-" ? "" : t.assignedTo); }}><UserPlus className="h-3.5 w-3.5" /></Button>
                          {t.status !== "escalated" && <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" onClick={() => handleEscalate(t.id)}><ArrowUpRight className="h-3.5 w-3.5" /></Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTicket(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View / Reply Dialog */}
      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{viewTicket?.id} — {viewTicket?.subject}</DialogTitle>
            <DialogDescription>{viewTicket?.description}</DialogDescription>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground">User</p><p className="font-medium text-foreground">{viewTicket.user}</p></div>
                <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium text-foreground">{viewTicket.assignedTo}</p></div>
                <div><p className="text-muted-foreground">Priority</p><Badge className={priorityStyles[viewTicket.priority]}>{viewTicket.priority}</Badge></div>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Communication Log</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {viewTicket.messages.map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{m.sender}</span>
                        <span className="text-xs text-muted-foreground">{m.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.message}</p>
                    </div>
                  ))}
                  {viewTicket.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reply</Label>
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your response..." />
                <Button onClick={handleReply} disabled={!replyText} className="gap-2"><MessageSquare className="h-4 w-4" /> Send Reply</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Support Ticket</DialogTitle>
            <DialogDescription>Submit a new internal or seller ticket</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Subject</Label><Input value={formData.subject} onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>User / Seller</Label><Input value={formData.user} onChange={e => setFormData(f => ({ ...f, user: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(f => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high", "urgent"] as Priority[]).map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.subject || !formData.user}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignOpen} onOpenChange={() => setAssignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Ticket — {assignOpen?.id}</DialogTitle>
            <DialogDescription>Select a staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignTo}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SupportPage;
