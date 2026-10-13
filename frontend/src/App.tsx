import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RolesPage from "./pages/RolesPage";
import PermissionsPage from "./pages/PermissionsPage";
import UsersPage from "./pages/UsersPage";
import OrdersPage from "./pages/OrdersPage";
import SellersPage from "./pages/SellersPage";
import CouriersPage from "./pages/CouriersPage";
import FinancePage from "./pages/FinancePage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
import LabelCustomizationPage from "./pages/LabelCustomizationPage";
import NdrRtoPage from "./pages/NdrRtoPage";
import RiskFraudPage from "./pages/RiskFraudPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ReportsPage from "./pages/ReportsPage";
import DisputesPage from "./pages/DisputesPage";
import WarehousePage from "./pages/WarehousePage";
import AuditLogsPage from "./pages/AuditLogsPage";
import NotificationsPage from "./pages/NotificationsPage";
import OrderChannelsPage from "./pages/integrations/OrderChannelsPage";
import OmsIntegrationPage from "./pages/integrations/OmsIntegrationPage";
import EddWidgetPage from "./pages/integrations/EddWidgetPage";
import ApiIntegrationPage from "./pages/integrations/ApiIntegrationPage";
import SystemMonitoringPage from "./pages/SystemMonitoringPage";
import CreditExposurePage from "./pages/CreditExposurePage";
import RateCalculator from "./pages/RateCalculatore";
import WalletRecharge from "./pages/WalletRecharge"
import B2bPage from "./pages/B2bPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <>      <div id="gg">
    <div className="loader"></div>
  </div>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/rate-calculator" element={<ProtectedRoute><RateCalculator /></ProtectedRoute>} />
            <Route path="/dashboard/b2b" element={<ProtectedRoute><B2bPage /></ProtectedRoute>} />
            <Route path="/dashboard/wallet-recharge" element={<ProtectedRoute><WalletRecharge /></ProtectedRoute>} />
            <Route path="/dashboard/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
            <Route path="/dashboard/permissions" element={<ProtectedRoute><PermissionsPage /></ProtectedRoute>} />
            <Route path="/dashboard/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/dashboard/sellers" element={<ProtectedRoute><SellersPage /></ProtectedRoute>} />
            <Route path="/dashboard/couriers" element={<ProtectedRoute><CouriersPage /></ProtectedRoute>} />
            <Route path="/dashboard/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
            <Route path="/dashboard/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard/label-customization" element={<ProtectedRoute><LabelCustomizationPage /></ProtectedRoute>} />
            <Route path="/dashboard/ndr-rto" element={<ProtectedRoute><NdrRtoPage /></ProtectedRoute>} />
            <Route path="/dashboard/risk" element={<ProtectedRoute><RiskFraudPage /></ProtectedRoute>} />
            <Route path="/dashboard/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/dashboard/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/dashboard/disputes" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
            <Route path="/dashboard/warehouse" element={<ProtectedRoute><WarehousePage /></ProtectedRoute>} />
            <Route path="/dashboard/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
            <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/dashboard/integrations/channels" element={<ProtectedRoute><OrderChannelsPage /></ProtectedRoute>} />
            <Route path="/dashboard/integrations/oms" element={<ProtectedRoute><OmsIntegrationPage /></ProtectedRoute>} />
            <Route path="/dashboard/integrations/edd-widget" element={<ProtectedRoute><EddWidgetPage /></ProtectedRoute>} />
            <Route path="/dashboard/integrations/api" element={<ProtectedRoute><ApiIntegrationPage /></ProtectedRoute>} />
            <Route path="/dashboard/api" element={<Navigate to="/dashboard/integrations/channels" replace />} />
            <Route path="/dashboard/system" element={<ProtectedRoute><SystemMonitoringPage /></ProtectedRoute>} />
            <Route path="/dashboard/credit" element={<ProtectedRoute><CreditExposurePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </>
);

export default App;
