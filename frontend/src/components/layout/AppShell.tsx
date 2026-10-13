import { ReactNode, useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Wallet, ChevronDown, Menu, X, LogOut, User,
  Search, RefreshCw, LifeBuoy, AlertTriangle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import BrandLogo from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import type { NavMenuItem, NavSection } from "@/config/navigation";

export type { NavMenuItem, NavSection };

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  navSections: NavSection[];
  user?: { name?: string; role?: string; avatar?: string; avatarUrl?: string } | null;
  wallet?: number;
  walletLabel?: string;
  onLogout: () => void;
  onProfileClick?: () => void;
  onWalletRefresh?: () => void;
  headerExtra?: ReactNode;
  hidePageHeader?: boolean;
}

const SIDEBAR_PINNED_KEY = "lm-sidebar-pinned";
const SIDEBAR_RAIL_W = 64;
const SIDEBAR_WIDE_W = 248;

const AppShell = ({
  children,
  title,
  subtitle,
  navSections,
  user,
  wallet = 0,
  walletLabel,
  onLogout,
  onProfileClick,
  onWalletRefresh,
  headerExtra,
  hidePageHeader = false,
}: AppShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("AWB ID");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_PINNED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const navRef = useRef<HTMLDivElement>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const isWide = sidebarHovered || pinnedOpen;

  const flatItems = useMemo(
    () => navSections.flatMap((s) => s.items),
    [navSections]
  );

  const toggleSidebar = useCallback(() => {
    setPinnedOpen((p) => !p);
  }, []);

  const handleSidebarEnter = useCallback(() => {
    if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    setSidebarHovered(true);
  }, []);

  const handleSidebarLeave = useCallback(() => {
    hoverLeaveTimer.current = setTimeout(() => setSidebarHovered(false), 120);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PINNED_KEY, String(pinnedOpen));
    } catch { /* ignore */ }
  }, [pinnedOpen]);

  useEffect(
    () => () => {
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    flatItems.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.url))) {
        next[item.title] = true;
      }
    });
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [location.pathname, flatItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard/orders?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActiveUrl = (url: string) =>
    location.pathname === url ||
    (url !== "/dashboard" && location.pathname.startsWith(url));

  const isItemActive = (item: NavMenuItem) => {
    if (item.url) return isActiveUrl(item.url);
    return item.children?.some((c) => isActiveUrl(c.url)) ?? false;
  };

  const isChildActive = (url: string) => isActiveUrl(url);

  const toggleExpand = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderCollapsedLink = (item: NavMenuItem) => (
    <Tooltip key={item.url}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.url!}
          end={item.url === "/dashboard"}
          className="flex justify-center py-1 w-full"
          activeClassName="[&_.lm-nav-icon]:!bg-teal-600 [&_.lm-nav-icon]:!text-white [&_.lm-nav-icon]:shadow-sm"
        >
          <span className="lm-nav-icon flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800">
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
    </Tooltip>
  );

  const renderCollapsedParent = (item: NavMenuItem) => {
    const active = isItemActive(item);
    return (
      <DropdownMenu key={item.title}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex justify-center py-1 w-full outline-none"
              >
                <span
                  className={cn(
                    "lm-nav-icon flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="min-w-[200px]">
          <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">{item.title}</p>
          {item.children!.map((child) => (
            <DropdownMenuItem
              key={child.url}
              onClick={() => navigate(child.url)}
              className={cn(isChildActive(child.url) && "bg-teal-50 text-teal-800 font-medium")}
            >
              {child.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderExpandedLink = (item: NavMenuItem, mobile: boolean) => (
    <NavLink
      key={item.url}
      to={item.url!}
      end={item.url === "/dashboard"}
      onClick={() => mobile && setMobileNav(false)}
      className="lm-nav-item mx-2 whitespace-nowrap"
      activeClassName="lm-nav-item-active"
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className="truncate">{item.title}</span>
    </NavLink>
  );

  const renderExpandedParent = (item: NavMenuItem, mobile: boolean) => {
    const isOpen = expanded[item.title];
    const hasActiveChild = item.children?.some((c) => isChildActive(c.url));

    return (
      <div key={item.title}>
        <button
          type="button"
          onClick={() => toggleExpand(item.title)}
          className={cn(
            "lm-nav-item w-[calc(100%-16px)] mx-2 whitespace-nowrap",
            hasActiveChild && !isOpen && "text-teal-700 bg-teal-50/60"
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="flex-1 text-left truncate">{item.title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className="mx-2 mt-0.5 mb-1 space-y-0.5 pl-4 border-l-2 border-slate-100 ml-5">
            {item.children!.map((child) => (
              <NavLink
                key={child.url}
                to={child.url}
                onClick={() => mobile && setMobileNav(false)}
                className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                activeClassName="!bg-teal-600 !text-white font-medium hover:!bg-teal-600 hover:!text-white"
              >
                {child.title}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNavItem = (item: NavMenuItem, mobile = false) => {
    const hasChildren = Boolean(item.children?.length);

    if (!isWide && !mobile) {
      return hasChildren ? renderCollapsedParent(item) : renderCollapsedLink(item);
    }

    return hasChildren
      ? renderExpandedParent(item, mobile)
      : renderExpandedLink(item, mobile);
  };

  const sidebarFooter = (mobile = false) => {
    if (!isWide && !mobile) {
      return (
        <div className="mt-auto border-t border-slate-100/80 px-2 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="mx-auto flex rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-white hover:border-slate-300 transition-colors"
            title="Pin sidebar open (Ctrl+B)"
          >
            Ctrl + B
          </button>
        </div>
      );
    }

    return (
      <div className="mt-auto border-t border-slate-100/80 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500 hover:bg-white transition-colors"
          >
            Ctrl + B
          </button>
          {!mobile && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          )}
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        )}
      </div>
    );
  };

  const sidebarContent = (mobile = false) => (
    <>
      <div
        className={cn(
          "shrink-0 py-4",
          !isWide && !mobile ? "flex justify-center px-2" : "px-4"
        )}
      >
        <BrandLogo iconOnly={!isWide && !mobile} />
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5">
        {flatItems.map((item) => renderNavItem(item, mobile))}
      </nav>
      {sidebarFooter(mobile)}
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-[#eef1f6]">
        <aside
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          className={cn(
            "hidden lg:flex shrink-0 flex-col border-r border-slate-200/80",
            "bg-gradient-to-b from-white via-white to-slate-50/90",
            "sticky top-0 h-screen self-start overflow-hidden",
            "transition-[width,box-shadow] duration-200 ease-out",
            isWide && "shadow-[2px_0_20px_rgba(15,23,42,0.04)]"
          )}
          style={{ width: isWide ? SIDEBAR_WIDE_W : SIDEBAR_RAIL_W }}
        >
          {sidebarContent()}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header ref={navRef} className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <div className="flex h-[3.25rem] items-center gap-3 px-4 lg:px-5">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                onClick={() => {
                  if (window.innerWidth >= 1024) toggleSidebar();
                  else setMobileNav(true);
                }}
                title="Pin sidebar open (Ctrl+B)"
              >
                <Menu className="h-5 w-5" />
              </button>

              <form
                onSubmit={handleSearch}
                className="hidden sm:flex flex-1 max-w-xl items-center gap-0 rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 border-r border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-white whitespace-nowrap"
                    >
                      {searchType} <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {["AWB ID", "Order ID", "Customer", "Phone"].map((t) => (
                      <DropdownMenuItem key={t} onClick={() => setSearchType(t)}>{t}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search order by ${searchType}`}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm"
                />
              </form>

              <div className="ml-auto flex items-center gap-2">
                <div className="hidden xl:flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  {/* <AlertTriangle className="h-3.5 w-3.5" /> */}

                  <span>Welcome:  {user?.name || "User"}</span>
                </div>

                <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white shadow-sm px-3 py-1.5 ring-1 ring-slate-100">
                  <Wallet className="h-4 w-4 text-teal-600" />
                  <div className="flex flex-col leading-tight">
                    {walletLabel ? (
                      <span className="text-[10px] text-slate-500 font-medium">{walletLabel}</span>
                    ) : null}
                    <span className="text-sm font-bold text-slate-800">₹ {((Number(wallet) || 0)).toFixed(2)}</span>
                  </div>
                  <button type="button" onClick={onWalletRefresh} className="p-0.5 rounded hover:bg-slate-200 text-slate-500">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  className="hidden sm:flex h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-4"
                  onClick={() => navigate("/dashboard/wallet-recharge")}
                >
                  Recharge
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="hidden sm:flex h-9 gap-1 border-slate-300 text-slate-700 font-medium rounded-lg">
                      Quick Actions <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/orders")}>View Orders</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/rate-calculator")}>Rate Calculator</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/reports")}>Reports</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/finance")}>Finance & COD</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  className="hidden md:flex h-9 gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg"
                  onClick={() => navigate("/dashboard/support")}
                >
                  <LifeBuoy className="h-4 w-4" /> Tickets
                </Button>

                <button type="button" className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">3</span>
                </button>

                {headerExtra}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white pl-1 pr-2 py-1 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-teal-700 text-xs font-bold text-white">
                        {String(user?.name || "").trim().charAt(0).toUpperCase() || "U"}
                        {resolveAvatarUrl(user?.avatarUrl) && (
                          <img
                            key={resolveAvatarUrl(user?.avatarUrl)}
                            src={resolveAvatarUrl(user?.avatarUrl)}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || "Account"}</p>
                      <p className="text-xs text-slate-500 capitalize">{user?.role || "User"}</p>
                    </div>
                    <DropdownMenuItem onClick={onProfileClick} className="gap-2">
                      <User className="h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2">
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="gap-2 text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {!hidePageHeader && title && (
            <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          )}

          <main className="flex-1 p-4 lg:p-6">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>

        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
                <BrandLogo />
                <button type="button" onClick={() => setMobileNav(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden py-2">
                {sidebarContent(true)}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AppShell;
