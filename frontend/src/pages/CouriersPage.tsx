import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Star, TrendingUp, AlertTriangle, Settings, BarChart3, Plus } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";

interface Courier {
  id: string;
  name: string;
  logo: string;
  status: "active" | "inactive";
  deliveryRate: number;
  avgDeliveryDays: number;
  totalShipments: number;
  rtoRate: number;
  rating: number;
  zones: string[];
  codEnabled: boolean;
  baseRate: number;
  weightRate: number;
  contactEmail: string;
  contactPhone: string;
  monthlyData: { month: string; shipments: number; delivered: number; rto: number }[];
}
   
const initialCouriers: Courier[] = [           
  { id: "c1", name: "eKART", logo: "../assets/ekart.jpeg", status: "active", deliveryRate: 94.2, avgDeliveryDays: 3.2, totalShipments: 4521, rtoRate: 5.8, rating: 4.5, zones: ["Metro", "Tier-1", "Tier-2"], codEnabled: true, baseRate: 45, weightRate: 12, contactEmail: "partner@bluedart.com", contactPhone: "+91 1800 233 1234", monthlyData: [{ month: "Sep", shipments: 620, delivered: 584, rto: 36 }, { month: "Oct", shipments: 710, delivered: 669, rto: 41 }, { month: "Nov", shipments: 680, delivered: 640, rto: 40 }, { month: "Dec", shipments: 890, delivered: 838, rto: 52 }, { month: "Jan", shipments: 780, delivered: 735, rto: 45 }, { month: "Feb", shipments: 841, delivered: 792, rto: 49 }] },
  { id: "c2", name: "Shree Maruti", logo: "../assets/shreemaruti.jpeg", status: "active", deliveryRate: 91.8, avgDeliveryDays: 3.8, totalShipments: 3876, rtoRate: 8.2, rating: 4.2, zones: ["Metro", "Tier-1", "Tier-2", "Tier-3"], codEnabled: true, baseRate: 40, weightRate: 10, contactEmail: "ops@delhivery.com", contactPhone: "+91 1800 103 1234", monthlyData: [{ month: "Sep", shipments: 540, delivered: 496, rto: 44 }, { month: "Oct", shipments: 610, delivered: 560, rto: 50 }, { month: "Nov", shipments: 590, delivered: 542, rto: 48 }, { month: "Dec", shipments: 780, delivered: 716, rto: 64 }, { month: "Jan", shipments: 690, delivered: 634, rto: 56 }, { month: "Feb", shipments: 666, delivered: 612, rto: 54 }] },
  { id: "c3", name: "Blue Dart", logo: "../assets/bluedart.jpeg", status: "active", deliveryRate: 88.5, avgDeliveryDays: 4.1, totalShipments: 2943, rtoRate: 11.5, rating: 3.8, zones: ["Metro", "Tier-1", "Tier-2"], codEnabled: false, baseRate: 35, weightRate: 8, contactEmail: "business@dtdc.com", contactPhone: "+91 1800 209 1234", monthlyData: [{ month: "Sep", shipments: 410, delivered: 363, rto: 47 }, { month: "Oct", shipments: 480, delivered: 425, rto: 55 }, { month: "Nov", shipments: 460, delivered: 407, rto: 53 }, { month: "Dec", shipments: 590, delivered: 522, rto: 68 }, { month: "Jan", shipments: 520, delivered: 460, rto: 60 }, { month: "Feb", shipments: 483, delivered: 428, rto: 55 }] },
  { id: "c4", name: "Amazon", logo:"../assets/amazone.jpeg", status: "active", deliveryRate: 92.1, avgDeliveryDays: 3.5, totalShipments: 3210, rtoRate: 7.9, rating: 4.3, zones: ["Metro", "Tier-1"], codEnabled: true, baseRate: 42, weightRate: 11, contactEmail: "connect@ecomexpress.in", contactPhone: "+91 1800 123 1234", monthlyData: [{ month: "Sep", shipments: 470, delivered: 433, rto: 37 }, { month: "Oct", shipments: 540, delivered: 497, rto: 43 }, { month: "Nov", shipments: 510, delivered: 470, rto: 40 }, { month: "Dec", shipments: 680, delivered: 626, rto: 54 }, { month: "Jan", shipments: 530, delivered: 488, rto: 42 }, { month: "Feb", shipments: 480, delivered: 442, rto: 38 }] },
  { id: "c5", name: "Delhivery Express", logo:"../assets/delhivery.jpeg", status: "active", deliveryRate: 92.1, avgDeliveryDays: 3.5, totalShipments: 3210, rtoRate: 7.9, rating: 4.3, zones: ["Metro", "Tier-1"], codEnabled: true, baseRate: 42, weightRate: 11, contactEmail: "connect@ecomexpress.in", contactPhone: "+91 1800 123 1234", monthlyData: [{ month: "Sep", shipments: 470, delivered: 433, rto: 37 }, { month: "Oct", shipments: 540, delivered: 497, rto: 43 }, { month: "Nov", shipments: 510, delivered: 470, rto: 40 }, { month: "Dec", shipments: 680, delivered: 626, rto: 54 }, { month: "Jan", shipments: 530, delivered: 488, rto: 42 }, { month: "Feb", shipments: 480, delivered: 442, rto: 38 }] },

  // { id: "c5", name: "Xpressbees", logo: "XB", status: "active", deliveryRate: 89.7, avgDeliveryDays: 4.0, totalShipments: 2156, rtoRate: 10.3, rating: 3.9, zones: ["Metro", "Tier-1", "Tier-2", "Tier-3"], codEnabled: true, baseRate: 38, weightRate: 9, contactEmail: "biz@xpressbees.com", contactPhone: "+91 1800 456 1234", monthlyData: [{ month: "Sep", shipments: 310, delivered: 278, rto: 32 }, { month: "Oct", shipments: 360, delivered: 323, rto: 37 }, { month: "Nov", shipments: 340, delivered: 305, rto: 35 }, { month: "Dec", shipments: 430, delivered: 386, rto: 44 }, { month: "Jan", shipments: 380, delivered: 341, rto: 39 }, { month: "Feb", shipments: 336, delivered: 301, rto: 35 }] },
  // { id: "c6", name: "Shadowfax", logo: "SF", status: "inactive", deliveryRate: 85.3, avgDeliveryDays: 4.5, totalShipments: 987, rtoRate: 14.7, rating: 3.5, zones: ["Metro"], codEnabled: false, baseRate: 32, weightRate: 7, contactEmail: "ops@shadowfax.in", contactPhone: "+91 1800 789 1234", monthlyData: [{ month: "Sep", shipments: 150, delivered: 128, rto: 22 }, { month: "Oct", shipments: 170, delivered: 145, rto: 25 }, { month: "Nov", shipments: 160, delivered: 136, rto: 24 }, { month: "Dec", shipments: 200, delivered: 171, rto: 29 }, { month: "Jan", shipments: 180, delivered: 154, rto: 26 }, { month: "Feb", shipments: 127, delivered: 108, rto: 19 }] },




];

const CouriersPage = () => {
  const { toast } = useToast();
  const [couriers, setCouriers] = useState(initialCouriers);
  const [analyticsCourier, setAnalyticsCourier] = useState<Courier | null>(null);
  const [settingsCourier, setSettingsCourier] = useState<Courier | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({ codEnabled: false, baseRate: 0, weightRate: 0, contactEmail: "", contactPhone: "" });

  const openSettings = (c: Courier) => {
    setSettingsForm({ codEnabled: c.codEnabled, baseRate: c.baseRate, weightRate: c.weightRate, contactEmail: c.contactEmail, contactPhone: c.contactPhone });
    setSettingsCourier(c);
  };

  const saveSettings = () => {
    if (!settingsCourier) return;
    setCouriers(prev => prev.map(c => c.id === settingsCourier.id ? { ...c, ...settingsForm } : c));
    setSettingsCourier(null);
    toast({ title: "Settings saved", description: `${settingsCourier.name} settings updated.` });
  };

  const toggleStatus = (id: string) => {
    setCouriers(prev => prev.map(c => c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c));
    toast({ title: "Status updated" });
  };

  const handleAddCourier = () => {
    const newCourier: Courier = {
      id: `c${Date.now()}`, name: newName, logo: newName.substring(0, 2).toUpperCase(), status: "active",
      deliveryRate: 0, avgDeliveryDays: 0, totalShipments: 0, rtoRate: 0, rating: 0,
      zones: ["Metro"], codEnabled: false, baseRate: 40, weightRate: 10,
      contactEmail: newEmail, contactPhone: newPhone,
      monthlyData: [{ month: "Feb", shipments: 0, delivered: 0, rto: 0 }],
    };
    setCouriers(prev => [...prev, newCourier]);
    setAddOpen(false);
    setNewName(""); setNewEmail(""); setNewPhone("");
    toast({ title: "Courier added", description: `${newName} has been added as a partner.` });
  };

  const activeCount = couriers.filter(c => c.status === "active").length;
  const avgDelivery = (couriers.filter(c => c.status === "active").reduce((a, c) => a + c.deliveryRate, 0) / activeCount).toFixed(1);
  const avgRto = (couriers.filter(c => c.status === "active").reduce((a, c) => a + c.rtoRate, 0) / activeCount).toFixed(1);
  const totalShipments = couriers.reduce((a, c) => a + c.totalShipments, 0);

  return (
    <DashboardLayout title="Courier Management" subtitle="Monitor courier partners and performance">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* <StatCard title="Active Partners" value={String(activeCount)} icon={<Truck className="h-5 w-5" />} variant="accent" />
          <StatCard title="Avg Delivery Rate" value={`${avgDelivery}%`} icon={<TrendingUp className="h-5 w-5" />} variant="success" />
          <StatCard title="Avg RTO Rate" value={`${avgRto}%`} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
          <StatCard title="Total Shipments" value={totalShipments.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} /> */}
        </div>

        {/* <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Courier</Button>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {couriers.map((courier) => (
            <Card key={courier.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                      <img src={courier.logo} alt={courier.name} className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">{courier.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        <span className="text-xs text-muted-foreground">{courier.rating}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleStatus(courier.id)}>
                    <Badge variant={courier.status === "active" ? "default" : "secondary"} className={`cursor-pointer ${courier.status === "active" ? "bg-success/10 text-success border-0" : ""}`}>
                      {courier.status}
                    </Badge>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Delivery Rate</span>
                      <span className="font-medium text-foreground">{courier.deliveryRate}%</span>
                    </div>
                    <Progress value={courier.deliveryRate} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center">
                      <p className="text-lg font-display font-bold text-foreground">{courier.avgDeliveryDays}</p>
                      <p className="text-xs text-muted-foreground">Avg Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-display font-bold text-foreground">{courier.totalShipments.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Shipments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-display font-bold text-destructive">{courier.rtoRate}%</p>
                      <p className="text-xs text-muted-foreground">RTO Rate</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {courier.zones.map((zone) => (
                      <Badge key={zone} variant="outline" className="text-xs">{zone}</Badge>
                    ))}
                    {courier.codEnabled && <Badge variant="outline" className="text-xs bg-primary/5">COD</Badge>}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analytics Dialog */}
      <Dialog open={!!analyticsCourier} onOpenChange={() => setAnalyticsCourier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{analyticsCourier?.name} — Performance Analytics</DialogTitle>
            <DialogDescription>Last 6 months performance data</DialogDescription>
          </DialogHeader>
          {analyticsCourier && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{analyticsCourier.deliveryRate}%</p>
                  <p className="text-xs text-muted-foreground">Delivery Rate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{analyticsCourier.avgDeliveryDays}d</p>
                  <p className="text-xs text-muted-foreground">Avg Delivery</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-destructive">{analyticsCourier.rtoRate}%</p>
                  <p className="text-xs text-muted-foreground">RTO Rate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{analyticsCourier.rating}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Monthly Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Month</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Shipments</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Delivered</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">RTO</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Success %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsCourier.monthlyData.map(m => (
                        <tr key={m.month} className="border-b border-border/50">
                          <td className="py-2 px-3 font-medium text-foreground">{m.month}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{m.shipments}</td>
                          <td className="py-2 px-3 text-right text-success">{m.delivered}</td>
                          <td className="py-2 px-3 text-right text-destructive">{m.rto}</td>
                          <td className="py-2 px-3 text-right font-medium text-foreground">{((m.delivered / m.shipments) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={!!settingsCourier} onOpenChange={() => setSettingsCourier(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{settingsCourier?.name} — Settings</DialogTitle>
            <DialogDescription>Configure courier partner settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">COD Enabled</p>
                <p className="text-sm text-muted-foreground">Allow cash on delivery for this courier</p>
              </div>
              <Switch checked={settingsForm.codEnabled} onCheckedChange={v => setSettingsForm(f => ({ ...f, codEnabled: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Base Rate (₹)</Label><Input type="number" value={settingsForm.baseRate} onChange={e => setSettingsForm(f => ({ ...f, baseRate: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Per Kg Rate (₹)</Label><Input type="number" value={settingsForm.weightRate} onChange={e => setSettingsForm(f => ({ ...f, weightRate: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Email</Label><Input value={settingsForm.contactEmail} onChange={e => setSettingsForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Contact Phone</Label><Input value={settingsForm.contactPhone} onChange={e => setSettingsForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsCourier(null)}>Cancel</Button>
            <Button onClick={saveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Courier Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Courier Partner</DialogTitle>
            <DialogDescription>Register a new courier partner</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Courier Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. BlueDart" /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="partner@courier.com" /></div>
            <div className="space-y-2"><Label>Contact Phone</Label><Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 1800 XXX XXXX" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCourier} disabled={!newName}>Add Courier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CouriersPage;
