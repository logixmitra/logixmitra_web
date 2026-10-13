import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [platformName, setPlatformName] = useState("LogixMitra");
  const [supportEmail, setSupportEmail] = useState("support@logixmitra.com");
  const [autoAssign, setAutoAssign] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [whatsappNotif, setWhatsappNotif] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [ipRestriction, setIpRestriction] = useState(false);
  const [allowedIPs, setAllowedIPs] = useState("192.168.1.0/24");
  const [commission, setCommission] = useState("5");
  const [courierMode, setCourierMode] = useState("auto");
  const [gstRate, setGstRate] = useState("18");
  const [gstNumber, setGstNumber] = useState("27AABCU9603R1ZM");
  const [brandColor, setBrandColor] = useState("#f97316");
  const [logoUrl, setLogoUrl] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("Dear {{seller_name}},\n\nYour {{event_type}} has been processed.\n\nRegards,\nLogixMitra Team");

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your changes have been saved successfully." });
  };

  return (
    <DashboardLayout title="Settings" subtitle="Platform configuration & system settings">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="commission">Commission & Fees</TabsTrigger>
          <TabsTrigger value="tax">Tax & GST</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-foreground">General Settings</CardTitle><CardDescription>Manage your platform configuration</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Platform Name</Label><Input value={platformName} onChange={e => setPlatformName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Support Email</Label><Input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} /></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Auto-assign couriers</p><p className="text-sm text-muted-foreground">Automatically assign couriers to new orders</p></div>
                <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Commission & Fee Settings</CardTitle><CardDescription>Configure platform commission and advance fees</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Global Commission Rate (%)</Label><Input type="number" value={commission} onChange={e => setCommission(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Default Courier Allocation Mode</Label>
                  <Select value={courierMode} onValueChange={setCourierMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Cheapest)</SelectItem>
                      <SelectItem value="fastest">Fastest Delivery</SelectItem>
                      <SelectItem value="rating">Best Rating</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Early COD Advance Fee (%)</Label><Input type="number" defaultValue="2.5" /></div>
                <div className="space-y-2"><Label>Minimum Settlement Amount (₹)</Label><Input type="number" defaultValue="500" /></div>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Tax & GST Configuration</CardTitle><CardDescription>Manage tax rates and GST details</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>GST Rate (%)</Label><Input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>GST Number</Label><Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} /></div>
                <div className="space-y-2"><Label>PAN Number</Label><Input defaultValue="AABCU9603R" /></div>
                <div className="space-y-2"><Label>Tax Deduction at Source (%)</Label><Input type="number" defaultValue="1" /></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Auto-generate GST Invoices</p><p className="text-sm text-muted-foreground">Automatically create GST invoices for all settlements</p></div>
                <Switch defaultChecked />
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Notification Channels</CardTitle><CardDescription>Configure how you send notifications</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Email Notifications", desc: "Send alerts via email", checked: emailNotif, onChange: setEmailNotif },
                { label: "SMS Notifications", desc: "Send alerts via SMS", checked: smsNotif, onChange: setSmsNotif },
                { label: "WhatsApp Notifications", desc: "Send NDR/delivery updates via WhatsApp", checked: whatsappNotif, onChange: setWhatsappNotif },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-foreground">{item.label}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
              <div className="space-y-2">
                <Label>NDR Customer Message Template</Label>
                <Textarea defaultValue="Dear Customer, your delivery for order {{order_id}} was unsuccessful. Reason: {{reason}}. Please contact us to reschedule." rows={3} />
                <p className="text-xs text-muted-foreground">Sent via SMS, WhatsApp & Email (up to 3 attempts)</p>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Shipping Configuration</CardTitle><CardDescription>Manage shipping zones and rates</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Default Shipping Zone</Label><Input defaultValue="Pan India" /></div>
                <div className="space-y-2"><Label>Base Shipping Rate (₹)</Label><Input type="number" defaultValue="50" /></div>
                <div className="space-y-2"><Label>Free Shipping Threshold (₹)</Label><Input type="number" defaultValue="500" /></div>
                <div className="space-y-2"><Label>Max Weight per Package (kg)</Label><Input type="number" defaultValue="25" /></div>
                <div className="space-y-2"><Label>International Shipping</Label>
                  <Select defaultValue="disabled"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="disabled">Disabled</SelectItem><SelectItem value="enabled">Enabled</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Default Currency</Label>
                  <Select defaultValue="INR"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INR">INR (₹)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem></SelectContent></Select>
                </div>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Security Settings</CardTitle><CardDescription>Two-factor authentication and IP restrictions</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Two-Factor Authentication (2FA)</p><p className="text-sm text-muted-foreground">Require 2FA for all admin logins</p></div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">IP Restriction</p><p className="text-sm text-muted-foreground">Only allow access from specific IPs</p></div>
                <Switch checked={ipRestriction} onCheckedChange={setIpRestriction} />
              </div>
              {ipRestriction && (
                <div className="space-y-2">
                  <Label>Allowed IP Addresses (CIDR notation)</Label>
                  <Textarea value={allowedIPs} onChange={e => setAllowedIPs(e.target.value)} rows={3} placeholder="192.168.1.0/24" />
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue="30" />
              </div>
              <div className="space-y-2">
                <Label>Max Login Attempts</Label>
                <Input type="number" defaultValue="5" />
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Branding & Email Templates</CardTitle><CardDescription>Customize platform appearance and email templates</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Brand Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-16 h-10 p-1" />
                    <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2"><Label>Logo URL</Label><Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Email Template</Label>
                <Textarea value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} rows={6} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Variables: {"{{seller_name}}, {{event_type}}, {{order_id}}, {{amount}}"}</p>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader><CardTitle className="text-foreground">Advanced Settings</CardTitle><CardDescription>System-level configuration</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Maintenance Mode</p><p className="text-sm text-muted-foreground">Put the platform in maintenance mode</p></div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <Separator />
              <div className="space-y-2"><Label>API Rate Limit (req/min)</Label><Input type="number" defaultValue="100" /></div>
              <div className="space-y-2"><Label>Data Retention Period (days)</Label><Input type="number" defaultValue="365" /></div>
              <div className="space-y-2"><Label>Auto Backup Frequency</Label>
                <Select defaultValue="daily"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SettingsPage;
