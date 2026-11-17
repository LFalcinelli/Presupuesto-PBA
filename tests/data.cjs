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
  assert.equal(p.spending-purpose.reduce((a,r)=>a+r.millions*1e6,0),39589891);
  assert(Math.abs(p.spending-economic.reduce((a,r)=>a+r.millions*1e6,0))<2e6);
  assert.equal((100*(p.spending/(1+inflation2027)/p.prior.spending-1)).toFixed(1),'12.3');
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
