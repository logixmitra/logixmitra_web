import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getuser, getuserid } from "../../services/getbasicdata";
import { sellerApi } from "../../services/sellerApi";
import labelSettingsApi from "../../services/labelSettingsApi";
import { UPLOAD_BASE_URL, UPLOAD_BASE_URLs } from "../../services/config";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import {
  DEFAULT_LABEL_SETTINGS,
  type LabelSettings,
  type LabelTemplate,
} from "@/config/labelSettings";
import ShippingLabelPreview from "@/components/labels/ShippingLabelPreview";
import { CheckCircle2, ImagePlus, Loader2, Tag, Trash2, Upload } from "lucide-react";

type SellerOption = { id: string | number; name: string; company?: string };

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const LOGO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

function resolveLogoUrl(logoUrl?: string | null): string {
  // Resolve stored references through the same canonical-URL helper the
  // profile avatar uses: everything the upload endpoint saves lives at
  // host /uploads/<file> (express.static). Legacy "/upload/uploads/<file>"
  // values only resolve when the server strips the "/upload" alias prefix —
  // otherwise the freshly uploaded logo showed as a blank preview.
  return resolveAvatarUrl(logoUrl);
}

const LabelCustomizationPage = () => {
  const { toast } = useToast();
  const user = getuser();
  const isAdmin = user?.role == "admin";
  const myId = getuserid();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>(String(myId || ""));
  const [settings, setSettings] = useState<LabelSettings>({ ...DEFAULT_LABEL_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadSellers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const list = await sellerApi.getAll({});
      const options = (Array.isArray(list) ? list : []).map((s: any) => ({
        id: s.id,
        name: s.name || s.company || `Seller #${s.id}`,
        company: s.company,
      }));
      setSellers(options);
      if (!sellerId && options[0]) setSellerId(String(options[0].id));
    } catch {
      setSellers([]);
    }
  }, [isAdmin, sellerId]);

  const loadSettings = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await labelSettingsApi.get(id);
      setSettings(data.settings);
    } catch {
      setSettings({ ...DEFAULT_LABEL_SETTINGS });
      toast({
        title: "Could not load settings",
        description: "Using default label options.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  useEffect(() => {
    if (!isAdmin) {
      setSellerId(String(myId || ""));
    }
  }, [isAdmin, myId]);

  useEffect(() => {
    if (sellerId) loadSettings(sellerId);
  }, [sellerId, loadSettings]);

  const setField = <K extends keyof LabelSettings>(key: K, value: LabelSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const logoPreviewUrl = useMemo(() => resolveLogoUrl(settings.logoUrl), [settings.logoUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast({
        title: "Invalid file",
        description: "Please upload a PNG, JPG, or WEBP image.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: "File too large",
        description: "Logo must be under 2 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const formdata = new FormData();
      formdata.append("file", file);
      // NOTE: UPLOAD_BASE_URL already ends with "/upload" (see services/config),
      // so POST to the base itself. Building `${UPLOAD_BASE_URL}/upload` sends
      // "/upload/upload", which hits no route on the server and returns
      // "Route not found" → "Logo upload failed".
      const uploadRes = await fetch(`${UPLOAD_BASE_URL}`, {
        method: "POST",
        body: formdata,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        filename?: string;
        fileInfo?: { filename?: string };
      };
      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || uploadData?.error || `Upload failed (${uploadRes.status})`);
      }
      const filename = uploadData?.filename || uploadData?.fileInfo?.filename;
      if (!filename) {
        throw new Error("Upload succeeded but no filename returned");
      }
      // Canonical, always-displayable URL: the server serves uploaded files
      // at host /uploads/<file> (express.static), so save that shape instead
      // of the "/upload/uploads/<file>" alias URL that 404s on some servers.
      const logoUrl = `${UPLOAD_BASE_URLs}uploads/${filename}`;
      setSettings((prev) => ({
        ...prev,
        logoUrl,
        showLogo: true,
      }));
      toast({ title: "Logo uploaded", description: "Preview updated — click Save Label Settings to apply it on labels." });
    } catch (error: any) {
      toast({
        title: "Logo upload failed",
        description: error?.message || "Unable to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const clearLogo = () => {
    setField("logoUrl", "");
  };

  const handleSave = async () => {
    if (!sellerId) {
      toast({ title: "Select a seller", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await labelSettingsApi.update(sellerId, settings);
      toast({ title: "Label settings saved", description: "Applied for this seller’s shipping labels." });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save label settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Label Customization" subtitle="Seller-wise shipping label branding & fields">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Tag className="h-5 w-5" />
              Shipping Label Options
            </CardTitle>
            <CardDescription>
              Configure logo, company name, support phone, and which fields appear on labels — per seller.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAdmin && (
              <div className="space-y-2 max-w-md">
                <Label>Seller</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.name}{s.company ? ` (${s.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Label template</Label>
                    <Select
                      value={settings.template}
                      onValueChange={(v) => setField("template", v as LabelTemplate)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="with_tax">With HSN / Tax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company name on label</Label>
                    <Input
                      value={settings.companyName}
                      onChange={(e) => setField("companyName", e.target.value)}
                      placeholder="Your brand / company name"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Logo</Label>
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex h-20 w-36 items-center justify-center rounded-md border bg-muted/30 overflow-hidden">
                          {logoPreviewUrl ? (
                            <img
                              src={logoPreviewUrl}
                              alt="Logo preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                // Broken/legacy URL — make the failure visible
                                // instead of silently showing an empty box.
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                              <ImagePlus className="h-5 w-5" />
                              No logo
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={LOGO_ACCEPT}
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingLogo}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" /> Upload logo
                              </>
                            )}
                          </Button>
                          {settings.logoUrl ? (
                            <Button type="button" variant="ghost" onClick={clearLogo}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {settings.logoUrl ? (
                        <p className="flex items-center gap-1.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Logo uploaded — click “Save Label Settings” to apply it on shipping labels.
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or WEBP · max 2 MB. Upload, then click Save Label Settings.
                      </p>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Or paste logo URL</Label>
                        <Input
                          value={settings.logoUrl}
                          onChange={(e) => setField("logoUrl", e.target.value)}
                          placeholder="https://…/logo.png"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Support phone</Label>
                    <Input
                      value={settings.supportPhone}
                      onChange={(e) => setField("supportPhone", e.target.value)}
                      placeholder="+91…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST on label</Label>
                    <Input
                      value={settings.gstOnLabel}
                      onChange={(e) => setField("gstOnLabel", e.target.value)}
                      placeholder="GSTIN"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom footer text</Label>
                  <Textarea
                    rows={3}
                    value={settings.footerText}
                    onChange={(e) => setField("footerText", e.target.value)}
                    placeholder="Optional return policy / note printed at bottom of label"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      ["showLogo", "Show logo"],
                      ["showCompanyName", "Show company name"],
                      ["showWarehouseAddress", "Show warehouse / ship-from address"],
                      ["showSupportPhone", "Show support phone"],
                      ["showGst", "Show GST"],
                      ["showTotal", "Show order total"],
                      ["showSku", "Show SKU column"],
                      ["showHsnTax", "Show HSN / tax columns"],
                      ["showAwbBarcode", "Show AWB barcode"],
                      ["showAwbQr", "Show AWB QR code"],
                      ["showOrderBarcode", "Show order barcode"],
                      ["showWeight", "Show weight"],
                      ["showDimensions", "Show dimensions (L × W × H)"],
                      ["showOrderReferenceId", "Show order reference ID"],
                      ["showOrderNo", "Show order no"],
                      ["showDisclaimer", "Show disclaimer"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={Boolean(settings[key])}
                        onCheckedChange={(v) => setField(key, v)}
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={handleSave} disabled={saving || !sellerId}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save Label Settings"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle className="text-foreground">Label preview</CardTitle>
            <CardDescription>
              Live sample of how the shipping label will look. Toggle fields on the left to hide or show them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
              </div>
            ) : (
              <ShippingLabelPreview settings={settings} logoUrl={logoPreviewUrl} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LabelCustomizationPage;
