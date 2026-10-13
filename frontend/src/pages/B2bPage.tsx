import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { b2bApi } from "../../services/b2bApi";
import { Plus, Trash2, Package, Truck, Calculator, FileText, Loader2, BookOpen } from "lucide-react";

const ZONES = ["ZONE A", "ZONE B", "ZONE C", "ZONE D", "ZONE E"] as const;
const FREIGHT_MODES = ["LTL", "PTL", "FTL", "AIR"] as const;

type Box = {
  boxNo: number;
  length: number;
  width: number;
  height: number;
  deadWeight: number;
};

const emptyBox = (n: number): Box => ({
  boxNo: n,
  length: 30,
  width: 20,
  height: 15,
  deadWeight: 5,
});

const defaultSlabs = () =>
  Object.fromEntries(
    ZONES.map((z) => [
      z,
      { minCharge: 80, perKg: z === "ZONE A" ? 18 : z === "ZONE B" ? 22 : z === "ZONE C" ? 28 : z === "ZONE D" ? 35 : 45, codPercent: 1.5, odaSurcharge: 0 },
    ])
  );

const B2bPage = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("shipments");
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [freightList, setFreightList] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookTarget, setBookTarget] = useState<any>(null);
  const [bookQuotes, setBookQuotes] = useState<any[]>([]);
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(0);
  const [awbInput, setAwbInput] = useState("");
  const [booking, setBooking] = useState(false);

  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);

  const [freightOpen, setFreightOpen] = useState(false);
  const [epodOpen, setEpodOpen] = useState(false);
  const [epodTarget, setEpodTarget] = useState<any>(null);
  const [epodUrl, setEpodUrl] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");

  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
    originPincode: "",
    invoiceValue: 1000,
    paymentGateway: "Prepaid",
    billingParty: "shipper",
    packages: [emptyBox(1), emptyBox(2)] as Box[],
    zone: "ZONE D",
  });

  const [freightForm, setFreightForm] = useState({
    freightMode: "LTL",
    consigneeName: "",
    consigneePhone: "",
    consigneeGstin: "",
    originPincode: "",
    destPincode: "",
    invoiceValue: 5000,
    paymentMode: "Prepaid",
    billingParty: "shipper",
    ewayBill: "",
    pickupType: "on_demand",
    pickupScheduledAt: "",
    appointmentAt: "",
    packages: [emptyBox(1)] as Box[],
    zone: "ZONE D",
    addressLine1: "",
    city: "",
    state: "",
  });

  const [quoteForm, setQuoteForm] = useState({
    originPincode: "",
    deliveryPincode: "",
    paymentMode: "Prepaid",
    invoiceValue: 1000,
    zone: "ZONE D",
    mode: "MPS",
    packages: [emptyBox(1)] as Box[],
  });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);

  const [cardForm, setCardForm] = useState({
    name: "",
    courierName: "",
    mode: "MPS",
    gstPercent: 18,
    minWeightKg: 0.5,
    volumetricDivisor: 5000,
    isActive: true,
    slabs: defaultSlabs() as Record<string, { minCharge: number; perKg: number; codPercent: number; odaSurcharge: number }>,
    notes: "",
  });

  const loadOrders = useCallback(async () => {
    const res = await b2bApi.listOrders({ orderType: "B2B_MPS" });
    setOrders(res.data || []);
  }, []);

  const loadCards = useCallback(async () => {
    const res = await b2bApi.listRateCards(isAdmin ? {} : { activeOnly: "true" });
    setRateCards(res.data || []);
  }, [isAdmin]);

  const loadFreight = useCallback(async () => {
    const res = await b2bApi.listFreight();
    setFreightList(res.data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrders(), loadCards(), loadFreight()]);
    } catch (e: any) {
      toast({ title: "Failed to load B2B data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [loadOrders, loadCards, loadFreight, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const chargeablePreview = useMemo(() => {
    return orderForm.packages.reduce((sum, b) => {
      const vol = (b.length * b.width * b.height) / 5000;
      return sum + Math.max(b.deadWeight || 0, vol);
    }, 0);
  }, [orderForm.packages]);

  const openBook = async (order: any) => {
    setBookTarget(order);
    setAwbInput("");
    setSelectedQuoteIdx(0);
    setBookOpen(true);
    try {
      const res = await b2bApi.quote({
        originPincode: orderForm.originPincode || "",
        deliveryPincode: order.pincode,
        packages: order.packages,
        paymentMode: order.paymentGateway,
        invoiceValue: Number(order.amount) || Number(order.subtotalPrice) || 0,
        zone: order.zone || "ZONE D",
        mode: "MPS",
      });
      setBookQuotes(res.data?.quotes || []);
    } catch (e: any) {
      toast({ title: "Quote failed", description: e.message, variant: "destructive" });
      setBookQuotes([]);
    }
  };

  const submitBook = async () => {
    if (!bookTarget) return;
    const quote = bookQuotes[selectedQuoteIdx];
    if (!quote) {
      toast({ title: "Select a rate card quote", variant: "destructive" });
      return;
    }
    if (!awbInput.trim()) {
      toast({ title: "Enter AWB number", variant: "destructive" });
      return;
    }
    setBooking(true);
    try {
      await b2bApi.bookOrder(bookTarget.id, {
        awb: awbInput.trim(),
        courierName: quote.courierName,
        quote,
        rateCardId: quote.rateCardId,
        zone: quote.zone,
      });
      toast({ title: "Shipment booked", description: `AWB ${awbInput} assigned` });
      setBookOpen(false);
      await loadOrders();
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const submitCreateOrder = async () => {
    if (!orderForm.customerName || !orderForm.pincode || orderForm.packages.length === 0) {
      toast({ title: "Fill consignee, pincode and packages", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await b2bApi.createOrder({
        ...orderForm,
        deliveryPincode: orderForm.pincode,
        orderType: "B2B_MPS",
      });
      toast({ title: "B2B order created" });
      setCreateOpen(false);
      await loadOrders();
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const runQuote = async () => {
    setQuoting(true);
    try {
      const res = await b2bApi.quote(quoteForm);
      setQuoteResult(res.data);
    } catch (e: any) {
      toast({ title: "Quote failed", description: e.message, variant: "destructive" });
    } finally {
      setQuoting(false);
    }
  };

  const openNewCard = () => {
    setEditingCard(null);
    setCardForm({
      name: "",
      courierName: "",
      mode: "MPS",
      gstPercent: 18,
      minWeightKg: 0.5,
      volumetricDivisor: 5000,
      isActive: true,
      slabs: defaultSlabs(),
      notes: "",
    });
    setCardEditorOpen(true);
  };

  const openEditCard = (card: any) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      courierName: card.courierName,
      mode: card.mode || "MPS",
      gstPercent: card.gstPercent ?? 18,
      minWeightKg: card.minWeightKg ?? 0.5,
      volumetricDivisor: card.volumetricDivisor ?? 5000,
      isActive: card.isActive !== false,
      slabs: card.slabs || defaultSlabs(),
      notes: card.notes || "",
    });
    setCardEditorOpen(true);
  };

  const saveCard = async () => {
    if (!cardForm.name || !cardForm.courierName) {
      toast({ title: "Name and courier are required", variant: "destructive" });
      return;
    }
    try {
      if (editingCard) {
        await b2bApi.updateRateCard(editingCard.id, cardForm);
        toast({ title: "Rate card updated" });
      } else {
        await b2bApi.createRateCard(cardForm);
        toast({ title: "Rate card created" });
      }
      setCardEditorOpen(false);
      await loadCards();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const deleteCard = async (id: number) => {
    if (!confirm("Delete this rate card?")) return;
    try {
      await b2bApi.deleteRateCard(id);
      toast({ title: "Deleted" });
      await loadCards();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const submitFreight = async () => {
    if (!freightForm.consigneeName || !freightForm.destPincode) {
      toast({ title: "Consignee and destination pincode required", variant: "destructive" });
      return;
    }
    try {
      await b2bApi.createFreight({
        ...freightForm,
        customerName: freightForm.consigneeName,
        customerPhone: freightForm.consigneePhone,
        pincode: freightForm.destPincode,
        consigneeAddress: {
          addressLine1: freightForm.addressLine1,
          city: freightForm.city,
          state: freightForm.state,
          pincode: freightForm.destPincode,
        },
        pickupScheduledAt: freightForm.pickupScheduledAt || null,
        appointmentAt: freightForm.appointmentAt || null,
      });
      toast({ title: "Freight consignment created" });
      setFreightOpen(false);
      await loadFreight();
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
  };

  const openFreightBook = async (row: any) => {
    setBookTarget({ ...row, _freight: true });
    setAwbInput("");
    setSelectedQuoteIdx(0);
    setBookOpen(true);
    try {
      const res = await b2bApi.quote({
        originPincode: row.originPincode,
        deliveryPincode: row.destPincode,
        packages: row.packages,
        paymentMode: row.paymentMode,
        invoiceValue: row.invoiceValue,
        zone: row.zone || "ZONE D",
        mode: row.freightMode || "LTL",
      });
      setBookQuotes(res.data?.quotes || []);
    } catch (e: any) {
      toast({ title: "Quote failed", description: e.message, variant: "destructive" });
      setBookQuotes([]);
    }
  };

  const submitBookUnified = async () => {
    if (bookTarget?._freight) {
      const quote = bookQuotes[selectedQuoteIdx];
      if (!quote || !awbInput.trim()) {
        toast({ title: "Select quote and enter LR/AWB", variant: "destructive" });
        return;
      }
      setBooking(true);
      try {
        await b2bApi.bookFreight(bookTarget.id, {
          lrNumber: awbInput.trim(),
          courierName: quote.courierName,
          quote,
          rateCardId: quote.rateCardId,
          zone: quote.zone,
        });
        toast({ title: "Freight booked" });
        setBookOpen(false);
        await loadFreight();
      } catch (e: any) {
        toast({ title: "Booking failed", description: e.message, variant: "destructive" });
      } finally {
        setBooking(false);
      }
      return;
    }
    await submitBook();
  };

  const saveEpod = async () => {
    if (!epodTarget || !epodUrl.trim()) {
      toast({ title: "ePOD URL required", variant: "destructive" });
      return;
    }
    try {
      await b2bApi.uploadFreightEpod(epodTarget.id, {
        epodUrl: epodUrl.trim(),
        appointmentAt: appointmentAt || null,
        markDelivered: true,
      });
      toast({ title: "ePOD saved" });
      setEpodOpen(false);
      await loadFreight();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const PackageEditor = ({
    packages,
    onChange,
  }: {
    packages: Box[];
    onChange: (p: Box[]) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">Packages / Boxes</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...packages, emptyBox(packages.length + 1)])}
        >
          <Plus className="h-4 w-4 mr-1" /> Add box
        </Button>
      </div>
      {packages.map((box, idx) => (
        <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 border rounded-lg bg-muted/20">
          <div>
            <Label className="text-xs">Box</Label>
            <Input value={box.boxNo} readOnly />
          </div>
          <div>
            <Label className="text-xs">L (cm)</Label>
            <Input
              type="number"
              value={box.length}
              onChange={(e) => {
                const next = [...packages];
                next[idx] = { ...box, length: parseFloat(e.target.value) || 0 };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">W (cm)</Label>
            <Input
              type="number"
              value={box.width}
              onChange={(e) => {
                const next = [...packages];
                next[idx] = { ...box, width: parseFloat(e.target.value) || 0 };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">H (cm)</Label>
            <Input
              type="number"
              value={box.height}
              onChange={(e) => {
                const next = [...packages];
                next[idx] = { ...box, height: parseFloat(e.target.value) || 0 };
                onChange(next);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Dead wt (kg)</Label>
            <Input
              type="number"
              value={box.deadWeight}
              onChange={(e) => {
                const next = [...packages];
                next[idx] = { ...box, deadWeight: parseFloat(e.target.value) || 0 };
                onChange(next);
              }}
            />
          </div>
          <div className="flex items-end">
            {packages.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange(packages.filter((_, i) => i !== idx).map((b, i) => ({ ...b, boxNo: i + 1 })))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout title="B2B Shipping" subtitle="Multi-package MPS, rate cards, and freight (LTL/PTL/FTL/Air)">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="shipments" className="gap-1"><Package className="h-3.5 w-3.5" /> Shipments</TabsTrigger>
          <TabsTrigger value="quote" className="gap-1"><Calculator className="h-3.5 w-3.5" /> Quote</TabsTrigger>
          {isAdmin && <TabsTrigger value="rate-cards" className="gap-1"><FileText className="h-3.5 w-3.5" /> Rate Cards</TabsTrigger>}
          <TabsTrigger value="freight" className="gap-1"><Truck className="h-3.5 w-3.5" /> Freight</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Multi-package (MPS) B2B orders with manual AWB booking.</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New B2B Order</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Consignee</th>
                    <th className="p-3">Boxes</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">AWB</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{loading ? "Loading…" : "No B2B MPS shipments yet"}</td></tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{o.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{o.referenceId}</div>
                      </td>
                      <td className="p-3">
                        <div>{o.customerName}</div>
                        <div className="text-xs text-muted-foreground">{o.pincode}</div>
                      </td>
                      <td className="p-3">{Array.isArray(o.packages) ? o.packages.length : "-"}</td>
                      <td className="p-3">
                        <Badge variant="outline">{o.paymentGateway}</Badge>
                        {o.billingParty === "consignee" && <Badge className="ml-1" variant="secondary">To-Pay</Badge>}
                      </td>
                      <td className="p-3">{o.status}</td>
                      <td className="p-3">{o.awb && o.awb !== "-" ? o.awb : "—"}</td>
                      <td className="p-3">
                        {(!o.awb || o.awb === "-") && (
                          <Button size="sm" variant="outline" onClick={() => openBook(o)}>
                            <BookOpen className="h-3.5 w-3.5 mr-1" /> Book AWB
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quote" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>B2B Rate Quote</CardTitle>
              <CardDescription>Quotes from admin-managed rate cards (no live courier API).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label>Origin pincode</Label>
                  <Input value={quoteForm.originPincode} maxLength={6} onChange={(e) => setQuoteForm({ ...quoteForm, originPincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                </div>
                <div>
                  <Label>Delivery pincode</Label>
                  <Input value={quoteForm.deliveryPincode} maxLength={6} onChange={(e) => setQuoteForm({ ...quoteForm, deliveryPincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                </div>
                <div>
                  <Label>Payment</Label>
                  <Select value={quoteForm.paymentMode} onValueChange={(v) => setQuoteForm({ ...quoteForm, paymentMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="To-Pay">To-Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Zone</Label>
                  <Select value={quoteForm.zone} onValueChange={(v) => setQuoteForm({ ...quoteForm, zone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Invoice value (₹)</Label>
                  <Input type="number" value={quoteForm.invoiceValue} onChange={(e) => setQuoteForm({ ...quoteForm, invoiceValue: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select value={quoteForm.mode} onValueChange={(v) => setQuoteForm({ ...quoteForm, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MPS">MPS</SelectItem>
                      {FREIGHT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <PackageEditor packages={quoteForm.packages} onChange={(p) => setQuoteForm({ ...quoteForm, packages: p })} />
              <Button onClick={runQuote} disabled={quoting}>
                {quoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                Get Quotes
              </Button>
              {quoteResult?.quotes?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground">Zone: {quoteResult.zone}</p>
                  {quoteResult.quotes.map((q: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg border bg-muted/20">
                      <div>
                        <p className="font-medium">{q.courierName}</p>
                        <p className="text-xs text-muted-foreground">{q.name} · {q.mode} · {q.chargeableWeight} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{q.total}</p>
                        <p className="text-xs text-muted-foreground">Freight ₹{q.freight}{q.codCharge ? ` + COD ₹${q.codCharge}` : ""} + GST</p>
                        {q.paymentMode === "To-Pay" && <Badge variant="secondary">No wallet debit</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {quoteResult && quoteResult.quotes?.length === 0 && (
                <p className="text-sm text-amber-600">No active rate cards for this mode. Ask admin to create one.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="rate-cards" className="space-y-4">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Admin-managed ₹/kg slabs by zone. Used for MPS and freight quoting.</p>
              <Button onClick={openNewCard}><Plus className="h-4 w-4 mr-1" /> New Rate Card</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {rateCards.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription>{c.courierName} · {c.mode}</CardDescription>
                    </div>
                    <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs grid grid-cols-5 gap-1">
                      {ZONES.map((z) => (
                        <div key={z} className="bg-muted/40 rounded p-1 text-center">
                          <div className="font-medium">{z.replace("ZONE ", "")}</div>
                          <div>₹{c.slabs?.[z]?.perKg ?? "-"}/kg</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEditCard(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCard(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rateCards.length === 0 && <p className="text-muted-foreground p-4">No rate cards yet.</p>}
            </div>
          </TabsContent>
        )}

        <TabsContent value="freight" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">LTL / PTL / FTL / Air consignments with pickup, appointment & ePOD.</p>
            <Button onClick={() => setFreightOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Freight</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Ref</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Consignee</th>
                    <th className="p-3">Pickup</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">LR/AWB</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {freightList.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No freight consignments yet</td></tr>
                  )}
                  {freightList.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="p-3 font-medium">{f.referenceId}</td>
                      <td className="p-3"><Badge variant="outline">{f.freightMode}</Badge></td>
                      <td className="p-3">
                        <div>{f.consigneeName}</div>
                        <div className="text-xs text-muted-foreground">{f.originPincode} → {f.destPincode}</div>
                      </td>
                      <td className="p-3 text-xs">
                        {f.pickupType} · {f.pickupStatus}
                        {f.pickupScheduledAt && <div>{new Date(f.pickupScheduledAt).toLocaleString()}</div>}
                      </td>
                      <td className="p-3">{f.status}</td>
                      <td className="p-3">{f.lrNumber || "—"}</td>
                      <td className="p-3 space-x-1">
                        {!f.lrNumber && (
                          <Button size="sm" variant="outline" onClick={() => openFreightBook(f)}>Book LR</Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEpodTarget(f);
                            setEpodUrl(f.epodUrl || "");
                            setAppointmentAt(f.appointmentAt ? String(f.appointmentAt).slice(0, 16) : "");
                            setEpodOpen(true);
                          }}
                        >
                          ePOD
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create MPS order */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New B2B Multi-Package Order</DialogTitle>
            <DialogDescription>Create an MPS order, then book with a manual AWB.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Consignee name *</Label>
              <Input value={orderForm.customerName} onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={orderForm.customerPhone} onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={orderForm.addressLine1} onChange={(e) => setOrderForm({ ...orderForm, addressLine1: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={orderForm.city} onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={orderForm.state} onChange={(e) => setOrderForm({ ...orderForm, state: e.target.value })} />
            </div>
            <div>
              <Label>Delivery pincode *</Label>
              <Input maxLength={6} value={orderForm.pincode} onChange={(e) => setOrderForm({ ...orderForm, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
            <div>
              <Label>Invoice value (₹)</Label>
              <Input type="number" value={orderForm.invoiceValue} onChange={(e) => setOrderForm({ ...orderForm, invoiceValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Payment</Label>
              <Select
                value={orderForm.paymentGateway}
                onValueChange={(v) =>
                  setOrderForm({
                    ...orderForm,
                    paymentGateway: v,
                    billingParty: v === "To-Pay" ? "consignee" : "shipper",
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prepaid">Prepaid</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="To-Pay">To-Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zone</Label>
              <Select value={orderForm.zone} onValueChange={(v) => setOrderForm({ ...orderForm, zone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <PackageEditor
            packages={orderForm.packages}
            onChange={(p) => setOrderForm({ ...orderForm, packages: p })}
          />
          <p className="text-xs text-muted-foreground">Est. chargeable weight: {chargeablePreview.toFixed(2)} kg</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreateOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book AWB / LR */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bookTarget?._freight ? "Book Freight LR" : "Book with Manual AWB"}</DialogTitle>
            <DialogDescription>Select a rate-card quote and enter the courier AWB/LR.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {bookQuotes.length === 0 && <p className="text-sm text-amber-600">No quotes available. Create an active rate card first.</p>}
            {bookQuotes.map((q, i) => (
              <button
                key={i}
                type="button"
                className={`w-full text-left p-3 rounded-lg border ${selectedQuoteIdx === i ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setSelectedQuoteIdx(i)}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{q.courierName}</span>
                  <span className="font-bold">₹{q.total}</span>
                </div>
                <p className="text-xs text-muted-foreground">{q.zone} · {q.chargeableWeight} kg · wallet debit ₹{q.debitAmount}</p>
              </button>
            ))}
            <div>
              <Label>{bookTarget?._freight ? "LR / AWB number *" : "AWB number *"}</Label>
              <Input value={awbInput} onChange={(e) => setAwbInput(e.target.value)} placeholder="Enter AWB from courier" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={submitBookUnified} disabled={booking || bookQuotes.length === 0}>
              {booking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate card editor */}
      <Dialog open={cardEditorOpen} onOpenChange={setCardEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit Rate Card" : "New Rate Card"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Courier label *</Label>
              <Input value={cardForm.courierName} onChange={(e) => setCardForm({ ...cardForm, courierName: e.target.value })} />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={cardForm.mode} onValueChange={(v) => setCardForm({ ...cardForm, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MPS">MPS</SelectItem>
                  {FREIGHT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GST %</Label>
              <Input type="number" value={cardForm.gstPercent} onChange={(e) => setCardForm({ ...cardForm, gstPercent: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Min weight (kg)</Label>
              <Input type="number" value={cardForm.minWeightKg} onChange={(e) => setCardForm({ ...cardForm, minWeightKg: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={cardForm.isActive} onCheckedChange={(v) => setCardForm({ ...cardForm, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="font-medium">Zone slabs (₹/kg)</Label>
            {ZONES.map((z) => (
              <div key={z} className="grid grid-cols-5 gap-2 items-end">
                <div className="text-sm font-medium pt-6">{z}</div>
                <div>
                  <Label className="text-xs">Per kg</Label>
                  <Input
                    type="number"
                    value={cardForm.slabs[z]?.perKg ?? 0}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        slabs: { ...cardForm.slabs, [z]: { ...cardForm.slabs[z], perKg: parseFloat(e.target.value) || 0 } },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Min charge</Label>
                  <Input
                    type="number"
                    value={cardForm.slabs[z]?.minCharge ?? 0}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        slabs: { ...cardForm.slabs, [z]: { ...cardForm.slabs[z], minCharge: parseFloat(e.target.value) || 0 } },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">COD %</Label>
                  <Input
                    type="number"
                    value={cardForm.slabs[z]?.codPercent ?? 0}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        slabs: { ...cardForm.slabs, [z]: { ...cardForm.slabs[z], codPercent: parseFloat(e.target.value) || 0 } },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">ODA</Label>
                  <Input
                    type="number"
                    value={cardForm.slabs[z]?.odaSurcharge ?? 0}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        slabs: { ...cardForm.slabs, [z]: { ...cardForm.slabs[z], odaSurcharge: parseFloat(e.target.value) || 0 } },
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={cardForm.notes} onChange={(e) => setCardForm({ ...cardForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveCard}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freight create */}
      <Dialog open={freightOpen} onOpenChange={setFreightOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Freight Consignment</DialogTitle>
            <DialogDescription>LTL / PTL / FTL / Air with optional scheduled pickup & appointment delivery.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={freightForm.freightMode} onValueChange={(v) => setFreightForm({ ...freightForm, freightMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREIGHT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment</Label>
              <Select
                value={freightForm.paymentMode}
                onValueChange={(v) =>
                  setFreightForm({
                    ...freightForm,
                    paymentMode: v,
                    billingParty: v === "To-Pay" ? "consignee" : "shipper",
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prepaid">Prepaid</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="To-Pay">To-Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consignee *</Label>
              <Input value={freightForm.consigneeName} onChange={(e) => setFreightForm({ ...freightForm, consigneeName: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={freightForm.consigneePhone} onChange={(e) => setFreightForm({ ...freightForm, consigneePhone: e.target.value })} />
            </div>
            <div>
              <Label>Consignee GSTIN</Label>
              <Input value={freightForm.consigneeGstin} onChange={(e) => setFreightForm({ ...freightForm, consigneeGstin: e.target.value })} />
            </div>
            <div>
              <Label>E-way bill</Label>
              <Input value={freightForm.ewayBill} onChange={(e) => setFreightForm({ ...freightForm, ewayBill: e.target.value })} />
            </div>
            <div>
              <Label>Origin pincode</Label>
              <Input maxLength={6} value={freightForm.originPincode} onChange={(e) => setFreightForm({ ...freightForm, originPincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
            <div>
              <Label>Dest pincode *</Label>
              <Input maxLength={6} value={freightForm.destPincode} onChange={(e) => setFreightForm({ ...freightForm, destPincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={freightForm.addressLine1} onChange={(e) => setFreightForm({ ...freightForm, addressLine1: e.target.value })} />
            </div>
            <div>
              <Label>Invoice value</Label>
              <Input type="number" value={freightForm.invoiceValue} onChange={(e) => setFreightForm({ ...freightForm, invoiceValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Zone</Label>
              <Select value={freightForm.zone} onValueChange={(v) => setFreightForm({ ...freightForm, zone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pickup type</Label>
              <Select value={freightForm.pickupType} onValueChange={(v) => setFreightForm({ ...freightForm, pickupType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_demand">On demand</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {freightForm.pickupType === "scheduled" && (
              <div>
                <Label>Pickup schedule</Label>
                <Input type="datetime-local" value={freightForm.pickupScheduledAt} onChange={(e) => setFreightForm({ ...freightForm, pickupScheduledAt: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Appointment delivery</Label>
              <Input type="datetime-local" value={freightForm.appointmentAt} onChange={(e) => setFreightForm({ ...freightForm, appointmentAt: e.target.value })} />
            </div>
          </div>
          <PackageEditor packages={freightForm.packages} onChange={(p) => setFreightForm({ ...freightForm, packages: p })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreightOpen(false)}>Cancel</Button>
            <Button onClick={submitFreight}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ePOD */}
      <Dialog open={epodOpen} onOpenChange={setEpodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ePOD / Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ePOD URL / path</Label>
              <Input value={epodUrl} onChange={(e) => setEpodUrl(e.target.value)} placeholder="https://… or /uploads/…" />
            </div>
            <div>
              <Label>Appointment (optional)</Label>
              <Input type="datetime-local" value={appointmentAt} onChange={(e) => setAppointmentAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEpodOpen(false)}>Cancel</Button>
            <Button onClick={saveEpod}>Save & mark delivered</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default B2bPage;
