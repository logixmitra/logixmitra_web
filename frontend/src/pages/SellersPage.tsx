import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, CheckCircle, XCircle, Eye, Users, ShieldCheck, AlertTriangle, 
  Plus, Edit, Trash2, Wallet, Tag, Download, RefreshCw, Filter, Loader2, LogIn 
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
import api from "../../services/api"
import { isAdminUser } from "../../services/getbasicdata";
import { startImpersonation } from "../../services/impersonation";

interface Seller {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  gst: string;
  roleId: string;
  password: string;


  status: "active" | "blocked" | "pending";
  kycStatus: "verified" | "pending" | "rejected";
  totalOrders: number;
  revenue: string;
  joinedAt: string;
  address: string;
  pincode: string;
  city: string;
  state: string;


  walletBalance: number;
  performanceScore: number;
  rtoRate: number;
  riskCategory: "low" | "medium" | "high";
  subscription: string;
}

type SellerStatus = "active" | "blocked" | "pending";
type KycStatus = "verified" | "pending" | "rejected";
type RiskCategory = "low" | "medium" | "high";

const statusStyles = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
};

const kycStyles = {
  verified: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
};

const riskStyles = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
};

const emptySeller: CreateSellerDTO = {
  name: "",
  email: "",
  company: "",
  phone: "",
  gst: "",
  address: "",
  status: "pending",
  kycStatus: "pending",
  riskCategory: "low",
  subscription: "Trial"
};
interface RoleOption {
  id: string | number;
  name: string;
}

const normalizeRoles = (response: unknown): RoleOption[] => {
  if (Array.isArray(response)) return response as RoleOption[];
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.results)) return r.results as RoleOption[];
  if (Array.isArray(r?.data)) return r.data as RoleOption[];
  const data = r?.data as Record<string, unknown> | undefined;
  if (Array.isArray(data?.results)) return data.results as RoleOption[];
  return [];
};

// Form Fields Component with proper focus handling
const FormFields = ({ formData, setFormData, roles = [] }: { 
  formData: CreateSellerDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateSellerDTO>>;
  roles?: RoleOption[];
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
    <div className="space-y-2">
      <Label htmlFor="sellerName">Name *</Label>
      <Input 
        id="sellerName"
        value={formData.name} 
        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} 
        placeholder="Enter seller name"
        autoComplete="off"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerEmail">Email *</Label>
      <Input 
        id="sellerEmail"
        type="email"
        value={formData.email} 
        onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} 
        placeholder="seller@example.com"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerCompany">Company *</Label>
      <Input 
        id="sellerCompany"
        value={formData.company} 
        onChange={e => setFormData(f => ({ ...f, company: e.target.value }))} 
        placeholder="Company name"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerPhone">Phone *</Label>
      <Input 
        id="sellerPhone"
        value={formData.phone} 
        onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} 
        placeholder="+91 98765 43210"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerGst">GST Number</Label>
      <Input 
        id="sellerGst"
        value={formData.gst} 
        onChange={e => setFormData(f => ({ ...f, gst: e.target.value }))} 
        placeholder="27AABCU9603R1ZM"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerAddress">Address *</Label>
      <Input 
        id="sellerAddress"
        value={formData.address} 
        onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} 
        placeholder="City, State"
      />
    </div>



     <div className="space-y-2">
      <Label htmlFor="sellerAddress">Pincode *</Label>
      <Input 
        id="sellerAddress"
        value={formData.pincode} 
        onChange={e => setFormData(f => ({ ...f, pincode: e.target.value }))} 
        placeholder="pincode"
      />
    </div>
     <div className="space-y-2">
      <Label htmlFor="sellerAddress">City *</Label>
      <Input 
        id="sellerAddress"
        value={formData.city} 
        onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} 
        placeholder="city"
      />
    </div>
     <div className="space-y-2">
      <Label htmlFor="sellerAddress">State *</Label>
      <Input 
        id="sellerAddress"
        value={formData.state} 
        onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} 
        placeholder="state"
      />
    </div>



    <div className="space-y-2">
      <Label htmlFor="sellerStatus">Status</Label>
      <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v as SellerStatus }))}>
        <SelectTrigger id="sellerStatus">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerKyc">KYC Status</Label>
      <Select value={formData.kycStatus} onValueChange={v => setFormData(f => ({ ...f, kycStatus: v as KycStatus }))}>
        <SelectTrigger id="sellerKyc">
          <SelectValue placeholder="Select KYC status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="sellerRisk">Risk Category</Label>
      <Select value={formData.riskCategory} onValueChange={v => setFormData(f => ({ ...f, riskCategory: v as RiskCategory }))}>
        <SelectTrigger id="sellerRisk">
          <SelectValue placeholder="Select risk category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    </div>




     <div className="space-y-2">
      <Label htmlFor="sellerRisk">Role</Label>
      <Select value={formData.roleId} onValueChange={v => setFormData(f => ({ ...f, roleId: v as RiskCategory }))}>
        <SelectTrigger id="role">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>

          {(roles || []).map((val) => (
            <SelectItem key={String(val.id)} value={String(val.id)}>{val.name}</SelectItem>
          ))}
         
        </SelectContent>
      </Select>
    </div>



    <div className="space-y-2">
      <Label htmlFor="sellerSubscription">Subscription Plan</Label>
      <Select value={formData.subscription} onValueChange={v => setFormData(f => ({ ...f, subscription: v }))}>
        <SelectTrigger id="sellerSubscription">
          <SelectValue placeholder="Select plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Trial">Trial</SelectItem>
          <SelectItem value="Starter">Starter</SelectItem>
          <SelectItem value="Growth">Growth</SelectItem>
          <SelectItem value="Enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>
    </div>
      <div className="space-y-2">
      <Label htmlFor="password">password *</Label>
      <Input 
        id="password"
        value={formData.password} 
        onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} 
        placeholder="Password"
      />
    </div>
  </div>
);

const SellersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // Dialogs
  const [viewSeller, setViewSeller] = useState<Seller | null>(null);
  const [editSeller, setEditSeller] = useState<Seller | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteSeller, setDeleteSeller] = useState<Seller | null>(null);
  const [walletAction, setWalletAction] = useState<{ seller: Seller; type: "credit" | "debit" } | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [formData, setFormData] = useState<CreateSellerDTO>(emptySeller);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  // Seller id currently being switched into ("Login as Seller")
  const [loginAsId, setLoginAsId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchSellers();
    fetchStats();
  }, [isAdmin, navigate]);

  // Fetch sellers on mount and when filters change
  // (admin gate above)

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (statusFilter !== "all") filters.status = statusFilter;
      if (kycFilter !== "all") filters.kycStatus = kycFilter;
      if (riskFilter !== "all") filters.riskCategory = riskFilter;
      if (search) filters.search = search;

      const data = await sellerApi.getAll(filters);     
      const response = await api.getRoles({
        page: 1,
        limit: 1000,
        search: ""
      });

      setRoles(normalizeRoles(response));
      setSellers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch sellers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await sellerApi.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Apply filters when they change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSellers();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search, statusFilter, kycFilter, riskFilter]);

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.email || !formData.company || !formData.phone || !formData.address) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const newSeller = await sellerApi.create(formData);
      setSellers(prev => [newSeller, ...prev]);
      setCreateOpen(false);
      setFormData(emptySeller);
      fetchStats(); // Refresh stats
      
      toast({ 
        title: "Success", 
        description: "Seller created successfully" 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create seller",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editSeller) return;
    
    try {
      const updated = await sellerApi.update(editSeller.id, formData);
      setSellers(prev => prev.map(s => s.id === editSeller.id ? updated : s));
      setEditSeller(null);
      
      toast({ 
        title: "Success", 
        description: "Seller updated successfully" 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update seller",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteSeller) return;
    
    try {
      await sellerApi.delete(deleteSeller.id);
      setSellers(prev => prev.filter(s => s.id !== deleteSeller.id));
      setDeleteSeller(null);
      fetchStats(); // Refresh stats
      
      toast({ 
        title: "Success", 
        description: "Seller deleted successfully" 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete seller",
        variant: "destructive",
      });
    }
  };

  const handleStatusToggle = async (id: string) => {
    const seller = sellers.find(s => s.id === id);
    if (!seller) return;

    const newStatus = seller.status === "active" ? "blocked" : "active";
    
    try {
      const updated = await sellerApi.updateStatus(id, newStatus);
      setSellers(prev => prev.map(s => s.id === id ? updated : s));
      
      toast({ 
        title: "Success", 
        description: `Seller ${newStatus === "active" ? "activated" : "blocked"} successfully` 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await sellerApi.approve(id);
      setSellers(prev => prev.map(s => s.id === id ? updated : s));
      
      toast({ 
        title: "Success", 
        description: "Seller approved successfully" 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to approve seller",
        variant: "destructive",
      });
    }
  };

  /**
   * "Login as Seller" — switch the current admin session into this seller
   * account. The admin session is stashed and restored from the banner.
   */
  const handleLoginAs = async (seller: Seller) => {
    const label = seller.company || seller.name;
    const confirmed = window.confirm(
      `Login as "${label}"?\n\nYou will be viewing the panel exactly as this seller sees it. ` +
        `Use the "Back to Admin" button in the top banner to return.`
    );
    if (!confirmed) return;

    try {
      setLoginAsId(String(seller.id));
      const response = await api.impersonate(seller.id);

      if (response?.success && response?.data?.token) {
        const started = startImpersonation(response.data.token, response.data.user);
        if (!started) {
          toast({
            title: "Could not switch account",
            description: "Failed to save your admin session. Please try again.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Account switched",
          description: `You are now logged in as ${response.data.user?.name || label}`,
        });
        // Full reload so AuthContext picks up the seller session + permissions
        window.location.href = "/dashboard";
        return;
      }

      toast({
        title: "Access denied",
        description: response?.error || "Could not access this seller account",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Access denied",
        description: error?.response?.data?.error || error?.message || "Could not access this seller account",
        variant: "destructive",
      });
    } finally {
      setLoginAsId(null);
    }
  };

  const handleWalletAction = async () => {
    if (!walletAction || !walletAmount) return;
    
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = await sellerApi.updateWallet(walletAction.seller.id, {
        amount,
        type: walletAction.type
      });
      
      setSellers(prev => prev.map(s => s.id === walletAction.seller.id ? updated : s));
      setWalletAction(null);
      setWalletAmount("");
      
      toast({ 
        title: "Success", 
        description: `₹${amount} ${walletAction.type}ed successfully` 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update wallet",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    fetchSellers();
    fetchStats();
    toast({ title: "Refreshed", description: "Data has been refreshed" });
  };

  const handleExport = () => {
    sellerApi.export(sellers);
    toast({ title: "Exported", description: "Sellers data exported to CSV" });
  };

  const openEdit = (seller: Seller) => {
    setFormData({
      name: seller.name,
      email: seller.email,
      company: seller.company,
      phone: seller.phone,
      gst: seller.gst,
      roleId: seller.roleId,
      password: seller.password,
      pincode: seller.pincode,
      city: seller.city,
      state: seller.state,




      address: seller.address,
      status: seller.status,
      kycStatus: seller.kycStatus,
      riskCategory: seller.riskCategory,
      subscription: seller.subscription
    });
    setEditSeller(seller);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setKycFilter("all");
    setRiskFilter("all");
  };

  return (
    <DashboardLayout title="Seller Management" subtitle="Approve, monitor, and manage sellers">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Active Sellers" 
            value={statsLoading ? "..." : String(stats?.active || 0)} 
            icon={<Users className="h-5 w-5" />} 
            variant="accent" 
          />
          <StatCard 
            title="KYC Verified" 
            value={statsLoading ? "..." : String(stats?.kyc?.verified || 0)} 
            icon={<ShieldCheck className="h-5 w-5" />} 
            variant="success" 
          />
          <StatCard 
            title="Pending Approval" 
            value={statsLoading ? "..." : String(stats?.pending || 0)} 
            icon={<AlertTriangle className="h-5 w-5" />} 
            variant="warning" 
          />
          <StatCard 
            title="High Risk" 
            value={statsLoading ? "..." : String(stats?.risk?.high || 0)} 
            icon={<Tag className="h-5 w-5" />} 
            variant="warning" 
          />
        </div>

      
        {/* Search and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search sellers..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-10" 
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-32">
                <ShieldCheck className="h-4 w-4 mr-2" />
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-32">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || kycFilter !== "all" || riskFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            
            <Button onClick={() => { setFormData(emptySeller); setCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Seller
            </Button>
          </div>
        </div>

        {/* Sellers Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Seller", "Company", "Status", "KYC", "Risk", "Score", "RTO %", "Wallet", "Plan", "Actions"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading sellers...
                        </div>
                      </td>
                    </tr>
                  ) : sellers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No sellers found
                      </td>
                    </tr>
                  ) : (
                    sellers.map(seller => {
                      const sellerStatus: SellerStatus = seller.status;
                      return (
                      <tr key={seller.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-foreground">{seller.name}</p>
                          <p className="text-xs text-muted-foreground">{seller.email}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{seller.company}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[seller.status]}`}>
                            {seller.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${kycStyles[seller.kycStatus]}`}>
                            {seller.kycStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs capitalize ${riskStyles[seller.riskCategory]}`}>
                            {seller.riskCategory}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Progress value={seller.performanceScore} className="h-2 w-12" />
                            <span className={`text-xs font-bold ${
                              seller.performanceScore >= 80 ? "text-green-600" : 
                              seller.performanceScore >= 50 ? "text-yellow-600" : 
                              "text-red-600"
                            }`}>
                              {seller.performanceScore}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-xs font-medium ${
                          seller.rtoRate > 10 ? "text-red-600" : "text-muted-foreground"
                        }`}>
                          {seller.rtoRate}%
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">
                          ₹{seller.walletBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{seller.subscription}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => setViewSeller(seller)}
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {isAdminUser() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-teal-600 hover:text-teal-700"
                                onClick={() => handleLoginAs(seller)}
                                disabled={loginAsId === String(seller.id)}
                                title="Login as this seller"
                              >
                                {loginAsId === String(seller.id) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <LogIn className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => openEdit(seller)}
                              title="Edit Seller"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            
                            {/* <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => setWalletAction({ seller, type: "credit" })}
                              title="Update Wallet"
                            >
                              <Wallet className="h-3.5 w-3.5 text-green-600" />
                            </Button> */}
                            
                            {sellerStatus === "pending" ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600" 
                                onClick={() => handleApprove(seller.id)}
                                title="Approve Seller"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                             sellerStatus !== "active" && <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => handleStatusToggle(seller.id)}
                                title="Activate Seller"
                              >
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600" 
                              onClick={() => setDeleteSeller(seller)}
                              title="Delete Seller"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Seller Dialog */}
      <Dialog open={!!viewSeller} onOpenChange={(open) => !open && setViewSeller(null)}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">{viewSeller?.company}</DialogTitle>
            <DialogDescription>Seller details & performance metrics</DialogDescription>
          </DialogHeader>
          {viewSeller && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{viewSeller.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{viewSeller.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{viewSeller.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">GST</p>
                  <p className="font-medium font-mono text-foreground">{viewSeller.gst || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusStyles[viewSeller.status]}>{viewSeller.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">KYC</p>
                  <Badge className={kycStyles[viewSeller.kycStatus]}>{viewSeller.kycStatus}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Category</p>
                  <Badge className={riskStyles[viewSeller.riskCategory]}>{viewSeller.riskCategory}</Badge>
                </div>


                
                <div>
                  <p className="text-muted-foreground">Subscription</p>
                  <Badge variant="outline">{viewSeller.subscription}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined Date</p>
                  <p className="font-medium">{new Date(viewSeller.joinedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{viewSeller.address}</p>
                </div>
                   <div>
                  <p className="text-muted-foreground">Pincode</p>
                  <p className="font-medium">{viewSeller.pincode}</p>
                </div>
                 <div>
                  <p className="text-muted-foreground">City</p>
                  <p className="font-medium">{viewSeller.city}</p>
                </div>

                 <div>
                  <p className="text-muted-foreground">State</p>
                  <p className="font-medium">{viewSeller.state}</p>
                </div>

              </div>
              
              <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-foreground">{viewSeller.performanceScore}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-foreground">{viewSeller.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-red-600">{viewSeller.rtoRate}%</p>
                  <p className="text-xs text-muted-foreground">RTO</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-foreground">₹{(viewSeller.walletBalance / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground">Wallet</p>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-foreground">{viewSeller.revenue}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Seller Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Seller</DialogTitle>
            <DialogDescription>Enter seller information. Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <FormFields formData={formData} setFormData={setFormData} roles={roles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateOpen(false);
              setFormData(emptySeller);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Add Seller</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Seller Dialog */}
      <Dialog open={!!editSeller} onOpenChange={(open) => !open && setEditSeller(null)}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Seller — {editSeller?.company}</DialogTitle>
            <DialogDescription>Update seller information</DialogDescription>
          </DialogHeader>
          <FormFields formData={formData} setFormData={setFormData} roles={roles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSeller(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSeller} onOpenChange={(open) => !open && setDeleteSeller(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Seller</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleteSeller?.company}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSeller(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Action Dialog */}
      <Dialog open={!!walletAction} onOpenChange={(open) => !open && setWalletAction(null)}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {walletAction?.type === "credit" ? "Credit" : "Debit"} Wallet
            </DialogTitle>
            <DialogDescription>
              {walletAction?.seller.company} - Current Balance: ₹{walletAction?.seller.walletBalance.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="walletAmount">Amount (₹)</Label>
              <Input 
                id="walletAmount"
                type="number" 
                value={walletAmount} 
                onChange={e => setWalletAmount(e.target.value)} 
                placeholder="Enter amount"
                min="1"
                step="1"
                autoComplete="off"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setWalletAction(w => w ? { ...w, type: "credit" } : null)} 
                className={`flex-1 ${walletAction?.type === "credit" ? "border-green-600 text-green-600 bg-green-50 dark:bg-green-950/20" : ""}`}
              >
                Credit
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setWalletAction(w => w ? { ...w, type: "debit" } : null)} 
                className={`flex-1 ${walletAction?.type === "debit" ? "border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20" : ""}`}
              >
                Debit
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setWalletAction(null);
              setWalletAmount("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleWalletAction} 
              disabled={!walletAmount || parseFloat(walletAmount) <= 0}
              variant={walletAction?.type === "credit" ? "default" : "destructive"}
            >
              {walletAction?.type === "credit" ? "Credit" : "Debit"} Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SellersPage;