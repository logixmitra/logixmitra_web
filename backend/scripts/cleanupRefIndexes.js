/**
 * Drop duplicate unique indexes on orders.referenceId, keeping a single one.
 * These accumulate because sequelize.sync({ alter: true }) re-adds the
 * attribute-level unique constraint on every restart.
 *
 * Run: node scripts/cleanupRefIndexes.js
 */

require('dotenv').config();
const sequelize = require('../config/database');

const KEEP = 'orders_referenceId_key';

async function main() {
  try {
    await sequelize.authenticate();

    const [rows] = await sequelize.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexdef ILIKE '%referenceId%'"
    );

    const toDrop = rows.map((r) => r.indexname).filter((name) => name !== KEEP);

    for (const name of toDrop) {
      // Constraint-backed indexes must be dropped via the constraint.
      await sequelize.query(`ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "${name}"`);
      await sequelize.query(`DROP INDEX IF EXISTS public."${name}"`);
      console.log(`Dropped ${name}`);
    }

    const [remaining] = await sequelize.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexdef ILIKE '%referenceId%'"
    );
    console.log('Remaining referenceId indexes:', remaining.map((r) => r.indexname));
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
