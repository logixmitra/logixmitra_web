// Temporary diagnostic: probe order_service variants + serviceability params.
require('dotenv').config();
const fs = require('fs');
const { Warehouse } = require('./models');
const svc = require('./services/orderService.js');
const TOKEN = process.env.SHADOWFAX_TOKEN;

(async () => {
  const o = JSON.parse(fs.readFileSync('./diag_order.json', 'utf8'));
  const w = (await Warehouse.findByPk(2)).toJSON();
  const sellerInfo = {
    name: w.name, address: w.address, city: w.city, state: w.state,
    pincode: w.pincode || 122001, phone: w.phone, gstTin: w.gst || '',
    returnAddress: w.address, returnCity: w.city, returnState: w.state,
    returnPincode: w.pincode, returnPhone: w.phone
  };
  const base = svc.convertToShipshadowfaxFormat(o, sellerInfo, {}, 0);
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

  const candidates = ['Surface', 'Air', 'regular', 'surface', 'air', null];
  for (const c of candidates) {
    const p = JSON.parse(JSON.stringify(base));
    const label = c === null ? 'omitted' : c;
    if (c === null) { delete p.order_details.order_service; } else { p.order_details.order_service = c; }
    p.order_details.client_order_id = `DIAG3-${label}-${ts}`;
    try {
      const res = await fetch('https://dale.shadowfax.in/api/v3/clients/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + TOKEN },
        body: JSON.stringify(p)
      });
      const j = await res.json().catch(() => null);
      console.log(`RESULT ${label} -> HTTP ${res.status} ${JSON.stringify(j)}`);
      if (j?.data?.awb_number) {
        const cr = await fetch('https://dale.shadowfax.in/api/v3/clients/orders/cancel/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + TOKEN },
          body: JSON.stringify({ request_id: p.order_details.client_order_id })
        });
        const cj = await cr.json().catch(() => null);
        console.log(`CANCEL ${label} -> ${JSON.stringify(cj)}`);
      }
    } catch (e) { console.log(`RESULT ${label} -> ERR ${e.message}`); }
  }

  for (const s of ['forward', 'express', 'b2c', 'all', 'Regular', 'sfx']) {
    try {
      const r = await fetch(`https://dale.shadowfax.in/api/v1/clients/serviceability/?service=${s}&pincodes=854336,110094`, {
        headers: { 'Authorization': 'Token ' + TOKEN }
      });
      const t = await r.text();
      console.log(`SVC ${s} -> ${r.status} ${t.slice(0, 300)}`);
    } catch (e) { console.log(`SVC ${s} -> ERR ${e.message}`); }
  }
  process.exit(0);
})().catch((e) => { console.log('FATAL=' + e.message); process.exit(1); });
