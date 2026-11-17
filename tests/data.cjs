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
