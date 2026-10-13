import DashboardLayout from "@/components/DashboardLayout";
import IntegrationPlatformCard from "@/components/integrations/IntegrationPlatformCard";
import { OMS_PLATFORMS } from "@/config/integrationPlatforms";
import { useToast } from "@/hooks/use-toast";

const OmsIntegrationPage = () => {
  const { toast } = useToast();

  return (
    <DashboardLayout hidePageHeader>
      <div className="lm-workspace-shell p-5">
        <h1 className="mb-5 text-base font-semibold text-slate-800">OMS Integration</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {OMS_PLATFORMS.map((platform) => (
            <IntegrationPlatformCard
              key={platform.id}
              name={platform.name}
              color={platform.color}
              logoText={platform.logoText}
              actionLabel="Integration Guide"
              onAction={() =>
                toast({
                  title: `${platform.name} integration guide`,
                  description: "Documentation will open in a new tab when configured.",
                })
              }
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OmsIntegrationPage;
