import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import IntegrationPlatformCard from "@/components/integrations/IntegrationPlatformCard";
import IntegrateChannelDialog from "@/components/integrations/IntegrateChannelDialog";
import {
  ORDER_CHANNEL_PLATFORMS,
  type ConnectedChannel,
  type OrderChannelPlatform,
} from "@/config/integrationPlatforms";
import integrationApi from "../../../services/integrationsApi";
import { getuserid } from "../../../services/getbasicdata";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const mapIntegrationToChannel = (row: any): ConnectedChannel => {
  const typeKey = String(row.type || row.channel || "").toLowerCase();
  const platform = ORDER_CHANNEL_PLATFORMS.find(
    (p) => p.id === typeKey || p.name.toLowerCase() === typeKey
  );
  const channelId = platform?.id || typeKey || "custom";
  const storeName = row.name || row.storeName || platform?.name || "Store";
  const isActive = Boolean(row.isActive ?? row.status === "Active");

  return {
    id: String(row.id),
    channel: channelId,
    channelLabel: platform?.name || row.type || "Channel",
    storeId: String(storeName).slice(0, 2).toUpperCase(),
    storeName,
    connectionStatus: isActive ? "Active" : "In-Active",
    status: isActive ? "Active" : "In-Active",
    lastSync: row.lastSync
      ? new Date(row.lastSync).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
  };
};

const StatusPill = ({ label }: { label: string }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
      label === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-600"
    )}
  >
    {label}
  </span>
);

const ChannelLogo = ({ platform }: { platform: OrderChannelPlatform | undefined }) => {
  if (!platform) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
        style={{ backgroundColor: platform.color }}
      >
        {platform.logoText}
      </div>
      <span className="text-sm font-medium text-slate-800">{platform.name}</span>
    </div>
  );
};

const OrderChannelsPage = () => {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [rawIntegrations, setRawIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<OrderChannelPlatform | null>(null);

  const integratedIds = useMemo(
    () => new Set(channels.map((c) => c.channel)),
    [channels]
  );

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await integrationApi.getAll();
      const list = Array.isArray(data) ? data : [];
      const uid = String(getuserid() ?? "");
      const mine = list.filter((row: any) => String(row?.user_id ?? "") === uid);
      setRawIntegrations(mine);
      setChannels(mine.map(mapIntegrationToChannel));
    } catch {
      setRawIntegrations([]);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const openIntegrate = (platform: OrderChannelPlatform) => {
    setSelectedPlatform(platform);
    setDialogOpen(true);
  };

  const handleIntegrate = async (form: Record<string, string>) => {
    try {
      const platform = ORDER_CHANNEL_PLATFORMS.find((p) => p.id === form.platform);
      const isShopify = form.platform === "shopify";

      const payload = isShopify
        ? {
            user_id: getuserid(),
            type: "Shopify",
            name: form.storeName || "Shopify Store",
            credentials: {
              storeUrl: form.storeUrl,
              clientid: form.clientId,
              accessToken: form.clientSecret,
            },
            isActive: true,
          }
        : {
            user_id: getuserid(),
            type: platform?.name === "WooCommerce" ? "WooCommerce" : "Custom",
            name: form.storeName,
            credentials: {
              storeUrl: form.storeUrl,
              apiKey: form.apiKey,
              apiSecret: form.apiSecret,
              accessToken: form.apiKey,
            },
            isActive: true,
          };

      if (isShopify) {
        const ok = await integrationApi.testConnection("Shopify", payload.credentials);
        if (!ok) {
          toast({
            title: "Connection failed",
            description: "Invalid Shopify URL, Client ID, or Client Secret.",
            variant: "destructive",
          });
          return;
        }
      }

      await integrationApi.create(payload);
      await loadChannels();
      toast({ title: "Store connected", description: `${platform?.name} integration saved.` });
    } catch {
      toast({ title: "Connection failed", variant: "destructive" });
    }
  };

  const handleSyncOrders = async (channel: ConnectedChannel) => {
    if (channel.channel !== "shopify") {
      toast({
        title: "Sync not available",
        description: `Order sync for ${channel.channelLabel} is not supported yet.`,
        variant: "destructive",
      });
      return;
    }

    const integration = rawIntegrations.find((row) => String(row.id) === String(channel.id));
    if (!integration?.credentials) {
      toast({
        title: "Missing credentials",
        description: "Reconnect Shopify with Client ID, Client Secret, and store URL.",
        variant: "destructive",
      });
      return;
    }

    setSyncingId(channel.id);
    try {
      const creds = integration.credentials || {};
      const result = await integrationApi.syncShopify({
        SHOP: creds.storeUrl,
        CLIENT_ID: creds.clientid || creds.clientId,
        CLIENT_SECRET: creds.accessToken || creds.clientSecret,
        user_id: getuserid(),
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      });

      toast({
        title: "Shopify sync completed",
        description: result?.message || `Synced ${result?.syncedCount ?? 0} orders`,
      });
      await loadChannels();
    } catch (error: any) {
      toast({
        title: "Shopify sync failed",
        description: error?.message || "Unable to sync Shopify orders",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-5">
        <div className="lm-workspace-shell overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h1 className="text-base font-semibold text-slate-800">Order Channels</h1>
            <button
              type="button"
              onClick={loadChannels}
              disabled={loading}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="lm-table-head">
                  {["Channel", "ID and Name", "Connection Status", "Status", "Last Order Sync", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      No channels connected yet. Select a platform below to integrate.
                    </td>
                  </tr>
                ) : (
                  channels.map((row) => {
                    const platform = ORDER_CHANNEL_PLATFORMS.find((p) => p.id === row.channel);
                    return (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-4"><ChannelLogo platform={platform} /></td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800"># {row.id.slice(0, 8)} | {row.storeId}</p>
                          <p className="text-sm text-slate-500">{row.channelLabel} | {row.storeName}</p>
                        </td>
                        <td className="px-5 py-4"><StatusPill label={row.connectionStatus} /></td>
                        <td className="px-5 py-4"><StatusPill label={row.status} /></td>
                        <td className="px-5 py-4 text-sm text-slate-600">{row.lastSync}</td>
                        <td className="px-5 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700"
                                disabled={syncingId === row.id}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={syncingId === row.id}
                                onClick={() => handleSyncOrders(row)}
                              >
                                {syncingId === row.id ? "Syncing..." : "Sync orders now"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const p = ORDER_CHANNEL_PLATFORMS.find((x) => x.id === row.channel);
                                  if (p) openIntegrate(p);
                                }}
                              >
                                Edit connection
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={async () => {
                                  try {
                                    await integrationApi.delete(row.id);
                                    await loadChannels();
                                    toast({ title: "Channel disconnected" });
                                  } catch {
                                    toast({ title: "Failed to disconnect", variant: "destructive" });
                                  }
                                }}
                              >
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lm-workspace-shell p-5">
          <h2 className="mb-5 text-base font-semibold text-slate-800">
            Select the channel to integrate
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ORDER_CHANNEL_PLATFORMS.map((platform) => (
              <IntegrationPlatformCard
                key={platform.id}
                name={platform.name}
                color={platform.color}
                logoText={platform.logoText}
                integrated={integratedIds.has(platform.id)}
                onAction={() => openIntegrate(platform)}
              />
            ))}
          </div>
        </div>
      </div>

      <IntegrateChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={selectedPlatform}
        onSubmit={handleIntegrate}
      />
    </DashboardLayout>
  );
};

export default OrderChannelsPage;
