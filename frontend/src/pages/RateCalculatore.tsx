// import { useState, useEffect } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
// import {
//   Search, CheckCircle, XCircle, Eye, Users, ShieldCheck, AlertTriangle,
//   Plus, Edit, Trash2, Wallet, Tag, Download, RefreshCw, Filter, Loader2,
//   Calculator, Package, MapPin, Scale, IndianRupee, Ruler, Table2,
//   Weight
// } from "lucide-react";
// import StatCard from "@/components/StatCard";
// import { useToast } from "@/hooks/use-toast";
// import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
// import { getuser, getuserid, metroPincodeList } from "../../services/getbasicdata";
// import * as XLSX from 'xlsx';
// import pincodelist from "../apiglobal/pincodelist.json";

// // ==================== Types ====================
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

// // Rate Calculator Types
// type ShipmentType = "FORWARD" | "REVERSE";
// type PackageType = "SPS" | "B2B";
// type PaymentMode = "PREPAID" | "COD";

// interface Dimensions {
//   length: number;
//   width: number;
//   height: number;
// }

// interface RateCalculatorForm {
//   shipmentType: ShipmentType;
//   packageType: PackageType;
//   originPincode: string;
//   deliveryPincode: string;
//   paymentMode: PaymentMode;
//   weight: number;
//   invoiceValue: number;
//   dimensions: Dimensions;
//   serviceType: "domestic" | "international";
// }

// // ==================== Constants ====================
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
//   name: "",
//   email: "",
//   company: "",
//   phone: "",
//   gst: "",
//   address: "",
//   status: "pending",
//   kycStatus: "pending",
//   riskCategory: "low",
//   subscription: "Trial",
//   pincode: "",
//   city: "",
//   state: "",
//   roleId: "",
//   password: ""
// };

// // ==================== Rate Calculator Form Component ====================
// const RateCalculatorForm = () => {
//   const { toast } = useToast();
//   const [ratelist, setRatelist] = useState([]);
//   const [alldata, setalldata] = useState({
//     type: [],
//     rate: [],
//     data: [],
//     codcharge: []
//   })
//   let [zone_,setzone_] = useState("")
//   let [corslab,setcorslab] = useState({})
//   const [formData, setFormData] = useState({
//     shipmentType: "FORWARD",
//     packageType: "SPS",
//     originPincode: "",
//     deliveryPincode: "",
//     paymentMode: "PREPAID",
//     weight: 0,
//     invoiceValue: 0,
//     dimensions: { length: 0, width: 0, height: 0 },
//     serviceType: "domestic"
//   });
//   const [rawData, setrawData] = useState([])
//   const [calculating, setCalculating] = useState(false);
//   const [calculatedRates, setCalculatedRates] = useState<any>(null);

//   const handleInputChange = (field: keyof RateCalculatorForm, value: any) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const handleDimensionChange = (dim: keyof Dimensions, value: string) => {
//     const numValue = parseFloat(value) || 0;
//     setFormData(prev => ({
//       ...prev,
//       dimensions: { ...prev.dimensions, [dim]: numValue }
//     }));
//   };

// const northEastStates = [
//   "arunachal pradesh",
//   "assam",
//   "manipur",
//   "meghalaya",
//   "mizoram",
//   "nagaland",
//   "sikkim",
//   "tripura",
//   "shimla",
//   "jammu & kashmir"

// ];

//   const metroCities = [
//   "mumbai",
//   "delhi",
//   "new delhi",
//   "bengaluru",
//   "chennai",
//   "hyderabad",
//   "ahmedabad",
//   "kolkata",
//   "pune",
//   "noida",
//   "gautam buddha nagar",
//   "jaipur",
//   "lucknow",
// ];

//   // https://api.postalpincode.in/pincode/

//   const userdata = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users/${getuser().id}`, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${localStorage.getItem("token")}`,
//         }
//       });
//       const data = await response.json();
//       console.log(data, "data>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
//       setrawData(data?.data?.ratechart || [])
//     } catch (error) {
//       console.error("Error fetching wallet data:", error);
//       return null;
//     }
//   }
//   useEffect(() => {
//     userdata()
//   }, [])

//   const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
//     if (!height || !width || !length) return undefined;

//     return Number(((height * width * length) / 5000).toFixed(2));
//   }

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

//   const handleCalculate = async () => {

//     if(!formData.originPincode || !formData.deliveryPincode || formData.weight<=0 || formData.invoiceValue<0){
//       alert("Please fill all required fields with valid values.")
//       return
//     }

//     let pincodefrom = formData.originPincode
//     let pincodeto = formData.deliveryPincode

//       let pin1 =  {}
//       let pin2 ={}

//           for(let x of pincodelist.Sheet1){
//             if(x.Pincode.includes(pincodefrom)){
//               pin1=x
//             }
//             if(x.Pincode.includes(pincodeto)){
//               pin2=x
//             }
//           }

//           console.log(pin1,pin2,"pin1pin1pin1pin1pin1pin1pin1pin1pin1pin1")

//       //  if(!pin1.Pincode){
//       //    alert("Invalid origin Pincode")
//       //   return
//       // }

//       // if(!pin2.Pincode){
//       //   alert("Invalid delivery Pincode")
//       //   return
//       // }

//         if(!pin1.City){
//           pin1=await getPincodeDetails(pincodefrom)
//         }

//   if(!pin2.City){
//           pin2=await getPincodeDetails(pincodeto)
//         }

//         console.log(pin1,pin2,"pin1pin1pin1pin1pin1pin1pin1pin1pin1pin1")

//       let zone=""
//         let response1={
//         city:pin1?.City.toLowerCase()=="gautam buddha nagar"?"noida" :pin1?.State=="Delhi"?"delhi":pin1?.City.toLowerCase() ,
//         district:pin1?.District.toLowerCase() == "gautam buddha nagar" ? "noida" : pin1?.District.toLowerCase()  ,
//         state:pin1?.State.toLowerCase() ,
//       }

//        let response2={
//         city:pin2?.City.toLowerCase()=="gautam buddha nagar"?"noida":pin2?.State=="Delhi"?"delhi":pin2?.City.toLowerCase() ,
//         district:pin2?.District.toLowerCase() == "gautam buddha nagar" ? "noida" : pin2?.District.toLowerCase()  ,
//         state:pin2?.State.toLowerCase()  ,
//       }

//       let response3=await fetch("${UPLOAD_BASE_URL}/read-excel",{
//         method:"POST",
//         headers:{
//           "Content-Type":"application/json",
//           "Authorization": `Bearer ${localStorage.getItem("token")}`,
//         },
//         body:JSON.stringify({pin1:response1,pin2:response2})
//       })
//       response3=await response3.json()
//        zone=response3?.data

//        console.log(zone,"zonemmmmmmmmmmmmmmmm")

// if(!response3.data || response3.data=="Zone not found")
//   {

//     if (response1.city == response2.city && response1.state == response2.state) {
//       zone = "ZONE A"

//     }
//     else if (response1.state == response2.state) {
//       zone = "ZONE B"
//     }
//     else if ((metroCities.includes(response1.city) && metroCities.includes(response2.city)) || (metroPincodeList.includes(formData.originPincode) && metroPincodeList.includes(formData.deliveryPincode))) {
//       zone = "ZONE C"

//     }
//     else if (northEastStates.includes(response1.state) || northEastStates.includes(response2.state)) {
//       zone = "ZONE E"

//     }
//     else {
//       zone = "ZONE D"
//     }
//   }
//   setzone_(zone)

//     console.log(zone, response1,"skadjksjdka")

//     let wieght = Number(formData.weight)>calculateVolumetricWeight(formData.dimensions.height, formData.dimensions.width, formData.dimensions.length)?Number(formData.weight):calculateVolumetricWeight(formData.dimensions.height, formData.dimensions.width, formData.dimensions.length)
//     let couriertype = {
//     }
//     alldata = {
//       type: [],
//       rate: [],
//       data: [],
//       codcharge: []
//     }

//     // let tmp = ""
//     let rawData_ = rawData.slice(2)

//       let alltype=[]

//          for(let i=0;i<rawData_.length;i++)
//             {
//                   if(rawData_[i][0]!=null ){
//                     if(!alltype.includes(rawData_[i][0])){
//                       alltype.push(rawData_[i][0])
//                     }
//                   }
//             }

//          console.log(zone,"dataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",alltype,Number(formData.weight),rawData_)

//             for(let i=0;i<alltype.length;i++){
//               if((zone=="ZONE A" || zone=="ZONE B") && alltype[i]?.includes("Air")){
//                   continue;
//                 }
//               let max=0
//               let ind=-1
//                 for(let j=0;j<rawData_.length;j++)
//                  {

//                     let tmax=Number(rawData_[j][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
//                      if(tmax>max && rawData_[j][0]==alltype[i] && (tmax<=wieght || (tmax<=wieght  || (tmax==.5 && wieght<=.5) ))){
//                        ind=j

//                       max=tmax
//                     }

//                  }
//                  console.log(max,ind,"maxmaxmaxmaxmaxmaxmaxmaxmax")

//                     if(max>=wieght){
//                         alldata.type.push(alltype[i])
//                         alldata.rate.push(rawData_[ind][rawData[0].indexOf(zone)])
//                         alldata.data.push(rawData_[ind])
//                         corslab[alltype[i]]=max

//                         let tamt1 = Number(rawData_[ind].at(-1).replaceAll(" ", "").split("|")[0])
//                     let per1 = parseFloat(rawData_[ind].at(-1).replaceAll(" ", "").split("|")[1])
//                     let tamt2 = Number(formData.invoiceValue) / 100 * per1
//                     alldata.codcharge.push(formData.paymentMode == "COD" ? (tamt1 > tamt2 ? tamt1 : tamt2) : 0)

//                       }
//                       else{

//                         // console.log(rawData_[ind+1],ind,"indddddddddddddd")

//                    let amount1=Number(rawData_[ind][rawData[0].indexOf(zone)])
//                     let amount2=Number(rawData_[ind+1][rawData[0].indexOf(zone)])
//                     let totalrate=amount1+amount2
//                     max+=Number(rawData_[ind+1][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
//                     do{

//                         if(max>=wieght){
//                         alldata.type.push(alltype[i])
//                         alldata.rate.push(totalrate)
//                         alldata.data.push(rawData_[ind])
//                         corslab[alltype[i]]=max

//                          let tamt1 = Number(rawData_[ind+1].at(-1).replaceAll(" ", "").split("|")[0])
//                     let per1 = parseFloat(rawData_[ind+1].at(-1).replaceAll(" ", "").split("|")[1])
//                     let tamt2 = Number(formData.invoiceValue) / 100 * per1
//                     alldata.codcharge.push(formData.paymentMode == "COD" ? (tamt1 > tamt2 ? tamt1 : tamt2) : 0)

//                         break;
//                       }
//                       max+=Number(rawData_[ind+1][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
//                       totalrate+=amount2
//                       } while(1);
//                       }
//                   }

//     // for (let i = 0; i < rawData_.length; i++) {
//     //   if ((zone == "ZONE A" || zone == "ZONE B") && rawData[i][0]?.includes("Air")) {
//     //   }
//     //   else {
//     //     if (rawData_[i][0] != null || rawData_.length - 1 == i) {
//     //       if ((tmp != "" && tmp != rawData_[i][0]) || (rawData_.length - 1 == i)) {
//     //         let tmpind = rawData_.length - 1 == i ? i : i - 1
//     //         if (tmp.includes("Air") && (zone == "ZONE A" || zone == "ZONE B")) {
//     //         }
//     //         else {
//     //           let amount1 = Number(rawData_[tmpind][rawData[0].indexOf(zone)])
//     //           let amount2 = Number(rawData_[tmpind - 1][rawData[0].indexOf(zone)])
//     //           let tmmfin = amount1 + amount2
//     //           while(1){
//     //             couriertype[tmp].total += Number(rawData_[tmpind][1].replaceAll(" ", "").replace("Per", "")
//     //             .replace("kg", "").replace("additional", "") || 0)
//     //             tmmfin += amount1
//     //             if (couriertype[tmp].total >= wieght || couriertype[tmp].total >= Number(formData.weight)) {
//     //               if (!alldata.type.includes(tmp)) {
//     //                 alldata.type.push(tmp)
//     //                 alldata.rate.push(tmmfin)
//     //                 alldata.data.push(rawData_[tmpind - 1])

//     //                 let tamt1 = Number(rawData_[tmpind - 1].at(-1).replaceAll(" ", "").split("|")[0])
//     //                 let per1 = parseFloat(rawData_[tmpind - 1].at(-1).replaceAll(" ", "").split("|")[1])
//     //                 let tamt2 = Number(formData.invoiceValue) / 100 * per1
//     //                 alldata.codcharge.push(formData.paymentMode == "COD" ? (tamt1 > tamt2 ? tamt1 : tamt2) : 0)
//     //               }
//     //               break;
//     //             }
//     //           }
//     //           if (rawData_.length - 1 == i) {
//     //             break;
//     //           }
//     //         }
//     //       }
//     //       tmp = rawData_[i][0]
//     //       couriertype[tmp] = { total: 0 }
//     //       couriertype[tmp].total += Number(rawData_[i][1].replaceAll(" ", "")
//     //       .replace("Per", "").replace("kg", "").replace("additional", "") || 0)
//     //     }
//     //     else {
//     //       couriertype[tmp].total += Number(rawData_[i][1].replaceAll(" ", "")
//     //       .replace("Per", "").replace("kg", "").replace("additional", "") || 0)
//     //     }
//     //     if (couriertype[tmp].total >= wieght || couriertype[tmp].total >= Number(formData.weight)) {
//     //       if (!alldata.type.includes(tmp)) {
//     //         alldata.type.push(tmp)
//     //         alldata.rate.push(rawData_[i][0] != null ? rawData_[i][rawData[0].indexOf(zone)] : (rawData_[i - 1][rawData[0].indexOf(zone)] + rawData_[i][rawData[0].indexOf(zone)]))
//     //         alldata.data.push(rawData_[i])

//     //         let tamt1 = Number(rawData_[i].at(-1).replaceAll(" ", "").split("|")[0])
//     //         let per1 = parseFloat(rawData_[i].at(-1).replaceAll(" ", "").split("|")[1])
//     //         let tamt2 = Number(formData.invoiceValue) / 100 * per1
//     //         alldata.codcharge.push(formData.paymentMode == "COD" ? (tamt1 > tamt2 ? tamt1 : tamt2) : 0)
//     //       }
//     //     }
//     //   }
//     // }
//     setalldata({ ...alldata })
//   }

//   console.log(zone_ ,corslab,"cccccccccccccccc")
//   const handleCalculate2 = async (wieght: number) => {

//     // if (wieght == 0) {
//     //   formData.dimensions.height = 0
//     //   formData.dimensions.width = 0
//     //   formData.dimensions.length = 0

//     // }
//     // else {
//     //   parseFloat(Math.cbrt(wieght * 5000).toFixed(3))

//     //   formData.dimensions.height = parseFloat(Math.cbrt(wieght * 5000).toFixed(3))
//     //   formData.dimensions.width = parseFloat(Math.cbrt(wieght * 5000).toFixed(3))
//     //   formData.dimensions.length = parseFloat(Math.cbrt(wieght * 5000).toFixed(3))

//     // }
//     // setFormData({ ...formData })

//   }

//   // formData.weight = calculateVolumetricWeight(formData.dimensions.height, formData.dimensions.width, formData.dimensions.length)

//   return (
//     <Card className="shadow-lg">
//       <CardHeader className="pb-4">
//         <CardTitle className="flex items-center gap-2 text-xl">
//           <Calculator className="h-5 w-5" />
//           Shipping Rate Calculator
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-6">
//           {/* Domestic/International Tabs */}
//           <Tabs value={formData.serviceType} onValueChange={(v) => handleInputChange("serviceType", v as "domestic" | "international")} className="w-full">
//             <TabsList className="grid w-full max-w-xs grid-cols-2">
//               <TabsTrigger value="domestic">Domestic</TabsTrigger>
//               <TabsTrigger value="international">International</TabsTrigger>
//             </TabsList>
//           </Tabs>

//           {/* Main Form Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//             {/* Shipment Type */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 Shipment Type <span className="text-red-500">*</span>
//               </Label>
//               <Select value={formData.shipmentType} onValueChange={(v) => handleInputChange("shipmentType", v as ShipmentType)}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select shipment type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="FORWARD">Forward</SelectItem>
//                   <SelectItem value="REVERSE">Reverse</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Package Type */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 Package Type <span className="text-red-500">*</span>
//               </Label>
//               <Select value={formData.packageType} onValueChange={(v) => handleInputChange("packageType", v as PackageType)}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select package type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="SPS">Single Package (B2C)</SelectItem>
//                   <SelectItem value="B2B">Multi Package (B2B)</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Origin Pincode */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 <MapPin className="h-3.5 w-3.5" />
//                 Origin Pincode <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 placeholder="6 Digits pickup area pincode"
//                 maxLength={6}
//                 value={formData.originPincode}
//                 onChange={(e) => handleInputChange("originPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
//               />
//             </div>

//             {/* Delivery Pincode */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 <MapPin className="h-3.5 w-3.5" />
//                 Delivery Area Pincode <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 placeholder="Enter delivery area pincode"
//                 maxLength={6}
//                 value={formData.deliveryPincode}
//                 onChange={(e) => handleInputChange("deliveryPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
//               />
//             </div>

//             {/* Payment Mode */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 Payment Mode <span className="text-red-500">*</span>
//               </Label>
//               <Select value={formData.paymentMode} onValueChange={(v) => handleInputChange("paymentMode", v as PaymentMode)}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select payment mode" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="PREPAID">Prepaid</SelectItem>
//                   <SelectItem value="COD">COD</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Approximate Weight */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 <Scale className="h-3.5 w-3.5" />
//                 Approximate Weight <span className="text-red-500">*</span>
//               </Label>
//               <div className="relative">
//                 <Input
//                   type="number"
//                   step="0.1"
//                   value={formData.weight}
//                   onChange={(e) => {

//                     handleCalculate2(parseFloat(e.target.value) || 0)

//                     handleInputChange("weight", parseFloat(e.target.value) || 0)

//                   }}
//                   className="pr-12"
//                 />
//                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Kg</span>
//               </div>
//             </div>

//             {/* Invoice Value */}
//             <div className="space-y-2">
//               <Label className="flex items-center gap-1">
//                 <IndianRupee className="h-3.5 w-3.5" />
//                 Invoice Value <span className="text-red-500">*</span>
//               </Label>
//               <div className="relative">
//                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
//                 <Input
//                   type="number"
//                   step="1"
//                   value={formData.invoiceValue}
//                   onChange={(e) => handleInputChange("invoiceValue", parseFloat(e.target.value) || 0)}
//                   className="pl-8"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Dimensions Section */}
//           <div className="border-t pt-4">
//             <div className="flex items-center gap-2 mb-4">
//               <Ruler className="h-4 w-4" />
//               <Label className="font-medium">Dimensions (in cm)</Label>
//             </div>
//             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label>Length *</Label>
//                 <div className="relative">
//                   <Input
//                     type="number"
//                     placeholder="Length"
//                     value={formData.dimensions.length}
//                     onChange={(e) => handleDimensionChange("length", e.target.value)}
//                   />
//                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <Label>Width *</Label>
//                 <div className="relative">
//                   <Input
//                     type="number"
//                     placeholder="Width"
//                     value={formData.dimensions.width}
//                     onChange={(e) => handleDimensionChange("width", e.target.value)}
//                   />
//                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <Label>Height *</Label>
//                 <div className="relative">
//                   <Input
//                     type="number"
//                     placeholder="Height"
//                     value={formData.dimensions.height}
//                     onChange={(e) => handleDimensionChange("height", e.target.value)}
//                   />
//                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="border-t pt-4">
//             <p> Volumetric Weight {calculateVolumetricWeight(formData.dimensions.height, formData.dimensions.width, formData.dimensions.length)} -kg

//             </p>

//           </div>

//           {/* Calculate Button */}
//           <Button
//             onClick={handleCalculate}
//             disabled={calculating}
//             className="w-full bg-primary hover:bg-primary/90"
//             size="lg"
//           >
//             {calculating ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Calculating...
//               </>
//             ) : (
//               <>
//                 <Calculator className="mr-2 h-4 w-4" />
//                 Calculate Rates
//               </>
//             )}
//           </Button>

//           {/* Results Section */}
//           {alldata.type.length > 0 && (
//             <div className="mt-6 border-t pt-4">
//               <h4 className="font-semibold mb-3">Available our Shipping Partner Rates</h4>
//               <div className="space-y-2">
//                 {alldata.type.map((partner: any, idx: number) => (
//                   <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
//                     <div>
//                       <p className="font-medium">{partner}</p>
//                     </div>
//                     <div className="text-right">
//                       <p className="font-bold text-lg">₹{alldata.rate[idx]}</p>
//                       {formData.paymentMode == "COD" && <p className="font-bold text-lg">₹{parseFloat(alldata.codcharge[idx]).toFixed(2)} COD Charged</p>}

//                       <p className="font-bold text-lg">₹{(((Number(alldata.rate[idx]) + Number(formData.paymentMode == "COD" ? parseFloat(alldata.codcharge[idx]) : 0)) / 100 * 18)).toFixed(2)} GST 18%</p>
//                       <p className="font-bold text-lg">₹{((Number(alldata.rate[idx]) + Number(formData.paymentMode == "COD" ? parseFloat(alldata.codcharge[idx]) : 0)) * 1.18).toFixed(2)} Total</p>
//                       <p className="text-sm">{zone_} - {corslab[partner] || 'N/A'} kg</p>

//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// // ==================== Rate Chart Component ====================
// // ==================== Rate Chart Component ====================
// const RateChart = () => {
//   const [rawData, setrawData] = useState([])
//   const [allsellerlist, setallsellerlist] = useState([]);
//   const [seller, setseller] = useState(getuserid());

//   // Process data to compute row spans for courier names
//   interface ProcessedRow {
//     courier: string;
//     weight: string;
//     zoneA: number;
//     zoneB: number;
//     zoneC: number;
//     zoneD: number;
//     zoneE: number;
//     codCharges: string;
//     rowSpan: number;
//     isFirstRow: boolean;
//   }

//   const processedRows: ProcessedRow[] = [];
//   let i = 2; // start from first data row (index 2)
//   while (i < rawData.length) {
//     const row = rawData[i];
//     const courierName = row[0] as string | null;
//     if (courierName !== null) {
//       // Start of a new courier group
//       let span = 1;
//       let j = i + 1;
//       while (j < rawData.length && rawData[j][0] === null) {
//         span++;
//         j++;
//       }
//       // Add the main row
//       processedRows.push({
//         courier: courierName,
//         weight: row[1] as string,
//         zoneA: row[2] as number,
//         zoneB: row[3] as number,
//         zoneC: row[4] as number,
//         zoneD: row[5] as number,
//         zoneE: row[6] as number,
//         codCharges: row[7] as string,
//         rowSpan: span,
//         isFirstRow: true,
//       });
//       // Add subsequent rows (null courier)
//       for (let k = i + 1; k < i + span; k++) {
//         const subRow = rawData[k];
//         processedRows.push({
//           courier: courierName,
//           weight: subRow[1] as string,
//           zoneA: subRow[2] as number,
//           zoneB: subRow[3] as number,
//           zoneC: subRow[4] as number,
//           zoneD: subRow[5] as number,
//           zoneE: subRow[6] as number,
//           codCharges: subRow[7] as string,
//           rowSpan: 0,
//           isFirstRow: false,
//         });
//       }
//       i += span;
//     } else {
//       // Should not happen because we skip null courier groups
//       i++;
//     }
//   }

//   const userdata = async () => {
//     try {

//       const response = await fetch(`${API_BASE_URL}/users/${seller}`, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${localStorage.getItem("token")}`,
//         }
//       });

//       const data = await response.json();

//       const data2 = await sellerApi.getAll()
//       setallsellerlist(data2)

//       console.log(data, "data")
//       setrawData(data?.data?.ratechart || [])
//     } catch (error) {
//       console.error("Error fetching wallet data:", error);
//       return null;
//     }
//   }

//   useEffect(() => {

//     userdata()
//   }, [seller])

//   const setuserratechart = async (data) => {
//     let payload = {
//       user_id: seller,
//       data: data
//     }
//     let response = await fetch("${API_BASE_URL}/integrations/ratechartset", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload)
//     }
//     )

//     userdata()

//   }

//   function downloadExcel() {
//     const ws = XLSX.utils.aoa_to_sheet(rawData);
//     const wb = XLSX.utils.book_new();

//     XLSX.utils.book_append_sheet(wb, ws, "Courier Rates");

//     XLSX.writeFile(wb, "courier_rates.xlsx");
//   }

//   return (
//     <Card className="shadow-lg">
//       <style type="text/css">
//         {
//           `
//            .selectboxwidth{
//            width:300px;
//       }

//         `
//         }

//       </style>
//       <CardHeader className="pb-4">
//         <CardTitle className="flex items-center gap-2 text-xl">
//           <Table2 className="h-5 w-5" />
//           Rate Chart

//           {getuser()?.role == "admin" && <>
//             <div style={{ width: "300px" }} className=" flex justify-end ml-auto ">
//               <Select value={seller} onValueChange={v => setseller(v)}
//                 variant="outline" size="sm" className="ml-auto  "

//               >
//                 <SelectTrigger id="seller">
//                   <SelectValue placeholder="Select seller" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {allsellerlist.map(s => (
//                     <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <Button htmlFor="inputratesheet" variant="outline" size="sm" className="ml btn-primary "
//               onClick={() => {
//                 let inputratesheet = document.getElementById("inputratesheet") as HTMLInputElement
//                 inputratesheet.click()
//               }}

//             >
//               Rate Sheet Upload
//             </Button>

//             <Button htmlFor="inputratesheet" variant="outline" size="sm" className="ml btn-primary "
//               onClick={() => {

//                 downloadExcel()

//               }}

//             >
//               Download Rate Sheet
//             </Button>

//           </>}
//           <input type="file" id="inputratesheet" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
//             const file = e.target.files?.[0];
//             if (file) {
//               if (confirm(`Selected file: ${file.name}`)) {

//                 const reader = new FileReader();

//                 reader.onload = (event) => {
//                   // 1. Read the binary data
//                   const data = new Uint8Array(event.target.result);
//                   const workbook = XLSX.read(data, { type: 'array' });

//                   // 2. Select the first sheet
//                   const sheetName = workbook.SheetNames[0];
//                   const worksheet = workbook.Sheets[sheetName];

//                   // 3. Convert to Array of Objects
//                   const jsonArray = XLSX.utils.sheet_to_json(worksheet);

//                   // 4. Convert to 2D Array (Rows and Columns only)
//                   const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//                   setuserratechart(dataArray)

//                 };

//                 reader.readAsArrayBuffer(file);
//                 // Handle file upload logic here (e.g., send to API)
//               } else {
//               }
//             }
//           }} />

//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm border-collapse">
//             <thead>
//               {/* Main header row */}
//               <tr className="bg-muted/50 border-b">
//                 <th className="text-left p-3 font-semibold">Couriers</th>
//                 <th className="text-left p-3 font-semibold">Weight</th>
//                 <th className="text-center p-3 font-semibold">ZONE A</th>
//                 <th className="text-center p-3 font-semibold">ZONE B</th>
//                 <th className="text-center p-3 font-semibold">ZONE C</th>
//                 <th className="text-center p-3 font-semibold">ZONE D</th>
//                 <th className="text-center p-3 font-semibold">ZONE E</th>
//                 <th className="text-center p-3 font-semibold">COD Charges / COD%</th>
//               </tr>
//               {/* Subheader row with zone descriptions */}
//               <tr className="bg-muted/30 border-b text-muted-foreground">
//                 <th className="p-3"></th>
//                 <th className="p-3"></th>
//                 <th className="text-center p-3 text-xs">Within City</th>
//                 <th className="text-center p-3 text-xs">Within State</th>
//                 <th className="text-center p-3 text-xs">Metro to Metro</th>
//                 <th className="text-center p-3 text-xs">Rest of India</th>
//                 <th className="text-center p-3 text-xs">North East, J&K</th>
//                 <th className="text-center p-3 text-xs"></th>
//               </tr>
//             </thead>
//             <tbody>
//               {processedRows.map((row, idx) => (
//                 <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
//                   {row.isFirstRow ? (
//                     <td rowSpan={row.rowSpan} className="p-3 font-medium align-middle">
//                       {row.courier}
//                     </td>
//                   ) : null}
//                   <td className="p-3">{row.weight}</td>
//                   <td className="p-3 text-center">₹{row.zoneA}</td>
//                   <td className="p-3 text-center">₹{row.zoneB}</td>
//                   <td className="p-3 text-center">₹{row.zoneC}</td>
//                   <td className="p-3 text-center">₹{row.zoneD}</td>
//                   <td className="p-3 text-center">₹{row.zoneE}</td>
//                   <td className="p-3 text-center">{row.codCharges}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <div className="mt-4 text-xs text-muted-foreground text-center">
//           *Rates are indicative and subject to change. COD charges shown as "Fixed fee | Percentage".
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// const PinCodeChart = () => {
//   const [rawData, setrawData] = useState([]);
//   const [allsellerlist, setallsellerlist] = useState([]);
//   const [seller, setseller] = useState(getuserid());
//   const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
//   const [serviceType, setServiceType] = useState("eKART");

//   // Pagination state
//   const [currentPage, setCurrentPage] = useState(1);
//   const [rowsPerPage, setRowsPerPage] = useState(25);

//   const userdata = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/integrations/pincodechartget_?pincodedate=${effectiveDate}&courier_name=${serviceType}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${localStorage.getItem("token")}`,
//         },
//         body: JSON.stringify({})
//       });
//       const data = await response.json();
//       console.log(data, "data");
//       setrawData(data?.data[0]?.data || []);
//       setCurrentPage(1); // Reset to first page on new data
//     } catch (error) {
//       setrawData([]);

//       console.error("Error fetching pincode data:", error);
//       return null;
//     }
//   };

//   useEffect(() => {
//     userdata();
//   }, [effectiveDate, serviceType]);

//   const setuserratechart = async (dataArray) => {
//     let payload = {
//       courier_name: serviceType,
//       data: dataArray,
//       pincodedate: effectiveDate
//     };
//     let response = await fetch("${API_BASE_URL}/integrations/pincodechartset", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload)
//     });
//     userdata();
//   };

//   // Helper to render boolean values as Yes/No
//   const formatValue = (value) => {
//     if (typeof value === 'boolean') return value ? 'Yes' : 'No';
//     if (value === null || value === undefined) return '-';
//     return String(value);
//   };

//   // Extract headers (first row) and data rows (remaining rows)
//   const headers = rawData.length > 0 ? rawData[0] : [];
//   const allRows = rawData.slice(1);

//   // Pagination calculations
//   const totalRows = allRows.length;
//   const totalPages = Math.ceil(totalRows / rowsPerPage);
//   const startIndex = (currentPage - 1) * rowsPerPage;
//   const endIndex = startIndex + rowsPerPage;
//   const paginatedRows = allRows.slice(startIndex, endIndex);

//   const handlePageChange = (newPage) => {
//     if (newPage >= 1 && newPage <= totalPages) {
//       setCurrentPage(newPage);
//     }
//   };

//   const handleRowsPerPageChange = (e) => {
//     setRowsPerPage(parseInt(e.target.value, 10));
//     setCurrentPage(1); // reset to first page
//   };

//   function downloadExcel() {
//     const ws = XLSX.utils.aoa_to_sheet(rawData);
//     const wb = XLSX.utils.book_new();

//     XLSX.utils.book_append_sheet(wb, ws, "Courier Rates");

//     XLSX.writeFile(wb, effectiveDate + "_pincodeservices.xlsx");
//   }

//   return (
//     <Card className="shadow-lg">
//       <style type="text/css">
//         {`
//           .selectboxwidth { width: 300px; }
//           .filter-group { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
//           .pagination-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
//           .pagination-buttons { display: flex; gap: 8px; }
//         `}
//       </style>
//       <CardHeader className="pb-4">
//         <CardTitle className="flex items-center gap-2 text-xl">
//           <Table2 className="h-5 w-5" />
//           Pincode Serviceability

//           <div className="filter-group ml-auto">
//             {/* Date Picker */}
//             <div className="flex items-center gap-2">
//               <span className="text-sm text-muted-foreground">Effective Date:</span>
//               <Input
//                 type="date"
//                 value={effectiveDate}
//                 onChange={(e) => setEffectiveDate(e.target.value)}
//                 className="w-40"
//               />
//             </div>

//             {/* Service Type Select Box */}
//             <Select value={serviceType} onValueChange={setServiceType}>
//               <SelectTrigger className="w-40">
//                 <SelectValue placeholder="Service Type" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="eKART">eKart</SelectItem>
//                 <SelectItem value="SMC">SMC</SelectItem>
//                 <SelectItem value="Delhivery">Delhivery</SelectItem>
//                 <SelectItem value="Amazon">Amazon</SelectItem>

//               </SelectContent>
//             </Select>

//             {getuser()?.role === "admin" && (
//               <>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="btn-primary"
//                   onClick={() => {
//                     let inputratesheet = document.getElementById("inputratesheet") as HTMLInputElement;
//                     inputratesheet.click();
//                   }}
//                 >
//                   Pincode Sheet Upload
//                 </Button>
//               </>
//             )}

//             <Button
//               variant="outline"
//               size="sm"
//               className="btn-primary"
//               onClick={() => {
//                 downloadExcel()
//               }}
//             >
//               Pincode Sheet Download
//             </Button>
//             <input
//               type="file"
//               id="inputratesheet"
//               className="hidden"
//               accept=".xlsx, .xls"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (file && confirm(`Selected file: ${file.name}`)) {
//                   const reader = new FileReader();
//                   reader.onload = (event) => {
//                     const data = new Uint8Array(event.target.result as ArrayBuffer);
//                     const workbook = XLSX.read(data, { type: 'array' });
//                     const sheetName = workbook.SheetNames[0];
//                     const worksheet = workbook.Sheets[sheetName];
//                     const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
//                     setuserratechart(dataArray);
//                   };
//                   reader.readAsArrayBuffer(file);
//                 }
//               }}
//             />
//           </div>
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         {rawData.length === 0 ? (
//           <div className="text-center py-8 text-muted-foreground">No data available for selected date and courier.</div>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm border-collapse">
//                 <thead>
//                   <tr className="bg-muted/50 border-b">
//                     {headers.map((header, idx) => (
//                       <th key={idx} className="text-left p-3 font-semibold">
//                         {header}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {paginatedRows.map((row, rowIdx) => (
//                     <tr key={rowIdx} className="border-b border-border hover:bg-muted/20 transition-colors">
//                       {row.map((cell, cellIdx) => (
//                         <td key={cellIdx} className="p-3">
//                           {formatValue(cell)}
//                         </td>
//                       ))}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination Controls */}
//             <div className="pagination-controls">
//               <div className="flex items-center gap-2">
//                 <span className="text-sm text-muted-foreground">Rows per page:</span>
//                 <Select value={String(rowsPerPage)} onValueChange={(v) => handleRowsPerPageChange({ target: { value: v } })}>
//                   <SelectTrigger className="w-20">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {[10, 25, 50, 100].map(size => (
//                       <SelectItem key={size} value={String(size)}>{size}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="text-sm text-muted-foreground">
//                 Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of {totalRows} entries
//               </div>

//               <div className="pagination-buttons">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => handlePageChange(currentPage - 1)}
//                   disabled={currentPage === 1}
//                 >
//                   Previous
//                 </Button>
//                 <div className="flex items-center gap-2">
//                   {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                     let pageNum;
//                     if (totalPages <= 5) {
//                       pageNum = i + 1;
//                     } else if (currentPage <= 3) {
//                       pageNum = i + 1;
//                     } else if (currentPage >= totalPages - 2) {
//                       pageNum = totalPages - 4 + i;
//                     } else {
//                       pageNum = currentPage - 2 + i;
//                     }
//                     return (
//                       <Button
//                         key={pageNum}
//                         variant={currentPage === pageNum ? "default" : "outline"}
//                         size="sm"
//                         onClick={() => handlePageChange(pageNum)}
//                       >
//                         {pageNum}
//                       </Button>
//                     );
//                   })}
//                 </div>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => handlePageChange(currentPage + 1)}
//                   disabled={currentPage === totalPages}
//                 >
//                   Next
//                 </Button>
//               </div>
//             </div>
//           </>
//         )}

//         <div className="mt-4 text-xs text-muted-foreground text-center">
//           * Pincode serviceability data is indicative and subject to change.
//         </div>
//       </CardContent>
//     </Card>
//   );
// };
// // ==================== Main Component ====================
// const RateCalculator = () => {
//   const [activeTab, setActiveTab] = useState("calculator");

//   return (
//     <DashboardLayout title="Rate Calculator" subtitle="Calculate shipping rates & view rate charts">
//       <div className="container mx-auto py-6 space-y-6">
//         {/* Tabs Navigation */}
//         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//           <TabsList className="grid w-full max-w-md grid-cols-3">
//             <TabsTrigger value="calculator" className="flex items-center gap-2">
//               <Calculator className="h-4 w-4" />
//               Rate Calculator
//             </TabsTrigger>
//             <TabsTrigger value="chart" className="flex items-center gap-2">
//               <Table2 className="h-4 w-4" />
//               Rate Chart
//             </TabsTrigger>

//             <TabsTrigger value="pincodechart" className="flex items-center gap-2">
//               <Table2 className="h-4 w-4" />
//               Pincode Chart
//             </TabsTrigger>

//           </TabsList>

//           <TabsContent value="calculator" className="mt-6">
//             <RateCalculatorForm />
//           </TabsContent>

//           <TabsContent value="chart" className="mt-6">
//             <RateChart />
//           </TabsContent>

//           <TabsContent value="pincodechart" className="mt-6">
//             <PinCodeChart />
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default RateCalculator;

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Wallet,
  Tag,
  Download,
  RefreshCw,
  Filter,
  Loader2,
  Calculator,
  Package,
  MapPin,
  Scale,
  IndianRupee,
  Ruler,
  Table2,
  Weight,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { sellerApi, CreateSellerDTO } from "../../services/sellerApi";
import {
  getuser,
  getuserid,
  metroPincodeList,
} from "../../services/getbasicdata";
import * as XLSX from "xlsx";
import pincodelist from "../apiglobal/pincodelist.json";
import {
  API_BASE_URL,
  UPLOAD_BASE_URL,
  UPLOAD_BASE_URLs,
} from "../../services/config";
import { b2bApi } from "../../services/b2bApi";
import { Link } from "react-router-dom";

// ==================== Types ====================
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

// Rate Calculator Types
type ShipmentType = "FORWARD" | "REVERSE";
type PackageType = "SPS" | "B2B";
type PaymentMode = "PREPAID" | "COD" | "TO_PAY";

interface Dimensions {
  length: number;
  width: number;
  height: number;
}

interface B2bBox {
  boxNo: number;
  length: number;
  width: number;
  height: number;
  deadWeight: number;
}

interface RateCalculatorForm {
  shipmentType: ShipmentType;
  packageType: PackageType;
  originPincode: string;
  deliveryPincode: string;
  paymentMode: PaymentMode;
  weight: number;
  invoiceValue: number;
  dimensions: Dimensions;
  serviceType: "domestic" | "international";
}

// ==================== Constants ====================
const statusStyles = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
};

const kycStyles = {
  verified:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const riskStyles = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
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
  subscription: "Trial",
  pincode: "",
  city: "",
  state: "",
  roleId: "",
  password: "",
};

// ==================== Rate Calculator Form Component ====================
const RateCalculatorForm = () => {
  const { toast } = useToast();
  const [ratelist, setRatelist] = useState([]);
  const [alldata, setalldata] = useState({
    type: [],
    rate: [],
    data: [],
    codcharge: [],
  });
  const [zone_, setzone_] = useState("");
  const [corslab, setcorslab] = useState({});
  const [formData, setFormData] = useState({
    shipmentType: "FORWARD",
    packageType: "SPS",
    originPincode: "",
    deliveryPincode: "",
    paymentMode: "PREPAID",
    weight: 0,
    invoiceValue: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    serviceType: "domestic",
  });
  const [rawData, setrawData] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [calculatedRates, setCalculatedRates] = useState<any>(null);
  const [b2bBoxes, setB2bBoxes] = useState<B2bBox[]>([
    { boxNo: 1, length: 30, width: 20, height: 15, deadWeight: 5 },
    { boxNo: 2, length: 30, width: 20, height: 15, deadWeight: 5 },
  ]);
  const [b2bQuotes, setB2bQuotes] = useState<any[]>([]);

  const calculateVolumetricWeight = (
    height?: number,
    width?: number,
    length?: number,
  ): number | undefined => {
    if (!height || !width || !length) return undefined;
    return Number(((height * width * length) / 5000).toFixed(2));
  };

  const volumetricWeight =
    calculateVolumetricWeight(
      formData.dimensions.height,
      formData.dimensions.width,
      formData.dimensions.length,
    ) || 0;

  const b2bChargeableWeight = b2bBoxes.reduce((sum, b) => {
    const vol = ((b.length || 0) * (b.width || 0) * (b.height || 0)) / 5000;
    return sum + Math.max(Number(b.deadWeight) || 0, vol);
  }, 0);

  const chargeableWeight =
    formData.packageType === "B2B"
      ? Number(b2bChargeableWeight.toFixed(2))
      : Math.max(Number(formData.weight) || 0, volumetricWeight || 0);

  const handleInputChange = (field: keyof RateCalculatorForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDimensionChange = (dim: keyof Dimensions, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [dim]: numValue },
    }));
  };

  const northEastStates = [
    "arunachal pradesh",
    "assam",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "sikkim",
    "tripura",
    "shimla",
    "jammu & kashmir",
  ];

  const metroCities = [
    "mumbai",
    "delhi",
    "new delhi",
    "bengaluru",
    "chennai",
    "hyderabad",
    "ahmedabad",
    "kolkata",
    "pune",
    "noida",
    "gautam buddha nagar",
    "jaipur",
    "lucknow",
  ];

  const userdata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${getuser().id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      console.log(data, "data>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
      setrawData(data?.data?.ratechart || []);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    }
  };

  useEffect(() => {
    userdata();
  }, []);

  async function getPincodeDetails(pincode) {
    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );
      const data = await response.json();

      if (data[0].Status === "Success" && data[0].PostOffice.length > 0) {
        const post = data[0].PostOffice[0];
        return {
          pincode: post.Pincode,
          City: post.Region || post.Name,
          District: post.District,
          State: post.State,
          country: post.Country,
        };
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

  const handleCalculate = async () => {
    if (
      !formData.originPincode ||
      !formData.deliveryPincode ||
      formData.invoiceValue < 0
    ) {
      alert("Please fill all required fields with valid values.");
      return;
    }
    if (formData.packageType === "B2B") {
      if (!b2bBoxes.length || b2bChargeableWeight <= 0) {
        alert("Add at least one box with valid weight/dimensions for B2B.");
        return;
      }
    } else if (formData.weight <= 0) {
      alert("Please fill all required fields with valid values.");
      return;
    }

    setCalculating(true);
    try {
      const pincodefrom = formData.originPincode;
      const pincodeto = formData.deliveryPincode;

      let pin1: { City?: string; State?: string; District?: string } = {};
      let pin2: { City?: string; State?: string; District?: string } = {};

      for (const x of pincodelist.Sheet1) {
        if (x.Pincode.includes(pincodefrom)) pin1 = x;
        if (x.Pincode.includes(pincodeto)) pin2 = x;
      }

      if (!pin1.City) pin1 = await getPincodeDetails(pincodefrom);
      if (!pin2.City) pin2 = await getPincodeDetails(pincodeto);

      let zone = "";
      const response1 = {
        city:
          pin1?.City.toLowerCase() == "gautam buddha nagar"
            ? "noida"
            : pin1?.State == "Delhi"
              ? "delhi"
              : pin1?.City.toLowerCase(),
        district:
          pin1?.District.toLowerCase() == "gautam buddha nagar"
            ? "noida"
            : pin1?.District.toLowerCase(),
        state: pin1?.State.toLowerCase(),
      };

      const response2 = {
        city:
          pin2?.City.toLowerCase() == "gautam buddha nagar"
            ? "noida"
            : pin2?.State == "Delhi"
              ? "delhi"
              : pin2?.City.toLowerCase(),
        district:
          pin2?.District.toLowerCase() == "gautam buddha nagar"
            ? "noida"
            : pin2?.District.toLowerCase(),
        state: pin2?.State.toLowerCase(),
      };

      const zoneRes = await fetch(`${UPLOAD_BASE_URLs}/read-excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ pin1: response1, pin2: response2 }),
      });
      // const response3 = await zoneRes.json() as { data?: string };
      // zone = response3?.data;
      console.log("========================================");
      console.log("🚀 READ EXCEL API CALL");
      console.log("========================================");

      console.log("UPLOAD_BASE_URLs =>", UPLOAD_BASE_URLs);

      console.log("PIN1 =>", response1);
      console.log("PIN2 =>", response2);

      // const zoneRes = await fetch(`${UPLOAD_BASE_URLs}/read-excel`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${localStorage.getItem("token")}`,
      //   },
      //   body: JSON.stringify({
      //     pin1: response1,
      //     pin2: response2,
      //   }),
      // });

      console.log("READ EXCEL STATUS =>", zoneRes.status);
      console.log("READ EXCEL OK =>", zoneRes.ok);

      const response3 = await zoneRes.json();

      console.log("READ EXCEL RESPONSE =>", response3);
      console.log("READ EXCEL RESPONSE DATA =>", response3?.data);

      zone = response3?.data;

      console.log("ZONE FROM API =>", zone);

      // --------------------------------------------------
      // FALLBACK ZONE LOGIC
      // --------------------------------------------------

      if (!zone || zone === "Zone not found") {
        console.log("⚠️ API ZONE NOT FOUND - USING FALLBACK");

        if (
          response1.city?.toLowerCase() === response2.city?.toLowerCase() &&
          response1.state?.toLowerCase() === response2.state?.toLowerCase()
        ) {
          zone = "ZONE A";
        } else if (
          response1.state?.toLowerCase() === response2.state?.toLowerCase()
        ) {
          zone = "ZONE B";
        } else if (
          (metroCities.includes(response1.city) &&
            metroCities.includes(response2.city)) ||
          (metroPincodeList.includes(formData.originPincode) &&
            metroPincodeList.includes(formData.deliveryPincode))
        ) {
          zone = "ZONE C";
        } else if (
          northEastStates.includes(response1.state) ||
          northEastStates.includes(response2.state)
        ) {
          zone = "ZONE E";
        } else {
          zone = "ZONE D";
        }
      }

      console.log("========================================");
      console.log("✅ FINAL ZONE =>", zone);
      console.log("========================================");

      setzone_(zone);
      if (!response3.data || response3.data == "Zone not found") {
        if (
          response1.city == response2.city &&
          response1.state == response2.state
        ) {
          zone = "ZONE A";
        } else if (response1.state == response2.state) {
          zone = "ZONE B";
        } else if (
          (metroCities.includes(response1.city) &&
            metroCities.includes(response2.city)) ||
          (metroPincodeList.includes(formData.originPincode) &&
            metroPincodeList.includes(formData.deliveryPincode))
        ) {
          zone = "ZONE C";
        } else if (
          northEastStates.includes(response1.state) ||
          northEastStates.includes(response2.state)
        ) {
          zone = "ZONE E";
        } else {
          zone = "ZONE D";
        }
      }
      setzone_(zone);

      // B2B multi-package: quote from admin rate cards
      if (formData.packageType === "B2B") {
        const payMode =
          formData.paymentMode === "TO_PAY"
            ? "To-Pay"
            : formData.paymentMode === "COD"
              ? "COD"
              : "Prepaid";
        const res = await b2bApi.quote({
          originPincode: formData.originPincode,
          deliveryPincode: formData.deliveryPincode,
          packages: b2bBoxes,
          paymentMode: payMode,
          invoiceValue: formData.invoiceValue,
          zone,
          originMeta: response1,
          destMeta: response2,
          mode: "MPS",
        });
        setB2bQuotes(res.data?.quotes || []);
        setalldata({ type: [], rate: [], data: [], codcharge: [] });
        setCalculating(false);
        return;
      }

      setB2bQuotes([]);
      const wieght = chargeableWeight;

      const couriertype = {};
      alldata.type = [];
      alldata.rate = [];
      alldata.data = [];
      alldata.codcharge = [];

      const rawData_ = rawData.slice(2);
      const alltype = [];

      for (let i = 0; i < rawData_.length; i++) {
        if (rawData_[i][0] != null) {
          if (!alltype.includes(rawData_[i][0])) {
            alltype.push(rawData_[i][0]);
          }
        }
      }

      const parseSlabKg = (cell: unknown) => {
        const n = Number(
          String(cell ?? "")
            .toLowerCase()
            .replaceAll(" ", "")
            .replace("per", "")
            .replace("kg", "")
            .replace("additional", "") || 0,
        );
        return Number.isFinite(n) ? n : 0;
      };

      for (let i = 0; i < alltype.length; i++) {
        if (
          (zone == "ZONE A" || zone == "ZONE B") &&
          alltype[i]?.includes("Air")
        ) {
          continue;
        }

        let max = 0;
        let ind = -1;

        for (let j = 0; j < rawData_.length; j++) {
          const tmax = parseSlabKg(rawData_[j][1]);
          if (
            tmax > max &&
            rawData_[j][0] == alltype[i] &&
            (tmax <= wieght || (tmax == 0.5 && wieght <= 0.5))
          ) {
            ind = j;
            max = tmax;
          }
        }

        if (ind < 0 || !rawData_[ind]) {
          continue;
        }

        const zoneCol = rawData[0].indexOf(zone);
        if (zoneCol < 0) {
          continue;
        }

        if (max >= wieght) {
          alldata.type.push(alltype[i]);
          alldata.rate.push(rawData_[ind][zoneCol]);
          alldata.data.push(rawData_[ind]);
          corslab[alltype[i]] = max;

          const codParts = String(rawData_[ind].at(-1) ?? "")
            .replaceAll(" ", "")
            .split("|");
          const tamt1 = Number(codParts[0]) || 0;
          const per1 = parseFloat(codParts[1]) || 0;
          const tamt2 = (Number(formData.invoiceValue) / 100) * per1;
          alldata.codcharge.push(
            formData.paymentMode == "COD" ? (tamt1 > tamt2 ? tamt1 : tamt2) : 0,
          );
        } else {
          if (!rawData_[ind + 1]) {
            continue;
          }

          const amount1 = Number(rawData_[ind][zoneCol]) || 0;
          const amount2 = Number(rawData_[ind + 1][zoneCol]) || 0;
          let totalrate = amount1 + amount2;
          const addKg = parseSlabKg(rawData_[ind + 1][1]);
          // Zero/invalid additional slab would hang forever in a while(true) loop
          if (addKg <= 0) {
            continue;
          }
          max += addKg;

          // Bound the loop so a bad rate sheet never freezes the page
          let safety = 0;
          const maxSteps = Math.ceil(Math.max(wieght, 1) / addKg) + 5;

          do {
            if (max >= wieght) {
              alldata.type.push(alltype[i]);
              alldata.rate.push(totalrate);
              alldata.data.push(rawData_[ind]);
              corslab[alltype[i]] = max;

              const codParts = String(rawData_[ind + 1].at(-1) ?? "")
                .replaceAll(" ", "")
                .split("|");
              const tamt1 = Number(codParts[0]) || 0;
              const per1 = parseFloat(codParts[1]) || 0;
              const tamt2 = (Number(formData.invoiceValue) / 100) * per1;
              alldata.codcharge.push(
                formData.paymentMode == "COD"
                  ? tamt1 > tamt2
                    ? tamt1
                    : tamt2
                  : 0,
              );
              break;
            }
            const nextAdd = parseSlabKg(rawData_[ind + 1][1]);
            if (nextAdd <= 0) {
              break;
            }
            max += nextAdd;
            totalrate += amount2;
            safety += 1;
          } while (safety < maxSteps);
        }
      }

      setalldata({ ...alldata });
    } catch (err) {
      console.error(err);
      alert("Rate calculation failed. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculate2 = async (wieght: number) => {
    // intentionally left blank
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5" />
          Shipping Rate Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Tabs
            value={formData.serviceType}
            onValueChange={(v) =>
              handleInputChange(
                "serviceType",
                v as "domestic" | "international",
              )
            }
            className="w-full"
          >
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="domestic">Domestic</TabsTrigger>
              <TabsTrigger value="international">International</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Shipment Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.shipmentType}
                onValueChange={(v) =>
                  handleInputChange("shipmentType", v as ShipmentType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORWARD">Forward</SelectItem>
                  <SelectItem value="REVERSE">Reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Package Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.packageType}
                onValueChange={(v) =>
                  handleInputChange("packageType", v as PackageType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPS">Single Package (B2C)</SelectItem>
                  <SelectItem value="B2B">Multi Package (B2B)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Origin Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="6 Digits pickup area pincode"
                maxLength={6}
                value={formData.originPincode}
                onChange={(e) =>
                  handleInputChange(
                    "originPincode",
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Delivery Area Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter delivery area pincode"
                maxLength={6}
                value={formData.deliveryPincode}
                onChange={(e) =>
                  handleInputChange(
                    "deliveryPincode",
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Payment Mode <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.paymentMode}
                onValueChange={(v) =>
                  handleInputChange("paymentMode", v as PaymentMode)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREPAID">Prepaid</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="TO_PAY">To-Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" />
                Approximate Weight <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  disabled={formData.packageType === "B2B"}
                  onChange={(e) => {
                    handleInputChange(
                      "weight",
                      parseFloat(e.target.value) || 0,
                    );
                  }}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Kg
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.packageType === "B2B"
                  ? "For B2B, enter weight per box below. Chargeable = sum of max(dead, volumetric) per box."
                  : "Enter actual dead weight only. It will not be auto-updated by dimensions."}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                Invoice Value <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  step="1"
                  value={formData.invoiceValue}
                  onChange={(e) =>
                    handleInputChange(
                      "invoiceValue",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="h-4 w-4" />
              <Label className="font-medium">
                {formData.packageType === "B2B"
                  ? "Multi-package boxes (cm / kg)"
                  : "Dimensions (in cm)"}
              </Label>
            </div>
            {formData.packageType === "B2B" ? (
              <div className="space-y-3">
                {b2bBoxes.map((box, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 border rounded-lg"
                  >
                    <div>
                      <Label className="text-xs">Box</Label>
                      <Input value={box.boxNo} readOnly />
                    </div>
                    <div>
                      <Label className="text-xs">L</Label>
                      <Input
                        type="number"
                        value={box.length}
                        onChange={(e) => {
                          const next = [...b2bBoxes];
                          next[idx] = {
                            ...box,
                            length: parseFloat(e.target.value) || 0,
                          };
                          setB2bBoxes(next);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">W</Label>
                      <Input
                        type="number"
                        value={box.width}
                        onChange={(e) => {
                          const next = [...b2bBoxes];
                          next[idx] = {
                            ...box,
                            width: parseFloat(e.target.value) || 0,
                          };
                          setB2bBoxes(next);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">H</Label>
                      <Input
                        type="number"
                        value={box.height}
                        onChange={(e) => {
                          const next = [...b2bBoxes];
                          next[idx] = {
                            ...box,
                            height: parseFloat(e.target.value) || 0,
                          };
                          setB2bBoxes(next);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dead kg</Label>
                      <Input
                        type="number"
                        value={box.deadWeight}
                        onChange={(e) => {
                          const next = [...b2bBoxes];
                          next[idx] = {
                            ...box,
                            deadWeight: parseFloat(e.target.value) || 0,
                          };
                          setB2bBoxes(next);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      {b2bBoxes.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setB2bBoxes(
                              b2bBoxes
                                .filter((_, i) => i !== idx)
                                .map((b, i) => ({ ...b, boxNo: i + 1 })),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setB2bBoxes([
                      ...b2bBoxes,
                      {
                        boxNo: b2bBoxes.length + 1,
                        length: 30,
                        width: 20,
                        height: 15,
                        deadWeight: 5,
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Add box
                </Button>
                <p className="text-xs text-muted-foreground">
                  B2B quotes use admin rate cards. Manage cards on the{" "}
                  <Link className="underline text-primary" to="/dashboard/b2b">
                    B2B page
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Length *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Length"
                      value={formData.dimensions.length}
                      onChange={(e) =>
                        handleDimensionChange("length", e.target.value)
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      CM
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Width *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={formData.dimensions.width}
                      onChange={(e) =>
                        handleDimensionChange("width", e.target.value)
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      CM
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Height *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Height"
                      value={formData.dimensions.height}
                      onChange={(e) =>
                        handleDimensionChange("height", e.target.value)
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      CM
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            {formData.packageType !== "B2B" && (
              <p>Volumetric Weight: {volumetricWeight} kg</p>
            )}
            <p>
              Chargeable Weight: <strong>{chargeableWeight} kg</strong>
            </p>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={calculating}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Rates
              </>
            )}
          </Button>

          {b2bQuotes.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold mb-3">B2B Rate Card Quotes</h4>
              <div className="space-y-2">
                {b2bQuotes.map((q: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{q.courierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.name} · {q.mode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{q.total}</p>
                      {q.codCharge > 0 && (
                        <p className="text-sm">₹{q.codCharge} COD</p>
                      )}
                      <p className="text-sm">
                        ₹{q.gst} GST · wallet debit ₹{q.debitAmount}
                      </p>
                      <p className="text-sm">
                        {q.zone} - {q.chargeableWeight} kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alldata.type.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold mb-3">
                Available our Shipping Partner Rates
              </h4>
              <div className="space-y-2">
                {alldata.type.map((partner: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{partner}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{alldata.rate[idx]}</p>
                      {formData.paymentMode == "COD" && (
                        <p className="font-bold text-lg">
                          ₹{parseFloat(alldata.codcharge[idx]).toFixed(2)} COD
                          Charged
                        </p>
                      )}
                      <p className="font-bold text-lg">
                        ₹
                        {(
                          ((Number(alldata.rate[idx]) +
                            Number(
                              formData.paymentMode == "COD"
                                ? parseFloat(alldata.codcharge[idx])
                                : 0,
                            )) /
                            100) *
                          18
                        ).toFixed(2)}{" "}
                        GST 18%
                      </p>
                      <p className="font-bold text-lg">
                        ₹
                        {(
                          (Number(alldata.rate[idx]) +
                            Number(
                              formData.paymentMode == "COD"
                                ? parseFloat(alldata.codcharge[idx])
                                : 0,
                            )) *
                          1.18
                        ).toFixed(2)}{" "}
                        Total
                      </p>
                      <p className="text-sm">
                        {zone_} - {corslab[partner] || "N/A"} kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== Rate Chart Component ====================
const RateChart = () => {
  const [rawData, setrawData] = useState([]);
  const [allsellerlist, setallsellerlist] = useState([]);
  const [seller, setseller] = useState(getuserid());

  interface ProcessedRow {
    courier: string;
    weight: string;
    zoneA: number;
    zoneB: number;
    zoneC: number;
    zoneD: number;
    zoneE: number;
    codCharges: string;
    rowSpan: number;
    isFirstRow: boolean;
  }

  const processedRows: ProcessedRow[] = [];
  let i = 2;
  while (i < rawData.length) {
    const row = rawData[i];
    const courierName = row[0] as string | null;
    if (courierName !== null) {
      let span = 1;
      let j = i + 1;
      while (j < rawData.length && rawData[j][0] === null) {
        span++;
        j++;
      }
      processedRows.push({
        courier: courierName,
        weight: row[1] as string,
        zoneA: row[2] as number,
        zoneB: row[3] as number,
        zoneC: row[4] as number,
        zoneD: row[5] as number,
        zoneE: row[6] as number,
        codCharges: row[7] as string,
        rowSpan: span,
        isFirstRow: true,
      });
      for (let k = i + 1; k < i + span; k++) {
        const subRow = rawData[k];
        processedRows.push({
          courier: courierName,
          weight: subRow[1] as string,
          zoneA: subRow[2] as number,
          zoneB: subRow[3] as number,
          zoneC: subRow[4] as number,
          zoneD: subRow[5] as number,
          zoneE: subRow[6] as number,
          codCharges: subRow[7] as string,
          rowSpan: 0,
          isFirstRow: false,
        });
      }
      i += span;
    } else {
      i++;
    }
  }

  const userdata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${seller}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (getuser()?.role === "admin") {
        try {
          const data2 = await sellerApi.getAll();
          setallsellerlist(data2 || []);
        } catch {
          setallsellerlist([]);
        }
      } else {
        setallsellerlist([]);
      }
      console.log(data, "data");
      setrawData(data?.data?.ratechart || []);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    }
  };

  useEffect(() => {
    userdata();
  }, [seller]);

  const setuserratechart = async (data) => {
    const payload = {
      user_id: seller,
      data: data,
    };
    const response = await fetch(`${API_BASE_URL}/integrations/ratechartset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    userdata();
  };

  function downloadExcel() {
    const ws = XLSX.utils.aoa_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courier Rates");
    XLSX.writeFile(wb, "courier_rates.xlsx");
  }

  return (
    <Card className="shadow-lg">
      <style type="text/css">
        {`
           .selectboxwidth{
           width:300px;
      }
        
        `}
      </style>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Table2 className="h-5 w-5" />
          Rate Chart
          {getuser()?.role == "admin" && (
            <>
              <div
                style={{ width: "300px" }}
                className=" flex justify-end ml-auto "
              >
                <Select value={seller} onValueChange={(v) => setseller(v)}>
                  <SelectTrigger id="seller">
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {allsellerlist.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="ml btn-primary "
                onClick={() => {
                  const inputratesheet = document.getElementById(
                    "inputratesheet",
                  ) as HTMLInputElement;
                  inputratesheet.click();
                }}
              >
                Rate Sheet Upload
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="ml btn-primary "
                onClick={() => {
                  downloadExcel();
                }}
              >
                Download Rate Sheet
              </Button>
            </>
          )}
          <input
            type="file"
            id="inputratesheet"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (confirm(`Selected file: ${file.name}`)) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const data = new Uint8Array(
                      event.target.result as ArrayBuffer,
                    );
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const dataArray = XLSX.utils.sheet_to_json(worksheet, {
                      header: 1,
                    });
                    setuserratechart(dataArray);
                  };
                  reader.readAsArrayBuffer(file);
                }
              }
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-semibold">Couriers</th>
                <th className="text-left p-3 font-semibold">Weight</th>
                <th className="text-center p-3 font-semibold">ZONE A</th>
                <th className="text-center p-3 font-semibold">ZONE B</th>
                <th className="text-center p-3 font-semibold">ZONE C</th>
                <th className="text-center p-3 font-semibold">ZONE D</th>
                <th className="text-center p-3 font-semibold">ZONE E</th>
                <th className="text-center p-3 font-semibold">
                  COD Charges / COD%
                </th>
              </tr>
              <tr className="bg-muted/30 border-b text-muted-foreground">
                <th className="p-3"></th>
                <th className="p-3"></th>
                <th className="text-center p-3 text-xs">Within City</th>
                <th className="text-center p-3 text-xs">Within State</th>
                <th className="text-center p-3 text-xs">Metro to Metro</th>
                <th className="text-center p-3 text-xs">Rest of India</th>
                <th className="text-center p-3 text-xs">North East, J&K</th>
                <th className="text-center p-3 text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {processedRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border hover:bg-muted/20 transition-colors"
                >
                  {row.isFirstRow ? (
                    <td
                      rowSpan={row.rowSpan}
                      className="p-3 font-medium align-middle"
                    >
                      {row.courier}
                    </td>
                  ) : null}
                  <td className="p-3">{row.weight}</td>
                  <td className="p-3 text-center">₹{row.zoneA}</td>
                  <td className="p-3 text-center">₹{row.zoneB}</td>
                  <td className="p-3 text-center">₹{row.zoneC}</td>
                  <td className="p-3 text-center">₹{row.zoneD}</td>
                  <td className="p-3 text-center">₹{row.zoneE}</td>
                  <td className="p-3 text-center">{row.codCharges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          *Rates are indicative and subject to change. COD charges shown as
          "Fixed fee | Percentage".
        </div>
      </CardContent>
    </Card>
  );
};

const PinCodeChart = () => {
  const [rawData, setrawData] = useState([]);
  const [allsellerlist, setallsellerlist] = useState([]);
  const [seller, setseller] = useState(getuserid());
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [serviceType, setServiceType] = useState("eKART");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const userdata = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/integrations/pincodechartget_?pincodedate=${effectiveDate}&courier_name=${serviceType}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({}),
        },
      );
      const data = await response.json();
      console.log(data, "data");
      setrawData(data?.data[0]?.data || []);
      setCurrentPage(1);
    } catch (error) {
      setrawData([]);
      console.error("Error fetching pincode data:", error);
      return null;
    }
  };

  useEffect(() => {
    userdata();
  }, [effectiveDate, serviceType]);

  const setuserratechart = async (dataArray) => {
    const payload = {
      courier_name: serviceType,
      data: dataArray,
      pincodedate: effectiveDate,
    };
    const response = await fetch(
      "${API_BASE_URL}/integrations/pincodechartset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    userdata();
  };

  const formatValue = (value) => {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value === null || value === undefined) return "-";
    return String(value);
  };

  const headers = rawData.length > 0 ? rawData[0] : [];
  const allRows = rawData.slice(1);

  const totalRows = allRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = allRows.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  function downloadExcel() {
    const ws = XLSX.utils.aoa_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courier Rates");
    XLSX.writeFile(wb, effectiveDate + "_pincodeservices.xlsx");
  }

  return (
    <Card className="shadow-lg">
      <style type="text/css">
        {`
          .selectboxwidth { width: 300px; }
          .filter-group { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
          .pagination-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
          .pagination-buttons { display: flex; gap: 8px; }
        `}
      </style>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Table2 className="h-5 w-5" />
          Pincode Serviceability
          <div className="filter-group ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Effective Date:
              </span>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-40"
              />
            </div>

            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eKART">eKart</SelectItem>
                <SelectItem value="SMC">SMC</SelectItem>
                <SelectItem value="Delhivery">Delhivery</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>

            {getuser()?.role === "admin" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-primary"
                  onClick={() => {
                    const inputratesheet = document.getElementById(
                      "inputratesheet",
                    ) as HTMLInputElement;
                    inputratesheet.click();
                  }}
                >
                  Pincode Sheet Upload
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="btn-primary"
              onClick={() => {
                downloadExcel();
              }}
            >
              Pincode Sheet Download
            </Button>

            <input
              type="file"
              id="inputratesheet"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && confirm(`Selected file: ${file.name}`)) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const data = new Uint8Array(
                      event.target.result as ArrayBuffer,
                    );
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const dataArray = XLSX.utils.sheet_to_json(worksheet, {
                      header: 1,
                    });
                    setuserratechart(dataArray);
                  };
                  reader.readAsArrayBuffer(file);
                }
              }}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rawData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No data available for selected date and courier.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    {headers.map((header, idx) => (
                      <th key={idx} className="text-left p-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="p-3">
                          {formatValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-controls">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Rows per page:
                </span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(v) =>
                    handleRowsPerPageChange({ target: { value: v } })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of{" "}
                {totalRows} entries
              </div>

              <div className="pagination-buttons">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-xs text-muted-foreground text-center">
          * Pincode serviceability data is indicative and subject to change.
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== Main Component ====================
const RateCalculator = () => {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <DashboardLayout
      title="Rate Calculator"
      subtitle="Calculate shipping rates & view rate charts"
    >
      <div className="container mx-auto py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Rate Calculator
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Rate Chart
            </TabsTrigger>
            <TabsTrigger
              value="pincodechart"
              className="flex items-center gap-2"
            >
              <Table2 className="h-4 w-4" />
              Pincode Chart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="mt-6">
            <RateCalculatorForm />
          </TabsContent>

          <TabsContent value="chart" className="mt-6">
            <RateChart />
          </TabsContent>

          <TabsContent value="pincodechart" className="mt-6">
            <PinCodeChart />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RateCalculator;
