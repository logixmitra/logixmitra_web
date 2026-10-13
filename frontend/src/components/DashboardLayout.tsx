import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getuserid } from "../../services/getbasicdata";
import { API_BASE_URL } from "../../services/config";
import { defaultNavSections, filterNavByPermissions, NavSection } from "@/config/navigation";
import { getImpersonationSession, exitImpersonation } from "../../services/impersonation";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hidePageHeader?: boolean;
}

const DashboardLayout = ({ children, title, subtitle, hidePageHeader }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [navSections, setNavSections] = useState<NavSection[]>(defaultNavSections);
  const [wallet, setWallet] = useState(0);
  const [walletLabel, setWalletLabel] = useState<string | undefined>(undefined);
  // Saved admin session while the admin is logged in as a seller
  const [impersonation, setImpersonation] = useState(getImpersonationSession());

  /** Header wallet chip — admins see the total across all sellers */
  const loadWallet = async () => {
    try {
      const rawUser =
        (user as any) || JSON.parse(localStorage.getItem("user") || "{}");
      const roleObj: any = (rawUser as any)?.role;
      const role =
        typeof roleObj === "object" && roleObj !== null
          ? String(roleObj?.name || "")
          : String((rawUser as any)?.role || "");
      const isAdmin =
        role.toLowerCase() === "admin" || role.toLowerCase() === "super admin";

      // API_BASE_URL already ends with "/api/" so don't add another slash
      const base = String(API_BASE_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("token") || "";

      if (isAdmin) {
        const response = await fetch(`${base}/wallets/sellers-total`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setWallet(Number(data?.total) || 0);
        setWalletLabel(`All sellers (${data?.count || 0})`);
        return;
      }

      // Prefer walletBalance already available on login / auth user —
      // instant display even if the users endpoint fails
      const cachedBalance = Number((rawUser as any)?.walletBalance);
      if (Number.isFinite(cachedBalance)) {
        setWallet(cachedBalance);
      }

      const userId =
        (rawUser as any)?.id || getuserid();
      if (!userId) {
        setWalletLabel(undefined);
        return;
      }

      const response = await fetch(`${base}/users/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const freshBalance = Number(data?.data?.walletBalance);
      setWallet(Number.isFinite(freshBalance) ? freshBalance : (Number.isFinite(cachedBalance) ? cachedBalance : 0));
      setWalletLabel(undefined);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /** Restore the stashed admin session and reload the app. */
  const handleExitImpersonation = () => {
    if (exitImpersonation()) {
      window.location.href = "/dashboard";
    }
  };

  useEffect(() => {
    const userData = (user as any) || JSON.parse(localStorage.getItem("user") || "{}");
    const permissionlist = (userData as any)?.permissions || [];
    const roleObj: any = (userData as any)?.role;
    const role =
      typeof roleObj === "object" && roleObj !== null
        ? String(roleObj?.name || "")
        : String((userData as any)?.role || "");
    const isAdmin =
      role.toLowerCase() === "admin" || role.toLowerCase() === "super admin";
    const filtered = filterNavByPermissions(defaultNavSections, permissionlist, isAdmin);
    setNavSections(filtered.length > 0 ? filtered : defaultNavSections);
    loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload wallet once auth user resolves (login is async) and on user change
  useEffect(() => {
    if (user) loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      hidePageHeader={hidePageHeader}
      navSections={navSections}
      user={user}
      wallet={wallet}
      walletLabel={walletLabel}
      onLogout={handleLogout}
      onProfileClick={() => navigate("/dashboard/profile")}
      onWalletRefresh={() => loadWallet()}
    >
      {impersonation && (
        <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200">
          <span className="flex items-center gap-2 font-medium">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
            Viewing as seller account:
            <strong>{String((impersonation.user as any)?.name || "")}</strong>
            <span className="hidden font-normal opacity-80 sm:inline">
              ({String((impersonation.user as any)?.email || "")})
            </span>
          </span>
          <button
            type="button"
            onClick={handleExitImpersonation}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Back to Admin
          </button>
        </div>
      )}
      {children}
    </AppShell>
  );
};

export default DashboardLayout;
