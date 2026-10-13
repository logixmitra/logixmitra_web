// Temporary diagnostic: probe pickup variants, order_types, delivery
// neighbours and serviceability params for 854336 coverage.
require('dotenv').config();
const fs = require('fs');
const { Warehouse } = require('./models');
const svc = require('./services/orderService.js');
const TOKEN = process.env.SHADOWFAX_TOKEN;
const ORDERS_URL = 'https://dale.shadowfax.in/api/v3/clients/orders/';
const CANCEL_URL = 'https://dale.shadowfax.in/api/v3/clients/orders/cancel/';

async function postOrder(p) {
  const res = await fetch(ORDERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + TOKEN },
    body: JSON.stringify(p)
  });
  const j = await res.json().catch(() => null);
  if (j?.data?.awb_number) {
    const cr = await fetch(CANCEL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token' + ' ' + TOKEN },
      body: JSON.stringify({ request_id: p.order_details.client_order_id })
    });
    const cj = await cr.json().catch(() => null);
    console.log(`  CANCELLED -> ${JSON.stringify(cj)}`);
  }
  return j;
}

(async () => {
  const o = JSON.parse(fs.readFileSync('./diag_order.json', 'utf8'));
  const w = (await Warehouse.findByPk(2)).toJSON();
  const si = {
    name: w.name, address: w.address, city: w.city, state: w.state,
    pincode: w.pincode || 122001, phone: w.phone, gstTin: w.gst || '',
    returnAddress: w.address, returnCity: w.city, returnState: w.state,
    returnPincode: w.pincode, returnPhone: w.phone
  };
  const base = svc.convertToShipshadowfaxFormat(o, si, {}, 0);
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const clone = () => JSON.parse(JSON.stringify(base));

  // A. pickup pincode variants (delivery fixed 854336, order_service Regular)
  const pickups = [
    [122001, 'Gurugram', 'Haryana'], [201301, 'Noida', 'Uttar Pradesh'],
    [400001, 'Mumbai', 'Maharashtra'], [560034, 'Bengaluru', 'Karnataka'],
    [854331, 'Araria', 'Bihar'], [854336, 'Araria', 'Bihar'],
  ];
  for (const [pin, city, state] of pickups) {
    const p = clone();
    p.order_details.order_service = 'Regular';
    p.pickup_details = { ...p.pickup_details, pincode: pin, city, state };
    p.return_details = { ...p.return_details, pincode: pin, city, state };
    p.order_details.client_order_id = `DPA-${pin}-${ts}`;
    try { console.log(`PICKUP ${pin} -> ${JSON.stringify(await postOrder(p))}`); }
    catch (e) { console.log(`PICKUP ${pin} -> ERR ${e.message}`); }
  }

  // B. order_type variants (default pickup 110094)
  for (const t of ['warehouse', 'd2d']) {
    const p = clone();
    p.order_type = t;
    p.order_details.client_order_id = `DOT-${t}-${ts}`;
    try { console.log(`OTYPE ${t} -> ${JSON.stringify(await postOrder(p))}`); }
    catch (e) { console.log(`OTYPE ${t} -> ERR ${e.message}`); }
  }

  // C. neighbour delivery pincodes (pickup 110094, Regular)
  for (const dp of [854331, 854326, 854330, 854335, 854337]) {
    const p = clone();
    p.customer_details = { ...p.customer_details, pincode: dp };
    p.order_details.client_order_id = `DDP-${dp}-${ts}`;
    try { console.log(`DPIN ${dp} -> ${JSON.stringify(await postOrder(p))}`); }
    catch (e) { console.log(`DPIN ${dp} -> ERR ${e.message}`); }
  }

  // D. serviceability service= guesses
  for (const s of ['seller_pickup', 'customer_delivery', 'pickup', 'delivery', 'economy', 'b2b', 'marketplace_regular']) {
    try {
      const r = await fetch(`https://dale.shadowfax.in/api/v1/clients/serviceability/?service=${s}&pincodes=854336`, {
        headers: { 'Authorization': 'Token ' + TOKEN }
      });
      const t = await r.text();
      console.log(`SVC ${s} -> ${r.status} ${t.slice(0, 250)}`);
    } catch (e) { console.log(`SVC ${s} -> ERR ${e.message}`); }
  }
  process.exit(0);
})().catch((e) => { console.log('FATAL=' + e.message); process.exit(1); });
