/**
 * Add missing B2B / Weight & Dimensions columns on orders.
 * Safe to re-run (IF NOT EXISTS).
 */
const sequelize = require('../config/database');

const statements = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "orderType" VARCHAR(255) NOT NULL DEFAULT 'B2C'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS packages JSONB NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "billingParty" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "b2bCharge" DOUBLE PRECISION NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "b2bRateCardId" INTEGER NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "manualBooking" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "consigneeGstin" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "ewayBill" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "appointmentAt" TIMESTAMP WITH TIME ZONE NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "epodUrl" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "rovType" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "freightMode" VARCHAR(255) NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "rtoCharge" DOUBLE PRECISION NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "rtoCharged" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "discountCodes" JSONB NULL`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "codCharge" DOUBLE PRECISION NULL`,
];

(async () => {
  await sequelize.authenticate();
  for (const sql of statements) {
    process.stdout.write(`Running: ${sql.slice(0, 70)}... `);
    await sequelize.query(sql);
    console.log('OK');
  }

  const [cols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'orders'
       AND column_name IN (
         'packages','orderType','billingParty','b2bCharge','b2bRateCardId',
         'manualBooking','consigneeGstin','ewayBill','appointmentAt','epodUrl',
         'rovType','freightMode','rtoCharge','rtoCharged','discountCodes','codCharge'
       )
     ORDER BY column_name`
  );
  console.log('\nVerified columns:');
  console.log(cols.map((c) => c.column_name).join('\n'));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
