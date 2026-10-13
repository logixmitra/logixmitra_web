// Temporary diagnostic: reproduce the exact Shadowfax payload for an order
// and POST it with a DIAG client_order_id (cancelled after inspection).
require('dotenv').config();
const fs = require('fs');
const { Warehouse } = require('./models');
const svc = require('./services/orderService.js');

(async () => {
  const o = JSON.parse(fs.readFileSync('./diag_order.json', 'utf8'));

  const w = (await Warehouse.findByPk(2)).toJSON();
  const sellerInfo = {
    name: w.name, address: w.address, city: w.city, state: w.state,
    pincode: w.pincode || 122001, phone: w.phone, gstTin: w.gst || '',
    returnAddress: w.address, returnCity: w.city, returnState: w.state,
    returnPincode: w.pincode, returnPhone: w.phone
  };

  let payload;
  try {
    payload = svc.convertToShipshadowfaxFormat(o, sellerInfo, {}, 0);
  } catch (e) { console.log('CONVERT_ERR=' + e.message); process.exit(0); }

  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  payload.order_details.client_order_id = 'DIAG2-' + ts;
  console.log('CLIENT_ORDER_ID=' + payload.order_details.client_order_id);
  console.log('PAYLOAD=' + JSON.stringify(payload));

  const res = await fetch('https://dale.shadowfax.in/api/v3/clients/orders/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + process.env.SHADOWFAX_TOKEN },
    body: JSON.stringify(payload)
  });
  const j = await res.json().catch(() => null);
  console.log('HTTP=' + res.status);
  console.log('RESPONSE=' + JSON.stringify(j));
  process.exit(0);
})().catch((e) => { console.log('FATAL=' + e.message); process.exit(1); });
