/**
 * Backfill and de-duplicate order reference IDs.
 *
 * Run:
 *   node scripts/backfillReferenceIds.js
 *
 * - Orders with null/empty referenceId get a fresh unique REF-xxxx id.
 * - When duplicates exist, the oldest order keeps the reference and the
 *   rest get fresh unique ids.
 */

require('dotenv').config();

const { Op } = require('sequelize');
const { Order } = require('../models');
const sequelize = require('../config/database');
const { generateUniqueReferenceId } = require('../utils/orderReference');

async function backfillMissing() {
  const missing = await Order.findAll({
    where: {
      [Op.or]: [
        { referenceId: null },
        { referenceId: '' },
      ],
    },
    attributes: ['id'],
    order: [['createdAt', 'ASC']],
  });

  let fixed = 0;
  for (const order of missing) {
    const referenceId = await generateUniqueReferenceId();
    await Order.update({ referenceId }, { where: { id: order.id } });
    fixed += 1;
  }
  console.log(`Backfilled ${fixed} orders with missing reference IDs.`);
}

async function fixDuplicates() {
  const [dupes] = await sequelize.query(`
    SELECT "referenceId"
    FROM "orders"
    WHERE "referenceId" IS NOT NULL AND "referenceId" <> ''
    GROUP BY "referenceId"
    HAVING COUNT(*) > 1
  `);

  let fixed = 0;
  for (const row of dupes) {
    const orders = await Order.findAll({
      where: { referenceId: row.referenceId },
      attributes: ['id', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    // Keep the oldest, regenerate the rest.
    for (const order of orders.slice(1)) {
      const referenceId = await generateUniqueReferenceId();
      await Order.update({ referenceId }, { where: { id: order.id } });
      fixed += 1;
    }
  }
  console.log(`Fixed ${fixed} orders with duplicate reference IDs (${dupes.length} duplicate values).`);
}

async function main() {
  try {
    await sequelize.authenticate();
    await backfillMissing();
    await fixDuplicates();

    const [remaining] = await sequelize.query(`
      SELECT "referenceId", COUNT(*) AS cnt
      FROM "orders"
      WHERE "referenceId" IS NOT NULL AND "referenceId" <> ''
      GROUP BY "referenceId"
      HAVING COUNT(*) > 1
    `);
    if (remaining.length > 0) {
      console.warn('Warning: duplicates still remain:', remaining);
      process.exitCode = 1;
    } else {
      console.log('All order reference IDs are now unique.');
    }
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
