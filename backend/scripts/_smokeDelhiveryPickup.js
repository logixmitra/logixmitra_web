// Temporary smoke test for the Delhivery pickup auto-registration flow.
// Run: node backend/scripts/_smokeDelhiveryPickup.js
// Stubs global.fetch + model DB calls; never hits the network or DB.
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const { Warehouse, User } = require('../models');
const svc = require('../services/orderService');

const results = [];
function assert(cond, label) {
  results.push({ ok: !!cond, label });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
}

function jsonResponse(body, status = 200) {
  const text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

const fakeWarehouse = {
  id: 2,
  name: 'Sk Gurugram',
  address: 'Plot 45, Sector 12',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
  phone: '9811012345'
};

const baseOrder = {
  referenceId: 'REF-SMOKE-1',
  customerName: 'Test Customer',
  customerPhone: '9876543210',
  customerEmail: 'test@example.com',
  addressLine1: 'House 1, MG Road',
  city: 'Delhi',
  state: 'Delhi',
  pincode: '110001',
  items: [{ name: 'Test Product', quantity: 1, unitPrice: 100 }],
  paymentMode: 'PREPAID'
};

const data22 = { ratelist: {}, coureir: [1], zone: ['ZONE A'] };

// DB stubs
Warehouse.findOne = async () => fakeWarehouse;
User.findByPk = async () => ({ email: 'seller@example.com', company: 'SK Traders Pvt Ltd', gst: '-' });
svc._hydrateOrderForShipment = async (o) => o;

async function scenarioA() {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, body: opts?.body });
    if (calls.length === 1) {
      // cmu/create: pickup missing
      return jsonResponse({ message: 'ClientWarehouse matching query does not exist.', packages: [] });
    }
    if (calls.length === 2) {
      // clientwarehouse/create: success
      return jsonResponse({ success: true, error: '', data: { name: 'Sk Gurugram' } });
    }
    // cmu/create retry: success with waybill
    return jsonResponse({ success: true, packages: [{ waybill: 'WB_TEST_123' }] });
  };

  const out = await svc.createShippmentDelhivery({ ...baseOrder }, 2, data22, 0, 0);
  assert(out?.packages?.[0]?.waybill === 'WB_TEST_123', 'A: shipment created after auto-registration (waybill returned)');
  assert(calls.length === 3, 'A: exactly 3 calls (cmu fail -> warehouse create -> cmu retry)');
  const whCall = calls[1];
  assert(whCall.url.includes('/api/backend/clientwarehouse/create/'), 'A: warehouse create endpoint used');
  const whBody = JSON.parse(whCall.body);
  assert(whBody.name === 'Sk Gurugram', 'A: pickup name sent = "Sk Gurugram"');
  assert(whBody.registered_name === 'SK Traders Pvt Ltd', 'A: registered_name from seller.company');
  assert(whBody.email === 'seller@example.com', 'A: email from seller.email');
  assert(whBody.pin === '122001' && whBody.return_pin === '122001', 'A: pickup + return pincode present');
  assert(whBody.country === 'India' && whBody.return_country === 'India', 'A: country fields present');
}

async function scenarioB() {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, body: opts?.body });
    if (calls.length === 1) {
      return jsonResponse({ message: 'ClientWarehouse matching query does not exist.', packages: [] });
    }
    // clientwarehouse/create fails
    return jsonResponse({ success: false, error: "Pincode doesn't exist in system" }, 400);
  };

  const out = await svc.createShippmentDelhivery({ ...baseOrder, referenceId: 'REF-SMOKE-2' }, 2, data22, 0, 0);
  assert(calls.length === 2, 'B: no retry when warehouse create fails');
  assert(String(out?.message).includes('auto-registration failed'), 'B: message mentions auto-registration failed');
  assert(String(out?.message).includes("Pincode doesn't exist in system"), 'B: Delhivery create error surfaced');
  assert(String(out?.message).includes('ClientWarehouse matching query does not exist'), 'B: original error preserved');
  assert(out?.success === false, 'B: success=false');
}

async function scenarioC() {
  const calls = [];
  User.findByPk = async () => ({ email: null, company: null, gst: '-' });
  global.fetch = async (url, opts) => {
    calls.push({ url, body: opts?.body });
    return jsonResponse({ message: 'ClientWarehouse matching query does not exist.', packages: [] });
  };

  const out = await svc.createShippmentDelhivery({ ...baseOrder, referenceId: 'REF-SMOKE-3' }, 2, data22, 0, 0);
  assert(calls.length === 1, 'C: warehouse create not attempted when required data missing');
  assert(String(out?.message).includes('missing required field(s): email'), 'C: missing email reported clearly');
}

(async () => {
  try {
    await scenarioA();
    await scenarioB();
    await scenarioC();
  } catch (err) {
    console.error('SMOKE_ERROR', err);
    results.push({ ok: false, label: 'unexpected error: ' + err.message });
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
  process.exit(failed.length ? 1 : 0);
})();
