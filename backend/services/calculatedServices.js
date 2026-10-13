
const { Order  } = require('../models');
const innofulfillService = require('./innofulfillService');
const { Shipment } = require('../models');

const fs = require('fs');
const path = require('path');




async function  getekarttoken(){
let response=await fetch('https://app.elite.ekartlogistics.in/integrations/v2/auth/token/EKART_6995807edcc54747b4c875ac', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
  "username": process.env.EKART_USERNAME || "",
  "password": process.env.EKART_PASSWORD || ""
})
})
if(!response.ok){
  return null
}

response=await response.json()
return response

}


 async function  getinnofulfilltoken(){
  try {
    const auth = await innofulfillService.getAuth();
    return {
      accessToken: auth.idToken || auth.apiKey,
      id_token: auth.idToken,
      tenantId: auth.tenantId,
      userId: auth.userId,
      ...auth
    };
  } catch (e) {
    console.error('InnoFulfill token error:', e.message);
    return null;
  }
}

async function getInnufilllabel(awd, referenceId){
  let order = null;
  if (referenceId) {
    order = await Order.findOne({ where: { referenceId } });
  } else if (awd) {
    order = await Order.findOne({ where: { awb: awd } });
  }
  order = order ? order.toJSON() : null;

  const shipment = referenceId
    ? await Shipment.findOne({ where: { referenceId } })
    : null;

  const orderId = innofulfillService.resolveExternalOrderId(order, shipment);
  if (!orderId) {
    return {};
  }

  const label = await innofulfillService.getShippingLabel({ orderId });
  if (label.shippingLabelUrl) {
    return { shippingLabelUrl: label.shippingLabelUrl };
  }

  if (label.buffer) {
    const fileName = `${referenceId || awd || orderId}.pdf`;
    const filePath = path.join("uploads", fileName);
    fs.writeFileSync(filePath, label.buffer);
    return { shippingLabelUrl: "https://app.logixmitra.com/api/preview/" + fileName };
  }

  return {};
}

async function getLabel(req){
      let referenceId=req.body.referenceId
      
      let order=await Order.findOne({
      where: {
        referenceId:referenceId
      }    })
    order=order.toJSON()

      if(order){
          let {access_token } =await getekarttoken()
          let response=await fetch('https://app.elite.ekartlogistics.in/data/v2/generate/manifest', {
            method: 'POST',
             headers: {
              'Content-Type': 'application/json',
                'Authorization':'Bearer '+access_token
                 },
                  responseType: "stream" ,
             body: JSON.stringify({
  "ids": [order.awb]
}),
})
 if (response.status === 200) {
    const buffer = Buffer.from(await response.arrayBuffer());
     const filePath = path.join("uploads", `${referenceId}.pdf`);
    fs.writeFileSync(filePath, buffer);
    return {url:"https://app.logixmitra.com/api/preview/"+referenceId+".pdf"}
  } else {
    let response=await getInnufilllabel(order.awb, referenceId)
    if(response.shippingLabelUrl){
    return {url:response.shippingLabelUrl}
    }
    else{
        return {message:"Not Found Order Number",status:false}
    }
  }              
      }
      else{
        return {message:"Not Found Order Number",status:false}
      }

}







 async function getInnofulfillData(tmpdata) {
  return innofulfillService.calculateEcommRate(tmpdata);
}
async function getEkartrateCalculated(tmpdata) {
  let {access_token } =await getekarttoken()
let ekartpayload ={
  "shippingDirection": tmpdata.shipmentType,
  "pickupPincode": tmpdata.originPincode,
  "dropPincode": tmpdata.deliveryPincode,
  "invoiceAmount": tmpdata.invoiceValue,
  "weight": tmpdata.weight,
  "length": tmpdata.dimensions.length,
  "height": tmpdata.dimensions.height,
  "width": tmpdata.dimensions.width,
  "serviceType": "SURFACE",
  "codAmount": tmpdata.paymentMode == "COD" ? tmpdata.invoiceValue : 0,
  "packages": [
    {
      "length": tmpdata.dimensions.length,
      "height": tmpdata.dimensions.height,
      "width": tmpdata.dimensions.width,
      "count": "1"
    }
  ]
}
let response=await fetch('https://app.elite.ekartlogistics.in/data/pricing/estimate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization':'Bearer '+access_token
  },
  body: JSON.stringify(ekartpayload)
})
response=await response.json()
console.log(response,"ekartcalculatedrate")
return response


}
module.exports = {
  getInnofulfillData,
  getEkartrateCalculated,
  getekarttoken,
  getinnofulfilltoken,
  getLabel


};
