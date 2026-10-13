const fs = require('fs');
const p = '.\\backend\\services\\orderService.js';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
const rep = (a, b, label) => {
  if (!s.includes(a)) { console.log('MISS:' + label); return; }
  s = s.split(a).join(b); n++;
};
rep("  const paymentMode = isCodOrder(order) ? 'COD' : 'Prepaid';",
    "  const paymentMode = isCodOrder(order) ? 'COD' : 'prepaid';",
    'paymode');
rep("? 'air' : 'regular'",
    "? 'Air' : 'Regular'",
    'ordersvc');
fs.writeFileSync(p, s);
console.log('reps:' + n);
