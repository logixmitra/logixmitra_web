// Temporary diagnostic: reproduce/verify the reported date-filter bug
// (From=2026-10-09, To=2026-10-10 must NOT include 08 Oct orders).
// Inserts controlled rows, runs the same query the Orders page runs,
// asserts the result, then cleans up.
require('dotenv').config();
const svc = require('./services/orderService.js');
const Order = require('./models/Order');

const mk = (vals) => Order.create({
  user_id: null,
  customerName: 'DIAG DATE TEST',
  customerPhone: '9999999999',
  seller: '19',
  pincode: '122001',
  city: 'Gurugram',
  state: 'Haryana',
  addressLine1: 'diag row',
  platform: 'Manual',
  orderType: 'B2C',
  status: 'Pending',
  ...vals,
});

(async () => {
  const created = [];
  try {
    // A: orderDate 08 Oct → must NOT appear for From=09 To=10
    created.push((await mk({ referenceId: 'DIAG-DF-A', orderDate: '2026-10-08', createdAt: new Date('2026-10-08T10:00:00Z') })).id);
    // B: orderDate 09 Oct → must appear
    created.push((await mk({ referenceId: 'DIAG-DF-B', orderDate: '2026-10-09', createdAt: new Date('2026-10-09T04:00:00Z') })).id);
    // C: no orderDate, created 09 Oct 01:30 IST (08 Oct 20:00Z) → must appear (it IS 9 Oct for IST users)
    created.push((await mk({ referenceId: 'DIAG-DF-C', orderDate: null, createdAt: new Date('2026-10-08T20:00:00Z') })).id);
    // D: no orderDate, created 08 Oct 15:30 IST (08 Oct 10:00Z) → must NOT appear
    created.push((await mk({ referenceId: 'DIAG-DF-D', orderDate: null, createdAt: new Date('2026-10-08T10:00:00Z') })).id);

    // Exact payload getOrderDateFilters("2026-10-09", "2026-10-10", "Order Created")
    // produces for an IST browser:
    const rows = await svc.getAllOrders({
      startDate: '2026-10-08T18:30:00.000Z',
      endDate: '2026-10-10T18:29:59.999Z',
      startDateDay: '2026-10-09',
      endDateDay: '2026-10-10',
      dateType: 'Order Created',
      paginate: 'false',
    });
    const list = (Array.isArray(rows) ? rows : (rows?.data || []))
      .filter((o) => String(o.referenceId || '').startsWith('DIAG-DF-'))
      .map((o) => o.referenceId);

    const pass = list.includes('DIAG-DF-B') && list.includes('DIAG-DF-C')
      && !list.includes('DIAG-DF-A') && !list.includes('DIAG-DF-D');
    console.log('MATCHED DIAG ROWS:', JSON.stringify(list.sort()));
    console.log(pass
      ? 'PASS: From=09 To=10 keeps only 09-Oct orders (orderDate + IST createdAt), excludes 08-Oct.'
      : 'FAIL: unexpected rows in date range: ' + JSON.stringify(list.sort()));
    process.exitCode = pass ? 0 : 1;
  } finally {
    await Order.destroy({ where: { id: created } });
    console.log('Cleaned up', created.length, 'diag rows.');
    process.exit(process.exitCode || 0);
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
