const { Client } = require('pg');
(async () => {
  const c = new Client({ host: 'localhost', port: 5432, database: 'logixmitradb', user: 'postgres', password: 'root' });
  await c.connect();
  const r = await c.query(`select "orderNumber", platform, "orderDate", "processedAt", "createdAt" from orders where platform = 'Shopify' order by "createdAt" desc limit 8`);
  console.log('SHOPIFY:'); console.log(JSON.stringify(r.rows, null, 2));
  const r2 = await c.query(`select column_name, data_type from information_schema.columns where table_name = 'orders' and column_name in ('orderDate','processedAt','createdAt','orderDateTime')`);
  console.log('TYPES:'); console.log(JSON.stringify(r2.rows, null, 2));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
