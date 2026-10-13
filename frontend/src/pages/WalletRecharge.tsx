// import { useState, useEffect } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
// import { 
//   Search, CheckCircle, XCircle, Eye, Users, ShieldCheck, AlertTriangle, 
//   Plus, Edit, Trash2, Wallet, Tag, Download, RefreshCw, Filter, Loader2 ,X
// } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
// import api from "../../services/api" 
// import {getuser} from "../../services/getbasicdata"






// interface Seller {
//   id: string;
//   name: string;
//   email: string;
//   company: string;
//   phone: string;
//   gst: string;
//   roleId: string;
//   password: string;


//   status: "active" | "blocked" | "pending";
//   kycStatus: "verified" | "pending" | "rejected";
//   totalOrders: number;
//   revenue: string;
//   joinedAt: string;
//   address: string;
//   pincode: string;
//   city: string;
//   state: string;


//   walletBalance: number;
//   performanceScore: number;
//   rtoRate: number;
//   riskCategory: "low" | "medium" | "high";
//   subscription: string;
// }

// type SellerStatus = "active" | "blocked" | "pending";
// type KycStatus = "verified" | "pending" | "rejected";
// type RiskCategory = "low" | "medium" | "high";

// const statusStyles = {
//   active: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
//   blocked: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
//   pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
// };

// const kycStyles = {
//   verified: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
//   pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
//   rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
// };

// const riskStyles = {
//   low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
//   medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
//   high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
// };

// const emptySeller: CreateSellerDTO = {
//   transid: "",
//   amount: "",
//   user_id:getuser()?.id

// };
// let rolelist=[]

// // Form Fields Component with proper focus handling
// const FormFields = ({ formData, setFormData }: { 
//   formData: CreateSellerDTO;
//   setFormData: React.Dispatch<React.SetStateAction<CreateSellerDTO>>;
// }) => (
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
//     <div className="space-y-2">
//       <Label htmlFor="sellerName">UPI Transaction ID</Label>
//       <Input 
//         id="sellerName"
//         value={formData.transid} 
//         onChange={e => setFormData(f => ({ ...f, transid: e.target.value }))} 
//         placeholder="Enter UPI transaction ID"
//         autoComplete="off"
//       />
//     </div>
//     <div className="space-y-2">
//       <Label htmlFor="sellerEmail">Amount *</Label>
//       <Input 
//         id="sellerEmail"
//         type="number"
//         value={formData.amount} 
//         onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))} 
//         placeholder="Enter amount"
//       />
//     </div>


//   </div>
// );

// const WalletRecharge = () => {
//   const { toast } = useToast();
//   const [sellers, setSellers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [kycFilter, setKycFilter] = useState<string>("all");
//   const [riskFilter, setRiskFilter] = useState<string>("all");

//   // Dialogs
//   const [viewSeller, setViewSeller] = useState<Seller | null>(null);
//   const [editSeller, setEditSeller] = useState<Seller | null>(null);
//   const [createOpen, setCreateOpen] = useState(false);
//   const [deleteSeller, setDeleteSeller] = useState<Seller | null>(null);
//   const [walletAction, setWalletAction] = useState<{ seller: Seller; type: "credit" | "debit" } | null>(null);
//   const [walletAmount, setWalletAmount] = useState("");
//   const [formData, setFormData] = useState<CreateSellerDTO>(emptySeller);
//   const [stats, setStats] = useState<any>(null);
//   const [statsLoading, setStatsLoading] = useState(true);

//   // Fetch sellers on mount and when filters change
//   useEffect(() => {
//     fetchSellers();
//     fetchStats();
//   }, []);

//   const fetchSellers = async () => {
//     try {
//       setLoading(true);
//       const data = await fetch(getuser()?.role=="admin"?"https://app.logixmitra.com/api/api/wallets":"https://app.logixmitra.com/api/api/wallets/users/"+getuser()?.id, {
//         method: "GET",
//         headers: {  "Content-Type": "application/json" }
//       }).then(res => res.json());     
//       console.log(data,"datadatadata")
    
//       setSellers(data);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to fetch sellers",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchStats = async () => {
//     try {
//       setStatsLoading(true);
//       const data = await sellerApi.getStats();
//       setStats(data);
//     } catch (error) {
//       console.error("Failed to fetch stats:", error);
//     } finally {
//       setStatsLoading(false);
//     }
//   };


//   // Apply filters when they change
//   useEffect(() => {
//     const debounceTimer = setTimeout(() => {
//       fetchSellers();
//     }, 500);

//     return () => clearTimeout(debounceTimer);
//   }, [search, statusFilter, kycFilter, riskFilter]);

//   const handleCreate = async () => {
//     try {
//       if (!formData.transid || !formData.amount) {
//         toast({
//           title: "Validation Error",
//           description: "Please fill in all required fields",
//           variant: "destructive",
//         });
//         return;
//       }

//       const newSeller = await fetch("https://app.logixmitra.com/api/api/wallets/create", {
//         method: "POST",
//         headers: {  "Content-Type": "application/json" },
//         body: JSON.stringify(formData)
//       }).then(res => res.json());

//       if (!newSeller) {
//         toast({
//           title: "Error",
//           description: "Failed to add balance. Please try again.",
//           variant: "destructive",
//         });
//         return;
//       }
//       ;

//     //   setSellers(prev => [newSeller, ...prev]);
//       setCreateOpen(false);
//       setFormData(emptySeller);
// fetchSellers()
      
//       toast({ 
//         title: "Success", 
//         description: "Balance added successfully" 
//       });
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.error || "Failed to create seller",
//         variant: "destructive",
//       });
//     }
//   };



//   const updateStatus = async (id,status) => {
//     try {
//       const updated = await fetch("https://app.logixmitra.com/api/api/wallets/status/" + id, {
//         method: "PUT",
//         headers: {  "Content-Type": "application/json" },
//         body: JSON.stringify({ status })
//       }).then(res => res.json());
    

//         toast({
//         title: "Success",
//         description: "Status updated successfully",
//       });
//         fetchSellers();
//     } catch (error: any) {
//       toast({
//         title: "Error",     
//          description: error.response?.data?.error || "Failed to update status",
//         variant: "destructive",
//         });
//     }
//     };

//     function formatDateDDMMYYYY(dateStr) {
//   const date = new Date(dateStr);

//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const year = date.getFullYear();

//   return `${day}-${month}-${year}`;
// }

//   return (
//     <DashboardLayout title="Wallet Recharge" subtitle="Recharge seller wallets">

    

// <div className="">
//         {/* Search and Actions */}
//         <div className="flex items-center justify-between flex-wrap gap-4">
//           <div className="flex items-center gap-3 flex-wrap">
         
          
//           <div className="flex items-center gap-2">
         
            
//             <Button onClick={() => { setFormData(emptySeller); setCreateOpen(true); }} className="gap-2">
//               <Plus className="h-4 w-4" /> Add Balance
//             </Button>
//           </div>
//         </div>
//         </div>

//         {/* Sellers Table */}
//         <Card className="shadow-card">
//           <CardContent className="p-0">
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead>
//                   <tr className="border-b border-border">
//                     {["Seller Name", "Transaction ID", "Amount","Date", "Status"].map(h => (
//                       <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
//                     ))}
//                     {
//                         getuser()?.role=="admin" && <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
//                     }
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {loading ? (
//                     <tr>
//                       <td colSpan={10} className="py-8 text-center text-muted-foreground">
//                         <div className="flex items-center justify-center gap-2">
//                           <Loader2 className="h-4 w-4 animate-spin" />
//                           Loading sellers...
//                         </div>
//                       </td>
//                     </tr>
//                   ) : sellers.length === 0 ? (
//                     <tr>
//                       <td colSpan={10} className="py-8 text-center text-muted-foreground">
//                         No sellers found
//                       </td>
//                     </tr>
//                   ) : (
//                     sellers?.map(seller => (
//                       (seller.status=="Approved" ||  seller.status=="Rejected" ||  seller.status=="draft") &&
//                       <tr key={seller.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
//                         <td className="py-3 px-4">
//                           <p className="text-sm font-medium text-foreground">{seller.user?.name}</p>
//                         </td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{seller.transid}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{seller.amount}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{formatDateDDMMYYYY(seller.createdAt)}</td>

                        

//                         <td className="py-3 px-4">
//                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[seller.status]}`}>
//                             {seller.status}
//                           </span>
//                         </td>



                        
//                         <td className="py-3 px-4">
                         
//                          {getuser()?.role=="admin" && seller.status == "draft" && (
//                          <div className="flex items-center gap-1">
                          
//                             <Button 
//                               variant="ghost" 
//                               size="icon" 
//                               className="h-8 w-8" 
//                               onClick={() =>{
//                                        if (confirm("Are you sure you want to reject this transaction?") == true) {
// updateStatus(seller.id,"rejected")
//   } else {
//   }
//                               }}
//                               title="Reject Transaction"
//                             >
//                               <X className="h-3.5 w-3.5" />
//                             </Button>
                         
                            
        
//                               <Button 
//                                 variant="ghost" 
//                                 size="icon" 
//                                 className="h-8 w-8 text-green-600" 
//                                 onClick={() =>{
//                                         if (confirm("Are you sure you want to approve this transaction?") == true) {

// updateStatus(seller.id,"Approved")


//   } else {
//   }
//                                 }}
//                                 title="Approve Transaction"
//                               >
//                                 <CheckCircle className="h-3.5 w-3.5" />
//                               </Button>

                            
                         
//                           </div>
//                         )}




//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* View Seller Dialog */}
//       <Dialog open={!!viewSeller} onOpenChange={(open) => !open && setViewSeller(null)}>
//         <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
//           <DialogHeader>
//             <DialogTitle className="text-foreground">{viewSeller?.company}</DialogTitle>
//             <DialogDescription>Seller details & performance metrics</DialogDescription>
//           </DialogHeader>
//           {viewSeller && (
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-4 text-sm">
//                 <div>
//                   <p className="text-muted-foreground">Name</p>
//                   <p className="font-medium text-foreground">{viewSeller.name}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Email</p>
//                   <p className="font-medium text-foreground">{viewSeller.email}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Phone</p>
//                   <p className="font-medium text-foreground">{viewSeller.phone}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">GST</p>
//                   <p className="font-medium font-mono text-foreground">{viewSeller.gst || '-'}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Status</p>
//                   <Badge className={statusStyles[viewSeller.status]}>{viewSeller.status}</Badge>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">KYC</p>
//                   <Badge className={kycStyles[viewSeller.kycStatus]}>{viewSeller.kycStatus}</Badge>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Risk Category</p>
//                   <Badge className={riskStyles[viewSeller.riskCategory]}>{viewSeller.riskCategory}</Badge>
//                 </div>


                
//                 <div>
//                   <p className="text-muted-foreground">Subscription</p>
//                   <Badge variant="outline">{viewSeller.subscription}</Badge>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Joined Date</p>
//                   <p className="font-medium">{new Date(viewSeller.joinedAt).toLocaleDateString()}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Address</p>
//                   <p className="font-medium">{viewSeller.address}</p>
//                 </div>
//                    <div>
//                   <p className="text-muted-foreground">Pincode</p>
//                   <p className="font-medium">{viewSeller.pincode}</p>
//                 </div>
//                  <div>
//                   <p className="text-muted-foreground">City</p>
//                   <p className="font-medium">{viewSeller.city}</p>
//                 </div>

//                  <div>
//                   <p className="text-muted-foreground">State</p>
//                   <p className="font-medium">{viewSeller.state}</p>
//                 </div>

//               </div>
              
//               <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border">
//                 <div className="text-center p-2 rounded-lg bg-muted/50">
//                   <p className="text-lg font-bold text-foreground">{viewSeller.performanceScore}</p>
//                   <p className="text-xs text-muted-foreground">Score</p>
//                 </div>
//                 <div className="text-center p-2 rounded-lg bg-muted/50">
//                   <p className="text-lg font-bold text-foreground">{viewSeller.totalOrders}</p>
//                   <p className="text-xs text-muted-foreground">Orders</p>
//                 </div>
//                 <div className="text-center p-2 rounded-lg bg-muted/50">
//                   <p className="text-lg font-bold text-red-600">{viewSeller.rtoRate}%</p>
//                   <p className="text-xs text-muted-foreground">RTO</p>
//                 </div>
//                 <div className="text-center p-2 rounded-lg bg-muted/50">
//                   <p className="text-lg font-bold text-foreground">₹{(viewSeller.walletBalance / 1000).toFixed(1)}K</p>
//                   <p className="text-xs text-muted-foreground">Wallet</p>
//                 </div>
//               </div>

//               <div className="bg-muted/30 p-3 rounded-lg">
//                 <p className="text-sm text-muted-foreground">Revenue</p>
//                 <p className="text-xl font-bold text-foreground">{viewSeller.revenue}</p>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Create Seller Dialog */}
//       <Dialog open={createOpen} onOpenChange={setCreateOpen}>
//         <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
//           <DialogHeader>
//             <DialogTitle className="text-foreground">Add Balance</DialogTitle>
//             <DialogDescription>Fields marked with * are required.</DialogDescription>
//           </DialogHeader>
//           <FormFields formData={formData} setFormData={setFormData} />
//           <DialogFooter>
//             <Button variant="outline" onClick={() => {
//               setCreateOpen(false);
//               setFormData(emptySeller);
//             }}>
//               Cancel
//             </Button>
//             <Button onClick={handleCreate}>Add Balance</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

    

//     </DashboardLayout>
//   );
// };

// export default WalletRecharge;


import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, CheckCircle, XCircle, Eye, Users, ShieldCheck, AlertTriangle, 
  Plus, Edit, Trash2, Wallet, Tag, Download, RefreshCw, Filter, Loader2, X,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
import { getuser } from "../../services/getbasicdata";
import { API_BASE_URL } from "../../services/config";
import qrcode from "../../public/assets/qrcode.jpeg"

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

const emptySeller: CreateSellerDTO = {
  transid: "",
  amount: "",
  user_id: getuser()?.id
};

function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const MIN_RECHARGE = 100;
const QUICK_AMOUNTS = [100, 300, 500, 1000];

// Form Fields Component
const FormFields = ({ formData, setFormData, showSubmitErrors }: {
  formData: CreateSellerDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateSellerDTO>>;
  showSubmitErrors: boolean;
}) => {
  const amountValue = String(formData.amount ?? "").trim();
  const amountNum = Number(amountValue);
  const amountInvalid = amountValue !== "" && (!Number.isFinite(amountNum) || amountNum < MIN_RECHARGE);
  const showAmountError = amountInvalid || (showSubmitErrors && (amountValue === "" || !Number.isFinite(amountNum) || amountNum < MIN_RECHARGE));
  const txnMissing = showSubmitErrors && !String(formData.transid ?? "").trim();

  return (
    <div className="grid grid-cols-1 gap-4" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Label htmlFor="sellerEmail">Amount (₹) *</Label>
        <Input 
          id="sellerEmail"
          type="number"
          min={MIN_RECHARGE}
          value={formData.amount} 
          onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))} 
          placeholder={`Enter recharge amount (min ₹${MIN_RECHARGE})`}
          className={showAmountError ? "border-rose-500 focus-visible:ring-rose-500" : ""}
        />
        {/* Quick-select boxes so the amount can be picked instead of typed */}
        <div className="flex flex-wrap gap-2 pt-1">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setFormData(f => ({ ...f, amount: String(amt) }))}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                amountValue !== "" && Number.isFinite(amountNum) && amountNum === amt
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700"
              }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>
        {showAmountError ? (
          <p className="text-xs font-medium text-rose-600">
            {amountValue === ""
              ? `Amount is required — minimum add ₹${MIN_RECHARGE}.`
              : `Minimum add ₹${MIN_RECHARGE} — please enter ₹${MIN_RECHARGE} or more.`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Minimum ₹{MIN_RECHARGE} — pick a quick amount below or type your own. No maximum limit.
          </p>
        )}
      </div>
    <p className="text-xs text-muted-foreground">
      Pay securely with Cashfree (UPI QR / Card / NetBanking). Checkout opens on Cashfree so the QR can be scanned. Optional: submit UPI Transaction ID below for manual approval.
    </p>
    <div className="space-y-2">
      <Label htmlFor="sellerName">UPI Transaction ID (manual)</Label>
      <Input 
        id="sellerName"
        value={formData.transid} 
        onChange={e => setFormData(f => ({ ...f, transid: e.target.value }))} 
        placeholder="Only for manual UPI QR recharge"
        autoComplete="off"
        className={txnMissing ? "border-rose-500 focus-visible:ring-rose-500" : ""}
      />
      {txnMissing && (
        <p className="text-xs font-medium text-rose-600">
          UPI Transaction ID is required for manual submit.
        </p>
      )}
    </div>
  </div>
  );
};

const WalletRecharge = () => {
  const { toast } = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Dialogs
  const [viewSeller, setViewSeller] = useState<Seller | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [QrOpen, setQrOpen] = useState(false);

  const [formData, setFormData] = useState<CreateSellerDTO>(emptySeller);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  // Turns field-level red borders on after a submit attempt (Submit UPI Manual / Pay with Cashfree).
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);

  // Fetch sellers on mount and when pagination changes
  useEffect(() => {
    fetchSellers();
    fetchStats();
  }, [currentPage, itemsPerPage]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const isAdmin = getuser()?.role == "admin";
      
      // Fetch all data first (since API might not support pagination)
      const url = isAdmin 
        ? `${API_BASE_URL}/wallets?paginate=true&page=${currentPage}&limit=${itemsPerPage}`
        : `${API_BASE_URL}/wallets/users/${getuser()?.id}?paginate=true&page=${currentPage}&limit=${itemsPerPage}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }
      }).then(res => res.json());
      
      console.log("Full API Response:", response);
      console.log("Response type:", Array.isArray(response) ? "Array" : typeof response);
      
      let allSellers = [];
      
      // Handle different response formats
      if (Array.isArray(response)) {
        allSellers = response;
      } else if (response.data && Array.isArray(response.data)) {
        allSellers = response.data;
      } else if (response.wallets && Array.isArray(response.wallets)) {
        allSellers = response.wallets;
      } else {
        allSellers = [];
      }
      
      console.log("All sellers before filter:", allSellers.length);
      console.log("Sample seller:", allSellers[0]);
      
      // REMOVE the status filter condition - show ALL transactions
      // The old condition was: (seller.status=="Approved" || seller.status=="Rejected" || seller.status=="draft")
      // This was filtering out many records
      
      // Sort by createdAt in descending order (newest first)
      const sortedSellers = [...allSellers].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log("Sorted sellers count:", sortedSellers.length);
      
      // Apply search filter
      let filteredSellers = sortedSellers;


      filteredSellers = filteredSellers.filter(seller => 
        (seller.status?.toLowerCase() === "approved" || seller.status?.toLowerCase() === "rejected" || seller.status?.toLowerCase() === "draft" || seller.status?.toLowerCase() === "pending_payment")
      );
      if (search) {
        filteredSellers = filteredSellers.filter(seller => 
          (seller.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          seller.transid?.toLowerCase().includes(search.toLowerCase()) ||
          seller.amount?.toString().includes(search)) 
        );
      }
      
      // Apply status filter (if not "all"). Prefix match so "Pending" also
      // catches Cashfree top-ups whose raw status is "pending_payment".
      if (statusFilter !== "all") {
        filteredSellers = filteredSellers.filter(seller => 
          seller.status?.toLowerCase().startsWith(statusFilter.toLowerCase())
        );
      }
      
      // console.log("Filtered sellers count:", filteredSellers.length);
      
      setTotalItems(filteredSellers.length);
      
      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedSellers = filteredSellers.slice(startIndex, startIndex + itemsPerPage);
      setSellers(paginatedSellers);
      
    } catch (error) {
      console.error("Error fetching sellers:", error);
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
    setCurrentPage(1); // Reset to first page when filters change
    const debounceTimer = setTimeout(() => {
      fetchSellers();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search, statusFilter]);

  const handleCreate = async () => {
    try {
      const amountNum = Number(formData.amount);
      const amountBad = !formData.amount || !Number.isFinite(amountNum) || amountNum < MIN_RECHARGE;
      if (!formData.transid || amountBad) {
        setShowSubmitErrors(true);
        const missing: string[] = [];
        if (amountBad) missing.push(`amount (minimum ₹${MIN_RECHARGE})`);
        if (!formData.transid) missing.push("UPI Transaction ID");
        toast({
          title: "Please check the highlighted fields",
          description: `Manual submit needs ${missing.join(" and ")}.`,
          variant: "destructive",
        });
        return;
      }

      setShowSubmitErrors(false);

      const newSeller = await fetch(`${API_BASE_URL}/wallets/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(formData)
      }).then(res => res.json());

      if (!newSeller) {
        toast({
          title: "Error",
          description: "Failed to add balance. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCreateOpen(false);
      setFormData(emptySeller);
      setShowSubmitErrors(false);
      fetchSellers();
      
      toast({ 
        title: "Success", 
        description: "Balance added successfully" 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create seller",
        variant: "destructive",
      });
    }
  };

  const verifyCashfreePayment = async (orderId: string, walletId?: number) => {
    const verifyRes = await fetch(`${API_BASE_URL}/wallets/cashfree/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        order_id: orderId,
        walletId,
        user_id: getuser()?.id
      })
    }).then(res => res.json());

    if (verifyRes?.success) {
      toast({
        title: "Success",
        description: "Wallet recharged successfully via Cashfree"
      });
      setCreateOpen(false);
      setFormData(emptySeller);
      fetchSellers();
      return true;
    }

    // Cashfree hasn't confirmed the payment yet (e.g. UPI still processing).
    // The wallet entry stays "pending_payment" → shows Pending in the
    // passbook and is credited automatically once the webhook/verify succeeds.
    const notCompletedYet = /not completed/i.test(String(verifyRes?.message || ""));
    toast({
      title: notCompletedYet ? "Payment pending" : "Verification failed",
      description: notCompletedYet
        ? "Cashfree has not confirmed this payment yet. The entry stays Pending and will be credited automatically once the payment succeeds."
        : verifyRes?.message || "Payment could not be verified",
      variant: notCompletedYet ? "default" : "destructive",
    });
    return false;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get("order_id");
    // Only act when Cashfree actually redirected back with an order_id.
    if (!rawParam) return;

    let saved: { orderId?: string; walletId?: number } = {};
    try {
      saved = JSON.parse(sessionStorage.getItem("cashfree_recharge") || "{}");
    } catch {
      saved = {};
    }

    // Cashfree should substitute {order_id}. If it didn't (param still holds
    // the literal placeholder), fall back to the id saved before checkout so
    // verification still runs instead of silently doing nothing.
    let orderId = rawParam;
    if (orderId.includes("{") || orderId.includes("}")) {
      orderId = saved.orderId || "";
    }
    if (!orderId) return;

    const walletId = saved.orderId === orderId ? saved.walletId : undefined;

    verifyCashfreePayment(orderId, walletId).finally(() => {
      sessionStorage.removeItem("cashfree_recharge");
      window.history.replaceState({}, "", window.location.pathname);
    });
    // Run once when Cashfree redirects back with order_id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCashfreePay = async () => {
    try {
      if (!formData.amount || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) < MIN_RECHARGE) {
        setShowSubmitErrors(true);
        toast({
          title: "Please check the highlighted fields",
          description: `Amount is required — minimum add ₹${MIN_RECHARGE}.`,
          variant: "destructive",
        });
        return;
      }

      setShowSubmitErrors(false);

      setPaying(true);
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        toast({
          title: "Error",
          description: "Failed to load Cashfree checkout",
          variant: "destructive",
        });
        return;
      }

      const orderRes = await fetch(`${API_BASE_URL}/wallets/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          user_id: getuser()?.id,
          amount: Number(formData.amount),
          return_url: `${window.location.origin}${window.location.pathname}?order_id={order_id}`
        })
      }).then(res => res.json());

      if (!orderRes?.success || !orderRes?.paymentSessionId) {
        toast({
          title: "Error",
          description: orderRes?.message || "Failed to create payment order",
          variant: "destructive",
        });
        return;
      }

      sessionStorage.setItem(
        "cashfree_recharge",
        JSON.stringify({ orderId: orderRes.orderId, walletId: orderRes.walletId })
      );
      setCreateOpen(false);

      const cashfree = (window as any).Cashfree({
        mode: orderRes.mode === "production" ? "production" : "sandbox"
      });

      // Full-page checkout. Cashfree's modal hides the UPI QR behind a click that does not open inside an iframe.
      const result = await cashfree.checkout({
        paymentSessionId: orderRes.paymentSessionId,
        redirectTarget: "_self"
      });

      if (result?.error) {
        sessionStorage.removeItem("cashfree_recharge");
        toast({
          title: "Payment failed",
          description: result.error?.message || "Payment was not completed",
          variant: "destructive",
        });
        return;
      }

      if (result?.redirect) {
        return;
      }

      await verifyCashfreePayment(orderRes.orderId, orderRes.walletId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Unable to start Cashfree payment",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const updated = await fetch(`${API_BASE_URL}/wallets/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }).then(res => res.json());
    
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Error",     
        description: error.response?.data?.error || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Wallet Recharge" subtitle="Recharge seller wallets">
      <div className="">
        {/* Search and Filters */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or transaction ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-80"
              />
            </div>
            
            {getuser()?.role == "admin" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button onClick={() => { setFormData(emptySeller); setCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Balance
            </Button>
{/* 
            <Button onClick={() => { setQrOpen(true); }} className="gap-2">
               QR Code
            </Button> */}
          </div>
        </div>

        {/* Sellers Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Seller Name", "Transaction ID", "Amount", "Date", "Status"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                    {
                      getuser()?.role == "admin" && <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading transactions...
                        </div>
                      </td>
                    </tr>
                  ) : sellers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    sellers?.map(seller => {
                      // Debug log to see what statuses are coming
                      console.log("Rendering seller:", seller.id, "Status:", seller.status);
                      
                      // Show ALL transactions - removed the restrictive filter
                      return (
                        <tr key={seller.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-foreground">{seller.user?.name || "N/A"}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{seller.transid || "N/A"}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">₹{seller.amount || 0}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{formatDateDDMMYYYY(seller.createdAt)}</td>
                          <td className="py-3 px-4">
                            {/* Cashfree top-ups sit at status "pending_payment"
                                until the gateway confirms — show them as
                                "Pending" (amber), never as a credited amount. */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              seller.status === 'Approved' || seller.status === 'approved' ? 'bg-green-100 text-green-800' :
                              seller.status === 'Rejected' || seller.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              seller.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              seller.status?.toLowerCase().startsWith('pending') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {seller.status?.toLowerCase().startsWith('pending') ? 'Pending' : (seller.status || "Unknown")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getuser()?.role == "admin" && (seller.status?.toLowerCase() == "draft") && (
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to reject this transaction?")) {
                                      updateStatus(seller.id, "Rejected");
                                    }
                                  }}
                                  title="Reject Transaction"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-green-600" 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to approve this transaction?")) {
                                      updateStatus(seller.id, "Approved");
                                    }
                                  }}
                                  title="Approve Transaction"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {endIndex} of {totalItems} entries
                  </span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      
                      if (totalPages <= maxVisible) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        if (currentPage <= 3) {
                          for (let i = 1; i <= 4; i++) pages.push(i);
                          pages.push('...');
                          pages.push(totalPages);
                        } else if (currentPage >= totalPages - 2) {
                          pages.push(1);
                          pages.push('...');
                          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          pages.push('...');
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                          pages.push('...');
                          pages.push(totalPages);
                        }
                      }
                      
                      return pages.map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8"
                            onClick={() => handlePageChange(page as number)}
                          >
                            {page}
                          </Button>
                        )
                      ));
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Transaction Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setFormData(emptySeller);
          setShowSubmitErrors(false);
        }
      }}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Balance</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
            {/* <img src={qrcode} alt="QR Code" className="w-64 h-64" /> */}
          </div>
          <FormFields formData={formData} setFormData={setFormData} showSubmitErrors={showSubmitErrors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateOpen(false);
              setFormData(emptySeller);
              setShowSubmitErrors(false);
            }}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleCreate}>
              Submit UPI Manual
            </Button>
            <Button onClick={handleCashfreePay} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay with Cashfree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={QrOpen} onOpenChange={setQrOpen}> 
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Scan QR Code</DialogTitle>
            <DialogDescription>Scan the QR code to add balance.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <img src={qrcode} alt="QR Code" className="w-64 h-64" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setQrOpen(false);
            }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default WalletRecharge;