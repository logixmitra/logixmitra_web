/**
 * Backfill stored tracking_history for orders that already have an AWB but no
 * scans in the DB (the list/detail sub-status reads only the stored row, so
 * these orders showed a blank Sub Status even though the courier has history).
 *
 * Safety: calls updateOrderStatus(..., { historyOnly: true }) so `status`,
 * `ndrreason` and RTO/cancel state are NEVER changed — we only fill scans
 * (plus deliveredDate/Time for already-Delivered orders when the courier
 * confirms the delivery timestamp).
 *
 * Run: node scripts/backfillTrackingHistory.js [--limit 200] [--delay 400]
 *      node scripts/backfillTrackingHistory.js --all
 */
require('dotenv').config();

const { Op, literal } = require('sequelize');
// Require the index so Order<->OrderItem associations are registered before
// the eager-loaded findAll below.
const { Order, OrderItem } = require('../models');
const sequelize = require('../config/database');
const {
  getInnufillTracking,
  getEkartTracking,
  getDelhiveryTracking,
  getShadowfaxTracking,
  getXpressbeesTracking,
  getBlueDartTracking,
  updateOrderStatus,
} = require('../services/trackingService');

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx > -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const LIMIT = process.argv.includes('--all')
  ? null
  : parseInt(argValue('--limit', '200'), 10);
const DELAY_MS = parseInt(argValue('--delay', '400'), 10);

/** Same courier dispatch as trackingService.processOrderTracking / routes/tracking.js. */
async function fetchTracking(order) {
  const courierType = String(order.courier || '').toLowerCase();
  if (
    courierType.includes('innufill') ||
    courierType.includes('innofulfil') ||
    courierType.includes('smc') ||
    courierType.includes('shree maruti')
  ) {
    return { data: await getInnufillTracking(order.awb), label: 'Shree Maruti Courier' };
  }
  if (courierType.includes('ekart')) {
    return { data: await getEkartTracking(order.awb), label: 'eKART' };
  }
  if (courierType.includes('shadowfax')) {
    return { data: await getShadowfaxTracking(order.awb), label: 'Shadowfax' };
  }
  if (courierType.includes('delhivery') || courierType.includes('delivery')) {
    return { data: await getDelhiveryTracking(order), label: 'Delhivery' };
  }
  if (courierType.includes('xpressbees') || courierType.includes('xpress bees')) {
    return { data: await getXpressbeesTracking(order.awb), label: 'Xpressbees' };
  }
  if (courierType.includes('bluedart') || courierType.includes('blue dart')) {
    return { data: await getBlueDartTracking(order.awb), label: 'BlueDart' };
  }
  return { data: null, label: order.courier || '' };
}

async function main() {
  await sequelize.authenticate();

  const where = {
    awb: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: '-' }] },
    [Op.or]: [
      { tracking_history: null },
      literal("(tracking_history IS NOT NULL AND jsonb_typeof(tracking_history::jsonb) = 'array' AND jsonb_array_length(tracking_history::jsonb) = 0)"),
    ],
  };

  const orders = await Order.findAll({
    where,
    include: [{ model: OrderItem, as: 'items', required: false }],
    order: [['updatedAt', 'DESC']],
    ...(LIMIT ? { limit: LIMIT } : {}),
  });

  console.log(`AWB orders with empty stored history: ${orders.length}`);

  const BATCH = 5;
  let filled = 0;
  let noData = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (order) => {
        try {
          const { data, label } = await fetchTracking(order);
          if (!data) {
            skipped += 1;
            console.log(`SKIP  ${order.orderNumber}: unsupported courier "${order.courier}"`);
            return;
          }
          if (!data.success) {
            noData += 1;
            console.log(`NODATA ${order.orderNumber} (${label}): ${data.error || 'no response'}`);
            return;
          }
          const updated = await updateOrderStatus(order, data, label, { historyOnly: true });
          if (updated) {
            filled += 1;
            console.log(`FILLED ${order.orderNumber} (${label})`);
          } else {
            failed += 0; // unchanged: courier returned the same (empty) data
            console.log(`EMPTY ${order.orderNumber} (${label}): courier returned no scans`);
          }
        } catch (err) {
          failed += 1;
          console.error(`ERR   ${order.orderNumber}: ${err.message}`);
        }
      })
    );
    if (i + BATCH < orders.length && DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  const remaining = await Order.count({
    where,
  });

  console.log('\n--- Backfill summary ---');
  console.log(`processed : ${orders.length}`);
  console.log(`filled    : ${filled}`);
  console.log(`no data   : ${noData}`);
  console.log(`skipped   : ${skipped} (unsupported courier)`);
  console.log(`errors    : ${failed}`);
  console.log(`still empty (AWB + no scans): ${remaining}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
