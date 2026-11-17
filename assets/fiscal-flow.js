'use strict';

const flowViews={purpose:'Para qué',who:'Quién',economic:'Qué se paga',type:'Corriente y capital'};
const flowHead={purpose:'Para qué se usa',who:'Qué áreas lo administran',economic:'Qué se paga',type:'Cómo se compone'};
const flowHistory={esocial:'social',eadministration:'administration',esecurity:'security',eeconomic:'economic',edebt:'debt',estaff:'staff',ebenefits:'benefits',egoods:'goods',ecapital:'capital',ecurrent:'current',etransfers:'transfers'};
let flowState, flowObserver;
const stackedFlow=matchMedia('(max-width: 680px)');
const flowHistoryRoute=id=>Object.hasOwn(flowHistory,id)?route('evolucion',{serie:flowHistory[id]}):'';

function flowData(view){
  const row=(r,prefix)=>({...r,id:prefix+r.id,label:r.label,amount:r.millions*million});
  const from=p.incomeGroups.map((r,i)=>row({...r,id:i,label:r.name},'r'));
  let to;
  if(view==='who')to=Object.entries(groups).map(([id,label])=>{
    const children=areas.filter(a=>a.group===id).sort((a,b)=>b.amount-a.amount);
    return {id:'a'+id,label,amount:children.reduce((s,a)=>s+a.amount,0),areas:children,detail:'Abrí el detalle para recorrer las áreas que integran este grupo.'};
  });
  else if(view==='type')to=[
    row({id:'current',label:'Gasto corriente',millions:p.currentMillions,detail:'Incluye el funcionamiento, las prestaciones previsionales, las transferencias y los intereses.'},'e'),
    row(composition.economic.find(x=>x.id==='capital'),'e')
  ];
  else if(view==='economic')to=composition.economic.map(r=>row(r,'e')).sort((a,b)=>b.amount-a.amount);
  else {
    to=composition.purpose.map(r=>row(r,'e'));
    to.push({id:'eunassigned',label:'Diferencia sin asignar',amount:p.spending-to.reduce((s,r)=>s+r.amount,0),detail:'Diferencia entre el total del proyecto y la suma de las finalidades legibles del Mensaje. No se imputó a ninguna finalidad.'});
  }
  return {from,to};
}

function flowValue(amount, base, unit){
  if(unit!=='hundred')return money(amount);
  const n=100*amount/base;
  return n>0&&n<.01?'Menos de $ 0,01':'$ '+digits(n,2);
}
function flowRow(row,side,state){
  const base=side==='from'?p.income:p.spending,active=state[side]===row.id;
  const value=flowValue(row.amount,base,state.unit);
  return '<button type="button" class="flow-node" data-flow-node="'+row.id+'" data-flow-side="'+side+'" data-ribbon="'+row.id+'" data-amount="'+row.amount+'" aria-expanded="'+active+'" aria-controls="flow-'+side+'-detail">'+
    '<span class="flow-node-copy"><span>'+esc(row.label)+'</span><strong>'+value+'</strong></span><span class="flow-symbol" aria-hidden="true">'+(active?'−':'+')+'</span>'+
    '<span class="flow-weight" aria-hidden="true" style="--weight:'+Math.min(100,100*row.amount/base).toFixed(4)+'%"></span></button>';
}
function flowDetails(row,side,state){
  const id='flow-'+side+'-detail';
  if(!row)return '<div id="'+id+'" class="flow-detail"><p class="small no-bottom">'+(side==='from'?'Elegí un ingreso para saber qué incluye.':'Elegí un destino para ver el detalle disponible.')+'</p></div>';
  const base=side==='from'?p.income:p.spending;
  const family=row.areas?'areas':'project';
  const context=(side==='from'?'Ingresos':'Gastos')+' · '+(side==='from'?'Cuadro 6':family==='areas'?'art. 5°':state.view==='purpose'?'Cuadro 8':'Cuadro 7');
  const lines=(row.children||[]).map(([label,m])=>'<li><span>'+esc(label)+'</span><strong>'+flowValue(m*million,base,state.unit)+'</strong></li>').join('');
  const listing=row.areas?'<ol class="flow-detail-list flow-areas">'+row.areas.map(a=>'<li><a href="'+budgetRoute('gastos',{area:a.id})+'">'+esc(pretty(a.name))+'</a><strong>'+flowValue(a.amount,base,state.unit)+'</strong></li>').join('')+'</ol>':'';
  const historyLink=flowHistoryRoute(row.id);
  return '<div id="'+id+'" class="flow-detail"><p class="eyebrow">'+context+'</p><h3>'+esc(row.label)+'</h3><p><strong>'+exact(row.amount)+'</strong> · '+share(row.amount,base)+' '+(side==='from'?'de los ingresos':'del gasto')+'.</p>'+
    (row.detail?'<p class="small">'+esc(row.detail)+'</p>':'')+(lines?'<ul class="flow-detail-list">'+lines+'</ul>':'')+listing+
    '<p class="small no-bottom">'+source(family,'Ver fuente')+(historyLink?' · <a href="'+historyLink+'">Ver ejecución histórica →</a>':'')+'</p></div>';
}
function flowTable(from,to,state){
  return '<details class="flow-fold" data-flow-fold="tabla"><summary>Ver el flujo como tabla</summary><div class="grid-two">'+[[from,'Ingresos previstos',p.income],[to,'Gasto propuesto',p.spending]].map(([rows,label,base])=>
    '<table><caption>'+label+'</caption><thead><tr><th scope="col">Rubro</th><th scope="col" class="num">'+(state.unit==='hundred'?'Cada $100':'Importe')+'</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><th scope="row">'+esc(r.label)+'</th><td class="num">'+flowValue(r.amount,base,state.unit)+'</td></tr>').join('')+'</tbody></table>').join('')+'</div></details>';
}
function flowMarkup(state){
  const {from,to}=flowData(state.view), selectedFrom=from.find(x=>x.id===state.from),selectedTo=to.find(x=>x.id===state.to);
  const toolbar=(list,action,selected,aria)=>'<div class="flow-toggles" role="group" aria-label="'+aria+'">'+Object.entries(list).map(([k,v])=>'<button type="button" data-flow-'+action+'="'+k+'" aria-pressed="'+(selected===k)+'">'+v+'</button>').join('')+'</div>';
  return '<section id="flujo-fiscal" class="section panel fiscal-flow" aria-labelledby="flow-title"><div class="flow-head"><div><p class="eyebrow">PROYECTO 2027 · PROVINCIA DE BUENOS AIRES</p><h2 id="flow-title">De dónde viene y a dónde va el dinero</h2><p class="muted">Seguí los recursos y abrí una rama para explorar el gasto propuesto.</p></div>'+
    '<button class="button flow-copy" type="button" data-flow-copy>Copiar enlace</button></div>'+
    '<div class="flow-toolbar">'+toolbar(flowViews,'view',state.view,'Cómo mirar el gasto')+toolbar({amount:'Importes',hundred:'Cada $100'},'unit',state.unit,'Unidad de lectura')+'</div>'+
    '<p class="small flow-guidance">'+(state.unit==='hundred'?'Izquierda: de cada $100 de ingresos. Derecha: de cada $100 de gasto.':'El grosor indica el monto. Cada lado llega a la caja común: el gráfico no asigna un impuesto a un servicio concreto.')+'</p>'+
    '<div class="flow-body"><svg class="flow-ribbons" aria-hidden="true" focusable="false"></svg><div class="flow-column flow-in"><h3>De dónde viene</h3>'+from.map(r=>flowRow(r,'from',state)).join('')+'</div>'+
    '<div class="flow-middle"><div class="flow-pool"><p class="eyebrow">CUENTA PROVINCIAL</p><div class="pool-amount"><strong>'+money(p.income)+'</strong><span>Ingresos previstos</span></div><div class="pool-amount"><strong>'+money(p.spending)+'</strong><span>Gasto propuesto</span></div><p class="flow-deficit"><strong>'+money(balance)+'</strong><span>Déficit financiero proyectado</span></p></div></div>'+
    '<div class="flow-column flow-out"><h3>'+flowHead[state.view]+'</h3>'+to.map(r=>flowRow(r,'to',state)).join('')+'</div></div>'+
    '<div class="flow-details" aria-live="polite">'+flowDetails(selectedFrom,'from',state)+flowDetails(selectedTo,'to',state)+'</div>'+
    '<p class="small flow-status" role="status"></p>'+
    '<details class="flow-fold" data-flow-fold="lectura"><summary>Cómo leer el flujo</summary><p>La diferencia entre los ingresos y los gastos es el resultado financiero. Las ramas se expresan en pesos del proyecto, antes de fuentes o aplicaciones financieras. El denominador de «Cada $100» es distinto en cada lado. Los cuadros del Mensaje están redondeados en millones; donde las finalidades no cierran, mostramos la diferencia sin repartirla.</p><p>'+source('project','Mensaje 4527 · cuadros 5 a 8')+' · <a href="#fuentes">Fuentes y metodología</a></p></details>'+flowTable(from,to,state)+'</section>';
}
function drawFlowRibbons(){
  const container=document.querySelector('.flow-body');
  if(!container||!flowState)return;
  const svg=container.querySelector('.flow-ribbons'), outer=container.getBoundingClientRect(), pool=container.querySelector('.flow-pool').getBoundingClientRect();
  if(outer.width===0||getComputedStyle(svg).display==='none'){svg.innerHTML='';return;}
  svg.setAttribute('viewBox','0 0 '+outer.width+' '+outer.height);
  const toPath=(bx,px,sy,ey,h)=>{const bx1=bx+(px-bx)*.52,px1=bx+(px-bx)*.58;
    return 'M'+bx+','+(sy-h/2)+' C'+bx1+','+(sy-h/2)+' '+px1+','+(ey-h/2)+' '+px+','+(ey-h/2)+' L'+px+','+(ey+h/2)+' C'+px1+','+(ey+h/2)+' '+bx1+','+(sy+h/2)+' '+bx+','+(sy+h/2)+' Z';
  };
  const group=(side)=>{
    const incoming=side==='from', denominator=flowState.unit==='hundred'?(incoming?p.income:p.spending):Math.max(p.spending,p.income);
    const px=(incoming?pool.left:pool.right)-outer.left, room=105;
    let edge=(pool.top-outer.top)+pool.height/2-room/2;
    return [...container.querySelectorAll('[data-flow-side="'+side+'"]')].map(btn=>{
      const bounds=btn.getBoundingClientRect(),bx=(incoming?bounds.right:bounds.left)-outer.left,sy=bounds.top-outer.top+bounds.height/2;
      const height=room*Number(btn.dataset.amount)/denominator, ey=edge+height/2;
      edge+=height;
      return '<path class="ribbon-'+side+'" d="'+toPath(bx,px,sy,ey,height)+'"/>';
    }).join('');
  };
  svg.innerHTML=group('from')+group('to');
}
function mountFlow(){
  flowObserver?.disconnect();
  const section=document.querySelector('.flow-body');
  if(!section)return;
  const details=document.querySelector('.flow-details');
  for(const side of ['from','to']){
    const detail=document.getElementById('flow-'+side+'-detail');
    const node=section.querySelector('[data-flow-side="'+side+'"][aria-expanded=true]');
    if(stackedFlow.matches&&node)node.after(detail);
    else details.append(detail);
  }
  flowObserver=new ResizeObserver(drawFlowRibbons);
  flowObserver.observe(section);
  drawFlowRibbons();
}
stackedFlow.addEventListener('change',mountFlow);
function homeFlow(q){
  const view=Object.hasOwn(flowViews,q?.get('flujo'))?q.get('flujo'):'purpose';
  flowState={view,unit:q?.get('lectura')==='100'?'hundred':'amount',from:q?.get('origen')||'',to:q?.get('destino')||''};
  const {from,to}=flowData(view);
  if(!from.some(x=>x.id===flowState.from))flowState.from='';
  if(!to.some(x=>x.id===flowState.to))flowState.to='';
  return flowMarkup(flowState);
}
function flowQuery(){
  const f=flowState;
  return {ir:'flujo',flujo:f.view,lectura:f.unit==='hundred'?'100':'pesos',...(f.from?{origen:f.from}:{}),...(f.to?{destino:f.to}:{})};
}
function flowClick(e){
  const b=e.target.closest('button');
  if(!b||!b.closest('.fiscal-flow'))return;
  let attr, value;
  if(b.hasAttribute('data-flow-copy')){
    const url=new URL(location.href);
    url.hash=route('inicio',flowQuery());
    const status=document.querySelector('.flow-status');
    const fallback=()=>{
      const link=document.createElement('a');
      link.href=url.href;
      link.textContent='Enlace a esta vista';
      status.replaceChildren('Podés copiar este enlace: ',link);
    };
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url.href).then(()=>status.textContent='Enlace copiado.').catch(fallback);
    else fallback();
    return;
  }
  if(b.dataset.flowView){attr='view';value=b.dataset.flowView;flowState.view=value;flowState.to='';}
  if(b.dataset.flowUnit){attr='unit';value=b.dataset.flowUnit;flowState.unit=value;}
  if(b.dataset.flowNode){attr='node';value=b.dataset.flowNode;const side=b.dataset.flowSide;flowState[side]=flowState[side]===value?'':value;}
  if(!attr)return;
  const previousTop=b.getBoundingClientRect().top;
  const activeFolds=[...document.querySelectorAll('.flow-fold[open]')].map(d=>d.dataset.flowFold);
  document.querySelector('.fiscal-flow').outerHTML=flowMarkup(flowState);
  for(const f of activeFolds)document.querySelector('[data-flow-fold="'+f+'"]').open=true;
  choose('inicio',flowQuery());
  mountFlow();
  const target=document.querySelector('[data-flow-'+attr+'="'+value+'"]');
  target.focus({preventScroll:true});
  window.scrollBy({top:target.getBoundingClientRect().top-previousTop,behavior:'instant'});
}
