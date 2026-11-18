'use strict';
const t=require('node:test'), assert=require('node:assert/strict');
const dataset=n=>require('../data/'+n+'.json');
t('La apertura por organismo reconcilia con el art. 4° del proyecto',()=>{
  const rows=dataset('areas'),p=dataset('project');
  assert.equal(rows.length,48);
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  assert.equal(rows.reduce((x,r)=>x+r.amount,0),p.spending);
  assert.equal(p.income-p.spending,-2152699127000);
  assert(Math.abs(p.income-p.spending-(p.primaryMillions-p.interestMillions)*1e6)<1e6);
  assert(Math.abs(p.income-p.incomeGroups.reduce((x,r)=>x+r.millions*1e6,0))<1e6);
  const taxes=p.incomeGroups[0];
  assert.equal(taxes.children.reduce((x,r)=>x+r[1],0),taxes.millions);
});
t('Las transferencias están conciliadas con los consolidados oficiales',()=>{
  const {districts}=dataset('municipios');
  assert.equal(districts.length,135);
  assert.equal(new Set(districts.map(r=>r.id)).size,135);
  for(const [period,total] of [['current',4388820396897.65],['previous',4639756001222.50]]){
    assert(Math.abs(districts.reduce((x,r)=>x+r[period][0],0)-total)<70);
    for(const d of districts)assert(d[period][0]>=d[period][1]+d[period][2]);
  }
  const works=dataset('works'),names=new Set(districts.map(d=>d.name));
  assert.equal(new Set(works.map(w=>w.code)).size,works.length);
  for(const w of works)assert(w.towns.every(n=>names.has(n)));
});
t('Los cortes de ejecución cierran y el IPC tiene nueve promedios anuales',()=>{
  const rows=dataset('history'),h1=dataset('advance');
  assert.equal(rows.length,21);
  assert.equal(rows.filter(r=>r.ipc).length,9);
  for(const [i,r] of rows.entries())assert.equal(r.year,2005+i);
  for(const r of [...rows,h1])assert(Math.abs(r.balance-(r.income-r.spending))<=1);
  assert.equal(h1.balance,-917484236979);
});
t('El flujo y la comparación real mantienen las bases de sus documentos',()=>{
  const {purpose,economic,inflation2027}=dataset('composition');
  const prior=dataset('prior-areas'), p=dataset('project');
  assert.deepEqual(Object.keys(prior).sort(),dataset('areas').map(r=>r.id).sort());
  assert.equal(Object.values(prior).reduce((a,b)=>a+b,0),p.prior.spending);
  assert.equal(inflation2027,.214);
  assert.equal(Math.round(p.spending/1e6),purpose.reduce((a,r)=>a+r.millions,0));
  assert.equal(p.spending,economic.reduce((a,r)=>a+Math.round(r.millions*1e6),0));
  for(const r of economic.filter(x=>x.children)){
    assert.equal(Math.round(r.millions*1e6),r.children.reduce((total,[,m])=>total+Math.round(m*1e6),0));
  }
  assert.equal((100*(p.spending/(1+inflation2027)/p.prior.spending-1)).toFixed(1),'12.3');
});
t('Las referencias nuevas mantienen sus coberturas y valores de origen',()=>{
  const {closing2026,ipc2026,ronAnnual,ronRecent,ioma}=dataset('additional-fiscal');
  const p=dataset('project');
  assert.equal(closing2026.spendingMillions,46521737);
  assert.equal(closing2026.incomeMillions-closing2026.spendingMillions,closing2026.balanceMillions);
  assert.equal(ipc2026.length,10);
  assert.equal(ipc2026.at(-1),12783.6887);
  assert.equal(p.staffing.permanent+p.staffing.temporary,531425);
  assert.equal(p.multiYear[0].balanceMillions,Math.round((p.income-p.spending)/1e6));
  assert.equal(ronRecent[2026].totalMillions,14915314);
  assert(ronRecent[2026].totalMillions>ronRecent[2026].cfiMillions);
  assert.equal(Object.keys(ronAnnual).length,23);
  assert.equal(Object.values(ioma[2024]).reduce((total,v)=>total+v,0),1381571123292);
});
t('Las nuevas series conservan unidades, cortes y cobertura',()=>{
  const f=dataset('fiscal-series');
  const districts=dataset('municipios').districts.map(d=>d.id).sort();
  for(const series of [f.coparticipation,f.schools])assert.deepEqual(Object.keys(series).sort(),districts);
  assert.equal(f.coparticipation['06007'][2021],undefined);
  assert.equal(f.schoolMonths,7);
  assert(Object.values(f.schools).every(d=>d[2025]>0&&d[2026]>0));
  assert.equal(f.taxes.recent.months,9);
  assert.equal(f.taxes.recent[2026][0],12936287860835);
  assert.equal(f.taxes.annual[2025][0],13947322809570);
  assert.equal(Object.keys(f.taxes.annual).length,27);
  for(const [total,...parts] of [...Object.values(f.taxes.annual),f.taxes.recent[2025],f.taxes.recent[2026]]){
    assert.equal(parts.reduce((a,b)=>a+b,0),total);
  }
  assert.equal(f.pbg[2024],197133921439300);
  assert.equal(f.pbg[2025],undefined);
  for(const r of dataset('history')){
    const {purpose,economic}=f.execution[r.year];
    const sum=purpose.administration+purpose.security+purpose.social+purpose.economic+purpose.debt;
    assert(Math.abs(purpose.total-sum)<1.1e6);
    if(r.year===2024)assert.equal(purpose.total,25634518010610);
    else assert(Math.abs(purpose.total-r.spending)<1.1e6);
    assert(economic.staff>economic.goods);
  }
});

t('Las planillas 2026 cierran y coinciden con el votado',()=>{
  const b=dataset('budget-2026'),p=dataset('project');
  const total=b.rows.find(r=>r.code==='total');
  assert.equal(total.total,p.prior.spending);
  const keys=Object.keys(b.objects);
  for(const r of b.rows)assert(Math.abs(keys.reduce((s,k)=>s+r[k],0)-r.total)<=2,r.code);
  const finalidades=b.rows.filter(r=>/^\d\.0\.0$/.test(r.code));
  assert.equal(finalidades.length,5);
  assert(Math.abs(finalidades.reduce((s,r)=>s+r.total,0)-total.total)<=5);
  const w=dataset('works-2026'),ids=new Set(dataset('municipios').districts.map(d=>d.id));
  assert(w.works.length>900);
  for(const o of w.works){assert(ids.has(o.district));assert(o.name.length>3);assert(o.a2026>=0&&o.a2027>=0);}
  assert.deepEqual([...new Set(w.works.map(o=>o.district))].sort(),[...w.districts].sort());
});
t('Las series nuevas conservan cobertura y unidades',()=>{
  const d=dataset('deflator').index,h=dataset('history');
  for(let y=2005;y<=2025;y++)assert(d[y]>0,String(y));
  for(const r of h.filter(r=>r.ipc))assert.equal(d[r.year],r.ipc);
  const e=dataset('employment');
  assert.equal(e.years.length,39);
  for(const k of ['staff','per1000','salary'])assert.equal(e[k].length,39);
  assert.equal(Object.keys(e.per1000Provinces2025).length,24);
  assert.equal(e.per1000.at(-1),e.per1000Provinces2025['BUENOS AIRES']);
  const top=dataset('tax-history').taxes;
  assert.equal(Object.keys(top['ingresos brutos']).length,42);
  const m=dataset('municipal-plus');
  assert.equal(Object.keys(m.districts).length,135);
  assert(m.priceRatio>1&&m.priceRatio<2);
  for(const x of Object.values(m.districts)){
    assert(x.pop2022>0);
    for(const k of ['jan_aug_2025','jan_aug_2026'])assert(x[k][0]>=x[k][1]+x[k][2]);
  }
  assert.equal(m.provincePopulation[2022],17523996);
  const s=dataset('sources');
  for(const k of ['budget2026','works2026','top','employment','muniMonthly','population','deflatorSplice'])assert(s[k]?.[1]?.startsWith('https://'),k);
});

t('La ejecución provincial del semestre cierra en sus identidades',()=>{
  const e=dataset('execution-2026'),v=id=>e.rows.find(r=>r.id===id);
  for(const k of ['h1_2025','h1_2026']){
    const near=(a,b)=>assert(Math.abs(a-b)<=2,k+': '+a+' vs '+b);
    near(v('income')[k],v('currentIncome')[k]+v('capitalIncome')[k]);
    near(v('spending')[k],v('current')[k]+v('capital')[k]);
    near(v('financialResult')[k],v('income')[k]-v('spending')[k]);
    near(v('primaryResult')[k],v('financialResult')[k]+v('interest')[k]);
    near(v('ownTax')[k],['grossTax','propertyTax','stampTax','vehicleTax','otherTax'].reduce((s,id)=>s+v(id)[k],0));
    near(v('capital')[k],v('investment')[k]+v('capitalTransfers')[k]+v('financialInvestment')[k]);
  }
  assert(e.priceRatio>1.2&&e.priceRatio<1.5);
  assert.equal(dataset('sources').execution2026[1].slice(0,8),'https://');
});