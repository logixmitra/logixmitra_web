import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderChannelPlatform } from "@/config/integrationPlatforms";

interface IntegrateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: OrderChannelPlatform | null;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

const IntegrateChannelDialog = ({
  open,
  onOpenChange,
  platform,
  onSubmit,
}: IntegrateChannelDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const isShopify = platform?.id === "shopify";

  useEffect(() => {
    if (!open) {
      setStoreName("");
      setStoreUrl("");
      setClientId("");
      setClientSecret("");
      setApiKey("");
      setApiSecret("");
    }
  }, [open]);

  const canSubmit = isShopify
    ? Boolean(storeUrl.trim() && clientId.trim() && clientSecret.trim())
    : Boolean(storeName.trim() && storeUrl.trim() && apiKey.trim());

  const handleSubmit = async () => {
    if (!platform || !canSubmit) return;
    setLoading(true);
    try {
      if (isShopify) {
        await onSubmit({
          platform: platform.id,
          storeName: storeName.trim() || "Shopify Store",
          storeUrl: storeUrl.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        });
      } else {
        await onSubmit({
          platform: platform.id,
          storeName: storeName.trim(),
          storeUrl: storeUrl.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        });
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Integrate {platform?.name}</DialogTitle>
          <DialogDescription>
            Connect your {platform?.name} store to sync orders automatically into LogixMitra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isShopify ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="shopifyUrl">Shopify URL</Label>
                <Input
                  id="shopifyUrl"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://your-store.myshopify.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopifyClientId">Client ID</Label>
                <Input
                  id="shopifyClientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopifyClientSecret">Client Secret</Label>
                <Input
                  id="shopifyClientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter Client Secret"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Store name</Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="My Store"
                />
              </div>
              <div className="space-y-2">
                <Label>Store URL</Label>
                <Input
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://your-store.com"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key / Access Token</Label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              {(platform?.id === "woocommerce" || platform?.id === "amazon") && (
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter API secret"
                    type="password"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? "Connecting..." : "Connect Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrateChannelDialog;
