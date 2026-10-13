// Temporary diagnostic: cancel the DPIN test orders + inspect serviceability
// responses for a serviceable pincode.
require('dotenv').config();
const TOKEN = process.env.SHADOWFAX_TOKEN;
const CANCEL_URL = 'https://dale.shadowfax.in/api/v3/clients/orders/cancel/';
const ids = [
  'DDP-854331-20261010105554', 'DDP-854326-20261010105554',
  'DDP-854330-20261010105554', 'DDP-854335-20261010105554',
  'DDP-854337-20261010105554',
];

(async () => {
  const done = {};
  for (let round = 1; round <= 6; round++) {
    let allDone = true;
    for (const id of ids) {
      if (done[id]) continue;
      const r = await fetch(CANCEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + TOKEN },
        body: JSON.stringify({ request_id: id })
      });
      const j = await r.json().catch(() => null);
      console.log(`R${round} ${id} -> ${JSON.stringify(j)}`);
      const msg = String(j?.responseMsg || '');
      if (j?.responseCode === 200 || (/cancelled/i.test(msg) && !/try cancelling/i.test(msg))) done[id] = true;
      else allDone = false;
    }
    if (allDone) { console.log('ALL_CANCELLED'); break; }
    if (round < 6) await new Promise((s) => setTimeout(s, 8000));
  }
  const pending = ids.filter((i) => !done[i]);
  console.log('PENDING=' + JSON.stringify(pending));

  for (const svc of ['customer_delivery', 'seller_pickup']) {
    for (const pins of ['854331,110094', '854336']) {
      try {
        const r = await fetch(`https://dale.shadowfax.in/api/v1/clients/serviceability/?service=${svc}&pincodes=${pins}`, {
          headers: { 'Authorization': 'Token ' + TOKEN }
        });
        const t = await r.text();
        console.log(`SVC ${svc} ${pins} -> ${r.status} ${t.slice(0, 400)}`);
      } catch (e) { console.log(`SVC ${svc} ${pins} -> ERR ${e.message}`); }
    }
  }
  process.exit(0);
})().catch((e) => { console.log('FATAL=' + e.message); process.exit(1); });
