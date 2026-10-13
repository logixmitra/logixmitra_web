const fs=require('fs');
for(const f of ['services/orderService.js','routes/orderService.js']){
const s=fs.readFileSync(f,'utf8');
const i=s.indexOf('charge += baseRate;');
const j=s.indexOf('charge=charge*1.18');
console.log(f,'start',i,'end',j);
if(i>0&&j>i) console.log(JSON.stringify(s.slice(i-2,j+30)));
}
