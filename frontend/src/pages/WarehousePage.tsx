// import { useEffect, useState } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Switch } from "@/components/ui/switch";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { Warehouse, MapPin, Plus, Edit, Trash2, Star } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import {apiRequest} from "../../src/apiglobal/apiconfig"
// import { getuserid } from "../../services/getbasicdata";
// import pincodelist from "../apiglobal/pincodelist.json";

     
// interface WarehouseItem {
//   id: string;
//   name: string;
//   address: string;
//   city: string;
//   state: string;
//   pincode: string;
//   contactPerson: string;
//   phone: string;
//   isDefault: boolean;
//   isActive: boolean;
//   ordersProcessed: number;
// }

// const initialWarehouses: WarehouseItem[] = [
//   // { id: "w1", name: "Mumbai Central Hub", address: "Plot 45, MIDC, Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400093", contactPerson: "Rajesh Kumar", phone: "+91 98765 43210", isDefault: true, isActive: true, ordersProcessed: 2450 },
//   // { id: "w2", name: "Delhi NCR Warehouse", address: "Sector 63, Noida", city: "Noida", state: "Uttar Pradesh", pincode: "201301", contactPerson: "Amit Patel", phone: "+91 87654 32109", isDefault: false, isActive: true, ordersProcessed: 1820 },
//   // { id: "w3", name: "Bangalore Tech Park", address: "Whitefield IT Park", city: "Bangalore", state: "Karnataka", pincode: "560066", contactPerson: "Priya Sharma", phone: "+91 76543 21098", isDefault: false, isActive: true, ordersProcessed: 980 },
//   // { id: "w4", name: "Chennai Warehouse", address: "Ambattur Industrial Estate", city: "Chennai", state: "Tamil Nadu", pincode: "600058", contactPerson: "Lakshmi Iyer", phone: "+91 65432 10987", isDefault: false, isActive: false, ordersProcessed: 320 },
// ];

// const WarehousePage = () => {
//   const { toast } = useToast();
//   const [warehouses, setWarehouses] = useState(initialWarehouses);
//   const [createOpen, setCreateOpen] = useState(false);
//   const [editWarehouse, setEditWarehouse] = useState<WarehouseItem | null>(null);
//   const [formData, setFormData] = useState({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "",user_id:"", });

//   const activeCount = warehouses.filter(w => w.isActive).length;
//   const totalOrders = warehouses.reduce((a, w) => a + w.ordersProcessed, 0);


// const getWarehouses = async () => {
//   let response =await apiRequest("GET","auth/getAllWarehouses",{},{})
//   // console.log(response,"asdjlsakdl ")

//   setWarehouses([...response.data.data.filter((val)=>val.user_id==getuserid())])
// }





//   const handleCreate = async () => {
//     const newW: WarehouseItem = { id: `w${Date.now()}`, ...formData, isDefault: false, isActive: true, ordersProcessed: 0 };
//         formData.user_id=getuserid() 
//     let response =await apiRequest("POST","auth/createWarehouse",formData,{})
//     getWarehouses()
//     setCreateOpen(false);
//     setFormData({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "",user_id:"", });
//     toast({ title: "Warehouse added" });
//   };
//   const handleupdate2=async (updateddata)=>{
//    let response =await apiRequest("PUT","auth/updateWarehouse/"+updateddata.id,updateddata,{})


//   }

//   const handleUpdate = async() => {
//     if (!editWarehouse) return;
//     let response =await apiRequest("PUT","auth/updateWarehouse/"+editWarehouse.id,formData,{})

//     getWarehouses()



//     setEditWarehouse(null);
//     toast({ title: "Warehouse updated" });
//   };
  

//   const setDefault = async (id: string) => {
//     setWarehouses(prev => prev.map(w => ({ ...w, isDefault: w.id === id })));
//     let daaa=warehouses.find((w) => w.id === id)
//     for(let w of warehouses){
//       if(w.id!==id){
//         w.isDefault=false
//         await handleupdate2(w);
//       }
//       else{
//           w.isDefault=true
//         await handleupdate2(w);

//       }
//     }
  

//     // daaa.isDefault=true
//     // await handleupdate2(daaa);



//     getWarehouses()

//     toast({ title: "Default warehouse set" });
//   };

//   const toggleActive = (id: string) => {
//     setWarehouses(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
//       let daaa=warehouses.find((w) => w.id === id)
//     daaa.isActive=!daaa.isActive || false
//     handleupdate2(daaa);
//     toast({ title: "Status updated" });
//   };

//   const deleteWarehouse =async (id: string) => {
//      let response =await apiRequest("DELETE","auth/deleteWarehouse/"+id,{},{})

//     getWarehouses()

//     toast({ title: "Warehouse removed", variant: "destructive" });
//   };

//   const openEdit = (w) => {
//     setFormData({ name: w.name, address: w.address, city: w.city, state: w.state, pincode: w.pincode, contactPerson: w.contactPerson, phone: w.phone,user_id:w.user_id, });
//     setEditWarehouse(w);
//   };
//   useEffect(()=>{
// getWarehouses()
//   },[])


//   async function getPincodeDetails(pincode) {
//   try {
//     const response = await fetch(
//       `https://api.postalpincode.in/pincode/${pincode}`
//     );

//     const data = await response.json();

//     if (
//       data[0].Status === "Success" &&
//       data[0].PostOffice.length > 0
//     ) {
//       const post = data[0].PostOffice[0];

//     return {
//           pincode: post.Pincode,
//           City: post.Region || post.Name,
//           District: post.District,
//           State: post.State,
//           country: post.Country,
//         }
    
//     } else {
//       return {
//         success: false,
//         message: "Pincode not found",
//       };
//     }
//   } catch (error) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }
// } 




//   const FormFields = ({formData,setFormData}) => (
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//       <div className="space-y-2 md:col-span-2"><Label>Warehouse Name</Label><Input defaultValue={formData.name} onBlur={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
//       <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input defaultValue={formData.address} onBlur={e => setFormData(f => ({ ...f, address: e.target.value }))} /></div>
//       <div className="space-y-2"><Label>City</Label><Input defaultValue={formData.city} onBlur={e => setFormData(f => ({ ...f, city: e.target.value }))} /></div>
//       <div className="space-y-2"><Label>State</Label><Input defaultValue={formData.state} onBlur={e => setFormData(f => ({ ...f, state: e.target.value }))} /></div>
//       <div className="space-y-2"><Label>Pincode</Label><Input defaultValue={formData.pincode} onBlur={async(e) =>{






// let checkstat=false
//                  for(let x of pincodelist.Sheet1){
//             if(x.Pincode.includes(e.target.value)){
//               checkstat=true
//               setFormData(f => ({ ...f, pincode: e.target.value, city: x.City, state: x.State }));
//             }

            


//           }

//                    if(!checkstat){

// let response =await getPincodeDetails(e.target.value)
//               setFormData(f => ({ ...f, pincode: e.target.value, city: response.City, state: response.State }));


//             }



           
        
        
//         setFormData(f => ({ ...f, pincode: e.target.value }))
        
        
        
//         }} /></div>
//       <div className="space-y-2"><Label>Contact Person</Label><Input defaultValue={formData.contactPerson} onBlur={e => setFormData(f => ({ ...f, contactPerson: e.target.value }))} /></div>
//       <div className="space-y-2"><Label>Phone</Label><Input defaultValue={formData.phone} onBlur={e => setFormData(f => ({ ...f, phone: e.target.value }))} /></div>
//     </div>
//   );
//   console.log(warehouses,"warehouseswarehouses")

//   return (
//     <DashboardLayout title="Warehouse Management" subtitle="Manage pickup locations and warehouses">
//       <div className="space-y-6">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard title="Total Warehouses" value={String(warehouses.length)} icon={<Warehouse className="h-5 w-5" />} variant="accent" />
//           <StatCard title="Active" value={String(activeCount)} icon={<MapPin className="h-5 w-5" />} variant="success" />
//           <StatCard title="Orders Processed" value={totalOrders.toLocaleString()} icon={<Star className="h-5 w-5" />} />
//           <StatCard title="Cities Covered" value={String(new Set(warehouses.map(w => w.city)).size)} icon={<MapPin className="h-5 w-5" />} />
//         </div>

//         <div className="flex justify-end">
//           <Button onClick={() => { setFormData({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "",user_id:"" }); setCreateOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Warehouse</Button>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {warehouses.map(w => (
//             <Card key={w.id} className={`shadow-card hover:shadow-card-hover transition-shadow `}>
//               <CardContent className="p-5">
//                 <div className="flex items-start justify-between mb-3">
//                   <div className="flex items-center gap-3">
//                     <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
//                       <Warehouse className="h-5 w-5 text-primary-foreground" />
//                     </div>
//                     <div>
//                       <div className="flex items-center gap-2">
//                         <h3 className="font-display font-bold text-foreground">{w.name}</h3>
//                         {w.isDefault && <Badge className="bg-accent/10 text-accent text-xs">Default</Badge>}
//                       </div>
//                       <p className="text-sm text-muted-foreground">{w.city}, {w.state} - {w.pincode}</p>
//                     </div>
//                   </div>
//                   <Switch checked={w.isActive} onCheckedChange={() => toggleActive(w.id)} />
//                 </div>
//                 <p className="text-sm text-muted-foreground mb-2">{w.address}</p>
//                 <div className="grid grid-cols-2 gap-2 text-sm mb-3">
//                   <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{w.contactPerson}</span></div>
//                   <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{w.phone}</span></div>
//                   {/* <div><span className="text-muted-foreground">Orders:</span> <span className="text-foreground font-medium">{w.ordersProcessed.toLocaleString()}</span></div> */}
//                 </div>
//                 <div className="flex gap-2 pt-3 border-t border-border">
//                   {!w.isDefault && <Button size="sm" variant="outline" onClick={() => setDefault(w.id)}>Set Default</Button>}
//                   <Button size="sm" variant="ghost" onClick={() => openEdit(w)}><Edit className="h-3.5 w-3.5" /></Button>
//                   <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteWarehouse(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>

//       <Dialog open={createOpen} onOpenChange={setCreateOpen}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader><DialogTitle className="text-foreground">Add Warehouse</DialogTitle><DialogDescription>Add a new pickup location</DialogDescription></DialogHeader>
         
//           <FormFields  formData={formData} setFormData={setFormData}/>

//           <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={!formData.name}>Add</Button></DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={!!editWarehouse} onOpenChange={() => setEditWarehouse(null)}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader><DialogTitle className="text-foreground">Edit Warehouse</DialogTitle><DialogDescription>Update warehouse details</DialogDescription></DialogHeader>
//                     <FormFields  formData={formData} setFormData={setFormData}/>

//           <DialogFooter><Button variant="outline" onClick={() => setEditWarehouse(null)}>Cancel</Button><Button onClick={handleUpdate}>Save</Button></DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </DashboardLayout>
//   );
// };

// export default WarehousePage;
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Warehouse, MapPin, Plus, Edit, Trash2, Star } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import {apiRequest} from "../../src/apiglobal/apiconfig"
import { getuserid } from "../../services/getbasicdata";
import pincodelist from "../apiglobal/pincodelist.json";

     
interface WarehouseItem {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  isDefault: boolean;
  isActive: boolean;
  ordersProcessed: number;
  user_id: string;
}

const initialWarehouses: WarehouseItem[] = [];

const WarehousePage = () => {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [createOpen, setCreateOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<WarehouseItem | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "", user_id: "", });
  const [defaultWarehouse, setDefaultWarehouse] = useState<WarehouseItem | null>(null);
  const [saving, setSaving] = useState(false);

  const activeCount = warehouses.filter(w => w.isActive).length;
  const totalOrders = warehouses.reduce((a, w) => a + w.ordersProcessed, 0);

  const getWarehouses = async () => {
    const response = await apiRequest("GET", "auth/getAllWarehouses", {}, {});
    const userWarehouses = response.data.data.filter((val) => val.user_id == getuserid());
    setWarehouses([...userWarehouses]);
    
    // Set default warehouse from fetched data
    const defaultWH = userWarehouses.find((w) => w.isDefault === true);
    if (defaultWH) {
      setDefaultWarehouse(defaultWH);
      // Store default warehouse ID in localStorage for cross-component access
      localStorage.setItem('defaultWarehouseId', defaultWH.id);
      localStorage.setItem('defaultWarehouse', JSON.stringify(defaultWH));
    } else if (userWarehouses.length > 0 && !defaultWH) {
      // If no default warehouse exists but there are warehouses, set first as default
      const firstWarehouse = userWarehouses[0];
      await setAsDefault(firstWarehouse.id);
    }
  }

  const setAsDefault = async (id: string) => {
    const warehouseToSet = warehouses.find((w) => w.id === id);
    if (!warehouseToSet) return;

    // Update all warehouses to have isDefault = false
    for (const w of warehouses) {
      if (w.id !== id) {
        w.isDefault = false;
        await handleUpdate2(w);
      }
    }
    
    // Set the selected warehouse as default
    warehouseToSet.isDefault = true;
    await handleUpdate2(warehouseToSet);
    
    // Update local state
    setWarehouses(prev => prev.map(w => ({ ...w, isDefault: w.id === id })));
    setDefaultWarehouse(warehouseToSet);
    
    // Store in localStorage
    localStorage.setItem('defaultWarehouseId', warehouseToSet.id);
    localStorage.setItem('defaultWarehouse', JSON.stringify(warehouseToSet));
    
    toast({ title: "Default warehouse set successfully" });
  };

  const handleCreate = async () => {
    const name = String(formData.name || "").trim();
    if (!name) {
      toast({ title: "Warehouse name is required", variant: "destructive" });
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const newWarehouse = {
        ...formData,
        name,
        phone: String(formData.phone || "").replace(/\D/g, ""),
        isDefault: warehouses.length === 0,
        isActive: true,
        ordersProcessed: 0,
        user_id: getuserid(),
      };

      const response = await apiRequest("POST", "auth/createWarehouse", newWarehouse, {});

      if (response?.data?.success) {
        await getWarehouses();
        setCreateOpen(false);
        setFormData({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "", user_id: "" });
        toast({ title: "Warehouse added successfully" });
      } else {
        toast({
          title: "Failed to add warehouse",
          description: response?.data?.message || undefined,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to add warehouse",
        description: error?.response?.data?.message || error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate2 = async (updateddata) => {
    const response = await apiRequest("PUT", "auth/updateWarehouse/" + updateddata.id, updateddata, {});
    return response;
  };

  const handleUpdate = async () => {
    if (!editWarehouse) return;
    
    const response = await apiRequest("PUT", "auth/updateWarehouse/" + editWarehouse.id, formData, {});
    
    if (response?.data?.success) {
      await getWarehouses(); // Refresh the list
      setEditWarehouse(null);
      toast({ title: "Warehouse updated successfully" });
    } else {
      toast({ title: "Failed to update warehouse", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string) => {
    const warehouse = warehouses.find((w) => w.id === id);
    if (warehouse) {
      warehouse.isActive = !warehouse.isActive;
      await handleUpdate2(warehouse);
      await getWarehouses(); // Refresh the list
      
      // If deactivating default warehouse, set a new default
      if (warehouse.isDefault && !warehouse.isActive) {
        const newDefault = warehouses.find(w => w.id !== id && w.isActive);
        if (newDefault) {
          await setAsDefault(newDefault.id);
          toast({ title: "Default warehouse changed as previous was deactivated" });
        }
      }
      
      toast({ title: "Status updated successfully" });
    }
  };

  const deleteWarehouse = async (id: string) => {
    const warehouseToDelete = warehouses.find((w) => w.id === id);
    
    // Check if trying to delete default warehouse
    if (warehouseToDelete?.isDefault) {
      toast({ 
        title: "Cannot delete default warehouse", 
        description: "Please set another warehouse as default first",
        variant: "destructive" 
      });
      return;
    }
    
    const response = await apiRequest("DELETE", "auth/deleteWarehouse/" + id, {}, {});
    
    if (response?.data?.success) {
      await getWarehouses(); // Refresh the list
      toast({ title: "Warehouse removed successfully" });
    } else {
      toast({ title: "Failed to remove warehouse", variant: "destructive" });
    }
  };

  const openEdit = (w) => {
    setFormData({ 
      name: w.name, 
      address: w.address, 
      city: w.city, 
      state: w.state, 
      pincode: w.pincode, 
      contactPerson: w.contactPerson, 
      phone: w.phone, 
      user_id: w.user_id 
    });
    setEditWarehouse(w);
  };

  useEffect(() => {
    getWarehouses();
  }, []);

  async function getPincodeDetails(pincode) {
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data[0].Status === "Success" && data[0].PostOffice.length > 0) {
        const post = data[0].PostOffice[0];
        return {
          pincode: post.Pincode,
          City: post.Region || post.Name,
          District: post.District,
          State: post.State,
          country: post.Country,
        }
      } else {
        return {
          success: false,
          message: "Pincode not found",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((f) => ({ ...f, [field]: value }));
  };

  const resolvePincode = async (pincode: string) => {
    const pin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
    updateField("pincode", pin);
    if (pin.length !== 6) return;

    let matched = false;
    for (const x of pincodelist.Sheet1) {
      if (String(x.Pincode).includes(pin)) {
        matched = true;
        setFormData((f) => ({ ...f, pincode: pin, city: x.City || f.city, state: x.State || f.state }));
        break;
      }
    }

    if (!matched) {
      const response = await getPincodeDetails(pin);
      if (response && (response as any).City) {
        setFormData((f) => ({
          ...f,
          pincode: pin,
          city: (response as any).City || f.city,
          state: (response as any).State || f.state,
        }));
      }
    }
  };

  // Controlled fields — onBlur + defaultValue caused "double click" because Add stayed
  // disabled until blur updated React state.
  const formFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label>Warehouse Name</Label>
        <Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Address</Label>
        <Input value={formData.address} onChange={(e) => updateField("address", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>State</Label>
        <Input value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Pincode</Label>
        <Input
          value={formData.pincode}
          onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={(e) => resolvePincode(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Contact Person</Label>
        <Input value={formData.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </div>
    </div>
  );

  // Function to get default warehouse (can be exported or used via context)
  const getDefaultWarehouse = () => {
    return defaultWarehouse;
  };

  // Function to get warehouse by ID (for order shipping)
  const getWarehouseById = (id: string) => {
    return warehouses.find(w => w.id === id);
  };

  console.log(warehouses, "warehouses");

  return (
    <DashboardLayout title="Warehouse Management" subtitle="Manage pickup locations and warehouses">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Warehouses" value={String(warehouses.length)} icon={<Warehouse className="h-5 w-5" />} variant="accent" />
          <StatCard title="Active" value={String(activeCount)} icon={<MapPin className="h-5 w-5" />} variant="success" />
          <StatCard title="Orders Processed" value={totalOrders.toLocaleString()} icon={<Star className="h-5 w-5" />} />
          <StatCard title="Cities Covered" value={String(new Set(warehouses.map(w => w.city)).size)} icon={<MapPin className="h-5 w-5" />} />
        </div>

        {defaultWarehouse && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium">
              Default Warehouse: <strong>{defaultWarehouse.name}</strong> - All orders will be fetched from this warehouse
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => { 
            setFormData({ name: "", address: "", city: "", state: "", pincode: "", contactPerson: "", phone: "", user_id: "" }); 
            setCreateOpen(true); 
          }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Warehouse
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map(w => (
            <Card key={w.id} className={`shadow-card hover:shadow-card-hover transition-shadow ${!w.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Warehouse className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-foreground">{w.name}</h3>
                        {w.isDefault && <Badge className="bg-accent/10 text-accent text-xs">Default</Badge>}
                        {!w.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{w.city}, {w.state} - {w.pincode}</p>
                    </div>
                  </div>
                  <Switch checked={w.isActive} onCheckedChange={() => toggleActive(w.id)} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{w.address}</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{w.contactPerson}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{w.phone}</span></div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-border">
                  {!w.isDefault && w.isActive && (
                    <Button size="sm" variant="outline" onClick={() => setAsDefault(w.id)}>
                      Set Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteWarehouse(w.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Warehouse</DialogTitle>
            <DialogDescription>Add a new pickup location</DialogDescription>
          </DialogHeader>
         
          {formFields}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !String(formData.name || "").trim()}>
              {saving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editWarehouse} onOpenChange={() => setEditWarehouse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Warehouse</DialogTitle>
            <DialogDescription>Update warehouse details</DialogDescription>
          </DialogHeader>
          
          {formFields}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWarehouse(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Utility functions to be used in other components
export const getDefaultWarehouseForOrders = () => {
  const defaultWarehouseStr = localStorage.getItem('defaultWarehouse');
  if (defaultWarehouseStr) {
    return JSON.parse(defaultWarehouseStr);
  }
  return null;
};

export const getWarehouseForShipping = (orderWarehouseId: string) => {
  // This function should be used when displaying shipping time
  // Pass the warehouse ID that was used when creating the order
  const warehousesStr = localStorage.getItem('warehouses');
  if (warehousesStr) {
    const warehouses = JSON.parse(warehousesStr);
    return warehouses.find(w => w.id === orderWarehouseId);
  }
  return null;
};

export default WarehousePage;