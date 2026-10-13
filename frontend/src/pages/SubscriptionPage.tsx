import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Plus, Edit, Trash2, Users, IndianRupee, Calendar } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  billingCycle: "monthly" | "yearly";
  features: string[];
  sellersCount: number;
  autoRenewal: boolean;
  status: "active" | "inactive";
}

const initialPlans: Plan[] = [
  { id: "pl1", name: "Starter", price: "₹999", billingCycle: "monthly", features: ["100 orders/month", "2 courier partners", "Basic analytics", "Email support"], sellersCount: 45, autoRenewal: true, status: "active" },
  { id: "pl2", name: "Growth", price: "₹2,499", billingCycle: "monthly", features: ["500 orders/month", "5 courier partners", "Advanced analytics", "Priority support", "COD management"], sellersCount: 62, autoRenewal: true, status: "active" },
  { id: "pl3", name: "Enterprise", price: "₹4,999", billingCycle: "monthly", features: ["Unlimited orders", "All courier partners", "Full analytics suite", "Dedicated support", "API access", "Custom integration"], sellersCount: 35, autoRenewal: true, status: "active" },
  { id: "pl4", name: "Trial", price: "₹0", billingCycle: "monthly", features: ["50 orders/month", "1 courier partner", "Basic dashboard"], sellersCount: 15, autoRenewal: false, status: "active" },
];

const SubscriptionPage = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState(initialPlans);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", billingCycle: "monthly" as const, features: "" });

  const totalSellers = plans.reduce((a, p) => a + p.sellersCount, 0);
  const activePlans = plans.filter(p => p.status === "active").length;

  const handleCreate = () => {
    const newPlan: Plan = {
      id: `pl${Date.now()}`,
      name: formData.name,
      price: formData.price,
      billingCycle: formData.billingCycle,
      features: formData.features.split(",").map(f => f.trim()),
      sellersCount: 0,
      autoRenewal: true,
      status: "active",
    };
    setPlans(prev => [...prev, newPlan]);
    setCreateOpen(false);
    setFormData({ name: "", price: "", billingCycle: "monthly", features: "" });
    toast({ title: "Plan created", description: `${newPlan.name} plan has been added.` });
  };

  const toggleAutoRenewal = (id: string) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, autoRenewal: !p.autoRenewal } : p));
    toast({ title: "Auto-renewal updated" });
  };

  const togglePlanStatus = (id: string) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "active" ? "inactive" as const : "active" as const } : p));
    toast({ title: "Plan status updated" });
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    toast({ title: "Plan deleted", variant: "destructive" });
  };

  return (
    <DashboardLayout title="Subscription & Billing" subtitle="Manage subscription plans and billing">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Plans" value={String(activePlans)} icon={<CreditCard className="h-5 w-5" />} variant="accent" />
          <StatCard title="Total Subscribers" value={String(totalSellers)} icon={<Users className="h-5 w-5" />} variant="success" />
          <StatCard title="Monthly Revenue" value="₹3.2L" icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard title="Next Billing" value="Mar 01" icon={<Calendar className="h-5 w-5" />} />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Plan</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`shadow-card hover:shadow-card-hover transition-shadow ${plan.status === "inactive" ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                  <Badge className={plan.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{plan.status}</Badge>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-display font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Subscribers</span>
                    <span className="font-medium text-foreground">{plan.sellersCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Auto Renewal</span>
                    <Switch checked={plan.autoRenewal} onCheckedChange={() => toggleAutoRenewal(plan.id)} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => togglePlanStatus(plan.id)}>
                    {plan.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Subscription Plan</DialogTitle>
            <DialogDescription>Add a new billing plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Plan Name</Label><Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pro" /></div>
            <div className="space-y-2"><Label>Price</Label><Input value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} placeholder="₹1,999" /></div>
            <div className="space-y-2"><Label>Features (comma-separated)</Label><Input value={formData.features} onChange={e => setFormData(f => ({ ...f, features: e.target.value }))} placeholder="Feature 1, Feature 2, Feature 3" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.price}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SubscriptionPage;
