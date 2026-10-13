// import { useState ,useEffect} from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Wallet, TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, XCircle, FileText, Plus } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { orderApi } from "../../services/orderApi";
// import { getuser } from "../../services/getbasicdata";
// import { Textarea } from "@/components/ui/textarea";
// import {apiRequest} from "../../src/apiglobal/apiconfig"
// import Select1 from "react-select";








// // Types
// interface Seller {
//   id: string;
//   name: string;
// }

// interface Order {
//   id: string;
//   orderNumber: string;
//   amount: number;
// }

// interface CreateTransactionModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess?: () => void;
// }

















// interface Transaction {
//   id: string; type: "credit" | "debit"; description: string; amount: string; date: string; status: "completed" | "pending" | "failed"; reference: string;
// }
// interface CODRemittance {
//   id: string; seller: string; amount: string; orders: number; dueDate: string; status: "settled" | "pending" | "overdue";
// }
// interface Settlement {
//   id: string; seller: string; amount: string; type: "cod" | "prepaid" | "early_cod"; requestDate: string; status: "pending" | "approved" | "rejected" | "processed"; approvedBy: string;
// }
// interface Invoice {
//   id: string; seller: string; invoiceNo: string; amount: string; gst: string; total: string; date: string; type: "shipping" | "platform_fee" | "settlement";
// }
// interface WalletEntry {
//   id: string; seller: string; balance: string; lastRecharge: string; lastDebit: string; status: "active" | "low" | "empty";
// }











// const mockTransactions: Transaction[] = [
//   // { id: "t1", type: "credit", description: "COD Settlement - BlueDart Batch #892", amount: "₹45,200", date: "2026-02-24", status: "completed", reference: "TXN-892341" },
//   // { id: "t2", type: "debit", description: "Shipping Charge - Order ORD-7821", amount: "₹85", date: "2026-02-24", status: "completed", reference: "TXN-892340" },
//   // { id: "t3", type: "credit", description: "Wallet Recharge - FashionHub", amount: "₹10,000", date: "2026-02-23", status: "completed", reference: "TXN-892339" },
//   // { id: "t4", type: "debit", description: "Weight Dispute Penalty - DTDC", amount: "₹320", date: "2026-02-23", status: "pending", reference: "TXN-892338" },
//   // { id: "t5", type: "credit", description: "COD Settlement - Delhivery Batch #456", amount: "₹32,800", date: "2026-02-22", status: "completed", reference: "TXN-892337" },
//   // { id: "t6", type: "debit", description: "Refund - Order ORD-7813", amount: "₹4,200", date: "2026-02-22", status: "completed", reference: "TXN-892336" },
//   // { id: "t7", type: "credit", description: "COD Settlement - Ecom Express Batch #123", amount: "₹28,500", date: "2026-02-21", status: "completed", reference: "TXN-892335" },
//   // { id: "t8", type: "debit", description: "Platform Fee - January 2026", amount: "₹12,500", date: "2026-02-20", status: "completed", reference: "TXN-892334" },
// ];

// const mockCOD: CODRemittance[] = [
//   // { id: "cod1", seller: "FashionHub", amount: "₹23,450", orders: 18, dueDate: "2026-02-26", status: "pending" },
//   // { id: "cod2", seller: "TechWorld", amount: "₹45,800", orders: 12, dueDate: "2026-02-25", status: "pending" },
//   // { id: "cod3", seller: "HomeDecor", amount: "₹8,900", orders: 7, dueDate: "2026-02-24", status: "overdue" },
//   // { id: "cod4", seller: "GadgetZone", amount: "₹31,200", orders: 9, dueDate: "2026-02-22", status: "settled" },
//   // { id: "cod5", seller: "SportsGear", amount: "₹15,600", orders: 11, dueDate: "2026-02-21", status: "settled" },
//   // { id: "cod6", seller: "OrganicBites", amount: "₹4,300", orders: 5, dueDate: "2026-02-27", status: "pending" },
// ];

// const initialSettlements: Settlement[] = [
//   // { id: "stl1", seller: "FashionHub", amount: "₹23,450", type: "cod", requestDate: "2026-02-24", status: "pending", approvedBy: "-" },
//   // { id: "stl2", seller: "TechWorld", amount: "₹45,800", type: "cod", requestDate: "2026-02-23", status: "pending", approvedBy: "-" },
//   // { id: "stl3", seller: "SportsGear", amount: "₹15,600", type: "prepaid", requestDate: "2026-02-22", status: "approved", approvedBy: "Amit Patel" },
//   // { id: "stl4", seller: "FashionHub", amount: "₹10,000", type: "early_cod", requestDate: "2026-02-21", status: "processed", approvedBy: "Rajesh Kumar" },
//   // { id: "stl5", seller: "HomeDecor", amount: "₹5,000", type: "early_cod", requestDate: "2026-02-20", status: "rejected", approvedBy: "Amit Patel" },
// ];

// const invoices: Invoice[] = [

//   // { id: "inv1", seller: "FashionHub", invoiceNo: "INV-2026-0234", amount: "₹8,500", gst: "₹1,530", total: "₹10,030", date: "2026-02-28", type: "shipping" },

//   // { id: "inv2", seller: "TechWorld", invoiceNo: "INV-2026-0233", amount: "₹12,000", gst: "₹2,160", total: "₹14,160", date: "2026-02-28", type: "platform_fee" },

//   // { id: "inv3", seller: "SportsGear", invoiceNo: "INV-2026-0232", amount: "₹15,600", gst: "₹0", total: "₹15,600", date: "2026-02-27", type: "settlement" },

//   // { id: "inv4", seller: "HomeDecor", invoiceNo: "INV-2026-0231", amount: "₹3,200", gst: "₹576", total: "₹3,776", date: "2026-02-26", type: "shipping" },

// ];

// const wallets: WalletEntry[] = [

//   // { id: "wl1", seller: "FashionHub", balance: "₹24,500", lastRecharge: "2026-02-23", lastDebit: "2026-02-24", status: "active" },
//   // { id: "wl2", seller: "TechWorld", balance: "₹52,300", lastRecharge: "2026-02-20", lastDebit: "2026-02-24", status: "active" },
//   // { id: "wl3", seller: "HomeDecor", balance: "₹1,200", lastRecharge: "2026-02-15", lastDebit: "2026-02-24", status: "low" },
//   // { id: "wl4", seller: "GadgetZone", balance: "₹0", lastRecharge: "2026-01-10", lastDebit: "2026-02-22", status: "empty" },
//   // { id: "wl5", seller: "SportsGear", balance: "₹18,900", lastRecharge: "2026-02-22", lastDebit: "2026-02-24", status: "active" },
//   // { id: "wl6", seller: "OrganicBites", balance: "₹3,400", lastRecharge: "2026-02-18", lastDebit: "2026-02-23", status: "low" },

// ];

// const codStatusStyles = { settled: "bg-success/10 text-success", pending: "bg-warning/10 text-warning", overdue: "bg-destructive/10 text-destructive" };
// const txnStatusStyles = { completed: "bg-success/10 text-success", pending: "bg-warning/10 text-warning", failed: "bg-destructive/10 text-destructive" };
// const stlStatusStyles = { pending: "bg-warning/10 text-warning", approved: "bg-info/10 text-info", rejected: "bg-destructive/10 text-destructive", processed: "bg-success/10 text-success" };
// const walletStatusStyles = { active: "bg-success/10 text-success", low: "bg-warning/10 text-warning", empty: "bg-destructive/10 text-destructive" };
// const invTypeStyles = { shipping: "bg-info/10 text-info", platform_fee: "bg-accent/10 text-accent", settlement: "bg-success/10 text-success" };


// function CreateTransactionModal({
//   open,
//   onOpenChange,
//   onSuccess,
// }: CreateTransactionModalProps) {
//   const { toast } = useToast();

//   // Form state
//   const [selectedOrderId, setSelectedOrderId] = useState<string>("");
//   const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
//   const [amount, setAmount] = useState<number>(0);
//   const [description, setDescription] = useState<string>("");

//   // Loading states
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [orderss, setOrderss] = useState({});

//   const [loadingOrders, setLoadingOrders] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

  







//   const fetchOrders = async () => {
//     setLoadingOrders(true);
//     try {
//       // Example API call – replace with your actual endpoint
//            const data = await orderApi.getAll();

//            let options = [
  
// ]


// for(let x of data){
// options.push({value:x.id,label:x.orderNumber+" - "+x.amount})
// }




//       setOrders(options);
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to load orders",
//         variant: "destructive",
//       });
//     } finally {
//       setLoadingOrders(false);
//     }
//   };

//   // When seller changes, fetch orders and reset order selection
//   useEffect(() => {
//     fetchOrders()
//   }, []);




//   const handleSubmit = async () => {
//     // Validation
  
//     if (!selectedOrderId) {
//       toast({
//         title: "Validation Error",
//         description: "Please select an order",
//         variant: "destructive",
//       });
//       return;
//     }
//     if (amount <= 0) {
//       toast({
//         title: "Validation Error",
//         description: "Amount must be greater than zero",
//         variant: "destructive",
//       });
//       return;
//     }
//     if (!description.trim()) {
//       toast({
//         title: "Validation Error",
//         description: "Description is required",
//         variant: "destructive",
//       });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       // Example API call – replace with your actual endpoint
//       const payload = {
//         orderId: selectedOrderId,
//         type: transactionType,
//         amount,
//         description: description.trim(),
//       };

   

// let response=await apiRequest("POST","tracking/transactions",payload,{})




    
//       // if (!response.ok) throw new Error("Submission failed");

//       toast({
//         title: "Success",
//         description: "Transaction created successfully",
//       });
//       resetForm();
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to create transaction",
//         variant: "destructive",
//       });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const resetForm = () => {
//     setSelectedOrderId("");
//     setTransactionType("credit");
//     setAmount(0);
//     setDescription("");
//     setOrders([]);
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Create New Transaction</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4 py-2">
//           {/* Seller Selection */}
       

//           {/* Order Selection */}
//           <div className="space-y-2">
//             <Label htmlFor="order">Select Order *</Label>

//             <Select1
//     defaultValue={orderss}
//     options={orders}
//     onChange={(selectedOption)=>{
//       setSelectedOrderId(selectedOption.value)
//       setOrderss(selectedOption)

//     }}
//   />



          
//           </div>

//           {/* Transaction Type */}
//           <div className="space-y-2">
//             <Label>Select Type *</Label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   value="credit"
//                   checked={transactionType === "credit"}
//                   onChange={() => setTransactionType("credit")}
//                   className="h-4 w-4"
//                 />
//                 <span>Credit</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   value="debit"
//                   checked={transactionType === "debit"}
//                   onChange={() => setTransactionType("debit")}
//                   className="h-4 w-4"
//                 />
//                 <span>Debit</span>
//               </label>
//             </div>
//           </div>

//           {/* Amount */}
//           <div className="space-y-2">
//             <Label htmlFor="amount">Amount *</Label>
//             <Input
//               id="amount"
//               type="number"
//               value={amount}
//               onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
//               placeholder="0.00"
//               step="0.01"
//               min="0"
//             />
//           </div>

//           {/* Description */}
//           <div className="space-y-2">
//             <Label htmlFor="description">Description *</Label>
//             <Textarea
//               id="description"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               placeholder="Enter transaction description"
//               rows={3}
//             />
//             <p className="text-xs text-muted-foreground">
//               Example: Payment for invoice #12345
//             </p>
//           </div>
//         </div>

//         <DialogFooter className="gap-2 sm:gap-0">
//           <Button
//             variant="outline"
//             onClick={() => {
//               resetForm();
//               onOpenChange(false);
//             }}
//           >
//             Cancel
//           </Button>
//           <Button onClick={handleSubmit} disabled={submitting}>
//             {submitting ? "Creating..." : "Create Transaction"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// const FinancePage = () => {
//   const { toast } = useToast();
//   const [settlements, setSettlements] = useState(initialSettlements);
//   const [walletAction, setWalletAction] = useState<{ seller: string; type: "credit" | "debit" } | null>(null);
//   const [walletAmount, setWalletAmount] = useState("");
//   const [alldata,setalldata]=useState([[],[],[],[]])
//    const [modalOpen, setModalOpen] = useState(false);


//   const approveSettlement = (id: string) => {
//     setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: "approved" as const, approvedBy: "Current Admin" } : s));
//     toast({ title: "Settlement approved" });
//   };
//   const rejectSettlement = (id: string) => {
//     setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" as const, approvedBy: "Current Admin" } : s));
//     toast({ title: "Settlement rejected", variant: "destructive" });
//   };

//   const handleWalletAction = () => {
//     if (!walletAction) return;
//     toast({ title: `Wallet ${walletAction.type}ed`, description: `₹${walletAmount} ${walletAction.type}ed to ${walletAction.seller} wallet.` });
//     setWalletAction(null);
//     setWalletAmount("");
//   };

//   const finanacedata=async()=>{
//              const data = await orderApi.getAll();
//              let tmporder={

//              }
//              for(let x of data){
                   
//                  tmporder[x.orderNumber]=x
//              }
//                    let datastore=[[],[],[],[]]
//                    const data1 = await fetch(getuser()?.role=="admin"?"https://app.logixmitra.com/api/api/wallets":"https://app.logixmitra.com/api/api/wallets/users/"+getuser()?.id, {
//                      method: "GET",
//                      headers: {  "Content-Type": "application/json" }
//                    }).then(res => res.json());  
//                    for(let x of data1){
//                      if(x.status=="Approved" || x.status=="Rejected" || x.status=="draft"){
//                         continue
//                        }
//                         if(tmporder[x.orderNumber] && x.user_id==getuser()?.id){
//                            if(tmporder[x.orderNumber].financialStatus=="paid"){
//                                datastore[0].push(x)
//                            }
//                            else{
//                                datastore[1].push(x)
//                            }
//                         }
//                       }


//                       console.log(datastore,"datastore")


//              setalldata([...datastore])    


//   }

//   useEffect(()=>{
// finanacedata()

//   },[])

//   function formatDateToDDMMYYYY(isoString) {
//   const date = new Date(isoString);

//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-based
//   const year = date.getFullYear();

//   return `${day}-${month}-${year}`;
// }

// // Example
// // console.log(formatDateToDDMMYYYY("2026-04-19T12:04:06.562Z"));
// // Output: 19-04-2026

//   return (
//     <DashboardLayout title="Finance & COD" subtitle="Track revenue, settlements, wallets, and invoices">



//       <CreateTransactionModal
//         open={modalOpen}
//         onOpenChange={setModalOpen}
//         onSuccess={() => {
//           // Refresh transaction list or perform any action after successful creation
//           console.log("Transaction created, refresh list");
//         }}
//       />
//       <div className="space-y-6">
//         {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Revenue" value="" icon={<TrendingUp className="h-5 w-5" />} change="+15% this month" variant="accent" />
//           <StatCard title="COD Pending" value="" icon={<Clock className="h-5 w-5" />} variant="warning" />
//           <StatCard title="Platform Profit" value="" icon={<IndianRupee className="h-5 w-5" />} variant="success" />
//           <StatCard title="Wallet Balance" value="" icon={<Wallet className="h-5 w-5" />} />
//         </div> */}

//         <Tabs defaultValue="transactions">
//           <TabsList className="flex-wrap">
//             <TabsTrigger value="transactions">Transactions</TabsTrigger>
//             <TabsTrigger value="codhistory">COD History</TabsTrigger>
//             <TabsTrigger value="cod">COD Remittance</TabsTrigger>
//             {/* <TabsTrigger value="settlements">Settlements</TabsTrigger> */}
//             {/* <TabsTrigger value="wallets">Wallet Ledger</TabsTrigger> */}
//             {/* <TabsTrigger value="invoices">Invoices & GST</TabsTrigger> */}
//           </TabsList>

//           <TabsContent value="transactions" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader className="flex-row items-center justify-between">
//                 <CardTitle className="font-display text-lg">Transaction History   {getuser()?.role=="admin" && <Button onClick={() => setModalOpen(true)}>New Transaction</Button>}</CardTitle>
//                 <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead><tr className="border-b border-border">{["Type", "Description", "Order-awb", "Amount", "Date", "Status"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                     <tbody>
//                       { Array.isArray(alldata[0]) &&  alldata[0].map(txn => 
//                         <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30">
//                           <td className="py-3 px-4"><div className={`h-8 w-8 rounded-lg flex items-center justify-center ${true ? "bg-success/10" : "bg-destructive/10"}`}>{txn.status === "credit" || txn.status === "Refund"? <ArrowDownRight className="h-4 w-4 text-success" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />}</div></td>
//                           <td className="py-3 px-4 text-sm text-foreground">{txn?.description || "Shipment  Charges"}</td>
//                           <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{txn?.orderNumber+ " - "+txn?.transid}</td>
//                           <td className={`py-3 px-4 text-sm font-semibold ${  txn.status === "credit" ? "text-success" : "text-destructive"}`}>{txn.amount}</td>
//                           <td className="py-3 px-4 text-sm text-muted-foreground">{formatDateToDDMMYYYY(txn.createdAt)}</td>
//                           <td className="py-3 px-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${txnStatusStyles[txn.status]}`}>{txn.status}</span></td>
//                         </tr>
//                       )}



                      
//                     </tbody>
//                   </table>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="codhistory" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader><CardTitle className="font-display text-lg">COD History</CardTitle></CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead><tr className="border-b border-border">{["Amount", "Orders-awb", "Date", "Status"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                     <tbody>
//                       {Array.isArray(alldata[1]) &&  alldata[1].map(cod => (
//                         <tr key={cod.id} className="border-b border-border/50 hover:bg-muted/30">
//                           {/* <td className="py-3 px-4 text-sm font-medium text-foreground">{cod?.seller}</td> */}
//                           <td className="py-3 px-4 text-sm font-semibold text-foreground">{cod?.amount}</td>
//                           <td className="py-3 px-4 text-sm text-muted-foreground">{cod?.orderNumber+ " - "+cod?.transid}</td>
//                           <td className="py-3 px-4 text-sm text-muted-foreground">{formatDateToDDMMYYYY(cod?.createdAt)}</td>
//                           <td className="py-3 px-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[cod.status]}`}>{cod.status}</span></td>
//                           {/* <td className="py-3 px-4">{cod?.status !== "settled" && <Button variant="outline" size="sm">Settle</Button>}</td> */}
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>



          
//           <TabsContent value="cod" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader><CardTitle className="font-display text-lg">COD Remittance</CardTitle></CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead><tr className="border-b border-border">{["Seller", "Amount", "Orders", "Due Date", "Status", "Action"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                     <tbody>
//                       {Array.isArray(alldata[1]) &&  alldata[1].map(cod => (
//                         <tr key={cod.id} className="border-b border-border/50 hover:bg-muted/30">
//                           <td className="py-3 px-4 text-sm font-medium text-foreground">{cod?.seller}</td>
//                           <td className="py-3 px-4 text-sm font-semibold text-foreground">{cod?.amount}</td>
//                           <td className="py-3 px-4 text-sm text-muted-foreground">{cod?.orders}</td>
//                           <td className="py-3 px-4 text-sm text-muted-foreground">{formatDateToDDMMYYYY(cod?.due_date)}</td>
//                           <td className="py-3 px-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[cod.status]}`}>{cod.status}</span></td>
//                           <td className="py-3 px-4">{cod?.status !== "settled" && <Button variant="outline" size="sm">Settle</Button>}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="settlements" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader><CardTitle className="font-display text-lg">Settlement Requests</CardTitle></CardHeader>
//               <CardContent className="p-0">
//                 <table className="w-full">
//                   <thead><tr className="border-b border-border">{["Seller", "Amount", "Type", "Request Date", "Status", "Approved By", "Actions"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                   <tbody>
//                     {settlements.map(s => (
//                       <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
//                         <td className="py-3 px-4 text-sm font-medium text-foreground">{s.seller}</td>
//                         <td className="py-3 px-4 text-sm font-semibold text-foreground">{s.amount}</td>
//                         <td className="py-3 px-4"><Badge variant="outline" className="text-xs capitalize">{s.type.replace("_", " ")}</Badge></td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{s.requestDate}</td>
//                         <td className="py-3 px-4"><Badge className={`text-xs capitalize ${stlStatusStyles[s.status]}`}>{s.status}</Badge></td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{s.approvedBy}</td>
//                         <td className="py-3 px-4">
//                           {s.status === "pending" && (
//                             <div className="flex gap-1">
//                               <Button size="sm" variant="outline" className="text-success gap-1" onClick={() => approveSettlement(s.id)}><CheckCircle className="h-3 w-3" /> Approve</Button>
//                               <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => rejectSettlement(s.id)}><XCircle className="h-3 w-3" /> Reject</Button>
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="wallets" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader><CardTitle className="font-display text-lg">Seller Wallet Ledger</CardTitle></CardHeader>
//               <CardContent className="p-0">
//                 <table className="w-full">
//                   <thead><tr className="border-b border-border">{["Seller", "Balance", "Last Recharge", "Last Debit", "Status", "Actions"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                   <tbody>
//                     {wallets.map(w => (
//                       <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
//                         <td className="py-3 px-4 text-sm font-medium text-foreground">{w.seller}</td>
//                         <td className="py-3 px-4 text-sm font-semibold text-foreground">{w.balance}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{w.lastRecharge}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{w.lastDebit}</td>
//                         <td className="py-3 px-4"><Badge className={`text-xs ${walletStatusStyles[w.status]}`}>{w.status}</Badge></td>
//                         <td className="py-3 px-4">
//                           <div className="flex gap-1">
//                             <Button size="sm" variant="outline" className="text-success" onClick={() => setWalletAction({ seller: w.seller, type: "credit" })}>Credit</Button>
//                             <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setWalletAction({ seller: w.seller, type: "debit" })}>Debit</Button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="invoices" className="mt-4">
//             <Card className="shadow-card">
//               <CardHeader className="flex-row items-center justify-between">
//                 <CardTitle className="font-display text-lg">Invoices & GST Reports</CardTitle>
//                 <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export GST Report</Button>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <table className="w-full">
//                   <thead><tr className="border-b border-border">{["Invoice No", "Seller", "Type", "Amount", "GST", "Total", "Date", "Actions"].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
//                   <tbody>
//                     {invoices.map(inv => (
//                       <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
//                         <td className="py-3 px-4 text-sm font-mono text-foreground">{inv.invoiceNo}</td>
//                         <td className="py-3 px-4 text-sm text-foreground">{inv.seller}</td>
//                         <td className="py-3 px-4"><Badge className={`text-xs capitalize ${invTypeStyles[inv.type]}`}>{inv.type.replace("_", " ")}</Badge></td>
//                         <td className="py-3 px-4 text-sm text-foreground">{inv.amount}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{inv.gst}</td>
//                         <td className="py-3 px-4 text-sm font-semibold text-foreground">{inv.total}</td>
//                         <td className="py-3 px-4 text-sm text-muted-foreground">{inv.date}</td>
//                         <td className="py-3 px-4"><Button variant="ghost" size="sm" className="gap-1"><Download className="h-3 w-3" /> PDF</Button></td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>

//       <Dialog open={!!walletAction} onOpenChange={() => setWalletAction(null)}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle className="text-foreground">{walletAction?.type === "credit" ? "Credit" : "Debit"} Wallet — {walletAction?.seller}</DialogTitle>
//             <DialogDescription>Enter the amount to {walletAction?.type}</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} placeholder="Enter amount" /></div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setWalletAction(null)}>Cancel</Button>
//             <Button onClick={handleWalletAction} disabled={!walletAmount} className={walletAction?.type === "debit" ? "bg-destructive hover:bg-destructive/90" : ""}>
//               {walletAction?.type === "credit" ? "Credit" : "Debit"} Wallet
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </DashboardLayout>
//   );
// };

// export default FinancePage;




// import { useState, useEffect, useMemo } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, Plus, Calendar, Truck, Package, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, X } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { orderApi } from "../../services/orderApi";
// import { getuser } from "../../services/getbasicdata";
// import { Textarea } from "@/components/ui/textarea";
// import { apiRequest } from "../../src/apiglobal/apiconfig";
// import Select1 from "react-select";

// // Lazy load xlsx to prevent initial load issues
// const loadXLSX = async () => {
//   return await import('xlsx');
// };

// // Types
// interface CreateTransactionModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess?: () => void;
// }

// interface WalletTransaction {
//   id: number;
//   user_id: number;
//   transid: string;
//   orderNumber: string | null;
//   amount: number;
//   status: string;
//   description: string;
//   createdAt: string;
//   type?: "credit" | "debit";
//   order?: any;
// }

// interface CODHistoryItem {
//   id: string;
//   orderId: string;
//   orderDate: string;
//   courier: string;
//   awbNumber: string;
//   invoiceAmount: string;
//   codAmount: string;
//   deliveredDate: string;
//   deliveredTime: string;
//   status: "pending" | "settled" | "overdue";
// }

// interface WalletHistoryItem {
//   id: string;
//   transactionId: string;
//   type: "credit" | "debit";
//   amount: string;
//   balance: string;
//   orderNumber: string;
//   description: string;
//   date: string;
//   status: string;
// }

// const codStatusStyles = {
//   settled: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   overdue: "bg-red-100 text-red-700",
// };

// const txnStatusStyles: Record<string, string> = {
//   completed: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   failed: "bg-red-100 text-red-700",
//   Debited: "bg-red-100 text-red-700",
//   Credited: "bg-green-100 text-green-700",
//   Approved: "bg-green-100 text-green-700",
//   rejected: "bg-red-100 text-red-700",
//   Refund: "bg-blue-100 text-blue-700",
// };

// function CreateTransactionModal({ open, onOpenChange, onSuccess }: CreateTransactionModalProps) {
//   const { toast } = useToast();
//   const [selectedOrderId, setSelectedOrderId] = useState<string>("");
//   const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
//   const [amount, setAmount] = useState<number>(0);
//   const [description, setDescription] = useState<string>("");
//   const [orders, setOrders] = useState<{ value: string; label: string }[]>([]);
//   const [submitting, setSubmitting] = useState(false);

//   const fetchOrders = async () => {
//     try {
//       const data = await orderApi.getAll();
//       const options = data.map((x: any) => ({ value: x.id, label: `${x.orderNumber} - ${x.amount}` }));
//       setOrders(options);
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   const handleSubmit = async () => {
//     if (!selectedOrderId) {
//       toast({ title: "Validation Error", description: "Please select an order", variant: "destructive" });
//       return;
//     }
//     if (amount <= 0) {
//       toast({ title: "Validation Error", description: "Amount must be greater than zero", variant: "destructive" });
//       return;
//     }
//     if (!description.trim()) {
//       toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await apiRequest("POST", "tracking/transactions", {
//         orderId: selectedOrderId,
//         type: transactionType,
//         amount,
//         description: description.trim(),
//       }, {});
//       toast({ title: "Success", description: "Transaction created successfully" });
//       setSelectedOrderId("");
//       setTransactionType("credit");
//       setAmount(0);
//       setDescription("");
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader><DialogTitle>Create New Transaction</DialogTitle></DialogHeader>
//         <div className="space-y-4 py-2">
//           <div className="space-y-2">
//             <Label>Select Order *</Label>
//             <Select1 options={orders} onChange={(option: any) => { setSelectedOrderId(option.value); }} />
//           </div>
//           <div className="space-y-2">
//             <Label>Select Type *</Label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="credit" checked={transactionType === "credit"} onChange={() => setTransactionType("credit")} /> Credit
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="debit" checked={transactionType === "debit"} onChange={() => setTransactionType("debit")} /> Debit
//               </label>
//             </div>
//           </div>
//           <div className="space-y-2">
//             <Label>Amount *</Label>
//             <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
//           </div>
//           <div className="space-y-2">
//             <Label>Description *</Label>
//             <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows={3} />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//           <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// const FinancePage = () => {
//   const { toast } = useToast();
//   const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
//   const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [exporting, setExporting] = useState(false);
  
//   // Pagination states
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [activeTab, setActiveTab] = useState("codhistory");
  
//   // Search states
//   const [searchTerm, setSearchTerm] = useState("");
  
//   const [summary, setSummary] = useState({
//     totalGenerated: 0,
//     totalPaid: 0,
//     nextRemittance: "2026-05-23",
//     nextAmount: 0,
//     totalDue: 0,
//   });

//   const formatDateToDDMMYYYY = (dateString: string) => {
//     if (!dateString) return "-";
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return "-";
//     const day = String(date.getDate()).padStart(2, "0");
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const year = date.getFullYear();
//     return `${day}-${month}-${year}`;
//   };

//   const formatTime = (dateString: string) => {
//     if (!dateString) return "-";
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return "-";
//     return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
//   };

//   const formatAmount = (amount: number | string) => {
//     let numAmount = typeof amount === 'string' ? parseFloat(amount.replace('₹', '').replace(/,/g, '')) : amount;
//     if (isNaN(numAmount)) numAmount = 0;
//     return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   };

//   const getDeliveredDetailsFromOrder = (order: any) => {
//     // Use updatedAt from the order for delivered date and time
//     if (order.updatedAt && order.status === "Delivered") {
//       return {
//         deliveredDate: formatDateToDDMMYYYY(order.deliveredDate),
//         deliveredTime: formatTime(order.deliveredDate+"T"+order.deliveredTime)
//       };
//     }
    
//     // Fallback to tracking history if updatedAt is not available
//     if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//       const deliveredEvent = order.tracking_history.find(
//         (event: any) => event.state === "DELIVERED"
//       );
      
//       if (deliveredEvent && deliveredEvent.createdAt) {
//         return {
//           deliveredDate: formatDateToDDMMYYYY(deliveredEvent.deliveredTime),
//           deliveredTime: formatTime(order.deliveredDate+"T"+order.deliveredTime)
//         };
//       }
      
//       const completedEvent = order.tracking_history.find(
//         (event: any) => event.state === "OUT_FOR_DELIVERY" || event.state === "COMPLETED"
//       );
      
//       if (completedEvent && completedEvent.createdAt) {
//         return {
//           deliveredDate: formatDateToDDMMYYYY(completedEvent.deliveredTime),
//           deliveredTime: formatTime(order.deliveredDate+"T"+order.deliveredTime)
//         };
//       }
//     }
    
//     return { deliveredDate: "-", deliveredTime: "-" };
//   };

//   const getAWBNumber = (order: any) => {
//     return order.trackingnumber || order.awb || order.awbNumber || "-";
//   };

//   const fetchOrderDetails = async (orderId: string) => {
//     try {
//       const response = await fetch(
//         `https://app.logixmitra.com/api/api/orders/${orderId}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       );
//       if (response.ok) {
//         return await response.json();
//       }
//     } catch (error) {
//       console.error(`Failed to fetch order details for ${orderId}:`, error);
//     }
//     return null;
//   };

//   // Check if order is COD
//   const isCODOrder = (order: any) => {
//     const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//     const paymentType = order.payment_type || "";
    
//     return paymentGateway === "Cash on Delivery (COD)" || 
//            paymentGateway === "COD" ||
//            paymentGateway?.toLowerCase() === "cod" ||
//            paymentGateway?.toLowerCase() === "cash on delivery" ||
//            paymentType === "COD" ||
//            paymentType === "Cash on Delivery";
//   };

//   // Filter data based on search term
//   const filteredCodHistory = useMemo(() => {
//     if (!searchTerm.trim()) return codHistory;
    
//     const term = searchTerm.toLowerCase();
//     return codHistory.filter(item => 
//       item.orderId.toLowerCase().includes(term) ||
//       item.courier.toLowerCase().includes(term) ||
//       item.awbNumber.toLowerCase().includes(term) ||
//       item.status.toLowerCase().includes(term) ||
//       item.invoiceAmount.toLowerCase().includes(term) ||
//       item.codAmount.toLowerCase().includes(term)
//     );
//   }, [codHistory, searchTerm]);

//   const filteredWalletHistory = useMemo(() => {
//     if (!searchTerm.trim()) return walletHistory;
    
//     const term = searchTerm.toLowerCase();
//     return walletHistory.filter(item => 
//       item.transactionId.toLowerCase().includes(term) ||
//       item.description.toLowerCase().includes(term) ||
//       item.type.toLowerCase().includes(term) ||
//       item.status.toLowerCase().includes(term) ||
//       item.amount.toLowerCase().includes(term)
//     );
//   }, [walletHistory, searchTerm]);

//   // Export to Excel with better handling
//   const exportToExcel = async (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
//     toast({ title: "Processing", description: "Preparing export..." });
    
//     try {
//       const XLSX = await loadXLSX();
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length > 0) {
//         let worksheetData;
        
//         if (type === "COD History") {
//           worksheetData = dataToExport.map((item: CODHistoryItem) => ({
//             "Order ID": item.orderId,
//             "Order Date": item.orderDate,
//             "Courier": item.courier,
//             "AWB Number": item.awbNumber,
//             "Invoice Amount": item.invoiceAmount,
//             "COD Amount": item.codAmount,
//             "Delivered Date": item.deliveredDate,
//             "Delivered Time": item.deliveredTime,
//             "Status": item.status.toUpperCase()
//           }));
//         } else {
//           worksheetData = dataToExport.map((item: WalletHistoryItem) => ({
//             "Transaction ID": item.transactionId,
//             "Type": item.type.toUpperCase(),
//             "Amount": item.amount,
//             "Description": item.description,
//             "Date": item.date,
//             "Status": item.status
//           }));
//         }
        
//         const worksheet = XLSX.utils.json_to_sheet(worksheetData);
//         const workbook = XLSX.utils.book_new();
//         XLSX.utils.book_append_sheet(workbook, worksheet, type);
//         XLSX.writeFile(workbook, `${type.replace(" ", "_")}_${new Date().toISOString().split('T')[0]}.xlsx`);
//         toast({ title: "Success", description: `${dataToExport.length} records exported successfully!` });
//       } else {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//       }
//     } catch (error) {
//       console.error("Export error:", error);
//       toast({ title: "Error", description: "Failed to export data. Please try again.", variant: "destructive" });
//     } finally {
//       setExporting(false);
//     }
//   };

//   // Export to CSV
//   const exportToCSV = (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
    
//     try {
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length > 0) {
//         let csvContent = "";
//         let headers: string[] = [];
//         let rows: any[][] = [];
        
//         if (type === "COD History") {
//           headers = ["Order ID", "Order Date", "Courier", "AWB Number", "Invoice Amount", "COD Amount", "Delivered Date", "Delivered Time", "Status"];
//           rows = dataToExport.map((item: CODHistoryItem) => [
//             item.orderId,
//             item.orderDate,
//             item.courier,
//             item.awbNumber,
//             item.invoiceAmount,
//             item.codAmount,
//             item.deliveredDate,
//             item.deliveredTime,
//             item.status
//           ]);
//         } else {
//           headers = ["Transaction ID", "Type", "Amount", "Description", "Date", "Status"];
//           rows = dataToExport.map((item: WalletHistoryItem) => [
//             item.transactionId,
//             item.type,
//             item.amount,
//             item.description,
//             item.date,
//             item.status
//           ]);
//         }
        
//         csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
//         const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
//         const link = document.createElement("a");
//         const url = URL.createObjectURL(blob);
//         link.href = url;
//         link.setAttribute("download", `${type.replace(" ", "_")}_${new Date().toISOString().split('T')[0]}.csv`);
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
        
//         toast({ title: "Success", description: `${dataToExport.length} records exported as CSV!` });
//       } else {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//       }
//     } catch (error) {
//       console.error("CSV Export error:", error);
//       toast({ title: "Error", description: "Failed to export CSV. Please try again.", variant: "destructive" });
//     } finally {
//       setExporting(false);
//     }
//   };

//   const fetchAllData = async () => {
//     setLoading(true);
//     try {
//       // Fetch wallet transactions (only for display, NOT for totals)
//       const walletResponse: WalletTransaction[] = await fetch(
//         getuser()?.role === "admin"
//           ? "https://app.logixmitra.com/api/api/wallets"
//           : `https://app.logixmitra.com/api/api/wallets/users/${getuser()?.id}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       ).then(res => res.json());

//       let ordersData = await orderApi.getAll();
      
//       if (!Array.isArray(ordersData)) {
//         ordersData = [];
//       }

//       // Filter to only COD orders
//       const codOnlyOrders = ordersData.filter((order: any) => {
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         return paymentGateway === "Cash on Delivery (COD)" || 
//                paymentGateway === "COD" ||
//                paymentGateway?.toLowerCase() === "cod" ||
//                paymentGateway?.toLowerCase() === "cash on delivery" ||
//                paymentType === "COD" ||
//                paymentType === "Cash on Delivery";
//       });

//       // Fetch details for COD orders only
//       const ordersWithDetails = await Promise.all(
//         codOnlyOrders.map(async (order: any) => {
//           if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//             return order;
//           }
//           const detailedOrder = await fetchOrderDetails(order.id);
//           return detailedOrder || order;
//         })
//       );

//       const walletHistoryData: WalletHistoryItem[] = [];
//       const codHistoryData: CODHistoryItem[] = [];
      
//       // Reset totals
//       let totalGenerated = 0;
//       let totalPaid = 0;
//       let totalDue = 0;


//       walletResponse.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());




//       // Process wallet transactions (ONLY for display)
//       if (Array.isArray(walletResponse)) {
//         for (const item of walletResponse) {
//           if (item.status === "draft") continue;
          
//           let type: "credit" | "debit" = "debit";
//           let displayStatus = item.status;
          
//           if (item.status === "Approved" && item.amount > 0 && !item.orderNumber) {
//             type = "credit";
//             displayStatus = "Credited";
//           } else if (item.status === "Debited" || (item.status === "Approved" && item.orderNumber)) {
//             type = "debit";
//             displayStatus = "Debited";
//           } else if (item.status === "Refund") {
//             type = "credit";
//             displayStatus = "Refund";
//           }

//           walletHistoryData.push({
//             id: item.id.toString(),
//             transactionId: item.transid || item.id.toString(),
//             orderNumber: item.orderNumber || "-",

//             type: type,
//             amount: formatAmount(item.amount),
//             balance: formatAmount(item.amount),
//             description: item.description || (type === "credit" ? "Wallet Credit" : "Wallet Debit"),
//             date: formatDateToDDMMYYYY(item.createdAt),
//             status: displayStatus,
//           });
//         }
//       }

//       // Process ONLY COD orders for COD History and financial calculations
//       for (const order of ordersWithDetails) {
//         if (!order || !order.orderNumber || order.status!="Delivered") continue;
        
//         // USE ONLY 'amount' field for COD amount
//         let codAmount = order.amount || 0;
        
//         // Convert to number if it's a string
//         if (typeof codAmount === 'string') {
//           codAmount = parseFloat(codAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         let invoiceAmount = order.amount || order.invoiceAmount || 0;
        
//         if (typeof invoiceAmount === 'string') {
//           invoiceAmount = parseFloat(invoiceAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         // Check if order is delivered/settled
//         const isSettled = 
//                          order.codpaidstatus != "Due";
//         const orderStatus = isSettled ? "settled" : "pending";
        
//         // Get delivered details from order's updatedAt field
//         const { deliveredDate, deliveredTime } = getDeliveredDetailsFromOrder(order);
//         const awbNumber = getAWBNumber(order);
        
//         codHistoryData.push({
//           id: order.id || order.orderNumber,
//           orderId: order.orderNumber,
//           orderDate: formatDateToDDMMYYYY(order.orderDate),
//           courier: order.courier || "Not Assigned",
//           awbNumber: awbNumber,
//           invoiceAmount: formatAmount(invoiceAmount),
//           codAmount: formatAmount(codAmount),
//           deliveredDate: deliveredDate,
//           deliveredTime: deliveredTime,
//           status: orderStatus as "pending" | "settled" | "overdue",
//         });
        
//         // Calculate totals based ONLY on COD orders using 'amount' field
//         const numCodAmount = typeof codAmount === 'number' ? codAmount : parseFloat(codAmount);
//         if (!isNaN(numCodAmount) && numCodAmount > 0) {
//           totalGenerated += numCodAmount;
//           if (isSettled) {
//             totalPaid += numCodAmount;
//           } else {
//             totalDue += numCodAmount;
//           }
//         }
//       }

//       codHistoryData.sort((a, b) => {
//         const dateA = a.orderDate.split('-').reverse().join('-');
//         const dateB = b.orderDate.split('-').reverse().join('-');
//         return dateB.localeCompare(dateA);
//       });

//       const nextRemittanceDate = new Date();
//       nextRemittanceDate.setDate(nextRemittanceDate.getDate() + 7);
//       const nextRemittanceStr = nextRemittanceDate.toISOString().split('T')[0];

//       setWalletHistory(walletHistoryData);
//       setCodHistory(codHistoryData);
//       setSummary({
//         totalGenerated,
//         totalPaid,
//         nextRemittance: nextRemittanceStr,
//         nextAmount: totalDue,
//         totalDue,
//       });
//     } catch (error) {
//       console.error("Failed to fetch data:", error);
//       toast({ title: "Error", description: "Failed to load finance data", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   // Pagination logic with filtered data
//   const getCurrentPageData = (data: any[]) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return data.slice(startIndex, endIndex);
//   };

//   const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);
  
//   const currentDisplayData = activeTab === "codhistory" ? filteredCodHistory : filteredWalletHistory;
//   const currentData = getCurrentPageData(currentDisplayData);
//   const currentTotalPages = totalPages(currentDisplayData);

//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//   };

//   const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setItemsPerPage(Number(e.target.value));
//     setCurrentPage(1);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//     setCurrentPage(1);
//   };

//   const clearSearch = () => {
//     setSearchTerm("");
//     setCurrentPage(1);
//   };

//   const totalOrders = codHistory.length;
//   const settledOrders = codHistory.filter(item => item.status === "settled").length;
//   const pendingOrders = codHistory.filter(item => item.status === "pending").length;

//   return (
//     <DashboardLayout title="Finance & COD" subtitle="Track revenue, settlements, wallets, and invoices">
//       <CreateTransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchAllData} />

//       <div className="space-y-6">
//         {/* Summary Cards - All values are now COD-only */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Remittance Generated" value={formatAmount(summary.totalGenerated)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
//           <StatCard title="Total Remittance Paid" value={formatAmount(summary.totalPaid)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
//           <StatCard title={`Next Remittance (${summary.nextRemittance})`} value={formatAmount(summary.nextAmount)} icon={<Clock className="h-5 w-5" />} variant="warning" />
//           <StatCard title="Total Remittance Due" value={formatAmount(summary.totalDue)} icon={<IndianRupee className="h-5 w-5" />} variant="destructive" />
//         </div>

//         {/* Additional Stats - COD Orders only */}
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Total COD Orders</p>
//                   <p className="text-2xl font-bold">{totalOrders}</p>
//                 </div>
//                 <Package className="h-8 w-8 text-muted-foreground" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Settled COD Orders</p>
//                   <p className="text-2xl font-bold text-green-600">{settledOrders}</p>
//                 </div>
//                 <CheckCircle className="h-8 w-8 text-green-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Pending COD Orders</p>
//                   <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
//                 </div>
//                 <Clock className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs defaultValue="codhistory" onValueChange={(value) => {
//           setActiveTab(value);
//           setCurrentPage(1);
//           setSearchTerm("");
//         }}>
//           <TabsList className="flex-wrap">
//             <TabsTrigger value="wallet">Wallet History</TabsTrigger>
//             <TabsTrigger value="codhistory">COD History</TabsTrigger>
//           </TabsList>

//           {/* Search Bar */}
//           <div className="mt-4 mb-4">
//             <div className="relative max-w-md">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder={`Search ${activeTab === "codhistory" ? "COD orders by ID, courier, AWB..." : "transactions by ID, description..."}`}
//                 value={searchTerm}
//                 onChange={handleSearch}
//                 className="pl-9 pr-10"
//               />
//               {searchTerm && (
//                 <button
//                   onClick={clearSearch}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                 >
//                   <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
//                 </button>
//               )}
//             </div>
//             {searchTerm && (
//               <p className="text-sm text-muted-foreground mt-2">
//                 Found {currentDisplayData.length} result(s) for "{searchTerm}"
//               </p>
//             )}
//           </div>

//           {/* Wallet History Tab */}
//           <TabsContent value="wallet" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <div className="flex items-center">
//                   <CardTitle>Wallet History</CardTitle>
//                   {getuser()?.role === "admin" && (
//                     <Button onClick={() => setModalOpen(true)} className="ml-4">
//                       <Plus className="h-4 w-4 mr-1" /> New Transaction
//                     </Button>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[800px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Transaction ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Type</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Description</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={6} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={6} className="py-8 text-center">
//                             {searchTerm ? "No matching wallet transactions found." : "No wallet transactions found."}
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: WalletHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.transactionId+(item.orderNumber ? ` (${item.orderNumber})` : "")}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.status === "credit"  || item.status=="Refund"  || item.status=="Credited" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                                 {item.status === "credit" || item.status=="Refund"  || item.status=="Credited" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
//                                 {item.status === "credit" || item.status=="Credited" ? "Credit" : item.status === "Refund" ? "Refund" : "Debited"}
//                               </span>
//                             </td>
//                             <td className={`py-3 px-4 text-sm font-semibold ${item.status === "credit" ? "text-green-600" : "text-red-600"}`}>{item.amount}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txnStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {/* Pagination for Wallet History */}
//                 {!loading && filteredWalletHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredWalletHistory.length)} of {filteredWalletHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(1)}
//                         disabled={currentPage === 1}
//                       >
//                         First
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage - 1)}
//                         disabled={currentPage === 1}
//                       >
//                         <ChevronLeft className="h-4 w-4" />
//                       </Button>
//                       <span className="px-3 py-1 text-sm">
//                         Page {currentPage} of {currentTotalPages}
//                       </span>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage + 1)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         <ChevronRight className="h-4 w-4" />
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentTotalPages)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         Last
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* COD History Tab */}
//           <TabsContent value="codhistory" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <CardTitle>COD History</CardTitle>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[1200px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Courier</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">AWB Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Invoice Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">COD Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Time</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={9} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={9} className="py-8 text-center">
//                             {searchTerm ? "No matching COD orders found." : "No COD history found."}
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: CODHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderId}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">{item.orderDate}</td>
//                             <td className="py-3 px-4 text-sm">
//                               <div className="flex items-center gap-1">
//                                 <Truck className="h-3 w-3 flex-shrink-0" />
//                                 <span className="truncate max-w-[150px]" title={item.courier}>{item.courier}</span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-mono">
//                               <span className="text-blue-600 font-medium">{item.awbNumber}</span>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-semibold">{item.invoiceAmount}</td>
//                             <td className="py-3 px-4 text-sm font-semibold text-green-600">{item.codAmount}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredDate !== "-" ? "text-green-600 font-medium" : "text-muted-foreground"}>
//                                   {item.deliveredDate}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <span className={item.deliveredTime !== "-" ? "text-green-600" : "text-muted-foreground"}>
//                                 {item.deliveredTime}
//                               </span>
//                             </td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[item.status]}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {/* Pagination for COD History */}
//                 {!loading && filteredCodHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCodHistory.length)} of {filteredCodHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(1)}
//                         disabled={currentPage === 1}
//                       >
//                         First
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage - 1)}
//                         disabled={currentPage === 1}
//                       >
//                         <ChevronLeft className="h-4 w-4" />
//                       </Button>
//                       <span className="px-3 py-1 text-sm">
//                         Page {currentPage} of {currentTotalPages}
//                       </span>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage + 1)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         <ChevronRight className="h-4 w-4" />
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentTotalPages)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         Last
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default FinancePage;


// import { useState, useEffect, useMemo } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, Plus, Calendar, Truck, Package, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, X, Filter } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { orderApi } from "../../services/orderApi";
// import { sellerApi } from "../../services/sellerApi"; 

// import { getuser } from "../../services/getbasicdata";
// import { Textarea } from "@/components/ui/textarea";
// import { apiRequest } from "../../src/apiglobal/apiconfig";
// import Select1 from "react-select";

// // Lazy load xlsx to prevent initial load issues
// const loadXLSX = async () => {
//   return await import('xlsx');
// };

// // Types
// interface CreateTransactionModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess?: () => void;
// }

// interface WalletTransaction {
//   id: number;
//   user_id: number;
//   transid: string;
//   orderNumber: string | null;
//   amount: number;
//   status: string;
//   description: string;
//   createdAt: string;
//   type?: "credit" | "debit";
//   order?: any;
// }

// interface CODHistoryItem {
//   id: string;
//   orderId: string;
//   orderDate: string;
//   orderDateISO: string;
//   courier: string;
//   awbNumber: string;
//   invoiceAmount: string;
//   seller?: string;
//   codAmount: string;
//   deliveredDate: string;
//   deliveredTime: string;
//   status: "pending" | "settled" | "overdue";
// }

// interface WalletHistoryItem {
//   id: string;
//   transactionId: string;
//   type: "credit" | "debit";
//   amount: string;
//   balance: string;
//   orderNumber: string;
//   description: string;
//   date: string;
//   dateISO: string;
//   status: string;
// }

// interface DateRange {
//   from: string;
//   to: string;
// }

// const codStatusStyles = {
//   settled: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   overdue: "bg-red-100 text-red-700",
// };

// const txnStatusStyles: Record<string, string> = {
//   completed: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   failed: "bg-red-100 text-red-700",
//   Debited: "bg-red-100 text-red-700",
//   Credited: "bg-green-100 text-green-700",
//   Approved: "bg-green-100 text-green-700",
//   rejected: "bg-red-100 text-red-700",
//   Refund: "bg-blue-100 text-blue-700",
// };
//       let temp={}


// function CreateTransactionModal({ open, onOpenChange, onSuccess }: CreateTransactionModalProps) {
//   const { toast } = useToast();
//   const [selectedOrderId, setSelectedOrderId] = useState<string>("");
//   const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
//   const [amount, setAmount] = useState<number>(0);
//   const [description, setDescription] = useState<string>("");
//   const [orders, setOrders] = useState<{ value: string; label: string }[]>([]);
//   const [submitting, setSubmitting] = useState(false);

//   const fetchOrders = async () => {
//     try {
//       const data = await orderApi.getAll();
//       const options = data.map((x: any) => ({ value: x.id, label: `${x.orderNumber} - ${x.amount}` }));
//       setOrders(options);
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   const handleSubmit = async () => {
//     if (!selectedOrderId) {
//       toast({ title: "Validation Error", description: "Please select an order", variant: "destructive" });
//       return;
//     }
//     if (amount <= 0) {
//       toast({ title: "Validation Error", description: "Amount must be greater than zero", variant: "destructive" });
//       return;
//     }
//     if (!description.trim()) {
//       toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await apiRequest("POST", "tracking/transactions", {
//         orderId: selectedOrderId,
//         type: transactionType,
//         amount,
//         description: description.trim(),
//       }, {});
//       toast({ title: "Success", description: "Transaction created successfully" });
//       setSelectedOrderId("");
//       setTransactionType("credit");
//       setAmount(0);
//       setDescription("");
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader><DialogTitle>Create New Transaction</DialogTitle></DialogHeader>
//         <div className="space-y-4 py-2">
//           <div className="space-y-2">
//             <Label>Select Order *</Label>
//             <Select1 options={orders} onChange={(option: any) => { setSelectedOrderId(option.value); }} />
//           </div>
//           <div className="space-y-2">
//             <Label>Select Type *</Label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="credit" checked={transactionType === "credit"} onChange={() => setTransactionType("credit")} /> Credit
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="debit" checked={transactionType === "debit"} onChange={() => setTransactionType("debit")} /> Debit
//               </label>
//             </div>
//           </div>
//           <div className="space-y-2">
//             <Label>Amount *</Label>
//             <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
//           </div>
//           <div className="space-y-2">
//             <Label>Description *</Label>
//             <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows={3} />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//           <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// const FinancePage = () => {
//   const { toast } = useToast();
//   const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
//   const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [exporting, setExporting] = useState(false);
  
//   // Pagination states
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [activeTab, setActiveTab] = useState("codhistory");
//    let datelist=[]
//          for(let i=0;i<7;i++){
//           const date = new Date();
//           date.setDate(date.getDate() + i);
//           const currentDayName = date.toLocaleDateString("en-US", { weekday: "long" });
//           if(currentDayName === "Saturday" || currentDayName === "Wednesday"){
//             datelist.push(date.toISOString().split('T')[0]);
//           }
//          }
  
//   // Search states
//   const [searchTerm, setSearchTerm] = useState("");
  
//   // Date filter states
//   const [codDateRange, setCodDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [walletDateRange, setWalletDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [showDateFilter, setShowDateFilter] = useState(false);
  
//   const [summary, setSummary] = useState({
//     totalGenerated: 0,
//     totalPaid: 0,
//     nextRemittance: "2026-05-23",
//     nextAmount: 0,
//     totalDue: 0,
//   });

//   // Helper function to convert any date format to YYYY-MM-DD
//   const convertToISODate = (dateInput: any): string => {
//     if (!dateInput) return "";
    
//     try {
//       // If it's already a string in YYYY-MM-DD format
//       if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
//         return dateInput.split('T')[0];
//       }
      
//       // If it's a date object or timestamp
//       const date = new Date(dateInput);
//       if (!isNaN(date.getTime())) {
//         return date.toISOString().split('T')[0];
//       }
      
//       return "";
//     } catch (error) {
//       console.error("Date conversion error:", error);
//       return "";
//     }
//   };

//   // Helper function to format date to DD-MM-YYYY for display
//   const formatDateToDDMMYYYY = (dateString: string) => {
//     if (!dateString) return "-";
//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return "-";
//       const day = String(date.getDate()).padStart(2, "0");
//       const month = String(date.getMonth() + 1).padStart(2, "0");
//       const year = date.getFullYear();
//       return `${day}-${month}-${year}`;
//     } catch {
//       return "-";
//     }
//   };

//   const formatTime = (dateString: string) => {
//     if (!dateString) return "-";
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return "-";
//     return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
//   };

//   const formatAmount = (amount: number | string) => {
//     let numAmount = typeof amount === 'string' ? parseFloat(amount.replace('₹', '').replace(/,/g, '')) : amount;
//     if (isNaN(numAmount)) numAmount = 0;
//     return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   };

//   const getDeliveredDetailsFromOrder = (order: any) => {
//     if (order.updatedAt && order.status === "Delivered") {
//       return {
//         deliveredDate: formatDateToDDMMYYYY(order.deliveredDate),
//         deliveredTime: formatTime(order.deliveredTime)
//       };
//     }
    
//     if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//       const deliveredEvent = order.tracking_history.find(
//         (event: any) => event.state === "DELIVERED"
//       );
      
//       if (deliveredEvent && deliveredEvent.deliveredDate) {
//         return {
//           deliveredDate: formatDateToDDMMYYYY(deliveredEvent.deliveredDate),
//           deliveredTime: formatTime(deliveredEvent.deliveredTime)
//         };
//       }
//     }
    
//     return { deliveredDate: "-", deliveredTime: "-" };
//   };

//   const getAWBNumber = (order: any) => {
//     return order.trackingnumber || order.awb || order.awbNumber || "-";
//   };

//   const fetchOrderDetails = async (orderId: string) => {
//     try {
//       const response = await fetch(
//         `https://app.logixmitra.com/api/api/orders/${orderId}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       );
//         const data2=await sellerApi.getAll()
//              for(let x of data2){
//               temp[x.id]=x
//             }
//       if (response.ok) {
//         return await respoense.json();
//       }
//     } catch (error) {
//       console.error(`Failed to fetch order details for ${orderId}:`, error);
//     }
//     return null;
//   };

//   // Filter COD data based on search term and date range
//   const filteredCodHistory = useMemo(() => {
//     let filtered = [...codHistory];
    
//     // Apply search filter
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.orderId.toLowerCase().includes(term) ||
//         item.courier.toLowerCase().includes(term) ||
//         item.seller?.toLowerCase().includes(term) ||
//         item.awbNumber.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term) ||
//         item.invoiceAmount.toLowerCase().includes(term) ||
//         item.codAmount.toLowerCase().includes(term)
//       );
//     }
    
//     // Apply date filter for COD
//     if (codDateRange.from || codDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.orderDateISO;
        
//         if (!itemDate || itemDate === "") {
//           return false;
//         }
        
//         if (codDateRange.from && codDateRange.to) {
//           return itemDate >= codDateRange.from && itemDate <= codDateRange.to;
//         } else if (codDateRange.from) {
//           return itemDate >= codDateRange.from;
//         } else if (codDateRange.to) {
//           return itemDate <= codDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [codHistory, searchTerm, codDateRange]);

//   // Filter wallet data based on search term and date range
//   const filteredWalletHistory = useMemo(() => {
//     let filtered = [...walletHistory];
    
//     // Apply search filter - includes Order Number search
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.transactionId.toLowerCase().includes(term) ||
//         item.orderNumber.toLowerCase().includes(term) ||
//         item.description.toLowerCase().includes(term) ||
//         item.type.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term) ||
//         item.amount.toLowerCase().includes(term)
//       );
//     }
    
//     // Apply date filter for Wallet
//     if (walletDateRange.from || walletDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.dateISO;
        
//         if (!itemDate || itemDate === "") {
//           return false;
//         }
        
//         if (walletDateRange.from && walletDateRange.to) {
//           return itemDate >= walletDateRange.from && itemDate <= walletDateRange.to;
//         } else if (walletDateRange.from) {
//           return itemDate >= walletDateRange.from;
//         } else if (walletDateRange.to) {
//           return itemDate <= walletDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [walletHistory, searchTerm, walletDateRange]);

//   const handleCodDateFromChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleCodDateToChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateFromChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateToChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const clearCodDateFilter = () => {
//     setCodDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   const clearWalletDateFilter = () => {
//     setWalletDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   // Get column widths for Excel
//   const getColumnWidths = (data: any[]) => {
//     if (!data || data.length === 0) return [];
    
//     const widths: number[] = [];
//     const headers = Object.keys(data[0]);
    
//     headers.forEach((header, idx) => {
//       let maxLength = header.length;
      
//       data.forEach(row => {
//         const value = String(row[header] || '');
//         maxLength = Math.max(maxLength, value.length);
//       });
      
//       widths[idx] = Math.min(maxLength, 50);
//     });
    
//     return widths;
//   };

//   // Export to Excel
//   const exportToExcel = async (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
//     toast({ title: "Processing", description: "Preparing export..." });
    
//     try {
//       const XLSX = await loadXLSX();
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let worksheetData;
      
//       if (type === "COD History") {
//         worksheetData = dataToExport.map((item: CODHistoryItem) => ({
//           "Order ID": item.orderId,
//           "Order Date": item.orderDate,
//           "Courier": item.courier,
//           "AWB Number": item.awbNumber,
//           "Invoice Amount": item.invoiceAmount,
//           "COD Amount": item.codAmount,
//           "Delivered Date": item.deliveredDate,
//           "Delivered Time": item.deliveredTime,
//           "Status": item.status.toUpperCase()
//         }));
//       } else {
//         worksheetData = dataToExport.map((item: WalletHistoryItem) => ({
//           "Transaction ID": item.transactionId,
//           "Order Number": item.orderNumber || "-",
//           "Type": item.type.toUpperCase(),
//           "Amount": item.amount,
//           "Description": item.description,
//           "Date": item.date,
//           "Status": item.status
//         }));
//       }
      
//       const worksheet = XLSX.utils.json_to_sheet(worksheetData);
//       const maxWidths = getColumnWidths(worksheetData);
//       worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
      
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, type);
      
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       XLSX.writeFile(workbook, `${type.replace(" ", "_")}_${timestamp}.xlsx`);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records successfully!` 
//       });
//     } catch (error) {
//       console.error("Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export data. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   // Export to CSV
//   const exportToCSV = (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
    
//     try {
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let csvContent = "";
//       let headers: string[] = [];
//       let rows: any[][] = [];
      
//       if (type === "COD History") {
//         headers = ["Order ID", "Order Date", "Courier", "AWB Number", "Invoice Amount", "COD Amount", "Delivered Date", "Delivered Time", "Status"];
//         rows = dataToExport.map((item: CODHistoryItem) => [
//           item.orderId,
//           item.orderDate,
//           item.courier,
//           item.awbNumber,
//           item.invoiceAmount,
//           item.codAmount,
//           item.deliveredDate,
//           item.deliveredTime,
//           item.status
//         ]);
//       } else {
//         headers = ["Transaction ID", "Order Number", "Type", "Amount", "Description", "Date", "Status"];
//         rows = dataToExport.map((item: WalletHistoryItem) => [
//           item.transactionId,
//           item.orderNumber || "-",
//           item.type,
//           item.amount,
//           item.description,
//           item.date,
//           item.status
//         ]);
//       }
      
//       const escapeCSV = (cell: any) => {
//         if (cell === null || cell === undefined) return '""';
//         const str = String(cell);
//         if (str.includes(',') || str.includes('"') || str.includes('\n')) {
//           return `"${str.replace(/"/g, '""')}"`;
//         }
//         return str;
//       };
      
//       csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
      
//       const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.href = url;
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       link.setAttribute("download", `${type.replace(" ", "_")}_${timestamp}.csv`);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records as CSV!` 
//       });
//     } catch (error) {
//       console.error("CSV Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export CSV. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   const fetchAllData = async () => {
//     setLoading(true);
//     try {
//       // Fetch wallet transactions
//       const walletResponse: WalletTransaction[] = await fetch(
//         getuser()?.role === "admin"
//           ? "https://app.logixmitra.com/api/api/wallets"
//           : `https://app.logixmitra.com/api/api/wallets/users/${getuser()?.id}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       ).then(res => res.json());

//       let ordersData = await orderApi.getAll();
      
//       if (!Array.isArray(ordersData)) {
//         ordersData = [];
//       }

//       // Filter to only COD orders
//       const codOnlyOrders = ordersData.filter((order: any) => {
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         return paymentGateway === "Cash on Delivery (COD)" || 
//                paymentGateway === "COD" ||
//                paymentGateway?.toLowerCase() === "cod" ||
//                paymentGateway?.toLowerCase() === "cash on delivery" ||
//                paymentType === "COD" ||
//                paymentType === "Cash on Delivery";
//       });

//       // Fetch details for COD orders only
//       const ordersWithDetails = await Promise.all(
//         codOnlyOrders.map(async (order: any) => {
//           if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//             return order;
//           }
//           const detailedOrder = await fetchOrderDetails(order.id);
//           return detailedOrder || order;
//         })
//       );

//       const walletHistoryData: WalletHistoryItem[] = [];
//       const codHistoryData: CODHistoryItem[] = [];
      
//       let totalGenerated = 0;
//       let totalPaid = 0;
//       let totalDue = 0;

//       // Sort wallet response
//       if (Array.isArray(walletResponse)) {
//         walletResponse.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//       }

//       // Process wallet transactions
//       if (Array.isArray(walletResponse)) {
//         for (const item of walletResponse) {
//           if (item.status === "draft") continue;
          
//           let type: "credit" | "debit" = "debit";
//           let displayStatus = item.status;
          
//           if (item.status === "Approved" && item.amount > 0 && !item.orderNumber) {
//             type = "credit";
//             displayStatus = "Credited";
//           } else if (item.status === "Debited" || (item.status === "Approved" && item.orderNumber)) {
//             type = "debit";
//             displayStatus = "Debited";
//           } else if (item.status === "Refund") {
//             type = "credit";
//             displayStatus = "Refund";
//           }

//           const createdAt = item.createdAt;
//           const dateISO = convertToISODate(createdAt);
//           const displayDate = formatDateToDDMMYYYY(createdAt);
          
//           walletHistoryData.push({
//             id: item.id.toString(),
//             transactionId: item.transid || item.id.toString(),
//             orderNumber: item.orderNumber || "-",
//             type: type,
//             amount: formatAmount(item.amount),
//             balance: formatAmount(item.amount),
//             description: item.description || (type === "credit" ? "Wallet Credit" : "Wallet Debit"),
//             date: displayDate,
//             dateISO: dateISO,
//             status: displayStatus,
//           });
//         }
//       }

//       // Process COD orders
//       for (const order of ordersWithDetails) {
//         if (!order || !order.orderNumber) continue;
        
//         // Only include delivered orders
//         if (order.status !== "Delivered") continue;
        
//         // Check if it's actually a COD order
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         const isCOD = paymentGateway === "Cash on Delivery (COD)" || 
//                       paymentGateway === "COD" ||
//                       paymentGateway?.toLowerCase() === "cod" ||
//                       paymentGateway?.toLowerCase() === "cash on delivery" ||
//                       paymentType === "COD" ||
//                       paymentType === "Cash on Delivery";
        
//         if (!isCOD) continue;
        
//         let codAmount = order.amount || 0;
        
//         if (typeof codAmount === 'string') {
//           codAmount = parseFloat(codAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         let invoiceAmount = order.amount || order.invoiceAmount || 0;
        
//         if (typeof invoiceAmount === 'string') {
//           invoiceAmount = parseFloat(invoiceAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         const isSettled = order.codpaidstatus !== "Due" || order.codpaidstatus !== "Pending";
//         const orderStatus = isSettled ? "settled" : "pending";
        
//         const { deliveredDate, deliveredTime } = getDeliveredDetailsFromOrder(order);
//         const awbNumber = getAWBNumber(order);
//         let datedelivered = new Date(deliveredDate.split('-').reverse().join('-') );
//         let dateone=new Date(datelist[0]);
//          let datetwo=new Date(datelist[1]);
        


//          if(dateone.getTime()>=(datedelivered.getTime()+(86400000*7)) || datetwo.getTime()>(datedelivered.getTime()+(86400000*7))){

        
        
//         // Use createdAt field for order date filtering
//         const orderDateValue = order.createdAt || order.orderDate;
        
//         // Convert to ISO date for filtering (YYYY-MM-DD)
//         const orderDateISO = convertToISODate(orderDateValue);
//         const orderDateDisplay = formatDateToDDMMYYYY(orderDateValue);
        
//         codHistoryData.push({
//           id: order.id || order.orderNumber,
//           orderId: order.orderNumber,
//           orderDate: orderDateDisplay,
//           orderDateISO: orderDateISO,
//           courier: order.courier || "Not Assigned",
//           awbNumber: awbNumber,
//           seller:temp[order.seller]?.name || order.seller, 
//           invoiceAmount: formatAmount(invoiceAmount),
//           codAmount: formatAmount(codAmount),
//           deliveredDate: deliveredDate,
//           deliveredTime: deliveredTime,
//           codstate:order.codpaidstatus==="Settled" ? "Settled" : "Pending",
//         });
        
//         const numCodAmount = typeof codAmount === 'number' ? codAmount : parseFloat(codAmount);
//         if (!isNaN(numCodAmount) && numCodAmount > 0) {
//           totalGenerated += numCodAmount;
//           if (isSettled) {
//             totalPaid += numCodAmount;
//           } else {
//             totalDue += numCodAmount;
//           }
//         }

//       }





//       }

//       // Sort COD history by date (newest first)
//       codHistoryData.sort((a, b) => {
//         if (!a.orderDateISO && !b.orderDateISO) return 0;
//         if (!a.orderDateISO) return 1;
//         if (!b.orderDateISO) return -1;
//         return b.orderDateISO.localeCompare(a.orderDateISO);
//       });
     


   





//       setWalletHistory(walletHistoryData);
//       setCodHistory(codHistoryData);
//       setSummary({
//         totalGenerated,
//         totalPaid,
//         nextRemittance: datelist.join(" & "),
//         nextAmount: totalDue,
//         totalDue,
//       });
      
//     } catch (error) {
//       console.error("Failed to fetch data:", error);
//       toast({ title: "Error", description: "Failed to load finance data", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   const getCurrentPageData = (data: any[]) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return data.slice(startIndex, endIndex);
//   };

//   const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);
  
//   const currentDisplayData = activeTab === "codhistory" ? filteredCodHistory : filteredWalletHistory;
//   const currentData = getCurrentPageData(currentDisplayData);
//   const currentTotalPages = totalPages(currentDisplayData);

//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//   };

//   const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setItemsPerPage(Number(e.target.value));
//     setCurrentPage(1);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//     setCurrentPage(1);
//   };

//   const clearSearch = () => {
//     setSearchTerm("");
//     setCurrentPage(1);
//   };

//   const totalOrders = codHistory.length;
//   const settledOrders = codHistory.filter(item => item.status === "settled").length;
//   const pendingOrders = codHistory.filter(item => item.status === "pending").length;

//   // Check if date filter is active
//   const isCodDateFilterActive = codDateRange.from !== "" || codDateRange.to !== "";
//   const isWalletDateFilterActive = walletDateRange.from !== "" || walletDateRange.to !== "";

//   const getSearchPlaceholder = () => {
//     if (activeTab === "codhistory") {
//       return "Search COD orders by Order ID, Courier, AWB, Status...";
//     } else {
//       return "Search wallet by Transaction ID, Order Number, Description, Status...";
//     }
//   };

//   return (
//     <DashboardLayout title="Finance & COD" subtitle="Track revenue, settlements, wallets, and invoices">
//       <CreateTransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchAllData} />

//       <div className="space-y-6">
//         {/* Summary Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Remittance Generated" value={formatAmount(summary.totalGenerated)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
//           <StatCard title="Total Remittance Paid" value={formatAmount(summary.totalPaid)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
//           <StatCard title={`Next Remittance (${summary.nextRemittance})`} value={formatAmount(summary.nextAmount)} icon={<Clock className="h-5 w-5" />} variant="warning" />
//           <StatCard title="Total Remittance Due" value={formatAmount(summary.totalDue)} icon={<IndianRupee className="h-5 w-5" />} variant="destructive" />
//         </div>

//         {/* Additional Stats */}
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Total COD Orders</p>
//                   <p className="text-2xl font-bold">{totalOrders}</p>
//                 </div>
//                 <Package className="h-8 w-8 text-muted-foreground" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Settled COD Orders</p>
//                   <p className="text-2xl font-bold text-green-600">{settledOrders}</p>
//                 </div>
//                 <CheckCircle className="h-8 w-8 text-green-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Pending COD Orders</p>
//                   <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
//                 </div>
//                 <Clock className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs defaultValue="codhistory" onValueChange={(value) => {
//           setActiveTab(value);
//           setCurrentPage(1);
//           setSearchTerm("");
//         }}>
//           <TabsList className="flex-wrap">
//             <TabsTrigger value="wallet">Wallet History</TabsTrigger>
//             <TabsTrigger value="codhistory">COD History</TabsTrigger>
//           </TabsList>

//           {/* Search and Filter Bar */}
//           <div className="mt-4 mb-4 space-y-3">
//             <div className="flex flex-wrap gap-3 items-center justify-between">
//               <div className="relative max-w-md flex-1 min-w-[200px]">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder={getSearchPlaceholder()}
//                   value={searchTerm}
//                   onChange={handleSearch}
//                   className="pl-9 pr-10"
//                 />
//                 {searchTerm && (
//                   <button
//                     onClick={clearSearch}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                   >
//                     <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
//                   </button>
//                 )}
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setShowDateFilter(!showDateFilter)}
//                 className="gap-2"
//               >
//                 <Filter className="h-4 w-4" />
//                 {showDateFilter ? "Hide Date Filter" : "Show Date Filter"}
//                 {((activeTab === "codhistory" && isCodDateFilterActive) ||
//                   (activeTab === "wallet" && isWalletDateFilterActive)) && (
//                   <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
//                 )}
//               </Button>
//             </div>
            
//             {showDateFilter && (
//               <div className="p-4 border rounded-lg bg-muted/30">
//                 {activeTab === "codhistory" ? (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Order Date From</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.from}
//                         onChange={(e) => handleCodDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                         placeholder="Select start date"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Order Date To</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.to}
//                         onChange={(e) => handleCodDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                         placeholder="Select end date"
//                       />
//                     </div>
//                     {isCodDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearCodDateFilter} className="mb-0.5">
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 ) : (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date From</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.from}
//                         onChange={(e) => handleWalletDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                         placeholder="Select start date"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date To</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.to}
//                         onChange={(e) => handleWalletDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                         placeholder="Select end date"
//                       />
//                     </div>
//                     {isWalletDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearWalletDateFilter} className="mb-0.5">
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {searchTerm && (
//               <p className="text-sm text-muted-foreground">
//                 Found {currentDisplayData.length} result(s) for "{searchTerm}"
//               </p>
//             )}
//             {((activeTab === "codhistory" && isCodDateFilterActive) ||
//               (activeTab === "wallet" && isWalletDateFilterActive)) && (
//               <p className="text-sm text-blue-600">
//                 📅 Date filter applied • Showing {currentDisplayData.length} records in selected date range
//               </p>
//             )}
//           </div>

//           {/* Wallet History Tab */}
//           <TabsContent value="wallet" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <div className="flex items-center">
//                   <CardTitle>Wallet History</CardTitle>
//                   {getuser()?.role === "admin" && (
//                     <Button onClick={() => setModalOpen(true)} className="ml-4">
//                       <Plus className="h-4 w-4 mr-1" /> New Transaction
//                     </Button>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[800px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Transaction ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Type</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Description</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center">
//                             {searchTerm || isWalletDateFilterActive ? "No matching wallet transactions found." : "No wallet transactions found."}
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: WalletHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.transactionId}</td>
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderNumber}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                                 {item.type === "credit" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
//                                 {item.type === "credit" ? "Credit" : "Debit"}
//                               </span>
//                             </td>
//                             <td className={`py-3 px-4 text-sm font-semibold ${item.type === "credit" ? "text-green-600" : "text-red-600"}`}>{item.amount}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txnStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {/* Pagination for Wallet History */}
//                 {!loading && filteredWalletHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredWalletHistory.length)} of {filteredWalletHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(1)}
//                         disabled={currentPage === 1}
//                       >
//                         First
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage - 1)}
//                         disabled={currentPage === 1}
//                       >
//                         <ChevronLeft className="h-4 w-4" />
//                       </Button>
//                       <span className="px-3 py-1 text-sm">
//                         Page {currentPage} of {currentTotalPages}
//                       </span>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage + 1)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         <ChevronRight className="h-4 w-4" />
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentTotalPages)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         Last
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* COD History Tab */}
//           <TabsContent value="codhistory" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <CardTitle>COD History</CardTitle>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[1200px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order ID</th>

//                         <th className="text-left py-3 px-4 text-xs font-semibold">Seller</th>

//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Courier</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">AWB Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Invoice Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">COD Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Time</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={9} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={9} className="py-8 text-center">
//                             {searchTerm || isCodDateFilterActive ? "No matching COD orders found." : "No COD history found."}
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: CODHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderId}</td>
//                             <td className="py-3 px-4 text-sm font-mono">{ item.seller}</td>

//                             <td className="py-3 px-4 text-sm whitespace-nowrap">{item.orderDate}</td>
//                             <td className="py-3 px-4 text-sm">
//                               <div className="flex items-center gap-1">
//                                 <Truck className="h-3 w-3 flex-shrink-0" />
//                                 <span className="truncate max-w-[150px]" title={item.courier}>{item.courier}</span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-mono">
//                               <span className="text-blue-600 font-medium">{item.awbNumber}</span>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-semibold">{item.invoiceAmount}</td>
//                             <td className="py-3 px-4 text-sm font-semibold text-green-600">{item.codAmount}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredDate !== "-" ? "text-green-600 font-medium" : "text-muted-foreground"}>
//                                   {item.deliveredDate}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <span className={item.deliveredTime !== "-" ? "text-green-600" : "text-muted-foreground"}>
//                                 {item.deliveredTime}
//                               </span>
//                             </td>

//                             <td className="py-3 px-4">
//                               {getuser()=== "admin" && (
//                                 <select 
//                                   defaultValue={item.codstate} 
//                                   onChange={()=>{

//                         }}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={"Pending"}>Pending</option>
//                         <option value={"Settled"}>Settled</option>
                  
//                       </select>)
// }

//                              {getuser()=== "admin" && (<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[item.status]}`}>
//                                 {item.status}
//                               </span>
//                              )}
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {/* Pagination for COD History */}
//                 {!loading && filteredCodHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCodHistory.length)} of {filteredCodHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(1)}
//                         disabled={currentPage === 1}
//                       >
//                         First
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage - 1)}
//                         disabled={currentPage === 1}
//                       >
//                         <ChevronLeft className="h-4 w-4" />
//                       </Button>
//                       <span className="px-3 py-1 text-sm">
//                         Page {currentPage} of {currentTotalPages}
//                       </span>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentPage + 1)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         <ChevronRight className="h-4 w-4" />
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handlePageChange(currentTotalPages)}
//                         disabled={currentPage === currentTotalPages}
//                       >
//                         Last
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default FinancePage;


// import { useState, useEffect, useMemo } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, Plus, Calendar, Truck, Package, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, X, Filter } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { orderApi } from "../../services/orderApi";
// import { sellerApi } from "../../services/sellerApi";
// import { getuser } from "../../services/getbasicdata";
// import { Textarea } from "@/components/ui/textarea";
// import { apiRequest } from "../../src/apiglobal/apiconfig";
// import Select1 from "react-select";

// // Lazy load xlsx to prevent initial load issues
// const loadXLSX = async () => {
//   return await import('xlsx');
// };

// // Types
// interface CreateTransactionModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess?: () => void;
// }

// interface WalletTransaction {
//   id: number;
//   user_id: number;
//   transid: string;
//   orderNumber: string | null;
//   amount: number;
//   status: string;
//   description: string;
//   createdAt: string;
//   type?: "credit" | "debit";
//   order?: any;
// }

// interface CODHistoryItem {
//   id: string;
//   orderId: string;
//   orderDate: string;
//   orderDateISO: string;
//   courier: string;
//   awbNumber: string;
//   invoiceAmount: string;
//   codAmount: string;
//   seller?: string;
//   deliveredDate: string;
//   deliveredTime: string;
//   status: "pending" | "settled" | "overdue";
//   codstate?: string;
// }

// interface WalletHistoryItem {
//   id: string;
//   transactionId: string;
//   type: "credit" | "debit";
//   amount: string;
//   balance: string;
//   orderNumber: string;
//   description: string;
//   date: string;
//   dateISO: string;
//   status: string;
// }

// interface DateRange {
//   from: string;
//   to: string;
// }

// const codStatusStyles = {
//   settled: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   overdue: "bg-red-100 text-red-700",
// };

// const txnStatusStyles: Record<string, string> = {
//   completed: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   failed: "bg-red-100 text-red-700",
//   Debited: "bg-red-100 text-red-700",
//   Credited: "bg-green-100 text-green-700",
//   Approved: "bg-green-100 text-green-700",
//   rejected: "bg-red-100 text-red-700",
//   Refund: "bg-blue-100 text-blue-700",
// };

// // Global temp object for seller mapping
// let sellerMap: Record<string, any> = {};

// function CreateTransactionModal({ open, onOpenChange, onSuccess }: CreateTransactionModalProps) {
//   const { toast } = useToast();
//   const [selectedOrderId, setSelectedOrderId] = useState<string>("");
//   const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
//   const [amount, setAmount] = useState<number>(0);
//   const [description, setDescription] = useState<string>("");
//   const [orders, setOrders] = useState<{ value: string; label: string }[]>([]);
//   const [submitting, setSubmitting] = useState(false);

//   const fetchOrders = async () => {
//     try {
//       const data = await orderApi.getAll();
//       const options = data.map((x: any) => ({ value: x.id, label: `${x.orderNumber} - ${x.amount}` }));
//       setOrders(options);
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   const handleSubmit = async () => {
//     if (!selectedOrderId) {
//       toast({ title: "Validation Error", description: "Please select an order", variant: "destructive" });
//       return;
//     }
//     if (amount <= 0) {
//       toast({ title: "Validation Error", description: "Amount must be greater than zero", variant: "destructive" });
//       return;
//     }
//     if (!description.trim()) {
//       toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await apiRequest("POST", "tracking/transactions", {
//         orderId: selectedOrderId,
//         type: transactionType,
//         amount,
//         description: description.trim(),
//       }, {});
//       toast({ title: "Success", description: "Transaction created successfully" });
//       setSelectedOrderId("");
//       setTransactionType("credit");
//       setAmount(0);
//       setDescription("");
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader><DialogTitle>Create New Transaction</DialogTitle></DialogHeader>
//         <div className="space-y-4 py-2">
//           <div className="space-y-2">
//             <Label>Select Order *</Label>
//             <Select1 options={orders} onChange={(option: any) => { setSelectedOrderId(option.value); }} />
//           </div>
//           <div className="space-y-2">
//             <Label>Select Type *</Label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="credit" checked={transactionType === "credit"} onChange={() => setTransactionType("credit")} /> Credit
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="debit" checked={transactionType === "debit"} onChange={() => setTransactionType("debit")} /> Debit
//               </label>
//             </div>
//           </div>
//           <div className="space-y-2">
//             <Label>Amount *</Label>
//             <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
//           </div>
//           <div className="space-y-2">
//             <Label>Description *</Label>
//             <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows={3} />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//           <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// // Helper function to get next remittance dates (Wednesdays and Saturdays)
// const getNextRemittanceDates = () => {
//   const datelist: string[] = [];
//   for (let i = 0; i < 7; i++) {
//     const date = new Date();
//     date.setDate(date.getDate() + i);
//     const currentDayName = date.toLocaleDateString("en-US", { weekday: "long" });
//     if (currentDayName === "Saturday" || currentDayName === "Wednesday") {
//       datelist.push(date.toISOString().split('T')[0]);
//     }
//   }
//   return datelist.join(" & ");
// };

// const FinancePage = () => {
//   const { toast } = useToast();
//   const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
//   const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [exporting, setExporting] = useState(false);
  
//   // Pagination states
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [activeTab, setActiveTab] = useState("codhistory");
  
//   // Search states
//   const [searchTerm, setSearchTerm] = useState("");
  
//   // Date filter states
//   const [codDateRange, setCodDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [walletDateRange, setWalletDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [showDateFilter, setShowDateFilter] = useState(false);
  
//   const [summary, setSummary] = useState({
//     totalGenerated: 0,
//     totalPaid: 0,
//     nextRemittance: getNextRemittanceDates(),
//     nextAmount: 0,
//     totalDue: 0,
//   });

//   // Helper function to convert any date format to YYYY-MM-DD
//   const convertToISODate = (dateInput: any): string => {
//     if (!dateInput) return "";
    
//     try {
//       if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
//         return dateInput.split('T')[0];
//       }
      
//       const date = new Date(dateInput);
//       if (!isNaN(date.getTime())) {
//         return date.toISOString().split('T')[0];
//       }
      
//       return "";
//     } catch (error) {
//       console.error("Date conversion error:", error);
//       return "";
//     }
//   };

//   // Helper function to format date to DD-MM-YYYY for display
//   const formatDateToDDMMYYYY = (dateString: string) => {
//     if (!dateString) return "-";
//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return "-";
//       const day = String(date.getDate()).padStart(2, "0");
//       const month = String(date.getMonth() + 1).padStart(2, "0");
//       const year = date.getFullYear();
//       return `${day}-${month}-${year}`;
//     } catch {
//       return "-";
//     }
//   };

//   // IMPROVED: Better time extraction from datetime
//   const extractTimeFromDate = (dateTimeString: string): string => {
//     if (!dateTimeString) return "-";
    
//     try {
//       // If it's a full ISO datetime string like "2025-05-27T14:30:00.000Z" or "2025-05-27 14:30:00"
//       const date = new Date(dateTimeString);
//       if (!isNaN(date.getTime())) {
//         return date.toLocaleTimeString('en-IN', { 
//           hour: '2-digit', 
//           minute: '2-digit', 
//           hour12: true 
//         });
//       }
      
//       // Try to extract time using regex if date parsing fails
//       const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
//       if (timeMatch) {
//         let hour = parseInt(timeMatch[1]);
//         const minute = timeMatch[2];
//         const ampm = hour >= 12 ? 'PM' : 'AM';
//         hour = hour % 12 || 12;
//         return `${hour}:${minute} ${ampm}`;
//       }
      
//       return "-";
//     } catch (error) {
//       console.error("Time extraction error:", error);
//       return "-";
//     }
//   };

//   const formatAmount = (amount: number | string) => {
//     let numAmount = typeof amount === 'string' ? parseFloat(amount.replace('₹', '').replace(/,/g, '')) : amount;
//     if (isNaN(numAmount)) numAmount = 0;
//     return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   };

//   // IMPROVED: Better delivery details extraction
//   const getDeliveredDetailsFromOrder = (order: any) => {
//     console.log("Processing order for delivery details:", order.orderNumber);
//     console.log("Order data:", order);
    
//     let deliveryDateTime = null;
    
//     // Try multiple sources to find delivery date/time
    
//     // 1. Check direct deliveredDateTime field
//     if (order.deliveredDateTime) {
//       deliveryDateTime = order.deliveredDateTime;
//       console.log("Found deliveredDateTime:", deliveryDateTime);
//     }
    
//     // 2. Check deliveredAt field
//     else if (order.deliveredAt) {
//       deliveryDateTime = order.deliveredAt;
//       console.log("Found deliveredAt:", deliveryDateTime);
//     }
    
//     // 3. Check deliveredDate + deliveredTime combination
//     else if (order.deliveredDate && order.deliveredTime) {
//       deliveryDateTime = `${order.deliveredDate} ${order.deliveredTime}`;
//       console.log("Combined deliveredDate + deliveredTime:", deliveryDateTime);
//     }
    
//     // 4. Check deliveredDate only (might contain time)
//     else if (order.deliveredDate) {
//       deliveryDateTime = order.deliveredDate;
//       console.log("Found deliveredDate:", deliveryDateTime);
//     }
    
//     // 5. Check updatedAt if status is Delivered
//     else if (order.updatedAt && order.status === "Delivered") {
//       deliveryDateTime = order.updatedAt;
//       console.log("Found updatedAt:", deliveryDateTime);
//     }
    
//     // 6. Check tracking history for delivered event
//     else if (order.tracking_history && Array.isArray(order.tracking_history)) {
//       const deliveredEvent = order.tracking_history.find(
//         (event: any) => 
//           event.state === "DELIVERED" || 
//           event.status === "DELIVERED" ||
//           event.event === "DELIVERED"
//       );
      
//       if (deliveredEvent) {
//         deliveryDateTime = deliveredEvent.deliveredDate || 
//                           deliveredEvent.deliveredAt || 
//                           deliveredEvent.createdAt || 
//                           deliveredEvent.timestamp ||
//                           deliveredEvent.date;
//         console.log("Found from tracking history:", deliveryDateTime);
//       }
//     }
    
//     // 7. Check status_history
//     else if (order.status_history && Array.isArray(order.status_history)) {
//       const deliveredStatus = order.status_history.find(
//         (s: any) => s.status === "Delivered" || s.status === "DELIVERED"
//       );
//       if (deliveredStatus && deliveredStatus.timestamp) {
//         deliveryDateTime = deliveredStatus.timestamp;
//         console.log("Found from status_history:", deliveryDateTime);
//       }
//     }
    
//     // If we found a delivery datetime, extract date and time
//     if (deliveryDateTime) {
//       const formattedDate = formatDateToDDMMYYYY(deliveryDateTime);
//       const formattedTime = extractTimeFromDate(deliveryDateTime);
//       console.log(`Extracted: Date=${formattedDate}, Time=${formattedTime}`);
//       return {
//         deliveredDate: formattedDate,
//         deliveredTime: formattedTime
//       };
//     }
    
//     console.log("No delivery details found for order:", order.orderNumber);
//     return { deliveredDate: "-", deliveredTime: "-" };
//   };

//   const getAWBNumber = (order: any) => {
//     return order.trackingnumber || order.awb || order.awbNumber || "-";
//   };

//   const fetchOrderDetails = async (orderId: string) => {
//     try {
//       const response = await fetch(
//         `https://app.logixmitra.com/api/api/orders/${orderId}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       );
//       if (response.ok) {
//         return await response.json();
//       }
//     } catch (error) {
//       console.error(`Failed to fetch order details for ${orderId}:`, error);
//     }
//     return null;
//   };

//   // Filter COD data based on search term and date range
//   const filteredCodHistory = useMemo(() => {
//     let filtered = [...codHistory];
    
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.orderId.toLowerCase().includes(term) ||
//         item.courier.toLowerCase().includes(term) ||
//         (item.seller && item.seller.toLowerCase().includes(term)) ||
//         item.awbNumber.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term)
//       );
//     }
    
//     if (codDateRange.from || codDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.orderDateISO;
//         if (!itemDate || itemDate === "") return false;
        
//         if (codDateRange.from && codDateRange.to) {
//           return itemDate >= codDateRange.from && itemDate <= codDateRange.to;
//         } else if (codDateRange.from) {
//           return itemDate >= codDateRange.from;
//         } else if (codDateRange.to) {
//           return itemDate <= codDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [codHistory, searchTerm, codDateRange]);

//   // Filter wallet data based on search term and date range
//   const filteredWalletHistory = useMemo(() => {
//     let filtered = [...walletHistory];
    
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.transactionId.toLowerCase().includes(term) ||
//         item.orderNumber.toLowerCase().includes(term) ||
//         item.description.toLowerCase().includes(term) ||
//         item.type.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term)
//       );
//     }
    
//     if (walletDateRange.from || walletDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.dateISO;
//         if (!itemDate || itemDate === "") return false;
        
//         if (walletDateRange.from && walletDateRange.to) {
//           return itemDate >= walletDateRange.from && itemDate <= walletDateRange.to;
//         } else if (walletDateRange.from) {
//           return itemDate >= walletDateRange.from;
//         } else if (walletDateRange.to) {
//           return itemDate <= walletDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [walletHistory, searchTerm, walletDateRange]);

//   const handleCodDateFromChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleCodDateToChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateFromChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateToChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const clearCodDateFilter = () => {
//     setCodDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   const clearWalletDateFilter = () => {
//     setWalletDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   // Get column widths for Excel
//   const getColumnWidths = (data: any[]) => {
//     if (!data || data.length === 0) return [];
    
//     const widths: number[] = [];
//     const headers = Object.keys(data[0]);
    
//     headers.forEach((header, idx) => {
//       let maxLength = header.length;
//       data.forEach(row => {
//         const value = String(row[header] || '');
//         maxLength = Math.max(maxLength, value.length);
//       });
//       widths[idx] = Math.min(maxLength, 50);
//     });
    
//     return widths;
//   };

//   // Export to Excel
//   const exportToExcel = async (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
//     toast({ title: "Processing", description: "Preparing export..." });
    
//     try {
//       const XLSX = await loadXLSX();
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let worksheetData;
      
//       if (type === "COD History") {
//         worksheetData = dataToExport.map((item: CODHistoryItem) => ({
//           "Order ID": item.orderId,
//           "Order Date": item.orderDate,
//           "Seller": item.seller || "-",
//           "Courier": item.courier,
//           "AWB Number": item.awbNumber,
//           "Invoice Amount": item.invoiceAmount,
//           "COD Amount": item.codAmount,
//           "Delivered Date": item.deliveredDate,
//           "Delivered Time": item.deliveredTime,
//           "Status": item.status.toUpperCase()
//         }));
//       } else {
//         worksheetData = dataToExport.map((item: WalletHistoryItem) => ({
//           "Transaction ID": item.transactionId,
//           "Order Number": item.orderNumber || "-",
//           "Type": item.type.toUpperCase(),
//           "Amount": item.amount,
//           "Description": item.description,
//           "Date": item.date,
//           "Status": item.status
//         }));
//       }
      
//       const worksheet = XLSX.utils.json_to_sheet(worksheetData);
//       const maxWidths = getColumnWidths(worksheetData);
//       worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
      
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, type);
      
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       XLSX.writeFile(workbook, `${type.replace(" ", "_")}_${timestamp}.xlsx`);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records successfully!` 
//       });
//     } catch (error) {
//       console.error("Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export data. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   // Export to CSV
//   const exportToCSV = (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
    
//     try {
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let headers: string[] = [];
//       let rows: any[][] = [];
      
//       if (type === "COD History") {
//         headers = ["Order ID", "Order Date", "Seller", "Courier", "AWB Number", "Invoice Amount", "COD Amount", "Delivered Date", "Delivered Time", "Status"];
//         rows = dataToExport.map((item: CODHistoryItem) => [
//           item.orderId,
//           item.orderDate,
//           item.seller || "-",
//           item.courier,
//           item.awbNumber,
//           item.invoiceAmount,
//           item.codAmount,
//           item.deliveredDate,
//           item.deliveredTime,
//           item.status
//         ]);
//       } else {
//         headers = ["Transaction ID", "Order Number", "Type", "Amount", "Description", "Date", "Status"];
//         rows = dataToExport.map((item: WalletHistoryItem) => [
//           item.transactionId,
//           item.orderNumber || "-",
//           item.type,
//           item.amount,
//           item.description,
//           item.date,
//           item.status
//         ]);
//       }
      
//       const escapeCSV = (cell: any) => {
//         if (cell === null || cell === undefined) return '""';
//         const str = String(cell);
//         if (str.includes(',') || str.includes('"') || str.includes('\n')) {
//           return `"${str.replace(/"/g, '""')}"`;
//         }
//         return str;
//       };
      
//       const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
      
//       const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.href = url;
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       link.setAttribute("download", `${type.replace(" ", "_")}_${timestamp}.csv`);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records as CSV!` 
//       });
//     } catch (error) {
//       console.error("CSV Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export CSV. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   const fetchAllData = async () => {
//     setLoading(true);
//     try {
//       console.log("Starting to fetch data...");
      
//       // Fetch wallet transactions
//       const walletResponse: WalletTransaction[] = await fetch(
//         getuser()?.role === "admin"
//           ? "https://app.logixmitra.com/api/api/wallets"
//           : `https://app.logixmitra.com/api/api/wallets/users/${getuser()?.id}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       ).then(res => res.json());

//       console.log("Wallet response:", walletResponse?.length);

//       // Fetch orders
//       let ordersData = await orderApi.getAll();
      
//       if (!Array.isArray(ordersData)) {
//         ordersData = [];
//       }
      
//       console.log("Total orders:", ordersData.length);

//       // Fetch seller data for mapping
//       try {
//         const sellerData = await sellerApi.getAll();
//         for (let x of sellerData) {
//           sellerMap[x.id] = x;
//         }
//         console.log("Seller data loaded:", Object.keys(sellerMap).length);
//       } catch (error) {
//         console.error("Failed to fetch sellers:", error);
//       }

//       // Get next remittance dates
//       const datelist: string[] = [];
//       for (let i = 0; i < 7; i++) {
//         const date = new Date();
//         date.setDate(date.getDate() + i);
//         const currentDayName = date.toLocaleDateString("en-US", { weekday: "long" });
//         if (currentDayName === "Saturday" || currentDayName === "Wednesday") {
//           datelist.push(date.toISOString().split('T')[0]);
//         }
//       }
//       console.log("Next remittance dates:", datelist);

//       // Filter to only COD orders
//       const codOnlyOrders = ordersData.filter((order: any) => {
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         const isCOD = paymentGateway === "Cash on Delivery (COD)" || 
//                paymentGateway === "COD" ||
//                paymentGateway?.toLowerCase() === "cod" ||
//                paymentGateway?.toLowerCase() === "cash on delivery" ||
//                paymentType === "COD" ||
//                paymentType === "Cash on Delivery";
        
//         return isCOD;
//       });
      
//       console.log("COD orders:", codOnlyOrders.length);

//       // Fetch details for COD orders only
//       const ordersWithDetails = await Promise.all(
//         codOnlyOrders.map(async (order: any) => {
//           if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//             return order;
//           }
//           const detailedOrder = await fetchOrderDetails(order.id);
//           return detailedOrder || order;
//         })
//       );

//       const walletHistoryData: WalletHistoryItem[] = [];
//       const codHistoryData: CODHistoryItem[] = [];
      
//       let totalGenerated = 0;
//       let totalPaid = 0;
//       let totalDue = 0;

//       // Process wallet transactions
//       if (Array.isArray(walletResponse)) {
//         walletResponse.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
//         for (const item of walletResponse) {
//           if (item.status === "draft") continue;
          
//           let type: "credit" | "debit" = "debit";
//           let displayStatus = item.status;
          
//           if (item.status === "Approved" && item.amount > 0 && !item.orderNumber) {
//             type = "credit";
//             displayStatus = "Credited";
//           } else if (item.status === "Debited" || (item.status === "Approved" && item.orderNumber)) {
//             type = "debit";
//             displayStatus = "Debited";
//           } else if (item.status === "Refund") {
//             type = "credit";
//             displayStatus = "Refund";
//           }

//           const createdAt = item.createdAt;
//           const dateISO = convertToISODate(createdAt);
//           const displayDate = formatDateToDDMMYYYY(createdAt);
          
//           walletHistoryData.push({
//             id: item.id.toString(),
//             transactionId: item.transid || item.id.toString(),
//             orderNumber: item.orderNumber || "-",
//             type: type,
//             amount: formatAmount(item.amount),
//             balance: formatAmount(item.amount),
//             description: item.description || (type === "credit" ? "Wallet Credit" : "Wallet Debit"),
//             date: displayDate,
//             dateISO: dateISO,
//             status: displayStatus,
//           });
//         }
//       }

//       // Process COD orders
//       for (const order of ordersWithDetails) {
//         if (!order || !order.orderNumber) continue;
        
//         // Only include delivered orders
//         if (order.status !== "Delivered") continue;
        
//         // Check if it's actually a COD order
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         const isCOD = paymentGateway === "Cash on Delivery (COD)" || 
//                       paymentGateway === "COD" ||
//                       paymentGateway?.toLowerCase() === "cod" ||
//                       paymentGateway?.toLowerCase() === "cash on delivery" ||
//                       paymentType === "COD" ||
//                       paymentType === "Cash on Delivery";
        
//         if (!isCOD) continue;
        
//         let codAmount = order.amount || 0;
//         if (typeof codAmount === 'string') {
//           codAmount = parseFloat(codAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         let invoiceAmount = order.amount || order.invoiceAmount || 0;
//         if (typeof invoiceAmount === 'string') {
//           invoiceAmount = parseFloat(invoiceAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         const isSettled = order.codpaidstatus === "Settled";
//         const orderStatus = isSettled ? "settled" : "pending";
        
//         // Get delivered details with time - THIS IS THE KEY FIX
//         const { deliveredDate, deliveredTime } = getDeliveredDetailsFromOrder(order);
        
//         const awbNumber = getAWBNumber(order);
        
//         // Use createdAt field for order date filtering
//         const orderDateValue = order.createdAt || order.orderDate;
//         const orderDateISO = convertToISODate(orderDateValue);
//         const orderDateDisplay = formatDateToDDMMYYYY(orderDateValue);
        
//         codHistoryData.push({
//           id: order.id || order.orderNumber,
//           orderId: order.orderNumber,
//           orderDate: orderDateDisplay,
//           orderDateISO: orderDateISO,
//           courier: order.courier || "Not Assigned",
//           awbNumber: awbNumber,
//           seller: sellerMap[order.seller]?.name || order.seller_name || order.seller || "-",
//           invoiceAmount: formatAmount(invoiceAmount),
//           codAmount: formatAmount(codAmount),
//           deliveredDate: deliveredDate,
//           deliveredTime: deliveredTime,
//           status: orderStatus,
//           codstate: order.codpaidstatus === "Settled" ? "Settled" : "Pending",
//         });
        
//         const numCodAmount = typeof codAmount === 'number' ? codAmount : parseFloat(codAmount);
//         if (!isNaN(numCodAmount) && numCodAmount > 0) {
//           totalGenerated += numCodAmount;
//           if (isSettled) {
//             totalPaid += numCodAmount;
//           } else {
//             totalDue += numCodAmount;
//           }
//         }
//       }

//       console.log("COD History Data count:", codHistoryData.length);
//       console.log("Sample COD data:", codHistoryData[0]);

//       // Sort COD history by date (newest first)
//       codHistoryData.sort((a, b) => {
//         if (!a.orderDateISO && !b.orderDateISO) return 0;
//         if (!a.orderDateISO) return 1;
//         if (!b.orderDateISO) return -1;
//         return b.orderDateISO.localeCompare(a.orderDateISO);
//       });

//       setWalletHistory(walletHistoryData);
//       setCodHistory(codHistoryData);
//       setSummary({
//         totalGenerated,
//         totalPaid,
//         nextRemittance: datelist.join(" & "),
//         nextAmount: totalDue,
//         totalDue,
//       });
      
//       console.log("Summary:", { totalGenerated, totalPaid, totalDue });
      
//     } catch (error) {
//       console.error("Failed to fetch data:", error);
//       toast({ title: "Error", description: "Failed to load finance data", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   const getCurrentPageData = (data: any[]) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return data.slice(startIndex, endIndex);
//   };

//   const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);
  
//   const currentDisplayData = activeTab === "codhistory" ? filteredCodHistory : filteredWalletHistory;
//   const currentData = getCurrentPageData(currentDisplayData);
//   const currentTotalPages = totalPages(currentDisplayData);

//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//   };

//   const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setItemsPerPage(Number(e.target.value));
//     setCurrentPage(1);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//     setCurrentPage(1);
//   };

//   const clearSearch = () => {
//     setSearchTerm("");
//     setCurrentPage(1);
//   };

//   const totalOrders = codHistory.length;
//   const settledOrders = codHistory.filter(item => item.status === "settled").length;
//   const pendingOrders = codHistory.filter(item => item.status === "pending").length;

//   const isCodDateFilterActive = codDateRange.from !== "" || codDateRange.to !== "";
//   const isWalletDateFilterActive = walletDateRange.from !== "" || walletDateRange.to !== "";

//   const getSearchPlaceholder = () => {
//     if (activeTab === "codhistory") {
//       return "Search COD orders by Order ID, Seller, Courier, AWB, Status...";
//     } else {
//       return "Search wallet by Transaction ID, Order Number, Description, Status...";
//     }
//   };

//   return (
//     <DashboardLayout title="Finance & COD" subtitle="Track revenue, settlements, wallets, and invoices">
//       <CreateTransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchAllData} />

//       <div className="space-y-6">
//         {/* Summary Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Remittance Generated" value={formatAmount(summary.totalGenerated)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
//           <StatCard title="Total Remittance Paid" value={formatAmount(summary.totalPaid)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
//           <StatCard title={`Next Remittance (${summary.nextRemittance})`} value={formatAmount(summary.nextAmount)} icon={<Clock className="h-5 w-5" />} variant="warning" />
//           <StatCard title="Total Remittance Due" value={formatAmount(summary.totalDue)} icon={<IndianRupee className="h-5 w-5" />} variant="destructive" />
//         </div>

//         {/* Additional Stats */}
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Total COD Orders</p>
//                   <p className="text-2xl font-bold">{totalOrders}</p>
//                 </div>
//                 <Package className="h-8 w-8 text-muted-foreground" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Settled COD Orders</p>
//                   <p className="text-2xl font-bold text-green-600">{settledOrders}</p>
//                 </div>
//                 <CheckCircle className="h-8 w-8 text-green-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Pending COD Orders</p>
//                   <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
//                 </div>
//                 <Clock className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs defaultValue="codhistory" onValueChange={(value) => {
//           setActiveTab(value);
//           setCurrentPage(1);
//           setSearchTerm("");
//         }}>
//           <TabsList className="flex-wrap">
//             <TabsTrigger value="wallet">Wallet History</TabsTrigger>
//             <TabsTrigger value="codhistory">COD History</TabsTrigger>
//           </TabsList>

//           {/* Search and Filter Bar */}
//           <div className="mt-4 mb-4 space-y-3">
//             <div className="flex flex-wrap gap-3 items-center justify-between">
//               <div className="relative max-w-md flex-1 min-w-[200px]">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder={getSearchPlaceholder()}
//                   value={searchTerm}
//                   onChange={handleSearch}
//                   className="pl-9 pr-10"
//                 />
//                 {searchTerm && (
//                   <button
//                     onClick={clearSearch}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                   >
//                     <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
//                   </button>
//                 )}
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setShowDateFilter(!showDateFilter)}
//                 className="gap-2"
//               >
//                 <Filter className="h-4 w-4" />
//                 {showDateFilter ? "Hide Date Filter" : "Show Date Filter"}
//               </Button>
//             </div>
            
//             {showDateFilter && (
//               <div className="p-4 border rounded-lg bg-muted/30">
//                 {activeTab === "codhistory" ? (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Order Date From</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.from}
//                         onChange={(e) => handleCodDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Order Date To</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.to}
//                         onChange={(e) => handleCodDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     {isCodDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearCodDateFilter}>
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 ) : (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date From</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.from}
//                         onChange={(e) => handleWalletDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date To</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.to}
//                         onChange={(e) => handleWalletDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     {isWalletDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearWalletDateFilter}>
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {searchTerm && (
//               <p className="text-sm text-muted-foreground">
//                 Found {currentDisplayData.length} result(s) for "{searchTerm}"
//               </p>
//             )}
//           </div>

//           {/* Wallet History Tab */}
//           <TabsContent value="wallet" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <div className="flex items-center">
//                   <CardTitle>Wallet History</CardTitle>
//                   {getuser()?.role === "admin" && (
//                     <Button onClick={() => setModalOpen(true)} className="ml-4">
//                       <Plus className="h-4 w-4 mr-1" /> New Transaction
//                     </Button>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[800px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Transaction ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Type</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Description</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center">
//                             No wallet transactions found.
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: WalletHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.transactionId}</td>
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderNumber}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                                 {item.type === "credit" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
//                                 {item.type === "credit" ? "Credit" : "Debit"}
//                               </span>
//                             </td>
//                             <td className={`py-3 px-4 text-sm font-semibold ${item.type === "credit" ? "text-green-600" : "text-red-600"}`}>{item.amount}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txnStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {!loading && filteredWalletHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredWalletHistory.length)} of {filteredWalletHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
//                       <span className="px-3 py-1 text-sm">Page {currentPage} of {currentTotalPages}</span>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === currentTotalPages}><ChevronRight className="h-4 w-4" /></Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentTotalPages)} disabled={currentPage === currentTotalPages}>Last</Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* COD History Tab */}
//           <TabsContent value="codhistory" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <CardTitle>COD History</CardTitle>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[1200px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Seller</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Courier</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">AWB Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Invoice Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">COD Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Time</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={10} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <span className="ml-2">Loading...</span>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={10} className="py-8 text-center">
//                             No COD history found.
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: CODHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderId}</td>
//                             <td className="py-3 px-4 text-sm">{item.seller || "-"}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">{item.orderDate}</td>
//                             <td className="py-3 px-4 text-sm">
//                               <div className="flex items-center gap-1">
//                                 <Truck className="h-3 w-3 flex-shrink-0" />
//                                 <span className="truncate max-w-[150px]" title={item.courier}>{item.courier}</span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-mono">
//                               <span className="text-blue-600 font-medium">{item.awbNumber}</span>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-semibold">{item.invoiceAmount}</td>
//                             <td className="py-3 px-4 text-sm font-semibold text-green-600">{item.codAmount}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredDate !== "-" ? "text-green-600 font-medium" : "text-muted-foreground"}>
//                                   {item.deliveredDate}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Clock className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredTime !== "-" ? "text-green-600 font-semibold" : "text-muted-foreground"}>
//                                   {item.deliveredTime}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[item.status]}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {!loading && filteredCodHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCodHistory.length)} of {filteredCodHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
//                       <span className="px-3 py-1 text-sm">Page {currentPage} of {currentTotalPages}</span>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === currentTotalPages}><ChevronRight className="h-4 w-4" /></Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentTotalPages)} disabled={currentPage === currentTotalPages}>Last</Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default FinancePage;


// import { useState, useEffect, useMemo } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, Plus, Calendar, Truck, Package, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, X, Filter } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { orderApi } from "../../services/orderApi";
// import { sellerApi } from "../../services/sellerApi";
// import { getuser } from "../../services/getbasicdata";
// import { Textarea } from "@/components/ui/textarea";
// import { apiRequest } from "../../src/apiglobal/apiconfig";
// import Select1 from "react-select";

// // Lazy load xlsx to prevent initial load issues
// const loadXLSX = async () => {
//   return await import('xlsx');
// };

// // Types
// interface CreateTransactionModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onSuccess?: () => void;
// }

// interface WalletTransaction {
//   id: number;
//   user_id: number;
//   transid: string;
//   orderNumber: string | null;
//   amount: number;
//   status: string;
//   description: string;
//   createdAt: string;
//   type?: "credit" | "debit";
//   order?: any;
// }

// interface CODHistoryItem {
//   id: string;
//   orderId: string;
//   orderDate: string;
//   orderDateISO: string;
//   courier: string;
//   awbNumber: string;
//   invoiceAmount: string;
//   codAmount: string;
//   seller?: string;
//   deliveredDate: string;
//   deliveredDateISO: string;
//   deliveredTime: string;
//   status: "pending" | "settled" | "overdue";
//   codstate?: string;
//   remittanceDueDate?: string;
//   remittanceDueDateISO?: string;
// }

// interface WalletHistoryItem {
//   id: string;
//   transactionId: string;
//   type: "credit" | "debit";
//   amount: string;
//   balance: string;
//   orderNumber: string;
//   description: string;
//   date: string;
//   dateISO: string;
//   status: string;
// }

// interface DateRange {
//   from: string;
//   to: string;
// }

// const codStatusStyles = {
//   settled: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   overdue: "bg-red-100 text-red-700",
// };

// const txnStatusStyles: Record<string, string> = {
//   completed: "bg-green-100 text-green-700",
//   pending: "bg-yellow-100 text-yellow-700",
//   failed: "bg-red-100 text-red-700",
//   Debited: "bg-red-100 text-red-700",
//   Credited: "bg-green-100 text-green-700",
//   Approved: "bg-green-100 text-green-700",
//   rejected: "bg-red-100 text-red-700",
//   Refund: "bg-blue-100 text-blue-700",
// };

// // Global temp object for seller mapping
// let sellerMap: Record<string, any> = {};

// function CreateTransactionModal({ open, onOpenChange, onSuccess }: CreateTransactionModalProps) {
//   const { toast } = useToast();
//   const [selectedOrderId, setSelectedOrderId] = useState<string>("");
//   const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
//   const [amount, setAmount] = useState<number>(0);
//   const [description, setDescription] = useState<string>("");
//   const [orders, setOrders] = useState<{ value: string; label: string }[]>([]);
//   const [submitting, setSubmitting] = useState(false);

//   const fetchOrders = async () => {
//     try {
//       const data = await orderApi.getAll();
//       const options = data.map((x: any) => ({ value: x.id, label: `${x.orderNumber} - ${x.amount}` }));
//       setOrders(options);
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   const handleSubmit = async () => {
//     if (!selectedOrderId) {
//       toast({ title: "Validation Error", description: "Please select an order", variant: "destructive" });
//       return;
//     }
//     if (amount <= 0) {
//       toast({ title: "Validation Error", description: "Amount must be greater than zero", variant: "destructive" });
//       return;
//     }
//     if (!description.trim()) {
//       toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await apiRequest("POST", "tracking/transactions", {
//         orderId: selectedOrderId,
//         type: transactionType,
//         amount,
//         description: description.trim(),
//       }, {});
//       toast({ title: "Success", description: "Transaction created successfully" });
//       setSelectedOrderId("");
//       setTransactionType("credit");
//       setAmount(0);
//       setDescription("");
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (error) {
//       toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader><DialogTitle>Create New Transaction</DialogTitle></DialogHeader>
//         <div className="space-y-4 py-2">
//           <div className="space-y-2">
//             <Label>Select Order *</Label>
//             <Select1 options={orders} onChange={(option: any) => { setSelectedOrderId(option.value); }} />
//           </div>
//           <div className="space-y-2">
//             <Label>Select Type *</Label>
//             <div className="flex gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="credit" checked={transactionType === "credit"} onChange={() => setTransactionType("credit")} /> Credit
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" value="debit" checked={transactionType === "debit"} onChange={() => setTransactionType("debit")} /> Debit
//               </label>
//             </div>
//           </div>
//           <div className="space-y-2">
//             <Label>Amount *</Label>
//             <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
//           </div>
//           <div className="space-y-2">
//             <Label>Description *</Label>
//             <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows={3} />
//           </div>
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//           <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// // Helper function to get next remittance date based on delivered date + 7 days, then next SATURDAY or TUESDAY
// const getNextRemittanceDateFromDelivered = (deliveredDateISO: string): string => {
//   if (!deliveredDateISO) return "-";
  
//   try {
//     const deliveredDate = new Date(deliveredDateISO);
//     if (isNaN(deliveredDate.getTime())) return "-";
    
//     const after7Days = new Date(deliveredDate);
//     after7Days.setDate(deliveredDate.getDate() + 7);
    
//     for (let i = 0; i < 7; i++) {
//       const checkDate = new Date(after7Days);
//       checkDate.setDate(after7Days.getDate() + i);
//       const dayName = checkDate.toLocaleDateString("en-US", { weekday: "long" });
      
//       if (dayName === "Saturday" || dayName === "Tuesday") {
//         const day = String(checkDate.getDate()).padStart(2, '0');
//         const month = String(checkDate.getMonth() + 1).padStart(2, '0');
//         const year = checkDate.getFullYear();
//         return `${day}-${month}-${year}`;
//       }
//     }
    
//     return "-";
//   } catch (error) {
//     console.error("Error calculating next remittance date:", error);
//     return "-";
//   }
// };

// // Parse date from DD-MM-YYYY to Date object
// const parseDateFromDMY = (dateStr: string): Date | null => {
//   if (!dateStr || dateStr === "-") return null;
//   try {
//     const [day, month, year] = dateStr.split('-');
//     return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
//   } catch {
//     return null;
//   }
// };

// // Format date to DD-MM-YYYY
// const formatDateToDMY = (date: Date): string => {
//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const year = date.getFullYear();
//   return `${day}-${month}-${year}`;
// };

// // Get the next upcoming remittance date from pending COD orders (future dates only)
// const getNextUpcomingRemittanceDate = (codOrders: CODHistoryItem[]): string => {
//   const pendingOrders = codOrders.filter(order => order.status === "pending");
  
//   if (pendingOrders.length === 0) {
//     return "-";
//   }
  
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
  
//   const futureDueDates: Date[] = [];
  
//   pendingOrders.forEach(order => {
//     if (order.remittanceDueDate && order.remittanceDueDate !== "-") {
//       const dueDate = parseDateFromDMY(order.remittanceDueDate);
//       if (dueDate && dueDate >= today) {
//         futureDueDates.push(dueDate);
//       }
//     }
//   });
  
//   if (futureDueDates.length === 0) {
//     return "-";
//   }
  
//   const nextDate = new Date(Math.min(...futureDueDates.map(d => d.getTime())));
//   return formatDateToDMY(nextDate);
// };

// // Get next upcoming remittance amount (sum of pending orders due on the next upcoming date only)
// const getNextUpcomingRemittanceAmount = (codOrders: CODHistoryItem[]): number => {
//   const nextDate = getNextUpcomingRemittanceDate(codOrders);
//   if (nextDate === "-") return 0;
  
//   const pendingOrdersDue = codOrders.filter(order => 
//     order.status === "pending" && order.remittanceDueDate === nextDate
//   );
  
//   let total = 0;
//   pendingOrdersDue.forEach(order => {
//     const amountStr = order.codAmount.replace('₹', '').replace(/,/g, '');
//     const amount = parseFloat(amountStr);
//     if (!isNaN(amount)) {
//       total += amount;
//     }
//   });
  
//   return total;
// };

// const FinancePage = () => {
//   const { toast } = useToast();
//   const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
//   const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [exporting, setExporting] = useState(false);
  
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [activeTab, setActiveTab] = useState("codhistory");
//   const [searchTerm, setSearchTerm] = useState("");
  
//   const [codDateRange, setCodDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [walletDateRange, setWalletDateRange] = useState<DateRange>({
//     from: "",
//     to: ""
//   });
//   const [showDateFilter, setShowDateFilter] = useState(false);
  
//   const [summary, setSummary] = useState({
//     totalGenerated: 0,
//     totalPaid: 0,
//     nextRemittanceDate: "-",
//     nextAmount: 0,
//     totalDue: 0,
//   });

//   const convertToISODate = (dateInput: any): string => {
//     if (!dateInput) return "";
    
//     try {
//       if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
//         return dateInput.split('T')[0];
//       }
      
//       const date = new Date(dateInput);
//       if (!isNaN(date.getTime())) {
//         return date.toISOString().split('T')[0];
//       }
      
//       return "";
//     } catch (error) {
//       console.error("Date conversion error:", error);
//       return "";
//     }
//   };

//   const formatDateToDDMMYYYY = (dateString: string) => {
//     if (!dateString) return "-";
//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return "-";
//       const day = String(date.getDate()).padStart(2, "0");
//       const month = String(date.getMonth() + 1).padStart(2, "0");
//       const year = date.getFullYear();
//       return `${day}-${month}-${year}`;
//     } catch {
//       return "-";
//     }
//   };

//   const extractTimeFromDate = (dateTimeString: string): string => {
//     if (!dateTimeString) return "-";
    
//     try {
//       const date = new Date(dateTimeString);
//       if (!isNaN(date.getTime())) {
//         return date.toLocaleTimeString('en-IN', { 
//           hour: '2-digit', 
//           minute: '2-digit', 
//           hour12: true 
//         });
//       }
      
//       const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
//       if (timeMatch) {
//         let hour = parseInt(timeMatch[1]);
//         const minute = timeMatch[2];
//         const ampm = hour >= 12 ? 'PM' : 'AM';
//         hour = hour % 12 || 12;
//         return `${hour}:${minute} ${ampm}`;
//       }
      
//       return "-";
//     } catch (error) {
//       console.error("Time extraction error:", error);
//       return "-";
//     }
//   };

//   const formatAmount = (amount: number | string) => {
//     let numAmount = typeof amount === 'string' ? parseFloat(amount.replace('₹', '').replace(/,/g, '')) : amount;
//     if (isNaN(numAmount)) numAmount = 0;
//     return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   };

//   const getDeliveredDetailsFromOrder = (order: any) => {
//     let deliveryDateTime = null;
//     let deliveredDateStr = null;
    
//     if (order.deliveredDateTime) {
//       deliveryDateTime = order.deliveredDateTime;
//       deliveredDateStr = order.deliveredDateTime;
//     }
//     else if (order.deliveredAt) {
//       deliveryDateTime = order.deliveredAt;
//       deliveredDateStr = order.deliveredAt;
//     }
//     else if (order.deliveredDate && order.deliveredTime) {
//       deliveryDateTime = `${order.deliveredDate} ${order.deliveredTime}`;
//       deliveredDateStr = order.deliveredDate;
//     }
//     else if (order.deliveredDate) {
//       deliveryDateTime = order.deliveredDate;
//       deliveredDateStr = order.deliveredDate;
//     }
//     else if (order.updatedAt && order.status === "Delivered") {
//       deliveryDateTime = order.updatedAt;
//       deliveredDateStr = order.updatedAt;
//     }
//     else if (order.tracking_history && Array.isArray(order.tracking_history)) {
//       const deliveredEvent = order.tracking_history.find(
//         (event: any) => 
//           event.state === "DELIVERED" || 
//           event.status === "DELIVERED" ||
//           event.event === "DELIVERED"
//       );
      
//       if (deliveredEvent) {
//         deliveryDateTime = deliveredEvent.deliveredDate || 
//                           deliveredEvent.deliveredAt || 
//                           deliveredEvent.createdAt || 
//                           deliveredEvent.timestamp ||
//                           deliveredEvent.date;
//         deliveredDateStr = deliveryDateTime;
//       }
//     }
    
//     if (!deliveredDateStr && order.deliveredDate) {
//       deliveredDateStr = order.deliveredDate;
//     }
    
//     if (deliveryDateTime || deliveredDateStr) {
//       const dateToUse = deliveredDateStr || deliveryDateTime;
//       const formattedDate = formatDateToDDMMYYYY(dateToUse);
//       const formattedTime = extractTimeFromDate(deliveryDateTime || dateToUse);
//       const isoDate = convertToISODate(dateToUse);
      
//       return {
//         deliveredDate: formattedDate,
//         deliveredDateISO: isoDate,
//         deliveredTime: formattedTime
//       };
//     }
    
//     return { deliveredDate: "-", deliveredDateISO: "", deliveredTime: "-" };
//   };

//   const getAWBNumber = (order: any) => {
//     return order.trackingnumber || order.awb || order.awbNumber || "-";
//   };

//   const fetchOrderDetails = async (orderId: string) => {
//     try {
//       const response = await fetch(
//         `https://app.logixmitra.com/api/api/orders/${orderId}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       );
//       if (response.ok) {
//         return await response.json();
//       }
//     } catch (error) {
//       console.error(`Failed to fetch order details for ${orderId}:`, error);
//     }
//     return null;
//   };

//   const filteredCodHistory = useMemo(() => {
//     let filtered = [...codHistory];
    
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.orderId.toLowerCase().includes(term) ||
//         item.courier.toLowerCase().includes(term) ||
//         (item.seller && item.seller.toLowerCase().includes(term)) ||
//         item.awbNumber.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term)
//       );
//     }
    
//     if (codDateRange.from || codDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.deliveredDateISO;
//         if (!itemDate || itemDate === "") return false;
        
//         if (codDateRange.from && codDateRange.to) {
//           return itemDate >= codDateRange.from && itemDate <= codDateRange.to;
//         } else if (codDateRange.from) {
//           return itemDate >= codDateRange.from;
//         } else if (codDateRange.to) {
//           return itemDate <= codDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [codHistory, searchTerm, codDateRange]);

//   const filteredWalletHistory = useMemo(() => {
//     let filtered = [...walletHistory];
    
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(item => 
//         item.transactionId.toLowerCase().includes(term) ||
//         item.orderNumber.toLowerCase().includes(term) ||
//         item.description.toLowerCase().includes(term) ||
//         item.type.toLowerCase().includes(term) ||
//         item.status.toLowerCase().includes(term)
//       );
//     }
    
//     if (walletDateRange.from || walletDateRange.to) {
//       filtered = filtered.filter(item => {
//         const itemDate = item.dateISO;
//         if (!itemDate || itemDate === "") return false;
        
//         if (walletDateRange.from && walletDateRange.to) {
//           return itemDate >= walletDateRange.from && itemDate <= walletDateRange.to;
//         } else if (walletDateRange.from) {
//           return itemDate >= walletDateRange.from;
//         } else if (walletDateRange.to) {
//           return itemDate <= walletDateRange.to;
//         }
//         return true;
//       });
//     }
    
//     return filtered;
//   }, [walletHistory, searchTerm, walletDateRange]);

//   const handleCodDateFromChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleCodDateToChange = (value: string) => {
//     setCodDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateFromChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, from: value }));
//     setCurrentPage(1);
//   };

//   const handleWalletDateToChange = (value: string) => {
//     setWalletDateRange(prev => ({ ...prev, to: value }));
//     setCurrentPage(1);
//   };

//   const clearCodDateFilter = () => {
//     setCodDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   const clearWalletDateFilter = () => {
//     setWalletDateRange({ from: "", to: "" });
//     setCurrentPage(1);
//   };

//   const getColumnWidths = (data: any[]) => {
//     if (!data || data.length === 0) return [];
    
//     const widths: number[] = [];
//     const headers = Object.keys(data[0]);
    
//     headers.forEach((header, idx) => {
//       let maxLength = header.length;
//       data.forEach(row => {
//         const value = String(row[header] || '');
//         maxLength = Math.max(maxLength, value.length);
//       });
//       widths[idx] = Math.min(maxLength, 50);
//     });
    
//     return widths;
//   };

//   const exportToExcel = async (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
//     toast({ title: "Processing", description: "Preparing export..." });
    
//     try {
//       const XLSX = await loadXLSX();
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let worksheetData;
      
//       if (type === "COD History") {
//         worksheetData = dataToExport.map((item: CODHistoryItem) => ({
//           "Order ID": item.orderId,
//           "Order Date": item.orderDate,
//           "Seller": item.seller || "-",
//           "Courier": item.courier,
//           "AWB Number": item.awbNumber,
//           "Invoice Amount": item.invoiceAmount,
//           "COD Amount": item.codAmount,
//           "Delivered Date": item.deliveredDate,
//           "Delivered Time": item.deliveredTime,
//           "Remittance Due Date": item.remittanceDueDate || "-",
//           "Status": item.status.toUpperCase()
//         }));
//       } else {
//         worksheetData = dataToExport.map((item: WalletHistoryItem) => ({
//           "Transaction ID": item.transactionId,
//           "Order Number": item.orderNumber || "-",
//           "Type": item.type.toUpperCase(),
//           "Amount": item.amount,
//           "Description": item.description,
//           "Date": item.date,
//           "Status": item.status
//         }));
//       }
      
//       const worksheet = XLSX.utils.json_to_sheet(worksheetData);
//       const maxWidths = getColumnWidths(worksheetData);
//       worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
      
//       const workbook = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(workbook, worksheet, type);
      
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       XLSX.writeFile(workbook, `${type.replace(" ", "_")}_${timestamp}.xlsx`);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records successfully!` 
//       });
//     } catch (error) {
//       console.error("Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export data. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   const exportToCSV = (type: string) => {
//     if (exporting) return;
    
//     setExporting(true);
    
//     try {
//       const dataToExport = type === "COD History" ? filteredCodHistory : filteredWalletHistory;
      
//       if (dataToExport.length === 0) {
//         toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
//         return;
//       }
      
//       let headers: string[] = [];
//       let rows: any[][] = [];
      
//       if (type === "COD History") {
//         headers = ["Order ID", "Order Date", "Seller", "Courier", "AWB Number", "Invoice Amount", "COD Amount", "Delivered Date", "Delivered Time", "Remittance Due Date", "Status"];
//         rows = dataToExport.map((item: CODHistoryItem) => [
//           item.orderId,
//           item.orderDate,
//           item.seller || "-",
//           item.courier,
//           item.awbNumber,
//           item.invoiceAmount,
//           item.codAmount,
//           item.deliveredDate,
//           item.deliveredTime,
//           item.remittanceDueDate || "-",
//           item.status
//         ]);
//       } else {
//         headers = ["Transaction ID", "Order Number", "Type", "Amount", "Description", "Date", "Status"];
//         rows = dataToExport.map((item: WalletHistoryItem) => [
//           item.transactionId,
//           item.orderNumber || "-",
//           item.type,
//           item.amount,
//           item.description,
//           item.date,
//           item.status
//         ]);
//       }
      
//       const escapeCSV = (cell: any) => {
//         if (cell === null || cell === undefined) return '""';
//         const str = String(cell);
//         if (str.includes(',') || str.includes('"') || str.includes('\n')) {
//           return `"${str.replace(/"/g, '""')}"`;
//         }
//         return str;
//       };
      
//       const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
      
//       const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);
//       link.href = url;
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
//       link.setAttribute("download", `${type.replace(" ", "_")}_${timestamp}.csv`);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
      
//       toast({ 
//         title: "Success", 
//         description: `Exported ${dataToExport.length} ${type} records as CSV!` 
//       });
//     } catch (error) {
//       console.error("CSV Export error:", error);
//       toast({ 
//         title: "Error", 
//         description: "Failed to export CSV. Please try again.", 
//         variant: "destructive" 
//       });
//     } finally {
//       setExporting(false);
//     }
//   };

//   const fetchAllData = async () => {
//     setLoading(true);
//     try {
//       const walletResponse: WalletTransaction[] = await fetch(
//         getuser()?.role === "admin"
//           ? "https://app.logixmitra.com/api/api/wallets"
//           : `https://app.logixmitra.com/api/api/wallets/users/${getuser()?.id}`,
//         { method: "GET", headers: { "Content-Type": "application/json" } }
//       ).then(res => res.json());

//       let ordersData = await orderApi.getAll();
      
//       if (!Array.isArray(ordersData)) {
//         ordersData = [];
//       }

//       try {
//         const sellerData = await sellerApi.getAll();
//         sellerMap = {};
//         for (let x of sellerData) {
//           sellerMap[x.id] = x;
//         }
//       } catch (error) {
//         console.error("Failed to fetch sellers:", error);
//       }
      
//       const codOnlyOrders = ordersData.filter((order: any) => {
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         const isCOD = paymentGateway === "Cash on Delivery (COD)" || 
//                paymentGateway === "COD" ||
//                paymentGateway?.toLowerCase() === "cod" ||
//                paymentGateway?.toLowerCase() === "cash on delivery" ||
//                paymentType === "COD" ||
//                paymentType === "Cash on Delivery";
        
//         return isCOD;
//       });

//       const ordersWithDetails = await Promise.all(
//         codOnlyOrders.map(async (order: any) => {
//           if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
//             return order;
//           }
//           const detailedOrder = await fetchOrderDetails(order.id);
//           return detailedOrder || order;
//         })
//       );

//       const walletHistoryData: WalletHistoryItem[] = [];
//       const codHistoryData: CODHistoryItem[] = [];
      
//       let totalGenerated = 0;
//       let totalPaid = 0;
//       let totalDue = 0;

//       if (Array.isArray(walletResponse)) {
//         walletResponse.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
//         for (const item of walletResponse) {
//           if (item.status === "draft") continue;
          
//           let type: "credit" | "debit" = "debit";
//           let displayStatus = item.status;
          
//           if (item.status === "Approved" && item.amount > 0 && !item.orderNumber) {
//             type = "credit";
//             displayStatus = "Credited";
//           } else if (item.status === "Debited" || (item.status === "Approved" && item.orderNumber)) {
//             type = "debit";
//             displayStatus = "Debited";
//           } else if (item.status === "Refund") {
//             type = "credit";
//             displayStatus = "Refund";
//           }

//           const createdAt = item.createdAt;
//           const dateISO = convertToISODate(createdAt);
//           const displayDate = formatDateToDDMMYYYY(createdAt);
          
//           walletHistoryData.push({
//             id: item.id.toString(),
//             transactionId: item.transid || item.id.toString(),
//             orderNumber: item.orderNumber || "-",
//             type: type,
//             amount: formatAmount(item.amount),
//             balance: formatAmount(item.amount),
//             description: item.description || (type === "credit" ? "Wallet Credit" : "Wallet Debit"),
//             date: displayDate,
//             dateISO: dateISO,
//             status: displayStatus,
//           });
//         }
//       }

//       for (const order of ordersWithDetails) {
//         if (!order || !order.orderNumber) continue;
        
//         if (order.status !== "Delivered") continue;
        
//         const paymentGateway = order.paymentGateway || order.payment_method || order.paymentMethod || "";
//         const paymentType = order.payment_type || "";
        
//         const isCOD = paymentGateway === "Cash on Delivery (COD)" || 
//                       paymentGateway === "COD" ||
//                       paymentGateway?.toLowerCase() === "cod" ||
//                       paymentGateway?.toLowerCase() === "cash on delivery" ||
//                       paymentType === "COD" ||
//                       paymentType === "Cash on Delivery";
        
//         if (!isCOD) continue;
        
//         let codAmount = order.amount || 0;
//         if (typeof codAmount === 'string') {
//           codAmount = parseFloat(codAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         let invoiceAmount = order.amount || order.invoiceAmount || 0;
//         if (typeof invoiceAmount === 'string') {
//           invoiceAmount = parseFloat(invoiceAmount.replace('₹', '').replace(/,/g, '')) || 0;
//         }
        
//         const isSettled = order.codpaidstatus === "Settled";
//         const orderStatus = isSettled ? "settled" : "pending";
        
//         const { deliveredDate, deliveredDateISO, deliveredTime } = getDeliveredDetailsFromOrder(order);
        
//         const remittanceDueDate = getNextRemittanceDateFromDelivered(deliveredDateISO);
        
//         const awbNumber = getAWBNumber(order);
        
//         const orderDateValue = order.createdAt || order.orderDate;
//         const orderDateDisplay = formatDateToDDMMYYYY(orderDateValue);
        
//         codHistoryData.push({
//           id: order.id || order.orderNumber,
//           orderId: order.orderNumber,
//           orderDate: orderDateDisplay,
//           orderDateISO: convertToISODate(orderDateValue),
//           courier: order.courier || "Not Assigned",
//           awbNumber: awbNumber,
//           seller: sellerMap[order.seller]?.name || order.seller_name || order.seller || "-",
//           invoiceAmount: formatAmount(invoiceAmount),
//           codAmount: formatAmount(codAmount),
//           deliveredDate: deliveredDate,
//           deliveredDateISO: deliveredDateISO,
//           deliveredTime: deliveredTime,
//           status: orderStatus,
//           codstate: order.codpaidstatus === "Settled" ? "Settled" : "Pending",
//           remittanceDueDate: remittanceDueDate,
//           remittanceDueDateISO: remittanceDueDate,
//         });
        
//         const numCodAmount = typeof codAmount === 'number' ? codAmount : parseFloat(codAmount);
//         if (!isNaN(numCodAmount) && numCodAmount > 0) {
//           totalGenerated += numCodAmount;
//           if (isSettled) {
//             totalPaid += numCodAmount;
//           } else {
//             totalDue += numCodAmount;
//           }
//         }
//       }

//       codHistoryData.sort((a, b) => {
//         if (!a.deliveredDateISO && !b.deliveredDateISO) return 0;
//         if (!a.deliveredDateISO) return 1;
//         if (!b.deliveredDateISO) return -1;
//         return b.deliveredDateISO.localeCompare(a.deliveredDateISO);
//       });

//       const nextDate = getNextUpcomingRemittanceDate(codHistoryData);
//       const nextAmount = getNextUpcomingRemittanceAmount(codHistoryData);

//       setWalletHistory(walletHistoryData);
//       setCodHistory(codHistoryData);
//       setSummary({
//         totalGenerated,
//         totalPaid,
//         nextRemittanceDate: nextDate,
//         nextAmount: nextAmount,
//         totalDue,
//       });
      
//     } catch (error) {
//       console.error("Failed to fetch data:", error);
//       toast({ title: "Error", description: "Failed to load finance data", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   const getCurrentPageData = (data: any[]) => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return data.slice(startIndex, endIndex);
//   };

//   const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);
  
//   const currentDisplayData = activeTab === "codhistory" ? filteredCodHistory : filteredWalletHistory;
//   const currentData = getCurrentPageData(currentDisplayData);
//   const currentTotalPages = totalPages(currentDisplayData);

//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//   };

//   const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setItemsPerPage(Number(e.target.value));
//     setCurrentPage(1);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//     setCurrentPage(1);
//   };

//   const clearSearch = () => {
//     setSearchTerm("");
//     setCurrentPage(1);
//   };

//   const totalOrders = codHistory.length;
//   const settledOrders = codHistory.filter(item => item.status === "settled").length;
//   const pendingOrders = codHistory.filter(item => item.status === "pending").length;

//   const isCodDateFilterActive = codDateRange.from !== "" || codDateRange.to !== "";
//   const isWalletDateFilterActive = walletDateRange.from !== "" || walletDateRange.to !== "";

//   const getSearchPlaceholder = () => {
//     if (activeTab === "codhistory") {
//       return "Search COD orders by Order ID, Seller, Courier, AWB, Status...";
//     } else {
//       return "Search wallet by Transaction ID, Order Number, Description, Status...";
//     }
//   };

//   return (
//     <DashboardLayout title="Finance & COD" subtitle="Track revenue, settlements, wallets, and invoices">
//       <CreateTransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchAllData} />

//       <div className="space-y-6">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Remittance Generated" value={formatAmount(summary.totalGenerated)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
//           <StatCard title="Total Remittance Paid" value={formatAmount(summary.totalPaid)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
          
//           <Card className="relative overflow-hidden">
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-muted-foreground">Next Remittance</p>
//                   <div className="flex items-baseline gap-2 mt-2">
//                     <span className="text-2xl font-bold">{formatAmount(summary.nextAmount)}</span>
//                   </div>
//                   <div className="flex items-center gap-1 mt-1">
//                     <Calendar className="h-3 w-3 text-muted-foreground" />
//                     <p className="text-xs text-muted-foreground">on {summary.nextRemittanceDate}</p>
//                   </div>
//                   <p className="text-xs text-muted-foreground mt-1">(Every Saturday & Tuesday)</p>
//                 </div>
//                 <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
//                   <Clock className="h-6 w-6 text-warning" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
          
//           <StatCard title="Total Remittance Due" value={formatAmount(summary.totalDue)} icon={<IndianRupee className="h-5 w-5" />} variant="destructive" />
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Total COD Orders</p>
//                   <p className="text-2xl font-bold">{totalOrders}</p>
//                 </div>
//                 <Package className="h-8 w-8 text-muted-foreground" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Settled COD Orders</p>
//                   <p className="text-2xl font-bold text-green-600">{settledOrders}</p>
//                 </div>
//                 <CheckCircle className="h-8 w-8 text-green-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Pending COD Orders</p>
//                   <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
//                 </div>
//                 <Clock className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs defaultValue="codhistory" onValueChange={(value) => {
//           setActiveTab(value);
//           setCurrentPage(1);
//           setSearchTerm("");
//         }}>
//           <TabsList className="flex-wrap">
//             <TabsTrigger value="wallet">Wallet History</TabsTrigger>
//             <TabsTrigger value="codhistory">COD History</TabsTrigger>
//           </TabsList>

//           <div className="mt-4 mb-4 space-y-3">
//             <div className="flex flex-wrap gap-3 items-center justify-between">
//               <div className="relative max-w-md flex-1 min-w-[200px]">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                 <Input
//                   placeholder={getSearchPlaceholder()}
//                   value={searchTerm}
//                   onChange={handleSearch}
//                   className="pl-9 pr-10"
//                 />
//                 {searchTerm && (
//                   <button
//                     onClick={clearSearch}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                   >
//                     <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
//                   </button>
//                 )}
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setShowDateFilter(!showDateFilter)}
//                 className="gap-2"
//               >
//                 <Filter className="h-4 w-4" />
//                 {showDateFilter ? "Hide Date Filter" : "Show Date Filter"}
//               </Button>
//             </div>
            
//             {showDateFilter && (
//               <div className="p-4 border rounded-lg bg-muted/30">
//                 {activeTab === "codhistory" ? (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Delivered Date From</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.from}
//                         onChange={(e) => handleCodDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Delivered Date To</Label>
//                       <Input
//                         type="date"
//                         value={codDateRange.to}
//                         onChange={(e) => handleCodDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     {isCodDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearCodDateFilter}>
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 ) : (
//                   <div className="flex flex-wrap gap-4 items-end">
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date From</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.from}
//                         onChange={(e) => handleWalletDateFromChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-sm font-medium">Transaction Date To</Label>
//                       <Input
//                         type="date"
//                         value={walletDateRange.to}
//                         onChange={(e) => handleWalletDateToChange(e.target.value)}
//                         className="w-auto min-w-[180px]"
//                       />
//                     </div>
//                     {isWalletDateFilterActive && (
//                       <Button variant="ghost" size="sm" onClick={clearWalletDateFilter}>
//                         <X className="h-4 w-4 mr-1" /> Clear
//                       </Button>
//                     )}
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {searchTerm && (
//               <p className="text-sm text-muted-foreground">
//                 Found {currentDisplayData.length} result(s) for "{searchTerm}"
//               </p>
//             )}
//           </div>

//           <TabsContent value="wallet" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <div className="flex items-center">
//                   <CardTitle>Wallet History</CardTitle>
//                   {getuser()?.role === "admin" && (
//                     <Button onClick={() => setModalOpen(true)} className="ml-4">
//                       <Plus className="h-4 w-4 mr-1" /> New Transaction
//                     </Button>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("Wallet History")}
//                     disabled={exporting || filteredWalletHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[800px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Transaction ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Type</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Description</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <p className="mt-2">Loading...</p>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={7} className="py-8 text-center text-muted-foreground">
//                             No wallet transactions found.
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: WalletHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.transactionId}</td>
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderNumber}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                                 {item.type === "credit" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
//                                 {item.type === "credit" ? "Credit" : "Debit"}
//                               </span>
//                             </td>
//                             <td className={`py-3 px-4 text-sm font-semibold ${item.type === "credit" ? "text-green-600" : "text-red-600"}`}>{item.amount}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
//                             <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txnStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {!loading && filteredWalletHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredWalletHistory.length)} of {filteredWalletHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
//                       <span className="px-3 py-1 text-sm">Page {currentPage} of {currentTotalPages}</span>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === currentTotalPages}><ChevronRight className="h-4 w-4" /></Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentTotalPages)} disabled={currentPage === currentTotalPages}>Last</Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="codhistory" className="mt-4">
//             <Card>
//               <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
//                 <CardTitle>COD History</CardTitle>
//                 <div className="flex gap-2">
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToExcel("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
//                     Export Excel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={() => exportToCSV("COD History")}
//                     disabled={exporting || filteredCodHistory.length === 0}
//                   >
//                     <Download className="h-3.5 w-3.5 mr-1" />
//                     Export CSV
//                   </Button>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-0">
//                 <div className="overflow-x-auto">
//                   <table className="w-full min-w-[1400px]">
//                     <thead className="bg-muted/50">
//                       <tr className="border-b">
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order ID</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Seller</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Order Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Courier</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">AWB Number</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Invoice Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">COD Amount</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Date</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Time</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Remittance Due</th>
//                         <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loading ? (
//                         <tr>
//                           <td colSpan={11} className="py-8 text-center">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto" />
//                             <p className="mt-2">Loading...</p>
//                           </td>
//                         </tr>
//                       ) : currentData.length === 0 ? (
//                         <tr>
//                           <td colSpan={11} className="py-8 text-center text-muted-foreground">
//                             No COD history found.
//                           </td>
//                         </tr>
//                       ) : (
//                         currentData.map((item: CODHistoryItem) => (
//                           <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
//                             <td className="py-3 px-4 text-sm font-mono">{item.orderId}</td>
//                             <td className="py-3 px-4 text-sm">{item.seller || "-"}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">{item.orderDate}</td>
//                             <td className="py-3 px-4 text-sm">
//                               <div className="flex items-center gap-1">
//                                 <Truck className="h-3 w-3 flex-shrink-0" />
//                                 <span className="truncate max-w-[150px]" title={item.courier}>{item.courier}</span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-mono">
//                               <span className="text-blue-600 font-medium">{item.awbNumber}</span>
//                             </td>
//                             <td className="py-3 px-4 text-sm font-semibold">{item.invoiceAmount}</td>
//                             <td className="py-3 px-4 text-sm font-semibold text-green-600">{item.codAmount}</td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredDate !== "-" ? "text-green-600 font-medium" : "text-muted-foreground"}>
//                                   {item.deliveredDate}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Clock className="h-3 w-3 flex-shrink-0" />
//                                 <span className={item.deliveredTime !== "-" ? "text-green-600 font-semibold" : "text-muted-foreground"}>
//                                   {item.deliveredTime}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-sm whitespace-nowrap">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="h-3 w-3 flex-shrink-0 text-warning" />
//                                 <span className="font-semibold text-warning">
//                                   {item.remittanceDueDate || "-"}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[item.status]}`}>
//                                 {item.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </tbody>
//                   </table>
//                 </div>
                
//                 {!loading && filteredCodHistory.length > 0 && (
//                   <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-muted-foreground">Rows per page:</span>
//                       <select 
//                         value={itemsPerPage} 
//                         onChange={handleItemsPerPageChange}
//                         className="border rounded px-2 py-1 text-sm"
//                       >
//                         <option value={5}>5</option>
//                         <option value={10}>10</option>
//                         <option value={20}>20</option>
//                         <option value={50}>50</option>
//                       </select>
//                     </div>
//                     <div className="text-sm text-muted-foreground">
//                       Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCodHistory.length)} of {filteredCodHistory.length} entries
//                     </div>
//                     <div className="flex gap-1">
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
//                       <span className="px-3 py-1 text-sm">Page {currentPage} of {currentTotalPages}</span>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === currentTotalPages}><ChevronRight className="h-4 w-4" /></Button>
//                       <Button variant="outline" size="sm" onClick={() => handlePageChange(currentTotalPages)} disabled={currentPage === currentTotalPages}>Last</Button>
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default FinancePage;


import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BillingTabsBar from "@/components/finance/BillingTabsBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Download, Clock, CheckCircle, Plus, Calendar, Truck, Package, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, X, Filter, Printer, FileText } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "../../services/orderApi";
import { sellerApi } from "../../services/sellerApi";
import { getuser, getuserid } from "../../services/getbasicdata";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "../../src/apiglobal/apiconfig";
import { API_BASE_URL } from "../../services/config";
import Select1 from "react-select";
import {
  printBillingDocument,
  printBillingDocuments,
  resolveDocTypeFromTab,
  walletItemToBillingDoc,
  downloadMonthlyInvoicePdf,
  printMonthlyInvoiceSheet,
  monthYearLabel,
  firstOfNextMonthLabel,
  monthPeriodLabel,
  monthlyBillNo,
  signedInvoiceAmount,
  buildMonthlyInvoiceInput,
  downloadBillingDocumentsPdf,
} from "@/utils/printBillingDocument";

// Lazy load xlsx to prevent initial load issues
const loadXLSX = async () => {
  return await import('xlsx');
};

// Types
interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface WalletTransaction {
  id: number;
  user_id: number;
  transid: string;
  referenceId: string | null;
  orderNumber?: string | null;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  type?: "credit" | "debit";
  order?: any;
}

interface CODHistoryItem {
  id: string;
  orderId: string;
  referenceId: string;
  orderDate: string;
  orderDateISO: string;
  courier: string;
  awbNumber: string;
  invoiceAmount: string;
  codAmount: string;
  seller?: string;
  deliveredDate: string;
  deliveredDateISO: string;
  deliveredTime: string;
  status: "pending" | "settled" | "overdue";
  codstate?: string;
  remittanceDueDate?: string;
  remittanceDueDateISO?: string;
}

interface WalletHistoryItem {
  id: string;
  transactionId: string;
  type: "credit" | "debit";
  amount: string;
  balance: string;
  referenceId: string;
  description: string;
  date: string;
  dateISO: string;
  status: string;
  zone?: string;
  weight?: string;
  paymentMode?: string;
  sellerId?: string | number;
  sellerName?: string;
  sellerAddress?: string;
  sellerCity?: string;
  sellerState?: string;
  sellerPincode?: string;
  sellerGst?: string;
  sellerPhone?: string;
}

interface DateRange {
  from: string;
  to: string;
}

const codStatusStyles = {
  settled: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
};

const txnStatusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  Pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  Debited: "bg-red-100 text-red-700",
  Credited: "bg-green-100 text-green-700",
  Approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  Refund: "bg-blue-100 text-blue-700",
};

// Global temp object for seller mapping
let sellerMap: Record<string, any> = {};

function CreateTransactionModal({ open, onOpenChange, onSuccess }: CreateTransactionModalProps) {
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("debit");
  const [reason, setReason] = useState<string>("Weight Dispute");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("Weight Dispute");
  const [orders, setOrders] = useState<{ value: string; label: string; awb: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapOrderOption = (x: any) => {
    const awb = x?.awb && x.awb !== "-" ? String(x.awb) : "";
    const ref = x?.referenceId || x?.orderNumber || x?.id;
    return {
      value: x.id,
      awb,
      label: awb ? `${awb} · ${ref}` : `No AWB · ${ref}`,
    };
  };

  const applyOrderRows = (rows: any[]) => {
    const unique = new Map<string, any>();
    for (const row of rows || []) {
      if (row?.id && !unique.has(String(row.id))) unique.set(String(row.id), row);
    }
    setOrders(Array.from(unique.values()).map(mapOrderOption));
  };

  const loadOrders = async (term = "") => {
    setSearching(true);
    try {
      const q = term.trim();
      const requests = q.length >= 3
        ? [
            orderApi.getAll({ paginate: "false", awb: q }),
            orderApi.getAll({ paginate: "false", search: q }),
          ]
        : [orderApi.getAll({ paginate: "true", page: "1", limit: "200" })];

      const results = await Promise.all(requests);
      const rows = results.flatMap((data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.orders)) return data.orders;
        if (Array.isArray(data?.data)) return data.data;
        return [];
      });
      applyOrderRows(rows);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadOrders();
    } else {
      setSelectedOrderId("");
      setOrders([]);
      setAmount(0);
      setReason("Weight Dispute");
      setDescription("Weight Dispute");
      setTransactionType("debit");
    }
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      toast({ title: "Validation Error", description: "Please search and select an order by AWB", variant: "destructive" });
      return;
    }
    if (amount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be greater than zero", variant: "destructive" });
      return;
    }
    const note = description.trim() || reason;
    if (!note) {
      toast({ title: "Validation Error", description: "Description is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "tracking/transactions", {
        orderId: selectedOrderId,
        type: transactionType,
        amount,
        description: note,
      }, {});
      if (res?.data?.success === false || res?.success === false) {
        throw new Error(res?.data?.message || res?.message || "Failed to create transaction");
      }
      toast({ title: "Success", description: "Transaction created successfully" });
      setSelectedOrderId("");
      setTransactionType("debit");
      setAmount(0);
      setDescription("Weight Dispute");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader><DialogTitle>Create New Transaction</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Search Order by AWB *</Label>
            <Input
              placeholder={searching ? "Loading orders..." : "Type AWB to search"}
              onChange={(e) => {
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => loadOrders(e.target.value), 300);
              }}
            />
            <div className="max-h-44 overflow-y-auto rounded-md border bg-background">
              {searching ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No orders found</p>
              ) : (
                orders.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${selectedOrderId === option.value ? "bg-muted font-medium" : ""}`}
                    onClick={() => setSelectedOrderId(option.value)}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
            {selectedOrderId ? (
              <p className="text-xs text-muted-foreground">
                Selected: {orders.find((o) => o.value === selectedOrderId)?.label}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <select
              className="w-full border rounded-md h-10 px-3 text-sm bg-background"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (!description || description === reason) setDescription(e.target.value);
                if (e.target.value === "Weight Dispute") setTransactionType("debit");
              }}
            >
              <option value="Weight Dispute">Weight Dispute</option>
              <option value="Manual Adjustment">Manual Adjustment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Select Type *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="credit" checked={transactionType === "credit"} onChange={() => setTransactionType("credit")} /> Credit
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="debit" checked={transactionType === "debit"} onChange={() => setTransactionType("debit")} /> Debit
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get next remittance date based on delivered date + 7 days, then next SATURDAY or TUESDAY
const getNextRemittanceDateFromDelivered = (deliveredDateISO: string): string => {
  if (!deliveredDateISO) return "-";
  
  try {
    const deliveredDate = new Date(deliveredDateISO);
    if (isNaN(deliveredDate.getTime())) return "-";
    
    const after7Days = new Date(deliveredDate);
    after7Days.setDate(deliveredDate.getDate() + 7);
    
    // Find the next Saturday or Tuesday after the 7-day mark
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(after7Days);
      checkDate.setDate(after7Days.getDate() + i);
      const dayName = checkDate.toLocaleDateString("en-US", { weekday: "long" });
      
      if (dayName === "Saturday" || dayName === "Tuesday") {
        const day = String(checkDate.getDate()).padStart(2, '0');
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const year = checkDate.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }
    
    return "-";
  } catch (error) {
    console.error("Error calculating next remittance date:", error);
    return "-";
  }
};

// Parse date from DD-MM-YYYY to Date object
const parseDateFromDMY = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "-") return null;
  try {
    const [day, month, year] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } catch {
    return null;
  }
};

// Format date to DD-MM-YYYY
const formatDateToDMY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseMoneyValue = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Collectable COD amount: prefer totalOutstanding, fall back to invoice amount for older orders. */
const resolveCollectableAmount = (order: any): number => {
  const outstanding = parseMoneyValue(order?.totalOutstanding);
  if (outstanding !== 0) return Number(outstanding.toFixed(2));
  return Number(parseMoneyValue(order?.amount).toFixed(2));
};

const isCodFinanceOrder = (order: any): boolean => {
  const paymentGateway = String(order?.paymentGateway || order?.payment_method || order?.paymentMethod || "");
  const paymentType = String(order?.payment_type || "");
  const financialStatus = String(order?.financialStatus || "").toLowerCase();
  return (
    paymentGateway === "Cash on Delivery (COD)" ||
    paymentGateway === "COD" ||
    paymentGateway.toLowerCase() === "cod" ||
    paymentGateway.toLowerCase() === "cash on delivery" ||
    paymentGateway.toLowerCase().includes("cash on delivery") ||
    paymentType === "COD" ||
    paymentType === "Cash on Delivery" ||
    financialStatus === "pending"
  );
};

// Get the next upcoming remittance date from pending COD orders (future dates only)
const getNextUpcomingRemittanceDate = (codOrders: CODHistoryItem[]): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pendingOrders = codOrders.filter(order => order.status === "pending");
  
  if (pendingOrders.length === 0) {
    return "-";
  }
  
  const futureDueDates: Date[] = [];
  
  pendingOrders.forEach(order => {
    if (order.remittanceDueDate && order.remittanceDueDate !== "-") {
      const dueDate = parseDateFromDMY(order.remittanceDueDate);
      if (dueDate && dueDate >= today) {
        futureDueDates.push(dueDate);
      }
    }
  });
  
  if (futureDueDates.length === 0) {
    return "-";
  }
  
  // Sort dates and get the earliest future date
  futureDueDates.sort((a, b) => a.getTime() - b.getTime());
  const nextDate = futureDueDates[0];
  return formatDateToDMY(nextDate);
};

// Get next upcoming remittance amount (sum of ALL pending orders due on or before the next date)
const getNextUpcomingRemittanceAmount = (codOrders: CODHistoryItem[]): number => {
  const nextDateStr = getNextUpcomingRemittanceDate(codOrders);
  if (nextDateStr === "-") return 0;
  
  const nextDate = parseDateFromDMY(nextDateStr);
  if (!nextDate) return 0;
  
  // Sum ALL pending orders where due date is <= nextDate (or equal to nextDate)
  // This includes all orders that are due on the upcoming Saturday/Tuesday
  let total = 0;
  codOrders.forEach(order => {
    if (order.status === "pending" && order.remittanceDueDate && order.remittanceDueDate !== "-") {
      const dueDate = parseDateFromDMY(order.remittanceDueDate);
      if (dueDate && dueDate <= nextDate) {
        const amountStr = order.codAmount.replace('₹', '').replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          total += amount;
        }
      }
    }
  });
  
  return total;
};

const FinancePage = () => {
  const { toast } = useToast();
  const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
  const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("codhistory");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [codDateRange, setCodDateRange] = useState<DateRange>({
    from: "",
    to: ""
  });
  const [walletDateRange, setWalletDateRange] = useState<DateRange>({
    from: "",
    to: ""
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState(() => new Date().getMonth() + 1);
  const [invoiceYear, setInvoiceYear] = useState(() => new Date().getFullYear());
  const [invoiceSellerId, setInvoiceSellerId] = useState<string>("all");
  const [invoicePdfLoading, setInvoicePdfLoading] = useState(false);

  const [summary, setSummary] = useState({
    totalGenerated: 0,
    totalPaid: 0,
    nextRemittanceDate: "-",
    nextAmount: 0,
    totalDue: 0,
  });

  const convertToISODate = (dateInput: any): string => {
    if (!dateInput) return "";

    try {
      const raw = String(dateInput).trim();
      // Plain calendar-day strings are already days — keep them as-is.
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

      // Timestamps must map to the viewer's LOCAL calendar day. The old
      // UTC day (toISOString().split('T')[0]) pushed transactions made
      // after midnight IST onto the previous day, so the passbook/COD date
      // filter disagreed with the date column (formatted in local time).
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }

      // Fallback: date-prefixed strings without a parseable time.
      if (raw.match(/^\d{4}-\d{2}-\d{2}/)) return raw.split('T')[0];

      return "";
    } catch (error) {
      console.error("Date conversion error:", error);
      return "";
    }
  };

  const formatDateToDDMMYYYY = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return "-";
    }
  };

  const extractTimeFromDate = (dateTimeString: string): string => {
    if (!dateTimeString) return "-";
    
    try {
      const date = new Date(dateTimeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
      }
      
      const timeMatch = dateTimeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
      }
      
      return "-";
    } catch (error) {
      console.error("Time extraction error:", error);
      return "-";
    }
  };

  const formatAmount = (amount: number | string) => {
    let numAmount = typeof amount === 'string' ? parseFloat(amount.replace('₹', '').replace(/,/g, '')) : amount;
    if (isNaN(numAmount)) numAmount = 0;
    return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDeliveredDetailsFromOrder = (order: any) => {
    let deliveryDateTime = null;
    let deliveredDateStr = null;
    
    if (order.deliveredDateTime) {
      deliveryDateTime = order.deliveredDateTime;
      deliveredDateStr = order.deliveredDateTime;
    }
    else if (order.deliveredAt) {
      deliveryDateTime = order.deliveredAt;
      deliveredDateStr = order.deliveredAt;
    }
    else if (order.deliveredDate && order.deliveredTime) {
      deliveryDateTime = `${order.deliveredDate} ${order.deliveredTime}`;
      deliveredDateStr = order.deliveredDate;
    }
    else if (order.deliveredDate) {
      deliveryDateTime = order.deliveredDate;
      deliveredDateStr = order.deliveredDate;
    }
    else if (order.updatedAt && order.status === "Delivered") {
      deliveryDateTime = order.updatedAt;
      deliveredDateStr = order.updatedAt;
    }
    else if (order.tracking_history && Array.isArray(order.tracking_history)) {
      const deliveredEvent = order.tracking_history.find(
        (event: any) => 
          event.state === "DELIVERED" || 
          event.status === "DELIVERED" ||
          event.event === "DELIVERED"
      );
      
      if (deliveredEvent) {
        deliveryDateTime = deliveredEvent.deliveredDate || 
                          deliveredEvent.deliveredAt || 
                          deliveredEvent.createdAt || 
                          deliveredEvent.timestamp ||
                          deliveredEvent.date;
        deliveredDateStr = deliveryDateTime;
      }
    }
    
    if (!deliveredDateStr && order.deliveredDate) {
      deliveredDateStr = order.deliveredDate;
    }
    
    if (deliveryDateTime || deliveredDateStr) {
      const dateToUse = deliveredDateStr || deliveryDateTime;
      const formattedDate = formatDateToDDMMYYYY(dateToUse);
      const formattedTime = extractTimeFromDate(deliveryDateTime || dateToUse);
      const isoDate = convertToISODate(dateToUse);
      
      return {
        deliveredDate: formattedDate,
        deliveredDateISO: isoDate,
        deliveredTime: formattedTime
      };
    }
    
    return { deliveredDate: "-", deliveredDateISO: "", deliveredTime: "-" };
  };

  const getAWBNumber = (order: any) => {
    return order.trackingnumber || order.awb || order.awbNumber || "-";
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}`,
        { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Failed to fetch order details for ${orderId}:`, error);
    }
    return null;
  };

  const filteredCodHistory = useMemo(() => {
    let filtered = [...codHistory];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item?.orderId?.toLowerCase()?.includes(term) ||
        item?.referenceId?.toLowerCase()?.includes(term) ||
        item.courier.toLowerCase().includes(term) ||
        (item.seller && item.seller.toLowerCase().includes(term)) ||
        item.awbNumber.toLowerCase().includes(term) ||
        item.codAmount.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      );
    }
    
    if (codDateRange.from || codDateRange.to) {
      filtered = filtered.filter(item => {
        const itemDate = item.deliveredDateISO;
        if (!itemDate || itemDate === "") return false;
        
        if (codDateRange.from && codDateRange.to) {
          return itemDate >= codDateRange.from && itemDate <= codDateRange.to;
        } else if (codDateRange.from) {
          return itemDate >= codDateRange.from;
        } else if (codDateRange.to) {
          return itemDate <= codDateRange.to;
        }
        return true;
      });
    }
    
    return filtered;
  }, [codHistory, searchTerm, codDateRange]);

  const filteredWalletHistory = useMemo(() => {
    let filtered = [...walletHistory];

    const matchesTab = (item: WalletHistoryItem) => {
      const desc = String(item.description || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();
      switch (activeTab) {
        case "shipping":
          return (
            type === "debit" ||
            desc.includes("shipment") ||
            desc.includes("shipping") ||
            desc.includes("rto") ||
            status.includes("debit")
          );
        case "recharges":
          return (
            type === "credit" ||
            status.includes("credit") ||
            status.includes("approved") ||
            desc.includes("recharge") ||
            desc.includes("wallet credit")
          );
        case "invoices":
          return (
            type === "debit" ||
            desc.includes("shipment") ||
            desc.includes("invoice") ||
            status.includes("debit")
          );
        case "credit":
          return (
            type === "credit" ||
            status.includes("refund") ||
            status.includes("credit") ||
            desc.includes("refund") ||
            desc.includes("credit note")
          );
        case "debit":
          return (
            type === "debit" ||
            status.includes("debit") ||
            desc.includes("debit note") ||
            desc.includes("rto")
          );
        case "notifications":
          return (
            desc.includes("notification") ||
            desc.includes("sms") ||
            desc.includes("whatsapp") ||
            desc.includes("email credit")
          );
        case "ledgers":
        case "wallet":
        default:
          return true;
      }
    };

    if (activeTab !== "codhistory" && activeTab !== "wallet" && activeTab !== "ledgers") {
      filtered = filtered.filter(matchesTab);
    } else if (activeTab === "wallet" || activeTab === "ledgers") {
      // full passbook / ledger
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.transactionId.toLowerCase().includes(term) ||
        item.referenceId.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      );
    }
    
    if (walletDateRange.from || walletDateRange.to) {
      filtered = filtered.filter(item => {
        const itemDate = item.dateISO;
        if (!itemDate || itemDate === "") return false;
        
        if (walletDateRange.from && walletDateRange.to) {
          return itemDate >= walletDateRange.from && itemDate <= walletDateRange.to;
        } else if (walletDateRange.from) {
          return itemDate >= walletDateRange.from;
        } else if (walletDateRange.to) {
          return itemDate <= walletDateRange.to;
        }
        return true;
      });
    }
    
    return filtered;
  }, [walletHistory, searchTerm, walletDateRange, activeTab]);

  const handleCodDateFromChange = (value: string) => {
    setCodDateRange(prev => ({ ...prev, from: value }));
    setCurrentPage(1);
  };

  const handleCodDateToChange = (value: string) => {
    setCodDateRange(prev => ({ ...prev, to: value }));
    setCurrentPage(1);
  };

  const handleWalletDateFromChange = (value: string) => {
    setWalletDateRange(prev => ({ ...prev, from: value }));
    setCurrentPage(1);
  };

  const handleWalletDateToChange = (value: string) => {
    setWalletDateRange(prev => ({ ...prev, to: value }));
    setCurrentPage(1);
  };

  const clearCodDateFilter = () => {
    setCodDateRange({ from: "", to: "" });
    setCurrentPage(1);
  };

  const clearWalletDateFilter = () => {
    setWalletDateRange({ from: "", to: "" });
    setCurrentPage(1);
  };

  const getColumnWidths = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    const widths: number[] = [];
    const headers = Object.keys(data[0]);
    
    headers.forEach((header, idx) => {
      let maxLength = header.length;
      data.forEach(row => {
        const value = String(row[header] || '');
        maxLength = Math.max(maxLength, value.length);
      });
      widths[idx] = Math.min(maxLength, 50);
    });
    
    return widths;
  };

  const exportToExcel = async (type: string) => {
    if (exporting) return;
    
    setExporting(true);
    toast({ title: "Processing", description: "Preparing export..." });
    
    try {
      const XLSX = await loadXLSX();
      const dataToExport = type === "COD History"
        ? filteredCodHistory
        : type === "Invoices"
          ? filteredMonthlyInvoices
          : filteredWalletHistory;
      
      if (dataToExport.length === 0) {
        toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
        return;
      }
      
      let worksheetData;
      
      if (type === "Invoices") {
        worksheetData = [
          ...filteredMonthlyInvoices.map((row) => ({
            "Bill no #": row.billNo,
            DATE: row.date,
            "BILL TO": row.sellerName,
            Address: row.sellerAddress || "-",
            GSTIN: row.sellerGst || "-",
            DESCRIPTION: row.description,
            Period: row.period,
            HSN: row.hsn,
            SUBTOTAL: formatAmount(row.subtotal),
            IGST: formatAmount(row.igst),
            TOTAL: formatAmount(row.totalAmount),
          })),
          {
            "Bill no #": "",
            DATE: "",
            "BILL TO": "",
            Address: "",
            GSTIN: "",
            DESCRIPTION: "TOTAL",
            Period: "",
            HSN: "",
            SUBTOTAL: formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.subtotal, 0)),
            IGST: formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.igst, 0)),
            TOTAL: formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.totalAmount, 0)),
          },
        ];
      } else if (type === "COD History") {
        worksheetData = (dataToExport as CODHistoryItem[]).map((item: CODHistoryItem) => ({
          "Order ID": item.orderId,
          "Order Date": item.orderDate,
          "Seller": item.seller || "-",
          "Courier": item.courier,
          "AWB Number": item.awbNumber,
          "Invoice Amount": item.invoiceAmount,
          "Collectable Amount": item.codAmount,
          "Delivered Date": item.deliveredDate,
          "Delivered Time": item.deliveredTime,
          "Remittance Due Date": item.remittanceDueDate || "-",
          "Status": item.status.toUpperCase()
        }));
      } else {
        worksheetData = (dataToExport as WalletHistoryItem[]).map((item: WalletHistoryItem) => ({
          "Transaction ID": item.transactionId,
          "RefenceID": item.referenceId || "-",
          "Type": item.type.toUpperCase(),
          "Amount": item.amount,
          "Zone": item.zone || "-",
          "Weight": item.weight || "-",
          "Payment Mode": item.paymentMode || "-",
          "Description": item.description,
          "Date": item.date,
          "Status": item.status
        }));
      }
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const maxWidths = getColumnWidths(worksheetData);
      worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, type);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      XLSX.writeFile(workbook, `${type.replace(" ", "_")}_${timestamp}.xlsx`);
      
      toast({ 
        title: "Success", 
        description: `Exported ${dataToExport.length} ${type} records successfully!` 
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to export data. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (type: string) => {
    if (exporting) return;
    
    setExporting(true);
    
    try {
      const dataToExport = type === "COD History"
        ? filteredCodHistory
        : type === "Invoices"
          ? filteredMonthlyInvoices
          : filteredWalletHistory;
      
      if (dataToExport.length === 0) {
        toast({ title: "No Data", description: `No ${type} data available to export.`, variant: "destructive" });
        return;
      }
      
      let headers: string[] = [];
      let rows: any[][] = [];
      
      if (type === "Invoices") {
        headers = ["Bill no #", "DATE", "BILL TO", "Address", "GSTIN", "DESCRIPTION", "Period", "HSN", "SUBTOTAL", "IGST", "TOTAL"];
        rows = [
          ...filteredMonthlyInvoices.map((row) => [
            row.billNo,
            row.date,
            row.sellerName,
            row.sellerAddress || "-",
            row.sellerGst || "-",
            row.description,
            row.period,
            row.hsn,
            formatAmount(row.subtotal),
            formatAmount(row.igst),
            formatAmount(row.totalAmount),
          ]),
          [
            "",
            "",
            "",
            "",
            "",
            "TOTAL",
            "",
            "",
            formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.subtotal, 0)),
            formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.igst, 0)),
            formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.totalAmount, 0)),
          ],
        ];
      } else if (type === "COD History") {
        headers = ["Order ID", "Order Date", "Seller", "Courier", "AWB Number", "Invoice Amount", "Collectable Amount", "Delivered Date", "Delivered Time", "Remittance Due Date", "Status"];
        rows = (dataToExport as CODHistoryItem[]).map((item: CODHistoryItem) => [
          item.orderId,
          item.orderDate,
          item.seller || "-",
          item.courier,
          item.awbNumber,
          item.invoiceAmount,
          item.codAmount,
          item.deliveredDate,
          item.deliveredTime,
          item.remittanceDueDate || "-",
          item.status
        ]);
      } else {
        headers = ["Transaction ID", "ReferenceId", "Type", "Amount", "Zone", "Weight", "Payment Mode", "Description", "Date", "Status"];
        rows = (dataToExport as WalletHistoryItem[]).map((item: WalletHistoryItem) => [
          item.transactionId,
          item.referenceId || "-",
          item.type,
          item.amount,
          item.zone || "-",
          item.weight || "-",
          item.paymentMode || "-",
          item.description,
          item.date,
          item.status
        ]);
      }
      
      const escapeCSV = (cell: any) => {
        if (cell === null || cell === undefined) return '""';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
      
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      link.setAttribute("download", `${type.replace(" ", "_")}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ 
        title: "Success", 
        description: `Exported ${dataToExport.length} ${type} records as CSV!` 
      });
    } catch (error) {
      console.error("CSV Export error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to export CSV. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const walletResponse: WalletTransaction[] = await fetch(
        getuser()?.role === "admin"
          ? `${API_BASE_URL}/wallets`
          : `${API_BASE_URL}/wallets/users/${getuser()?.id}`,
        { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` } }
      ).then(res => res.json());

      const ordersResult = await orderApi.getAll({ paginate: "false" });
      let ordersData = ordersResult.orders || ordersResult;
      
      if (!Array.isArray(ordersData)) {
        ordersData = [];
      }

      try {
        if (getuser()?.role === "admin") {
          const sellerData = await sellerApi.getAll();
          sellerMap = {};
          for (const x of sellerData || []) {
            sellerMap[x.id] = x;
          }
        } else {
          const me = await sellerApi.getById(getuserid());
          sellerMap = me ? { [me.id]: me } : {};
        }
      } catch (error) {
        console.error("Failed to fetch sellers:", error);
      }
      
      const codOnlyOrders = ordersData.filter((order: any) => isCodFinanceOrder(order));

      const ordersWithDetails = await Promise.all(
        codOnlyOrders.map(async (order: any) => {
          if (order.tracking_history && Array.isArray(order.tracking_history) && order.tracking_history.length > 0) {
            return order;
          }
          const detailedOrder = await fetchOrderDetails(order.id);
          return detailedOrder || order;
        })
      );

      const orderByKey: Record<string, any> = {};
      for (const order of ordersData) {
        if (order?.referenceId) orderByKey[String(order.referenceId)] = order;
        if (order?.orderNumber) orderByKey[String(order.orderNumber)] = order;
      }

      const paymentModeOf = (order: any) => {
        if (!order) return "-";
        const gateway = String(order.paymentGateway || order.payment_method || order.paymentMethod || "");
        const financial = String(order.financialStatus || "").toLowerCase();
        if (financial === "pending" || /cod|cash on delivery/i.test(gateway)) return "COD";
        if (financial === "paid" || /prepaid|online|upi|razorpay|cashfree|card/i.test(gateway)) return "Prepaid";
        return gateway || financial || "-";
      };

      const weightOf = (order: any) => {
        if (!order) return "-";
        // Show the chargeable weight — whichever is higher, dead or volumetric.
        // Some couriers store grams (3000 = 3 kg); an explicit "kg"/"g" unit
        // wins, otherwise a bare number >= 100 is grams (kg values stay < 100).
        const toKg = (value: unknown) => {
          const raw = String(value ?? "").trim().toLowerCase();
          const n = Number(raw.replace(/[^0-9.-]/g, ""));
          if (!Number.isFinite(n)) return NaN;
          if (/kg|kilo/.test(raw)) return n;
          if (/\bg\b|gram/.test(raw)) return n / 1000;
          return n >= 100 ? n / 1000 : n;
        };
        const candidates = [toKg(order.totalWeight), toKg(order.deadWeight), toKg(order.totalVolumetricWeight)].filter(
          (n) => Number.isFinite(n) && n > 0
        );
        if (!candidates.length) return "-";
        const n = Math.max(...candidates);
        return `${Number(n.toFixed(3))} kg`;
      };

      const walletHistoryData: WalletHistoryItem[] = [];
      const codHistoryData: CODHistoryItem[] = [];
      
      let totalGenerated = 0;
      let totalPaid = 0;
      let totalDue = 0;
      let runningBalance = 0; // For wallet running balance

      // Process wallet transactions (sorted oldest first for correct balance)
      if (Array.isArray(walletResponse)) {
        walletResponse.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        for (const item of walletResponse) {
          if (item.status === "draft") continue;
          
          let type: "credit" | "debit" = "debit";
          let displayStatus = item.status;
          const statusLower = String(item.status || "").toLowerCase();
          const descLower = String(item.description || "").toLowerCase();
          const amountNum = Number(item.amount) || 0;
          const descIsCredit = /\b(credit|credited|recharge|refund)\b/.test(descLower) && !/\bdebit/.test(descLower);

          if (statusLower.includes("refund")) {
            type = "credit";
            displayStatus = "Refund";
            runningBalance += Math.abs(amountNum);
          } else if (statusLower.includes("pending")) {
            // Cashfree / manual top-ups that the gateway hasn't confirmed yet
            // (status "pending_payment", "pending", ...). They must show as
            // Pending and must NOT move the running balance — the row flips to
            // Approved → "Credited" only after verify/webhook confirmation.
            type = "credit";
            displayStatus = "Pending";
          } else if (
            statusLower === "credited" ||
            statusLower === "credit" ||
            statusLower === "approved" ||
            statusLower.includes("recharge") ||
            descIsCredit
          ) {
            type = "credit";
            displayStatus = statusLower === "approved" || statusLower === "credit" ? "Credited" : item.status;
            runningBalance += Math.abs(amountNum);
          } else if (statusLower.includes("debit") || amountNum < 0) {
            type = "debit";
            displayStatus = "Debited";
            runningBalance -= Math.abs(amountNum);
          } else if (amountNum > 0) {
            type = "credit";
            displayStatus = "Credited";
            runningBalance += amountNum;
          } else {
            runningBalance -= Math.abs(amountNum);
          }

          const createdAt = item.createdAt;
          const dateISO = convertToISODate(createdAt);
          const displayDate = formatDateToDDMMYYYY(createdAt);
          const seller = sellerMap[item.user_id] || sellerMap[getuserid()] || {};
          const linkedOrder = orderByKey[String(item.referenceId || "")] || orderByKey[String(item.orderNumber || "")] || null;
          
          walletHistoryData.push({
            id: item.id.toString(),
            transactionId: item.transid || item.id.toString(),
            referenceId: item.referenceId || "-",
            type: type,
            amount: formatAmount(item.amount),
            balance: formatAmount(runningBalance),
            zone: linkedOrder?.zone || "-",
            weight: weightOf(linkedOrder),
            paymentMode: paymentModeOf(linkedOrder),
            description: item.description || (type === "credit" ? "Wallet Credit" : "Wallet Debit"),
            date: displayDate,
            dateISO: dateISO,
            status: displayStatus,
            sellerId: item.user_id,
            sellerName: seller.company || seller.name || seller.businessName || getuser()?.company || getuser()?.name || "",
            sellerAddress: seller.address || "",
            sellerCity: seller.city || "",
            sellerState: seller.state || "",
            sellerPincode: seller.pincode || "",
            sellerGst: seller.gst && seller.gst !== "-" ? seller.gst : "",
            sellerPhone: seller.phone || seller.mobile || "",
          });
        }
        
        // Reverse to show newest first in UI
        walletHistoryData.reverse();
      }

      // Process COD orders
      for (const order of ordersWithDetails) {
        if (!order || !order.referenceId) continue;
        
        if (order.status !== "Delivered") continue;
        
        if (!isCodFinanceOrder(order)) continue;

        const collectableAmount = resolveCollectableAmount(order);
        if (collectableAmount <= 0) continue;

        const invoiceAmount = parseMoneyValue(order.invoiceAmount || order.amount);
        
        const isSettled = order.codpaidstatus === "Settled";
        const orderStatus = isSettled ? "settled" : "pending";
        
        const { deliveredDate, deliveredDateISO, deliveredTime } = getDeliveredDetailsFromOrder(order);
        
        const remittanceDueDate = getNextRemittanceDateFromDelivered(deliveredDateISO);
        
        const awbNumber = getAWBNumber(order);
        
        const orderDateValue = order.createdAt || order.orderDate;
        const orderDateDisplay = formatDateToDDMMYYYY(orderDateValue);
        
        codHistoryData.push({
          id: order.id || order.referenceId,
          orderId: order.orderNumber || order.referenceId,
          referenceId: order.referenceId,
          orderDate: orderDateDisplay,
          orderDateISO: convertToISODate(orderDateValue),
          courier: order.courier || "Not Assigned",
          awbNumber: awbNumber,
          seller: sellerMap[order.seller]?.name || order.seller_name || order.seller || "-",
          invoiceAmount: formatAmount(invoiceAmount),
          codAmount: formatAmount(collectableAmount),
          deliveredDate: deliveredDate,
          deliveredDateISO: deliveredDateISO,
          deliveredTime: deliveredTime,
          status: orderStatus,
          codstate: order.codpaidstatus === "Settled" ? "Settled" : "Pending",
          remittanceDueDate: remittanceDueDate,
          remittanceDueDateISO: remittanceDueDate,
        });

        totalGenerated += collectableAmount;
        if (isSettled) {
          totalPaid += collectableAmount;
        } else {
          totalDue += collectableAmount;
        }
      }

      // Sort COD history by delivered date (newest first)
      codHistoryData.sort((a, b) => {
        if (!a.deliveredDateISO && !b.deliveredDateISO) return 0;
        if (!a.deliveredDateISO) return 1;
        if (!b.deliveredDateISO) return -1;
        return b.deliveredDateISO.localeCompare(a.deliveredDateISO);
      });

      // Calculate next remittance date and amount
      const nextDate = getNextUpcomingRemittanceDate(codHistoryData);
      const nextAmount = getNextUpcomingRemittanceAmount(codHistoryData);

      setWalletHistory(walletHistoryData);
      setCodHistory(codHistoryData);
      setSummary({
        totalGenerated,
        totalPaid,
        nextRemittanceDate: nextDate,
        nextAmount: nextAmount,
        totalDue,
      });
      
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Failed to load finance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getCurrentPageData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);
  
  const currentDisplayData = activeTab === "codhistory" ? filteredCodHistory : filteredWalletHistory;
  const currentData = getCurrentPageData(currentDisplayData);
  const currentTotalPages = totalPages(currentDisplayData);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const totalOrders = codHistory.length;
  const settledOrders = codHistory.filter(item => item.status === "settled").length;
  const pendingOrders = codHistory.filter(item => item.status === "pending").length;

  const isCodDateFilterActive = codDateRange.from !== "" || codDateRange.to !== "";
  const isWalletDateFilterActive = walletDateRange.from !== "" || walletDateRange.to !== "";

  const getSearchPlaceholder = () => {
    if (activeTab === "codhistory") {
      return "Search COD orders by Order ID, Seller, Courier, AWB, Status...";
    }
    if (activeTab === "invoices") {
      return "Search by Bill no, BILL TO, GSTIN, Period...";
    }
    return "Search by Transaction ID, Order Number, Description, Status...";
  };

  const walletTabTitles: Record<string, string> = {
    wallet: "Passbook",
    shipping: "Shipping Charges",
    recharges: "All Recharges",
    invoices: "Invoices",
    credit: "Credit Notes",
    debit: "Debit Notes",
    ledgers: "Ledgers",
    notifications: "Notification Credit History",
  };
  const isWalletStyleTab = activeTab !== "codhistory";
  const walletTabTitle = walletTabTitles[activeTab] || "Passbook";
  const printDocType = resolveDocTypeFromTab(activeTab);
  const canPrintBillingDocs = !!printDocType;

  const invoiceSourceRows = useMemo(() => {
    return (walletHistory as WalletHistoryItem[]).filter((item) => {
      const desc = String(item.description || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();
      return (
        type === "debit" ||
        desc.includes("shipment") ||
        desc.includes("invoice") ||
        status.includes("debit")
      );
    });
  }, [walletHistory]);

  const monthlyInvoiceRows = useMemo(() => {
    const groups = new Map<string, WalletHistoryItem[]>();
    for (const item of invoiceSourceRows) {
      const iso = String(item.dateISO || "").slice(0, 10);
      let year = 0;
      let month = 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        year = Number(iso.slice(0, 4));
        month = Number(iso.slice(5, 7));
      } else {
        const m = String(item.date || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!m) continue;
        year = Number(m[3]);
        month = Number(m[2]);
      }
      if (year !== invoiceYear || month !== invoiceMonth) continue;
      const sellerId = String(item.sellerId || item.sellerName || "seller");
      if (getuser()?.role === "admin" && invoiceSellerId !== "all" && sellerId !== invoiceSellerId) continue;
      const key = `${year}-${String(month).padStart(2, "0")}-${sellerId}`;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      const first = items[0];
      const sellerId = String(first.sellerId || first.sellerName || "seller");
      const totalAmount = items.reduce((sum, item) => sum + signedInvoiceAmount(item), 0);
      const absTotal = Math.abs(totalAmount);
      const subtotal = +(absTotal / 1.18).toFixed(2);
      const igst = +(absTotal - subtotal).toFixed(2);
      const address = [first.sellerAddress, first.sellerCity, first.sellerState, first.sellerPincode]
        .filter(Boolean)
        .join(", ");
      return {
        id: key,
        year: invoiceYear,
        month: invoiceMonth,
        monthLabel: monthYearLabel(invoiceYear, invoiceMonth),
        sellerId,
        sellerName: first.sellerName || `Seller ${sellerId}`,
        sellerAddress: address,
        sellerGst: first.sellerGst || "",
        sellerPhone: first.sellerPhone || "",
        shipmentCount: items.length,
        totalAmount: absTotal,
        subtotal,
        igst,
        description: "E-Commerce Courier Charge",
        period: monthPeriodLabel(invoiceYear, invoiceMonth),
        hsn: "996812",
        billNo: monthlyBillNo(invoiceYear, invoiceMonth, groups.size > 1 ? sellerId : undefined),
        date: firstOfNextMonthLabel(invoiceYear, invoiceMonth),
        items,
      };
    }).sort((a, b) => a.sellerName.localeCompare(b.sellerName));
  }, [invoiceSourceRows, invoiceYear, invoiceMonth, invoiceSellerId]);

  const filteredMonthlyInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return monthlyInvoiceRows;
    return monthlyInvoiceRows.filter((row) =>
      row.sellerName.toLowerCase().includes(term) ||
      row.billNo.toLowerCase().includes(term) ||
      row.monthLabel.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term) ||
      row.period.toLowerCase().includes(term) ||
      row.sellerAddress.toLowerCase().includes(term) ||
      String(row.sellerGst || "").toLowerCase().includes(term)
    );
  }, [monthlyInvoiceRows, searchTerm]);

  const invoiceMonthTransactions = useMemo(() => {
    const rows = monthlyInvoiceRows.flatMap((row) => row.items);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) =>
      [
        item.transactionId,
        item.referenceId,
        item.type,
        item.amount,
        item.zone,
        item.weight,
        item.paymentMode,
        item.description,
        item.date,
        item.status,
        item.sellerName,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [monthlyInvoiceRows, searchTerm]);

  const invoiceMonthTotal = useMemo(
    () => invoiceMonthTransactions.reduce((sum, item) => sum + signedInvoiceAmount(item), 0),
    [invoiceMonthTransactions]
  );

  const handlePrintWalletItem = (item: WalletHistoryItem) => {
    const docType = resolveDocTypeFromTab(activeTab);
    if (!docType) return;
    try {
      printBillingDocument(walletItemToBillingDoc(item, docType));
    } catch (error: any) {
      toast({
        title: "Print failed",
        description: error?.message || "Unable to open print dialog",
        variant: "destructive",
      });
    }
  };

  const handlePrintMonthlyInvoice = (row?: (typeof monthlyInvoiceRows)[number]) => {
    try {
      const items = row?.items || invoiceMonthTransactions;
      printMonthlyInvoiceSheet(items, invoiceYear, invoiceMonth);
    } catch (error: any) {
      toast({
        title: "Print failed",
        description: error?.message || "Unable to open print dialog",
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoiceRow = async (row: (typeof monthlyInvoiceRows)[number]) => {
    setInvoicePdfLoading(true);
    try {
      const input = buildMonthlyInvoiceInput(row.items, {
        year: row.year,
        month: row.month,
        sellerKey: monthlyInvoiceRows.length > 1 ? row.sellerId : undefined,
      });
      await downloadBillingDocumentsPdf([input], `Tax_Invoice_${row.billNo}.pdf`);
      toast({ title: "Download started", description: `${row.billNo} PDF is downloading.` });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.message || "Unable to generate invoice PDF",
        variant: "destructive",
      });
    } finally {
      setInvoicePdfLoading(false);
    }
  };

  const handlePrintFilteredDocs = () => {
    const docType = resolveDocTypeFromTab(activeTab);
    if (!docType) return;
    if (activeTab === "invoices") {
      if (!invoiceMonthTransactions.length) {
        toast({ title: "No invoices", description: "No monthly invoice found for the selected month.", variant: "destructive" });
        return;
      }
      try {
        printMonthlyInvoiceSheet(invoiceMonthTransactions, invoiceYear, invoiceMonth);
        toast({
          title: "Print started",
          description: `Preparing ${filteredMonthlyInvoices.length} tax invoice(s)`,
        });
      } catch (error: any) {
        toast({
          title: "Print failed",
          description: error?.message || "Unable to open print dialog",
          variant: "destructive",
        });
      }
      return;
    }
    const rows = filteredWalletHistory as WalletHistoryItem[];
    if (!rows.length) {
      toast({ title: "No documents", description: "Nothing to print on this tab.", variant: "destructive" });
      return;
    }
    try {
      const pageRows = getCurrentPageData(rows) as WalletHistoryItem[];
      printBillingDocuments(pageRows.map((item) => walletItemToBillingDoc(item, docType)));
      toast({
        title: "Print started",
        description: `Preparing ${pageRows.length} ${walletTabTitle.toLowerCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Print failed",
        description: error?.message || "Unable to open print dialog",
        variant: "destructive",
      });
    }
  };

  const invoiceSellerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of invoiceSourceRows) {
      const id = String(item.sellerId || "");
      if (!id) continue;
      if (!map.has(id)) map.set(id, item.sellerName || `Seller ${id}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [invoiceSourceRows]);

  const invoiceYearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const item of invoiceSourceRows) {
      const y = Number(String(item.dateISO || "").slice(0, 4));
      if (y >= 2020 && y <= 2100) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [invoiceSourceRows]);

  const handleDownloadMonthlyInvoice = async () => {
    let rows = invoiceSourceRows;
    if (getuser()?.role === "admin" && invoiceSellerId !== "all") {
      rows = rows.filter((item) => String(item.sellerId) === invoiceSellerId);
    }
    if (!rows.length) {
      toast({ title: "No invoices", description: "No invoice charges found to export.", variant: "destructive" });
      return;
    }
    setInvoicePdfLoading(true);
    try {
      await downloadMonthlyInvoicePdf(rows, invoiceYear, invoiceMonth);
      toast({ title: "Download started", description: "Monthly invoice PDF is downloading." });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.message || "Unable to generate monthly invoice PDF",
        variant: "destructive",
      });
    } finally {
      setInvoicePdfLoading(false);
    }
  };

  return (
    <DashboardLayout hidePageHeader>
      <CreateTransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchAllData} />

      <div className="space-y-4">
        <BillingTabsBar activeTab={activeTab} onTabChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(""); }} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
          {activeTab === "wallet" || activeTab === "ledgers" || activeTab === "shipping" || activeTab === "recharges" || activeTab === "invoices" || activeTab === "credit" || activeTab === "debit" || activeTab === "notifications" ? (
            <>
              <StatCard title="Wallet Balance" value={formatAmount(walletHistory[0]?.balance ?? summary.totalGenerated)} icon={<IndianRupee className="h-5 w-5" />} variant="accent" />
              <StatCard title="Total Credit" value={formatAmount(walletHistory.filter(w => parseFloat(String(w.amount).replace('₹', '').replace(/,/g, '')) > 0 && w.type === 'credit').reduce((s, w) => s + parseFloat(String(w.amount).replace('₹', '').replace(/,/g, '')), 0))} icon={<ArrowUpRight className="h-5 w-5" />} variant="success" />
              <StatCard title="Total Debit" value={formatAmount(Math.abs(walletHistory.filter(w => w.type === 'debit').reduce((s, w) => s + parseFloat(String(w.amount).replace('₹', '').replace(/,/g, '')), 0)))} icon={<ArrowDownRight className="h-5 w-5" />} variant="warning" />
              <StatCard title={`${walletTabTitle} Rows`} value={String(activeTab === "invoices" ? filteredMonthlyInvoices.length : filteredWalletHistory.length)} icon={<FileText className="h-5 w-5" />} />
            </>
          ) : (
            <>
              <StatCard title="Total Remittance Generated" value={formatAmount(summary.totalGenerated)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
              <StatCard title="Total Remittance Paid" value={formatAmount(summary.totalPaid)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
              <StatCard title="Next Remittance" value={formatAmount(summary.nextAmount)} icon={<Clock className="h-5 w-5" />} variant="warning" />
              <StatCard title="Total Remittance Due" value={formatAmount(summary.totalDue)} icon={<IndianRupee className="h-5 w-5" />} variant="destructive" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total COD Orders</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Settled COD Orders</p>
                  <p className="text-2xl font-bold text-green-600">{settledOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending COD Orders</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lm-workspace-shell p-1">
        <Tabs defaultValue="codhistory" value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1);
          setSearchTerm("");
        }}>
          <TabsList className="hidden">
            <TabsTrigger value="wallet">Wallet History</TabsTrigger>
            <TabsTrigger value="codhistory">COD History</TabsTrigger>
          </TabsList>

          <div className="mt-4 mb-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="relative max-w-md flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={getSearchPlaceholder()}
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-9 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showDateFilter ? "Hide Date Filter" : "Show Date Filter"}
              </Button>
            </div>
            
            {showDateFilter && (
              <div className="p-4 border rounded-lg bg-muted/30">
                {activeTab === "codhistory" ? (
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Delivered Date From</Label>
                      <Input
                        type="date"
                        value={codDateRange.from}
                        onChange={(e) => handleCodDateFromChange(e.target.value)}
                        className="w-auto min-w-[180px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Delivered Date To</Label>
                      <Input
                        type="date"
                        value={codDateRange.to}
                        onChange={(e) => handleCodDateToChange(e.target.value)}
                        className="w-auto min-w-[180px]"
                      />
                    </div>
                    {isCodDateFilterActive && (
                      <Button variant="ghost" size="sm" onClick={clearCodDateFilter}>
                        <X className="h-4 w-4 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Transaction Date From</Label>
                      <Input
                        type="date"
                        value={walletDateRange.from}
                        onChange={(e) => handleWalletDateFromChange(e.target.value)}
                        className="w-auto min-w-[180px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Transaction Date To</Label>
                      <Input
                        type="date"
                        value={walletDateRange.to}
                        onChange={(e) => handleWalletDateToChange(e.target.value)}
                        className="w-auto min-w-[180px]"
                      />
                    </div>
                    {isWalletDateFilterActive && (
                      <Button variant="ghost" size="sm" onClick={clearWalletDateFilter}>
                        <X className="h-4 w-4 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {searchTerm && (
              <p className="text-sm text-muted-foreground">
                Found {activeTab === "invoices" ? filteredMonthlyInvoices.length : currentDisplayData.length} result(s) for "{searchTerm}"
              </p>
            )}
          </div>

          {isWalletStyleTab ? (
          <div className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center">
                  <CardTitle>{walletTabTitle}</CardTitle>
                  {getuser()?.role === "admin" && (
                    <Button onClick={() => setModalOpen(true)} className="ml-4">
                      <Plus className="h-4 w-4 mr-1" /> New Transaction
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {activeTab === "invoices" && (
                    <>
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={invoiceMonth}
                        onChange={(e) => { setInvoiceMonth(Number(e.target.value)); setCurrentPage(1); }}
                      >
                        {[
                          "January","February","March","April","May","June",
                          "July","August","September","October","November","December",
                        ].map((label, idx) => (
                          <option key={label} value={idx + 1}>{label}</option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={invoiceYear}
                        onChange={(e) => { setInvoiceYear(Number(e.target.value)); setCurrentPage(1); }}
                      >
                        {invoiceYearOptions.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      {getuser()?.role === "admin" && invoiceSellerOptions.length > 0 && (
                        <select
                          className="h-9 rounded-md border bg-background px-2 text-sm max-w-[180px]"
                          value={invoiceSellerId}
                          onChange={(e) => { setInvoiceSellerId(e.target.value); setCurrentPage(1); }}
                        >
                          <option value="all">All sellers</option>
                          {invoiceSellerOptions.map((seller) => (
                            <option key={seller.id} value={seller.id}>{seller.name}</option>
                          ))}
                        </select>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleDownloadMonthlyInvoice}
                        disabled={loading || invoicePdfLoading}
                      >
                        {invoicePdfLoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1" />
                        )}
                        Download Monthly PDF
                      </Button>
                    </>
                  )}
                  {canPrintBillingDocs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintFilteredDocs}
                      disabled={loading || (activeTab === "invoices" ? filteredMonthlyInvoices.length === 0 : filteredWalletHistory.length === 0)}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Print {activeTab === "credit" ? "Credit Notes" : activeTab === "debit" ? "Debit Notes" : "Monthly Invoice"}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToExcel(walletTabTitle)}
                    disabled={exporting || (activeTab === "invoices" ? filteredMonthlyInvoices.length === 0 : filteredWalletHistory.length === 0)}
                  >
                    {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
                    Export Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToCSV(walletTabTitle)}
                    disabled={exporting || (activeTab === "invoices" ? filteredMonthlyInvoices.length === 0 : filteredWalletHistory.length === 0)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {activeTab === "invoices" ? (
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-semibold">Bill no #</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">DATE</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">BILL TO</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">DESCRIPTION</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Period</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">HSN</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold">SUBTOTAL</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold">IGST</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold">TOTAL</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <p className="mt-2">Loading...</p>
                          </td>
                        </tr>
                      ) : filteredMonthlyInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-muted-foreground">
                            No tax invoices found for the selected month.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {getCurrentPageData(filteredMonthlyInvoices).map((row) => (
                            <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4 text-sm font-mono font-semibold">{row.billNo}</td>
                              <td className="py-3 px-4 text-sm">{row.date}</td>
                              <td className="py-3 px-4 text-sm">
                                <div className="font-medium">{row.sellerName}</div>
                                {row.sellerAddress ? (
                                  <div className="text-xs text-muted-foreground max-w-[240px] truncate">{row.sellerAddress}</div>
                                ) : null}
                                {row.sellerGst ? (
                                  <div className="text-xs text-muted-foreground">GSTIN: {row.sellerGst}</div>
                                ) : null}
                              </td>
                              <td className="py-3 px-4 text-sm">{row.description}</td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">{row.period}</td>
                              <td className="py-3 px-4 text-sm font-mono">{row.hsn}</td>
                              <td className="py-3 px-4 text-sm text-right">{formatAmount(row.subtotal)}</td>
                              <td className="py-3 px-4 text-sm text-right">{formatAmount(row.igst)}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold">{formatAmount(row.totalAmount)}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 h-8"
                                    onClick={() => handlePrintMonthlyInvoice(row)}
                                    title="Print Tax Invoice"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 h-8"
                                    onClick={() => handleDownloadInvoiceRow(row)}
                                    disabled={invoicePdfLoading}
                                    title="Download Tax Invoice PDF"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    PDF
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 border-t-2">
                            <td colSpan={6} className="py-3 px-4 text-sm font-semibold text-right">TOTAL</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">
                              {formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.subtotal, 0))}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">
                              {formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.igst, 0))}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-bold">
                              {formatAmount(filteredMonthlyInvoices.reduce((s, r) => s + r.totalAmount, 0))}
                            </td>
                            <td />
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                  ) : (
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-semibold">Transaction ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Order Number</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Zone</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Weight</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Payment Mode</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
                        {canPrintBillingDocs && (
                          <th className="text-left py-3 px-4 text-xs font-semibold">Print</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={canPrintBillingDocs ? 11 : 10} className="py-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <p className="mt-2">Loading...</p>
                          </td>
                        </tr>
                      ) : currentData.length === 0 ? (
                        <tr>
                          <td colSpan={canPrintBillingDocs ? 11 : 10} className="py-8 text-center text-muted-foreground">
                            No wallet transactions found.
                          </td>
                        </tr>
                      ) : (
                        currentData.map((item: WalletHistoryItem) => (
                          <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-sm font-mono">{item.transactionId}</td>
                            <td className="py-3 px-4 text-sm font-mono">{item.referenceId}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {item.type === "credit" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                {item.type === "credit" ? "Credit" : "Debit"}
                              </span>
                            </td>
                            <td className={`py-3 px-4 text-sm font-semibold ${item.type === "credit" ? "text-green-600" : "text-red-600"}`}>{item.amount}</td>
                            <td className="py-3 px-4 text-sm">{item.zone || "-"}</td>
                            <td className="py-3 px-4 text-sm">{item.weight || "-"}</td>
                            <td className="py-3 px-4 text-sm">{item.paymentMode || "-"}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{item.date}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txnStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
                                {item.status}
                              </span>
                            </td>
                            {canPrintBillingDocs && (
                              <td className="py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 h-8"
                                  onClick={() => handlePrintWalletItem(item)}
                                  title={`Print ${activeTab === "credit" ? "Credit Note" : activeTab === "debit" ? "Debit Note" : "Invoice"}`}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Print
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  )}
                </div>
                
                {!loading && (activeTab === "invoices" ? filteredMonthlyInvoices.length : filteredWalletHistory.length) > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <select 
                        value={itemsPerPage} 
                        onChange={handleItemsPerPageChange}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, activeTab === "invoices" ? filteredMonthlyInvoices.length : filteredWalletHistory.length)} of {activeTab === "invoices" ? filteredMonthlyInvoices.length : filteredWalletHistory.length} entries
                    </div>
                    <div className="flex gap-1">
                      {(() => {
                        const pages = activeTab === "invoices"
                          ? Math.max(1, Math.ceil(filteredMonthlyInvoices.length / itemsPerPage))
                          : currentTotalPages;
                        return (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="px-3 py-1 text-sm">Page {currentPage} of {pages}</span>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pages}><ChevronRight className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(pages)} disabled={currentPage === pages}>Last</Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          ) : null}

          <TabsContent value="codhistory" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>COD History</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToExcel("COD History")}
                    disabled={exporting || filteredCodHistory.length === 0}
                  >
                    {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
                    Export Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToCSV("COD History")}
                    disabled={exporting || filteredCodHistory.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px]">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-xs font-semibold">Order ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Seller</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Order Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Courier</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">AWB Number</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Invoice Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Collectable Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Delivered Time</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Remittance Due</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold">Status</th>
                       </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <p className="mt-2">Loading...</p>
                          </td>
                        </tr>
                      ) : currentData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-muted-foreground">
                            No COD history found.
                          </td>
                        </tr>
                      ) : (
                        currentData.map((item: CODHistoryItem) => (
                          <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-sm font-mono">{item.orderId}</td>
                            <td className="py-3 px-4 text-sm">{item.seller || "-"}</td>
                            <td className="py-3 px-4 text-sm whitespace-nowrap">{item.orderDate}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Truck className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[150px]" title={item.courier}>{item.courier}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm font-mono">
                              <span className="text-blue-600 font-medium">{item.awbNumber}</span>
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold">{item.invoiceAmount}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-green-600">{item.codAmount}</td>
                            <td className="py-3 px-4 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className={item.deliveredDate !== "-" ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                  {item.deliveredDate}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className={item.deliveredTime !== "-" ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                                  {item.deliveredTime}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0 text-warning" />
                                <span className="font-semibold text-warning">
                                  {item.remittanceDueDate || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${codStatusStyles[item.status]}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {item.status === "pending" && getuser()?.role === "admin" && (
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={async () => {
                                    try {
                                      const res = await apiRequest("PATCH", `orders/${item.id}/mark-cod-paid`, {}, {});
                                      if (res?.success !== false) {
                                        setCodHistory(prev =>
                                          prev.map(entry =>
                                            entry.id === item.id
                                              ? { ...entry, status: "settled", codstate: "Settled" }
                                              : entry
                                          )
                                        );
                                        toast({ title: "Success", description: "COD marked as paid" });
                                      } else {
                                        toast({ title: "Error", description: res?.message || "Failed to mark as paid", variant: "destructive" });
                                      }
                                    } catch (e) {
                                      toast({ title: "Error", description: "Failed to mark as paid", variant: "destructive" });
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Mark as Paid
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {!loading && filteredCodHistory.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <select 
                        value={itemsPerPage} 
                        onChange={handleItemsPerPageChange}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCodHistory.length)} of {filteredCodHistory.length} entries
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="px-3 py-1 text-sm">Page {currentPage} of {currentTotalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === currentTotalPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentTotalPages)} disabled={currentPage === currentTotalPages}>Last</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FinancePage;