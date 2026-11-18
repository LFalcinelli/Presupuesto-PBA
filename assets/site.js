'use strict';

const { project:p, areas, municipios:geo, works, history, sources, composition } = PBA_DATA;
const fiscal = PBA_DATA['fiscal-series'], priorAreas = PBA_DATA['prior-areas'];
const extraFiscal = PBA_DATA['additional-fiscal'];
const b26 = PBA_DATA['budget-2026'], works26 = PBA_DATA['works-2026'], mplus = PBA_DATA['municipal-plus'];
const deflator = PBA_DATA.deflator.index, employment = PBA_DATA.employment, taxHistory = PBA_DATA['tax-history'];
const main = document.querySelector('main');
const dialog = document.querySelector('#detail');
const content = document.querySelector('#detail-content');
const sections = {inicio:'Inicio',presupuesto:'Presupuesto 2027',municipio:'Mi municipio',evolucion:'Historia',fuentes:'Fuentes'};
const sectionAlias = {provincia:'presupuesto'};
const views = {resumen:'Resumen',gasto:'En qué se gasta',cambios:'Qué cambia',recursos:'De dónde sale',v2026:'Presupuesto 2026',anexos:'Planillas'};
const viewAlias = {gastos:'gasto',ingresos:'recursos',avance:'v2026',2026:'v2026'};
const groups = {central:'Administración Central',organismos:'Organismos descentralizados',prevision:'Instituciones de previsión social'};
const digits = (x,d=0) => formatNumber(x,d);
const exact = x => formatMoney(x);
const money = x => formatMoney(x,{style:'short'});
const million = 1e6;
const balance = p.income-p.spending;
const inflation = composition.inflation2027;
const inflationLabel = digits(inflation*100,1)+'%';
const in2026Pesos = amount => amount/(1+inflation);
const realChange = (amount,base) => 100*(in2026Pesos(amount)/base-1);
const signedPct = n => formatPercent(n,{signed:true});
const signedMoney = n => (n>0?'+':'')+money(n);
const monthName = number => new Intl.DateTimeFormat('es-AR',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,number-1,1)));
const narrow = () => matchMedia('(max-width: 560px)').matches;
const ipc2026 = extraFiscal.ipc2026;
const lastIpc = ipc2026.at(-1);
const monthlyFactor = lastIpc/ipc2026.at(-2);
const price2026 = (ipc2026.reduce((sum,level)=>sum+level,0)+lastIpc*monthlyFactor+lastIpc*monthlyFactor**2)/12;
const priceLevel = year => year===2026?price2026:year===2027?price2026*(1+inflation):deflator[year];
const toReal = (amount,year) => amount*deflator[2025]/priceLevel(year);
const budgetRefs = [
  {year:2026, spending:extraFiscal.closing2026.spendingMillions*million, income:extraFiscal.closing2026.incomeMillions*million, stage:'Proyección de cierre', page:82},
  {year:2027, spending:p.spending, income:p.income, stage:'Proyecto de ley', page:96}
];
const population = year => { const pop=mplus.provincePopulation; return year===2022?(pop[2021]+pop[2023])/2:pop[year]; };
const pop2025 = population(2025);
const esc = x => String(x).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal = x => String(x).normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\w ]/g,' ').toLowerCase().trim();
const share = (x,base) => formatShare(100*x/base);
const source = (key,text,anchor='') => '<a href="'+esc(sources[key][1]+anchor)+'" target="_blank" rel="noopener">'+esc(text||sources[key][0])+' ↗</a>';
const route = (section, params={}) => '#'+section+(Object.keys(params).length?'?'+new URLSearchParams(params):'');
const budgetRoute = (view,extra={}) => route('presupuesto',{vista:viewAlias[view]||view,...extra});
const sectionLink = (url,text,kind='') => '<a class="button '+kind+'" href="'+esc(url)+'">'+esc(text)+'</a>';
const intro = (over,title,text) => '<div class="section-head"><p class="eyebrow">'+over+'</p><h1>'+title+'</h1><p class="lead">'+text+'</p></div>';
const brief = (over,title,text) => '<div class="section-head"><p class="eyebrow">'+over+'</p><h2>'+title+'</h2><p class="muted">'+text+'</p></div>';
const card = (label,value,note,cls='') => '<article class="panel metric-card"><strong>'+label+'</strong><span class="metric '+cls+'">'+value+'</span><p class="small">'+note+'</p></article>';
const toggles = (name,options,current,aria) => '<div class="flow-toggles" role="group" aria-label="'+esc(aria)+'">'+Object.entries(options).map(([k,v])=>'<button type="button" data-'+name+'="'+k+'" aria-pressed="'+(k===current)+'">'+esc(v)+'</button>').join('')+'</div>';
const bars = rows => '<div class="chart-list">'+rows.map(([name,value,base,tone,url])=>{
  const pct = Math.max(0,Math.min(100,Math.abs(value/base)*100));
  const label=url?'<a href="'+esc(url)+'">'+esc(name)+' →</a>':esc(name);
  return '<div><div class="bar-meta"><strong>'+label+'</strong><strong>'+money(value)+'</strong></div><div class="track" aria-hidden="true"><div class="fill '+(tone||'')+'" style="width:'+pct.toFixed(4)+'%"></div></div></div>';
}).join('')+'</div>';

function readRoute(){
  const [raw,q] = location.hash.slice(1).split('?');
  const id = sectionAlias[raw]||raw;
  return {id:Object.hasOwn(sections,id)?id:'inicio',q:new URLSearchParams(q)};
}
function choose(section, params){
  const hash=route(section,params);
  if(location.hash!==hash)window.history.replaceState(null,'',hash);
}
const keepUpper=/^(ii|iii|iv|vi|vii|viii|ix|xi|xii|birf|bid|caf|ivc|opisu|ioma|arba|comirec|comilu|acumar|aysa|absa|uba|unlp|cpa|caps|cdi|upa|sae|r\.?p\.?|r\.?n\.?|n[°º])$/;
function pretty(label){
  let after=true;
  return label.replace(/\s+/g,' ').trim().toLocaleLowerCase('es-AR').split(' ').map(s=>{
    const core=s.replace(/^[("¿]+|[).,:;"]+$/g,'');
    let out;
    if(keepUpper.test(core))out=s.toLocaleUpperCase('es-AR');
    else if(!after&&/^(de|del|la|las|los|el|y|a|en|e|o|u|con|por|para|al)$/.test(s))out=s;
    else out=s.replace(/^([("¿]*)(.)/,(_,a,c)=>a+c.toLocaleUpperCase('es-AR'));
    after=/[.:\-–(]$/.test(s)||s==='-';
    return out;
  }).join(' ').replace(/\(([A-Za-z.]+)\)/g,(_,w)=>'('+w.toUpperCase()+')');
}
function mapSvg(hero=false){
  const attrs=hero?' aria-hidden="true"':' role="group" aria-label="Mapa de partidos. Para elegir con el teclado, usá el selector de municipio."';
  return '<svg class="'+(hero?'hero-map':'map')+'" viewBox="'+geo.viewBox+'"'+attrs+' xmlns="http://www.w3.org/2000/svg">'+geo.districts.map(d=>'<path d="'+d.path+'" '+(hero?'':'class="district" data-district="'+d.id+'" fill-rule="evenodd"')+'>'+(hero?'':'<title>'+esc(d.name)+'</title>')+'</path>').join('')+'</svg>';
}

// ---------- Inicio ----------
function home(q){
  const nationalShare=100*p.incomeGroups.find(g=>/origen nacional/.test(g.name)).millions*million/p.income;
  const staff=composition.economic.find(r=>r.id==='staff');
  const keys=[
    ['Déficit antes de intereses',money(p.primaryMillions*million),'El proyecto prevé gastar más de lo que ingresa incluso antes de pagar la deuda. Con intereses, el rojo llega a '+money(balance)+'.',budgetRoute('resumen')],
    ['De cada $100 de ingresos','$ '+digits(nationalShare,0)+' llegan de Nación','Impuestos nacionales que se distribuyen a la Provincia. Los impuestos propios aportan $ '+digits(100*p.incomeGroups[0].millions*million/p.income,0)+'.',budgetRoute('recursos')],
    ['Sueldos',share(staff.millions*million,p.spending)+' del gasto','Personal es el mayor rubro: '+money(staff.millions*million)+'. El presupuesto prevé '+digits(p.staffing.permanent+p.staffing.temporary)+' cargos.',budgetRoute('gasto',{composicion:'economic'})],
    ['Frente al votado 2026',signedPct(realChange(p.spending,p.prior.spending))+' real','Con una inflación promedio supuesta de '+inflationLabel+'. Mirá qué áreas suben y cuáles bajan.',budgetRoute('cambios')]
  ];
  return '<section class="hero"><div><span class="tag">Proyecto 2027 · enviado a la Legislatura</span><h1>Gasto Público PBA</h1><p>Seguí el presupuesto de la Provincia de Buenos Aires: de dónde salen los recursos, cómo se reparten y qué llega a tu municipio.</p><div class="actions">'+sectionLink(budgetRoute('resumen'),'Ver el Proyecto 2027','primary')+sectionLink('#municipio','Buscar mi municipio','secondary')+'</div></div>'+mapSvg(true)+'</section>'+
    '<div class="metrics four">'+card('Gasto propuesto',money(p.spending),'Corriente y de capital · 2027')+card('Ingresos previstos',money(p.income),'Impuestos y otros recursos · 2027')+card('Déficit proyectado',money(balance),share(-balance,p.income)+' de los ingresos','red')+card('Por bonaerense','$ '+digits(p.spending/pop2025/1e6,2)+' millones','Gasto 2027 por habitante, al año')+'</div>'+
    homeFlow(q)+
    '<section class="section">'+brief('Cuatro claves','Lo que hay que saber del proyecto','Cada dato lleva a su detalle.')+
    '<div class="keys">'+keys.map(([t,v,txt,url])=>'<a class="panel key-card" href="'+esc(url)+'"><span class="eyebrow">'+t+'</span><strong class="metric">'+v+'</strong><p>'+txt+'</p><span class="action">Ver detalle →</span></a>').join('')+'</div></section>'+
    '<section class="section">'+brief('Explorá los datos','Tres formas de mirar el presupuesto','Elegí una pregunta para empezar.')+
    '<div class="paths">'+[
      [budgetRoute('gasto'),'01','¿En qué se gasta?','Rectángulos por finalidad, tipo de gasto y organismo, y qué sube o baja frente a 2026.','Ver el gasto'],
      ['#municipio','02','¿Qué llega a mi municipio?','Transferencias por habitante en los 135 partidos, su variación real y las obras previstas.','Abrir mapa'],
      ['#evolucion','03','¿Cómo cambiaron las cuentas?','Veinte años de ejecución en pesos de hoy, la recaudación desde 1984 y el empleo público.','Ver la historia']
    ].map(([url,no,title,text,go])=>'<a class="panel story-link" href="'+esc(url)+'"><span class="route-no">'+no+'</span><h3>'+title+'</h3><p>'+text+'</p><span class="action">'+go+' →</span></a>').join('')+
    '</div></section>';
}

// ---------- Presupuesto 2027 ----------
function summary(){
  const capitalIncome=p.incomeGroups.find(g=>/capital/i.test(g.name)).millions*million;
  const interest=p.interestMillions*million, currentNoInterest=p.currentMillions*million-interest;
  const currentIncome=p.income-capitalIncome;
  const steps=[
    {label:'Ahorro corriente antes de intereses',value:currentIncome-currentNoInterest,kind:'total'},
    {label:'Recursos de capital',value:capitalIncome,kind:'up'},
    {label:'Gasto de capital',value:-p.capitalMillions*million,kind:'down'},
    {label:'Resultado primario',value:p.primaryMillions*million,kind:'total'},
    {label:'Intereses de la deuda',value:-interest,kind:'down'},
    {label:'Resultado financiero',value:balance,kind:'total'}
  ];
  const balances=p.multiYear, cap=Math.max(...balances.map(r=>Math.abs(r.balanceMillions)))*million;
  return '<div class="metrics">'+card('Gasto propuesto',money(p.spending),'Gasto corriente y de capital')+card('Recursos previstos',money(p.income),'Ingresos corrientes y de capital')+card('Resultado financiero',money(balance),'Déficit de '+share(-balance,p.income)+' de los ingresos','red')+'</div>'+
    '<section class="section panel"><h2>Así se llega al déficit</h2><p class="muted">Los ingresos corrientes ('+money(currentIncome)+') superan al gasto corriente sin intereses ('+money(currentNoInterest)+'). Ese ahorro no alcanza para cubrir la inversión, y los intereses agrandan el rojo. Cada barra suma o resta a la anterior.</p>'+
    waterfall(steps,{format:money,label:'Cascada del Proyecto 2027: de los ingresos al resultado financiero',narrow:narrow()})+
    '<p class="small compact no-bottom">'+source('project','Cuadro 5 del Mensaje','#page=82')+' · '+source('project','Planilla 1','#page=132')+' · Los rubros del Mensaje están redondeados en millones.</p></section>'+
    '<section class="section grid-two"><article class="panel"><h3>Resultado previsto hasta 2029</h3><p class="small">Presupuesto plurianual, en pesos de cada año.</p>'+
    diverging(balances.map(r=>({id:r.year,label:String(r.year),value:r.balanceMillions*million})),{format:signedMoney,label:'Resultado financiero 2027 a 2029',max:cap})+
    '<p class="small compact no-bottom">'+source('project','Planilla 34','#page=207')+'</p></article>'+
    '<article class="panel"><h3>¿Qué se votó para 2026?</h3><p class="metric moneyline">'+money(p.prior.spending)+'</p><p class="muted">Gasto aprobado al inicio de 2026 (Ley 15.557). En pesos de 2026, el proyecto 2027 equivale a '+money(in2026Pesos(p.spending))+': '+signedPct(realChange(p.spending,p.prior.spending))+' real.</p>'+sectionLink(budgetRoute('cambios'),'Ver qué cambia por área')+'</article></section>';
}
const spendViews={purpose:'Para qué',economic:'Qué se paga',who:'Quién lo administra'};
function spendItems(view){
  if(view==='who')return areas.map(a=>({id:a.id,label:pretty(a.name),value:a.amount}));
  if(view==='economic')return composition.economic.flatMap(r=>r.children?r.children.map(([label,m],i)=>({id:r.id+i,label,value:m*million})):[{id:r.id,label:r.label,value:r.millions*million}]);
  return composition.purpose.map(r=>({id:r.id,label:r.label,value:r.millions*million}));
}
function spendView(q){
  const view=Object.hasOwn(spendViews,q.get('composicion'))?q.get('composicion'):'purpose';
  const note={purpose:'Las cinco finalidades del Cuadro 8. Servicios sociales reúne educación, salud y previsión.',economic:'Clasificación económica de la Planilla 1. Tocá un rectángulo para ver su detalle.',who:'Los 48 organismos del artículo 5°. Tocá un rectángulo para abrir su ficha.'}[view];
  return '<section class="section">'+brief('Proyecto 2027','¿En qué se gastaría?','Cada rectángulo es proporcional a su parte del gasto total de '+money(p.spending)+'.')+
    '<div class="panel" id="spend-composition">'+toggles('spend-view',spendViews,view,'Composición del gasto')+'<p class="small">'+note+'</p>'+
    treemap(spendItems(view),{total:p.spending,format:money,label:'Composición del gasto 2027: '+spendViews[view],height:narrow()?420:430,kind:view==='who'?'area':'tile'})+
    '<p class="small compact no-bottom">'+(view==='who'?source('project','Artículo 5°','#page=96'):view==='purpose'?source('project','Cuadro 8 · Finalidades','#page=88'):source('project','Planilla 1 · Clasificación económica','#page=132'))+'</p></div></section>'+
    '<section class="section">'+brief('Organismos y jurisdicciones','Buscá un área de gobierno','Abrí una ficha para ver cuánto se propone gastar, su peso en el presupuesto y cómo cambia frente a lo votado en 2026.')+
    '<div class="area-controls"><label class="field grow">Nombre del área <input type="search" id="area-query" placeholder="Por ejemplo: Educación, Salud o Vialidad" value="'+esc(q.get('q')||'')+'"></label><label class="field">Tipo de organismo<select id="area-group"><option value="">Todos</option>'+Object.entries(groups).map(([g,name])=>'<option value="'+g+'"'+(q.get('grupo')===g?' selected':'')+'>'+name+'</option>').join('')+'</select></label></div>'+
    '<p class="results" aria-live="polite" id="area-count"></p><div class="area-grid" id="area-list"></div></section>';
}
function updateAreas(){
  const input=document.querySelector('#area-query'), group=document.querySelector('#area-group');
  const query=normal(input.value), g=group.value;
  const rows=areas.filter(a=>(!g||g===a.group)&&query.split(/ +/).every(t=>normal(a.name).includes(t))).sort((a,b)=>b.amount-a.amount);
  document.querySelector('#area-count').textContent=rows.length+' de '+areas.length+' áreas';
  document.querySelector('#area-list').innerHTML=rows.length?rows.map(a=>{const base=priorAreas[a.id],chg=base?realChange(a.amount,base):null;return '<button type="button" class="area-card" data-area="'+a.id+'"><span>'+groups[a.group]+'</span><strong>'+esc(pretty(a.name))+'</strong><span class="metric">'+money(a.amount)+'</span><span class="minor">'+share(a.amount,p.spending)+' del total'+(chg===null?'':' · <b class="'+(chg<0?'red':'green')+'">'+signedPct(chg)+' real</b>')+' →</span></button>';}).join(''):'<p class="muted">No encontramos áreas con esos filtros.</p>';
}
const changeGroups={areas:'Organismos',purpose:'Finalidades'}, changeMetrics={pct:'Variación %',amount:'Diferencia en pesos'};
const purposeCodes={administration:'1.0.0',security:'2.0.0',social:'3.0.0',economic:'4.0.0',debt:'5.0.0'};
function changeRows(groupBy){
  if(groupBy==='purpose')return composition.purpose.map(r=>{const base=b26.rows.find(x=>x.code===purposeCodes[r.id]).total,now=r.millions*million;return {id:r.id,label:r.label,base,now,note:'2026: '+money(base)};});
  return areas.filter(a=>priorAreas[a.id]).map(a=>({id:a.id,label:pretty(a.name),base:priorAreas[a.id],now:a.amount,href:budgetRoute('gasto',{composicion:'who',area:a.id})}));
}
function changesView(q){
  const groupBy=Object.hasOwn(changeGroups,q.get('agrupar'))?q.get('agrupar'):'areas', metric=Object.hasOwn(changeMetrics,q.get('medida'))?q.get('medida'):'pct';
  const rows=changeRows(groupBy).map(r=>({...r,pct:100*(in2026Pesos(r.now)/r.base-1),amount:in2026Pesos(r.now)-r.base}));
  const sorted=rows.sort((a,b)=>b[metric]-a[metric]);
  const show=q.get('todos')==='1'||sorted.length<=16?sorted:[...sorted.slice(0,8),...sorted.slice(-8)];
  const staff26=b26.rows.find(r=>r.code==='total').staff, staff27=composition.economic.find(r=>r.id==='staff').millions*million;
  return '<section class="section">'+brief('2027 frente a 2026','¿Qué sube y qué baja?','El proyecto 2027 se pasa a pesos de 2026 con la inflación promedio supuesta de '+inflationLabel+' y se compara con lo votado para 2026.')+
    '<div class="metrics">'+card('Gasto total',signedPct(realChange(p.spending,p.prior.spending))+' real',money(in2026Pesos(p.spending))+' en pesos de 2026, frente a '+money(p.prior.spending)+' votados')+
    card('Sueldos',signedPct(100*(in2026Pesos(staff27)/staff26-1))+' real','Personal 2027 (Planilla 1) frente a gastos en personal 2026 (Planilla A)')+
    card('Intereses',signedPct(100*(in2026Pesos(p.interestMillions*million)/b26.rows.find(r=>r.code==='5.0.0').debtService-1))+' real','Intereses 2027 frente al servicio de la deuda votado en 2026','red')+'</div>'+
    '<div class="panel section-tight"><div class="flow-toolbar">'+toggles('change-group',changeGroups,groupBy,'Agrupar por')+toggles('change-metric',changeMetrics,metric,'Medida')+'</div>'+
    '<p class="small">'+(metric==='pct'?'Variación real: cuánto cambia cada rubro descontando la inflación.':'Diferencia en pesos de 2026: cuánto dinero más o menos recibe cada rubro.')+(show.length<sorted.length?' Se muestran las 8 mayores subas y las 8 mayores bajas.':'')+'</p>'+
    diverging(show.map(r=>({id:r.id,label:r.label,value:r[metric],note:metric==='pct'?money(r.now)+' en 2027':signedPct(r.pct)+' real',href:r.href})),{format:metric==='pct'?signedPct:signedMoney,label:'Variación real 2027 frente a 2026 por '+changeGroups[groupBy].toLowerCase()})+
    (show.length<sorted.length?'<p class="compact"><a class="button" href="'+esc(budgetRoute('cambios',{agrupar:groupBy,medida:metric,todos:'1'}))+'">Ver los '+sorted.length+' '+changeGroups[groupBy].toLowerCase()+'</a></p>':'')+
    '<p class="small compact no-bottom">Los organismos se emparejan por nombre y sus funciones pueden haber cambiado. Las finalidades 2026 provienen de la Planilla A del Presupuesto 2026. '+source('budget','Ley 15.557')+' · '+source('budget2026','Planillas consolidadas 2026')+' · <a href="#fuentes">Cómo se calcula</a></p></div></section>';
}
function revenueView(){
  const tax=fiscal.taxes.recent, [total,...parts]=tax[2026];
  const names=['Ingresos Brutos','Inmobiliario','Automotores','Sellos','Otros recursos tributarios'];
  const items=p.incomeGroups.flatMap((g,i)=>g.children?g.children.map(([label,m],j)=>({id:'r'+i+'-'+j,label,value:m*million})):[{id:'r'+i,label:g.name,value:g.millions*million}]);
  const ron=extraFiscal.ronRecent;
  return '<section class="section">'+brief('Proyecto 2027','¿De dónde saldrían los recursos?','Los impuestos provinciales aparecen abiertos por tributo. Los importes son estimaciones del proyecto.')+
    '<div class="panel">'+treemap(items,{total:p.income,format:money,label:'Composición de los recursos 2027',height:narrow()?380:400})+
    '<div class="grid-two compact">'+p.incomeGroups.map(r=>'<details class="income-details"><summary>'+esc(r.name)+' · '+money(r.millions*million)+'</summary><p class="small">'+esc(r.detail)+'</p></details>').join('')+'</div>'+
    '<p class="small compact no-bottom">'+source('project','Cuadro 6 del Mensaje','#page=83')+' · Los rubros se publicaron redondeados a millones.</p></div></section>'+
    '<section class="section grid-two"><article class="panel">'+brief('Enero–'+monthName(tax.months)+' 2026','Impuestos propios cobrados','Pesos de 2026, sin coparticipación federal.')+
    '<p class="metric moneyline">'+money(total)+'</p>'+bars(names.map((n,i)=>[n,parts[i],total,'income']))+
    '<p class="small compact">'+source('taxCatalog','Datos Abiertos PBA')+' · '+source('taxTables','Planillas de recaudación')+'</p>'+sectionLink(route('evolucion',{serie:'tax'}),'Ver la recaudación desde 1984')+'</article>'+
    '<article class="panel">'+brief('Enero–'+monthName(ron.month)+' de cada año','Lo que gira Nación','Recursos de origen nacional distribuidos automáticamente.')+
    bars([['2025 · total',ron[2025].totalMillions*million,ron[2026].totalMillions*million,'income'],['2026 · total',ron[2026].totalMillions*million,ron[2026].totalMillions*million,'income'],['2026 · coparticipación federal',ron[2026].cfiMillions*million,ron[2026].totalMillions*million,'']])+
    '<p class="small compact">La coparticipación ya está incluida en el total. '+source('ronOctober','Informe de octubre')+'</p>'+sectionLink(route('evolucion',{serie:'ron'}),'Ver la evolución real')+'</article></section>';
}
const view2026={function:'Por función',object:'Por tipo de gasto'};
function budget2026View(q){
  const mode=Object.hasOwn(view2026,q.get('mirada'))?q.get('mirada'):'function';
  const total=b26.rows.find(r=>r.code==='total').total;
  const finalColors={1:'var(--c0)',2:'var(--c3)',3:'var(--c1)',4:'var(--c2)',5:'var(--c4)'};
  const fn=b26.rows.filter(r=>/^\d\.\d\.0$/.test(r.code)&&!/\.0\.0$/.test(r.code)).map(r=>({id:r.code,label:r.label,value:r.total,color:finalColors[r.code[0]]}));
  const debt=b26.rows.find(r=>r.code==='5.0.0');if(!fn.some(r=>r.id.startsWith('5')))fn.push({id:'5.1.0',label:'Servicios de la deuda',value:debt.total,color:finalColors[5]});
  const totals=b26.rows.find(r=>r.code==='total');
  const obj=Object.entries(b26.objects).map(([k,label],i)=>({id:k,label,value:totals[k],color:chartPalette(i)}));
  const a=PBA_DATA.advance;
  return '<section class="section">'+brief('Ley 15.557','El presupuesto votado para 2026','La composición del gasto aprobado al inicio del año: '+money(total)+'.')+
    '<div class="panel">'+toggles('view-2026',view2026,mode,'Composición 2026')+
    (mode==='function'?'<ul class="chart-legend multi swatch">'+[['Administración gubernamental',1],['Seguridad y justicia',2],['Servicios sociales',3],['Servicios económicos',4],['Deuda',5]].map(([n,c])=>'<li style="--dot:'+finalColors[c]+'">'+n+'</li>').join('')+'</ul>':'')+
    treemap(mode==='function'?fn:obj,{total,format:money,label:'Presupuesto 2026 '+view2026[mode].toLowerCase(),height:narrow()?420:430})+
    '<p class="small compact no-bottom">'+source('budget2026','Planilla A · finalidad, función y objeto del gasto')+'</p></div></section>'+
    '<section class="section grid-two"><article class="panel"><h3>Enero–junio 2026</h3>'+bars([['Ingresos percibidos',a.income,Math.max(a.income,a.spending),'income'],['Gasto devengado',a.spending,Math.max(a.income,a.spending),'']])+'<p class="small compact">Resultado financiero: <strong>'+money(a.balance)+'</strong>. Corte provisorio; no es el resultado anual.</p>'+source('advance','Ejecución provincial · segundo trimestre')+'</article>'+
    '<article class="panel"><h3>Proyección oficial del cierre 2026</h3>'+bars([['Ingresos estimados',budgetRefs[0].income,budgetRefs[0].spending,'income'],['Gasto estimado',budgetRefs[0].spending,budgetRefs[0].spending,'']])+
    '<p class="small compact no-bottom">Déficit proyectado: <strong class="red">'+money(extraFiscal.closing2026.balanceMillions*million)+'</strong>. '+source('project','Cuadro 5 del Mensaje 2027','#page=82')+'</p></article></section>';
}
function annexes(){
  const {permanent,temporary}=p.staffing, positions=permanent+temporary;
  const documents=[[132,'Gasto por naturaleza económica','Planilla 1 · Remuneraciones, bienes y servicios, transferencias, intereses e inversión.'],[100,'Cargos y horas cátedra','Artículos 10 y 11 · El articulado remite a las planillas de cargos y horas docentes.'],[207,'Presupuesto plurianual','Planilla 34 · Ingresos, gastos, resultados y financiamiento para 2027 a 2029.'],[219,'Presupuesto con perspectiva de género','Planilla 35 · Programas y obras identificados según las brechas que buscan reducir.'],[279,'Presupuesto con perspectiva ambiental','Planilla 36 · Programas y obras identificados por objetivo ambiental.']];
  return '<section class="section">'+brief('Expediente PE-1/26-27','Planillas del Proyecto 2027','El PDF oficial de Diputados tiene 286 páginas. Las planillas comienzan en la página 131.')+
    '<div class="actions">'+sectionLink(sources.project[1]+'#page=131','Abrir planillas')+sectionLink(sources.projectRecord[1],'Consultar el expediente')+'</div>'+
    '<div class="grid-two section-tight"><article class="panel"><h3>Cargos previstos</h3><p class="metric moneyline">'+digits(positions)+'</p><table><tbody><tr><th scope="row">Planta permanente</th><td class="num">'+digits(permanent)+'</td></tr><tr><th scope="row">Planta temporaria</th><td class="num">'+digits(temporary)+'</td></tr></tbody></table><p class="small compact no-bottom">Son cargos presupuestados; la dotación efectiva se mide por separado ('+sectionLink(route('evolucion',{serie:'staffCount'}),'ver planta ocupada')+'). '+source('project','Artículo 10','#page=100')+'</p></article>'+
    '<article class="panel"><h3>Obras con perspectiva ambiental</h3><p class="small">Selección revisada de la Planilla 36. No es el inventario completo.</p><ul class="work-list">'+works.slice().sort((a,b)=>b.amount-a.amount).slice(0,6).map(w=>'<li><div><strong>'+esc(w.name)+'</strong><small>'+esc(w.towns.join(' · '))+'</small></div><strong class="amt">'+money(w.amount)+'</strong></li>').join('')+'</ul></article></div>'+
    '<ul class="work-list panel section-tight">'+documents.map(([page,title,note])=>'<li><div><strong>'+source('project',title,'#page='+page)+'</strong><small>'+note+'</small></div><span class="small">PDF · p. '+page+'</span></li>').join('')+'</ul></section>';
}
function province(q){
  const raw=q.get('vista'), view=Object.hasOwn(views,viewAlias[raw]||raw)?(viewAlias[raw]||raw):'resumen';
  return intro('PRESUPUESTO PROVINCIAL','Proyecto de Presupuesto 2027','Lo que el Ejecutivo pide gastar, de dónde saldría el dinero y qué cambia frente a lo votado para 2026.')+
    '<nav class="subnav" aria-label="Secciones del presupuesto">'+Object.entries(views).map(([v,label])=>'<a class="button" '+(v===view?'aria-current="page" ':'')+'href="'+budgetRoute(v)+'">'+label+'</a>').join('')+'</nav>'+
    ({resumen:summary,gasto:()=>spendView(q),cambios:()=>changesView(q),recursos:revenueView,v2026:()=>budget2026View(q),anexos:annexes}[view]());
}

// ---------- Mi municipio ----------
const districtById=new Map(geo.districts.map(x=>[x.id,x]));
const defaultDistrict=geo.districts.find(x=>x.name==='La Plata').id;
const md=id=>mplus.districts[id];
const muniPop=id=>md(id).pop2022;
const muniIndicators={
  pc:{label:'Transferencias por habitante',note:'Enero–agosto 2026, pesos por habitante (Censo 2022).',value:id=>md(id).jan_aug_2026[0]/muniPop(id),format:v=>'$ '+digits(v)},
  total:{label:'Transferencias totales',note:'Enero–agosto 2026, pesos del período.',value:id=>md(id).jan_aug_2026[0],format:money},
  real:{label:'Variación real',note:'Enero–agosto 2026 frente a enero–agosto 2025, descontando la inflación.',value:id=>100*(md(id).jan_aug_2026[0]/md(id).jan_aug_2025[0]/mplus.priceRatio-1),format:v=>signedPct(v),diverging:true},
  copart:{label:'Coparticipación por habitante',note:'Coparticipación bruta enero–agosto 2026 por habitante.',value:id=>md(id).jan_aug_2026[1]/muniPop(id),format:v=>'$ '+digits(v)},
  schools:{label:'Consejos escolares',note:'Giros enero–julio 2026 por habitante.',value:id=>(fiscal.schools[id][2026]||0)/muniPop(id),format:v=>'$ '+digits(v)}
};
let muniState={id:defaultDistrict,indicator:'pc',compare:''};
function provinceAverage(indicator){
  const ids=geo.districts.map(d=>d.id), popSum=ids.reduce((s,id)=>s+muniPop(id),0);
  if(indicator==='pc')return ids.reduce((s,id)=>s+md(id).jan_aug_2026[0],0)/popSum;
  if(indicator==='copart')return ids.reduce((s,id)=>s+md(id).jan_aug_2026[1],0)/popSum;
  if(indicator==='schools')return ids.reduce((s,id)=>s+(fiscal.schools[id][2026]||0),0)/popSum;
  if(indicator==='real')return 100*(ids.reduce((s,id)=>s+md(id).jan_aug_2026[0],0)/ids.reduce((s,id)=>s+md(id).jan_aug_2025[0],0)/mplus.priceRatio-1);
  return ids.reduce((s,id)=>s+md(id).jan_aug_2026[0],0)/ids.length;
}
function municipality(q){
  muniState={id:districtById.has(q.get('partido'))?q.get('partido'):defaultDistrict,indicator:Object.hasOwn(muniIndicators,q.get('indicador'))?q.get('indicador'):'pc',compare:districtById.has(q.get('comparar'))?q.get('comparar'):''};
  const options=sel=>geo.districts.map(d=>'<option value="'+d.id+'"'+(d.id===sel?' selected':'')+'>'+esc(d.name)+'</option>').join('');
  return intro('MAPA BONAERENSE','¿Qué llega a mi municipio?','Elegí uno de los 135 partidos y un indicador. Por habitante se compara mejor: los partidos grandes reciben más en total.')+
    '<div class="area-controls"><label class="field grow">Elegí tu municipio<select id="district-select">'+options(muniState.id)+'</select></label>'+
    '<label class="field grow">Qué mostrar en el mapa<select id="district-indicator">'+Object.entries(muniIndicators).map(([k,v])=>'<option value="'+k+'"'+(k===muniState.indicator?' selected':'')+'>'+v.label+'</option>').join('')+'</select></label></div>'+
    '<div class="map-grid"><div class="panel map-panel"><p class="eyebrow" id="map-title"></p>'+mapSvg()+
    '<div class="map-legend" id="map-legend" aria-hidden="true"></div><p class="small no-bottom" id="map-note"></p></div><div class="panel" id="district-info" aria-live="polite"></div></div>'+
    '<section class="section grid-two"><article class="panel"><h2 class="h3">Ranking de los 135 partidos</h2><p class="small" id="ranking-note"></p><ol class="ranking" id="district-ranking"></ol><button type="button" class="button compact" data-ranking-all>Ver los 135</button></article>'+
    '<article class="panel" id="district-compare"></article></section>'+
    '<section class="section">'+brief('Serie histórica','Coparticipación y consejos escolares','Series del catálogo de datos abiertos de la Provincia.')+'<div class="grid-two fiscal-district" id="district-fiscal"></div></section>'+
    '<section class="section">'+brief('Obras','Obras provinciales en el partido','Proyectos del Presupuesto 2026 (Planilla H) con su previsión para 2027, y una selección ambiental del Proyecto 2027.')+'<div class="panel" id="district-works"></div></section>'+
    municipalFinances();
}
function municipalFinances(){
  const f=composition.municipalClose2025;
  const income=(f.ownCurrentMillions+f.otherCurrentMillions+f.capitalIncomeMillions)*million;
  const result=f.balanceMillions*million, spending=income-result;
  return '<section class="section">'+brief('CIERRE 2025','Las cuentas de los 135 municipios en conjunto','Ingresos y gastos de las administraciones municipales bonaerenses, según el informe provincial.')+
    '<div class="panel"><h3>Déficit financiero de '+money(-result)+'</h3>'+treemap([{id:'own',label:'Recursos propios corrientes',value:f.ownCurrentMillions*million},{id:'other',label:'Transferencias de otras jurisdicciones',value:f.otherCurrentMillions*million},{id:'cap',label:'Recursos de capital',value:f.capitalIncomeMillions*million}],{total:income,format:money,label:'Ingresos municipales 2025',height:180})+
    '<p class="compact">'+f.deficitDistricts+' municipios cerraron con déficit y '+f.surplusDistricts+' con superávit. Gastos: '+money(spending)+', de los cuales '+money(f.capitalExpenseMillions*million)+' fueron de capital.</p>'+
    '<p class="small compact no-bottom">'+source('municipalFinance','Informe de finanzas municipales · pp. 8 y 12','#page=13')+' · '+source('bulletin','Boletines municipales')+' · '+source('municipalDirectory','Explorar Municipios Argentinos')+'</p></div></section>';
}
function rankedDistricts(indicator){
  const f=muniIndicators[indicator].value;
  return geo.districts.map(d=>({id:d.id,name:d.name,value:f(d.id)})).sort((a,b)=>b.value-a.value);
}
function districtCopart(d){
  const amounts=fiscal.coparticipation[d.id], years=[];for(let y=2010;y<=2025;y++)years.push(y);
  const pc={},prov={};
  for(const y of years){if(amounts[y]!==undefined)pc[y]=toReal(amounts[y],y)/muniPop(d.id);
    const tot=geo.districts.reduce((s,x)=>s+(fiscal.coparticipation[x.id][y]||0),0);prov[y]=toReal(tot,y)/geo.districts.reduce((s,x)=>s+muniPop(x.id),0);}
  return '<article class="panel"><h3>Coparticipación por habitante · '+esc(d.name)+'</h3><p class="small">Pesos de 2025 por habitante, 2010–2025. La línea gris es el promedio provincial.</p>'+
    lineChart({years,series:[{name:d.name,values:pc},{name:'Promedio provincial',values:prov,color:'var(--muted)'}],format:v=>'$ '+digits(v),axisFormat:v=>digits(v/1000)+' mil',label:'Coparticipación bruta real por habitante de '+d.name,narrow:true})+
    '<p class="small no-bottom">'+source('muniCatalog','Serie de transferencias')+' · Deflactor empalmado (ver Fuentes).</p></article>';
}
function districtSchools(d){
  const values=fiscal.schools[d.id], limit=fiscal.schoolMonths, rows=Object.entries(values), cap=Math.max(...rows.map(([,v])=>v),1);
  return '<article class="panel"><h3>Giros a consejos escolares · '+esc(d.name)+'</h3><p class="small">Enero–'+monthName(limit)+' de cada año, en pesos del período.</p>'+
    (rows.length?bars(rows.map(([y,value])=>[y,value,cap,'income'])):'<p>Sin datos para este corte.</p>')+
    '<p class="small compact no-bottom">'+source('schoolCatalog','Serie de consejos escolares')+'</p></article>';
}
function districtWorks(d){
  const items26=works26.works.filter(w=>w.district===d.id).sort((a,b)=>b.a2026-a.a2026), items27=works.filter(w=>w.towns.includes(d.name)).sort((a,b)=>b.amount-a.amount);
  const covered=works26.districts.includes(d.id);
  const sum=items26.reduce((s,w)=>s+w.a2026,0), sum27=items26.reduce((s,w)=>s+w.a2027,0);
  const list26=items26.length?'<div class="metrics two"><div class="mini"><span>2026 · crédito</span><strong>'+money(sum)+'</strong></div><div class="mini"><span>2027 · previsto</span><strong>'+money(sum27)+'</strong></div></div><ul class="work-list">'+items26.slice(0,q2(items26.length)).map(w=>'<li><div><strong>'+esc(pretty(w.name))+'</strong><small>'+esc(pretty(w.organism||''))+(w.a2027?' · 2027: '+money(w.a2027):'')+'</small></div><strong class="amt" title="'+esc(exact(w.a2026))+'">'+money(w.a2026)+'</strong></li>').join('')+'</ul>'+(items26.length>12?'<details class="flow-fold"><summary>Ver las '+items26.length+' obras</summary><ul class="work-list">'+items26.slice(12).map(w=>'<li><div><strong>'+esc(pretty(w.name))+'</strong><small>'+esc(pretty(w.organism||''))+'</small></div><strong class="amt">'+money(w.a2026)+'</strong></li>').join('')+'</ul></details>':'')
    :'<p>'+(covered?'La Planilla H no registra obras para este partido.':'La copia de la Planilla H 2026 consultada no incluye a <strong>'+esc(d.name)+'</strong>. Eso no significa que no tenga obras.')+'</p>';
  const list27=items27.length?'<h3 class="compact">Proyecto 2027 · selección ambiental</h3><ul class="work-list">'+items27.map(w=>'<li><div><strong>'+esc(w.name)+'</strong><small>'+esc(w.towns.join(' · '))+(w.towns.length>1?' · monto compartido':'')+' · '+source('works','partida '+w.code,'#page='+w.page)+'</small></div><strong class="amt">'+money(w.amount)+'</strong></li>').join('')+'</ul>':'';
  return '<h3>Presupuesto 2026 · proyectos en el partido</h3>'+list26+list27+'<p class="small compact no-bottom">'+source('works2026','Planilla H 2026')+' · '+source('works','Planilla 36 del Proyecto 2027')+'</p>';
}
const q2=n=>Math.min(n,12);
function districtCompareMarkup(d){
  const other=muniState.compare?districtById.get(muniState.compare):null;
  const ind=Object.entries(muniIndicators).filter(([k])=>k!=='total');
  const rows=ind.map(([k,v])=>{const a=v.value(d.id),b=other?v.value(other.id):provinceAverage(k);return '<tr><th scope="row">'+v.label+'</th><td class="num">'+v.format(a)+'</td><td class="num">'+v.format(b)+'</td></tr>';}).join('');
  return '<h2 class="h3">Comparar '+esc(d.name)+'</h2><label class="field">Con<select id="district-compare-select"><option value="">Promedio provincial</option>'+geo.districts.filter(x=>x.id!==d.id).map(x=>'<option value="'+x.id+'"'+(x.id===muniState.compare?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>'+
    '<div class="table-wrap compact"><table><thead><tr><th scope="col">Indicador</th><th scope="col" class="num">'+esc(d.name)+'</th><th scope="col" class="num">'+(other?esc(other.name):'Provincia')+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="small compact no-bottom">Por habitante: población del Censo 2022. Los promedios provinciales pesan cada partido por su población.</p>';
}
function updateDistrict(changeHash=false){
  const {id,indicator}=muniState, d=districtById.get(id), m=md(id), ind=muniIndicators[indicator];
  if(changeHash)choose('municipio',{partido:id,indicador:indicator,...(muniState.compare?{comparar:muniState.compare}:{})});
  document.querySelector('#district-select').value=id;
  document.querySelector('#district-indicator').value=indicator;
  const ranked=rankedDistricts(indicator), pos=ranked.findIndex(r=>r.id===id)+1;
  const ascending=[...ranked].reverse(), bins=new Map(ascending.map((r,i)=>[r.id,Math.min(4,Math.floor(i/27))]));
  document.querySelectorAll('.map path').forEach(path=>{
    const r=ranked.find(x=>x.id===path.dataset.district);
    let cls='m'+bins.get(r.id);
    if(ind.diverging)cls='d'+(r.value< -10?0:r.value<-3?1:r.value<3?2:r.value<10?3:4);
    path.setAttribute('class',cls+(r.id===id?' selected':''));
    path.querySelector('title').textContent=r.name+' · '+ind.format(r.value);
  });
  document.querySelector('#map-title').textContent=ind.label;
  document.querySelector('#map-note').innerHTML=esc(ind.note)+' '+(ind.diverging?'Rojo: baja real; verde: suba real.':'Cinco grupos de 27 partidos.')+' '+source('muniCatalog','Datos abiertos PBA');
  document.querySelector('#map-legend').innerHTML=ind.diverging?'<small>−10% o menos</small><span class="d0"></span><span class="d1"></span><span class="d2"></span><span class="d3"></span><span class="d4"></span><small>+10% o más</small>':'<small>Menor</small><span class="m0"></span><span class="m1"></span><span class="m2"></span><span class="m3"></span><span class="m4"></span><small>Mayor</small>';
  const realVar=muniIndicators.real.value(id), pc=muniIndicators.pc.value(id), avg=provinceAverage('pc');
  const [total,copa,edu,dec]=m.jan_aug_2026, others=total-copa-edu-dec;
  document.querySelector('#district-info').innerHTML='<p class="eyebrow">Enero–agosto 2026</p><h2>'+esc(d.name)+'</h2>'+
    '<div class="metrics two"><div class="mini"><span>Transferencias</span><strong title="'+esc(exact(total))+'">'+money(total)+'</strong></div><div class="mini"><span>Por habitante</span><strong>$ '+digits(pc)+'</strong><small>'+(pc>avg?'Por encima':'Por debajo')+' del promedio ($ '+digits(avg)+')</small></div>'+
    '<div class="mini"><span>Frente a 2025</span><strong class="'+(realVar<0?'red':'green')+'">'+signedPct(realVar)+' real</strong></div><div class="mini"><span>'+esc(ind.label)+'</span><strong>'+pos+'.º de 135</strong></div></div>'+
    treemap([{id:'copa',label:'Coparticipación',value:copa},{id:'edu',label:'Fondo Educativo',value:edu},{id:'dec',label:'Descentralización tributaria',value:dec},{id:'oth',label:'Otros fondos',value:Math.max(0,others)}],{total,format:money,label:'Composición de las transferencias a '+d.name,height:170})+
    '<p class="small compact no-bottom">Último acumulado oficial (enero–septiembre 2026): '+money(d.current[0])+'. No incluye la recaudación propia del municipio. '+source('transfers','Planillas oficiales')+'</p>';
  const showAll=document.querySelector('#district-ranking').dataset.all==='1';
  const view=showAll?ranked:ranked.slice(0,10).concat(pos>10&&pos<=125?[{gap:true},ranked[pos-1]]:[],[{gap:true}],ranked.slice(-10));
  const max=Math.max(...ranked.map(r=>Math.abs(r.value)));
  document.querySelector('#ranking-note').textContent=ind.note+(showAll?'':' Diez más altos, diez más bajos y el partido elegido.');
  document.querySelector('#district-ranking').innerHTML=view.map(r=>r.gap?'<li class="gap" aria-hidden="true">…</li>':'<li'+(r.id===id?' class="selected"':'')+' value="'+(ranked.indexOf(r)+1)+'"><button type="button" data-district="'+r.id+'"><span>'+esc(r.name)+'</span><span class="rk-track"><span class="rk-bar'+(r.value<0?' neg':'')+'" style="width:'+(100*Math.abs(r.value)/max).toFixed(2)+'%"></span></span><strong>'+ind.format(r.value)+'</strong></button></li>').join('');
  document.querySelector('#district-compare').innerHTML=districtCompareMarkup(d);
  document.querySelector('#district-fiscal').innerHTML=districtCopart(d)+districtSchools(d);
  document.querySelector('#district-works').innerHTML=districtWorks(d);
}

// ---------- Historia ----------
const historicGroups={
  'Cuenta provincial':{spending:'Gasto total',current:'Gasto corriente',capital:'Gasto de capital',income:'Ingresos totales',balance:'Resultado financiero'},
  'Para qué se gastó':{social:'Servicios sociales',education:'Educación y cultura',health:'Salud',security:'Servicios de seguridad',administration:'Administración gubernamental',economic:'Servicios económicos',debt:'Servicios de la deuda pública'},
  'Qué se pagó':{staff:'Personal',goods:'Consumo excluido el personal',benefits:'Prestaciones de la seguridad social',transfers:'Transferencias corrientes',investment:'Inversión real directa',capitalTransfers:'Transferencias de capital',interest:'Intereses de la deuda'},
  'Ingresos tributarios':{tax:'Recaudación provincial',grossTax:'Ingresos Brutos',propertyTax:'Inmobiliario',vehicleTax:'Automotores',stampTax:'Sellos',ron:'Recursos tributarios de origen nacional'},
  'Empleo público':{staffCount:'Planta ocupada',staffRate:'Cargos cada mil habitantes',salary:'Gasto salarial medio mensual'},
  'Otros organismos':{ioma:'Gasto de IOMA'}
};
const historicOptions=Object.assign({},...Object.values(historicGroups));
const taxMetrics=['tax','grossTax','propertyTax','vehicleTax','stampTax'];
const employmentMetrics={staffCount:'staff',staffRate:'per1000',salary:'salary'};
const modes={real:'Pesos de 2025',nominal:'Pesos de cada año',pbg:'% del PBG',capita:'Por habitante'};
function historicAmount(year,metric){
  if(employmentMetrics[metric]){const i=employment.years.indexOf(year);return i<0?undefined:employment[employmentMetrics[metric]][i];}
  if(metric==='ron')return extraFiscal.ronAnnual[year];
  if(metric==='ioma')return extraFiscal.ioma[year]?Object.values(extraFiscal.ioma[year]).reduce((t,v)=>t+v,0):undefined;
  const row=history.find(r=>r.year===year);
  if(taxMetrics.includes(metric))return fiscal.taxes.annual[year]?.[taxMetrics.indexOf(metric)];
  if(!row)return undefined;
  if(row[metric]!==undefined)return row[metric];
  const breakdown=fiscal.execution[year];
  return breakdown?.purpose[metric] ?? breakdown?.economic[metric];
}
function metricModes(metric){
  if(metric==='staffCount'||metric==='staffRate')return {count:'Cantidad'};
  if(metric==='salary')return {real:'Pesos de 2025',nominal:'Pesos de cada año'};
  if(metric==='balance')return {ratio:'% de los ingresos',real:'Pesos de 2025'};
  return modes;
}
function historyView(q){
  const metric=Object.hasOwn(historicOptions,q.get('serie'))?q.get('serie'):'spending';
  const available=metricModes(metric), mode=Object.hasOwn(available,q.get('modo'))?q.get('modo'):Object.keys(available)[0];
  const first=employmentMetrics[metric]?(mode==='count'?1987:2005):taxMetrics.includes(metric)&&mode==='nominal'?1999:2005;
  let years=[];for(let y=first;y<=2025;y++)years.push(y);
  const withBudget=(metric==='spending'||metric==='income')&&(mode==='real'||mode==='nominal'||mode==='capita');
  if(withBudget)years.push(2026,2027);
  const value=y=>{
    const raw=y>=2026?budgetRefs.find(r=>r.year===y)?.[metric]:historicAmount(y,metric);
    if(!Number.isFinite(raw))return undefined;
    if(mode==='count')return raw;
    if(mode==='ratio'){const r=history.find(x=>x.year===y);return 100*r.balance/r.income;}
    if(mode==='nominal')return raw;
    if(mode==='pbg')return fiscal.pbg[y]?100*raw/fiscal.pbg[y]:undefined;
    if(mode==='capita'){const pop=population(y)||(y>=2026?population(2025):undefined);return pop?toReal(raw,y)/pop:undefined;}
    return priceLevel(y)?toReal(raw,y):undefined;
  };
  const values={};for(const y of years){const v=value(y);if(Number.isFinite(v))values[y]=v;}
  const shown=years.filter(y=>values[y]!==undefined);
  const fmt=mode==='pbg'||mode==='ratio'?v=>digits(v,1)+'%':mode==='count'?v=>metric==='staffRate'?digits(v,1):digits(v):mode==='capita'?v=>'$ '+digits(v):money;
  const peak=Math.max(...Object.values(values).map(Math.abs));
  const moneyScale=peak>=2e12?[1e12,'billones de pesos']:[1e9,'miles de millones de pesos'];
  const axis=mode==='pbg'||mode==='ratio'?v=>digits(v,0)+'%':mode==='count'?v=>metric==='staffRate'?digits(v):digits(v/1000)+' mil':mode==='capita'?v=>digits(v/1e6,1)+' M':v=>digits(v/moneyScale[0],Math.abs(peak/moneyScale[0])<10?1:0);
  const axisNote=mode==='capita'?'Eje: millones de pesos por habitante.':mode==='real'||mode==='nominal'?'Eje: '+moneyScale[1]+'.':'';
  const yearA=shown.includes(Number(q.get('desde')))?Number(q.get('desde')):shown.find(y=>y>=2015)||shown[0];
  const yearB=shown.includes(Number(q.get('hasta')))?Number(q.get('hasta')):shown.filter(y=>y<=2025).at(-1);
  const va=values[yearA], vb=values[yearB];
  const note={real:'Pesos constantes de 2025. 2005–2016 con IPC empalmado; desde 2017, IPC de la región Pampeana.',nominal:'Pesos de cada año, sin ajustar por inflación.',pbg:'Porcentaje del Producto Bruto Geográfico de la Provincia (hasta 2024).',capita:'Pesos de 2025 por habitante, 2010 en adelante (proyecciones de población).',count:metric==='staffRate'?'Cargos ocupados en la Administración Central y organismos descentralizados cada mil habitantes.':'Cargos ocupados al 31 de diciembre. Hay cambios de cobertura en 2005 y 2017.',ratio:'Saldo después de intereses, como porcentaje de los ingresos de cada año.'}[mode];
  const sourceKey=employmentMetrics[metric]?'employment':metric==='ron'?'ron':metric==='ioma'?'ioma':taxMetrics.includes(metric)?'taxTables':Object.hasOwn(historicGroups['Para qué se gastó'],metric)?'functions':'history';
  const series=[{name:historicOptions[metric],values,dashedFrom:withBudget?2026:undefined}];
  const comparisonText=Number.isFinite(va)&&Number.isFinite(vb)?(mode==='pbg'||mode==='ratio'?'<strong>'+(vb-va>=0?'+':'−')+digits(Math.abs(vb-va),1)+' puntos</strong>':'<strong class="'+(vb<va?'red':'green')+'">'+signedPct(100*(vb/va-1))+'</strong>'+(mode==='count'?'':' · '+(mode==='capita'?'$ '+digits(vb-va):signedMoney(vb-va)))):'Sin dato para alguno de los años.';
  return intro('CUENTAS PÚBLICAS BONAERENSES','Cómo cambiaron las cuentas','Veinte años de ejecución presupuestaria en pesos de hoy, la recaudación propia desde 1984 y el empleo público desde 1987.')+
    '<div class="history-controls"><label class="field grow">Qué querés ver<select id="history-metric">'+Object.entries(historicGroups).map(([group,options])=>'<optgroup label="'+group+'">'+Object.entries(options).map(([k,v])=>'<option value="'+k+'"'+(k===metric?' selected':'')+'>'+v+'</option>').join('')+'</optgroup>').join('')+'</select></label>'+(Object.keys(available).length>1?toggles('history-mode',available,mode,'Unidad'):'')+'</div>'+
    '<section class="panel"><h2>'+historicOptions[metric]+'</h2><p class="small">'+note+(axisNote?' '+axisNote:'')+'</p>'+
    lineChart({years:shown,series,format:fmt,axisFormat:axis,label:historicOptions[metric]+', '+shown[0]+' a '+shown.at(-1),narrow:narrow(),active:yearB,zero:mode!=='count'||metric!=='staffRate'})+
    '<div class="compare-years"><label class="field">Desde<select id="history-from">'+shown.map(y=>'<option'+(y===yearA?' selected':'')+'>'+y+'</option>').join('')+'</select></label><label class="field">Hasta<select id="history-to">'+shown.map(y=>'<option'+(y===yearB?' selected':'')+'>'+y+'</option>').join('')+'</select></label><p class="chart-value"><span>'+yearA+' → '+yearB+'</span>'+comparisonText+'</p></div>'+
    (withBudget?'<p class="small compact">2026: cierre estimado por el Ejecutivo. 2027: proyecto de ley con inflación promedio supuesta de '+inflationLabel+'. '+source('project','Cuadro 5 del Mensaje','#page=82')+'</p>':'')+
    '<p class="small chart-caption">'+source(sourceKey)+(mode==='pbg'?' · '+source('pbg','PBG oficial'):'')+(mode==='real'||mode==='capita'?' · '+source('ipc','IPC de INDEC')+' · '+source('deflatorSplice','Empalme 2005–2016'):'')+'</p>'+
    '<details class="income-details"><summary>Ver los datos del gráfico</summary><div class="table-wrap"><table><thead><tr><th scope="col">Año</th><th scope="col" class="num">'+esc(modes[mode]||available[mode])+'</th></tr></thead><tbody>'+shown.map(y=>'<tr><th scope="row">'+y+(y>=2026?' · '+budgetRefs.find(r=>r.year===y).stage:'')+'</th><td class="num">'+fmt(values[y])+'</td></tr>').join('')+'</tbody></table></div></details></section>'+
    historyComposition(q)+employmentSection();
}
const compositionViews={purpose:'Para qué se gastó',economic:'Qué se pagó',taxes:'Recaudación propia'};
function historyComposition(q){
  const view=Object.hasOwn(compositionViews,q.get('composicion'))?q.get('composicion'):'purpose';
  let years=[],series;
  if(view==='taxes'){
    const names={'ingresos brutos':'Ingresos Brutos',inmobiliario:'Inmobiliario',automotores:'Automotores',sellos:'Sellos',otros:'Otros'};
    years=Object.keys(taxHistory.taxes['ingresos brutos']).map(Number);
    series=Object.entries(names).map(([k,n])=>({name:n,values:taxHistory.taxes[k]}));
  }else{
    for(let y=2005;y<=2025;y++)years.push(y);
    const keys=view==='purpose'?{administration:'Administración',security:'Seguridad',social:'Servicios sociales',economic:'Servicios económicos',debt:'Deuda'}:{staff:'Personal',goods:'Bienes y servicios',benefits:'Prestaciones previsionales',transfers:'Transferencias corrientes',investment:'Inversión real',capitalTransfers:'Transferencias de capital'};
    series=Object.entries(keys).map(([k,n])=>({name:n,values:Object.fromEntries(years.map(y=>[y,fiscal.execution[y]?.[view][k]||0]))}));
  }
  const last=years.at(-1), lastTotal=series.reduce((s,x)=>s+(x.values[last]||0),0), firstTotal=series.reduce((s,x)=>s+(x.values[years[0]]||0),0);
  return '<section class="section panel" id="composicion-historica">'+brief('Composición en el tiempo','¿Cómo cambió el reparto?','Cada franja es la parte de un rubro sobre el total de cada año: no depende de la inflación.')+
    toggles('history-composition',compositionViews,view,'Composición histórica')+
    stacked100({years,series,label:compositionViews[view]+', composición '+years[0]+'–'+last,narrow:narrow()})+
    '<div class="table-wrap"><table><thead><tr><th scope="col">Rubro</th><th scope="col" class="num">'+years[0]+'</th><th scope="col" class="num">'+last+'</th><th scope="col" class="num">Cambio</th></tr></thead><tbody>'+
    series.map(s=>{const a=100*(s.values[years[0]]||0)/firstTotal,b=100*(s.values[last]||0)/lastTotal;return '<tr><th scope="row">'+esc(s.name)+'</th><td class="num">'+formatShare(a)+'</td><td class="num">'+formatShare(b)+'</td><td class="num">'+(b-a>=0?'+':'−')+digits(Math.abs(b-a),1)+' p.</td></tr>';}).join('')+'</tbody></table></div>'+
    '<p class="small compact no-bottom">'+(view==='taxes'?source('top','Serie TOP 1984–2025'):view==='purpose'?source('functions'):source('history'))+'</p></section>';
}
function employmentSection(){
  const fixNames={'Ciudad Autonoma de Buenos Aires':'Ciudad de Buenos Aires','Cordoba':'Córdoba','Entre Rios':'Entre Ríos','Neuquen':'Neuquén','Rio Negro':'Río Negro','Tucuman':'Tucumán'};
  const prov=employment.per1000Provinces2025, rows=Object.entries(prov).map(([n,v])=>{const l=pretty(n.replace(/\(\d+\)/g,'').trim());return {id:n.replace(/\(\d+\)/g,'').trim(),label:fixNames[l]||l,value:v};}).sort((a,b)=>b.value-a.value);
  const pos=rows.findIndex(r=>r.id==='BUENOS AIRES')+1;
  const years=employment.years.filter(y=>y>=2005), salary={};
  for(const y of years){const i=employment.years.indexOf(y);salary[y]=toReal(employment.salary[i],y);}
  return '<section class="section grid-two" id="empleo"><article class="panel"><h2 class="h3">Empleo público: Buenos Aires frente a las demás</h2><p class="small">Cargos ocupados cada mil habitantes en 2025, Administración Central y organismos descentralizados. Buenos Aires está '+pos+'.ª de 24.</p>'+
    '<ol class="ranking compact-rank">'+rows.map(r=>'<li'+(r.id==='BUENOS AIRES'?' class="selected"':'')+'><span>'+esc(r.label)+'</span><span class="rk-track"><span class="rk-bar" style="width:'+(100*r.value/rows[0].value).toFixed(2)+'%"></span></span><strong>'+digits(r.value,1)+'</strong></li>').join('')+'</ol>'+
    '<p class="small compact no-bottom">'+source('employment')+'</p></article>'+
    '<article class="panel"><h2 class="h3">Salario medio real</h2><p class="small">Gasto salarial medio mensual por cargo, en pesos de 2025.</p>'+
    lineChart({years,series:[{name:'Gasto salarial medio mensual',values:salary}],format:v=>'$ '+digits(v),axisFormat:v=>digits(v/1e6,1)+' M',label:'Gasto salarial medio mensual real, 2005 a 2025',narrow:true})+
    '<p class="small compact no-bottom">'+source('employment')+' · Deflactor empalmado.</p></article></section>';
}

// ---------- Fuentes ----------
function methodology(){
  const groupsOfSources={
    'Proyecto 2027':['project','projectRecord','presentation','areas','works'],
    'Presupuesto 2026':['budget','budget2026','works2026','advance'],
    'Series históricas':['history','functions','top','taxCatalog','taxTables','ron','ronOctober','employment','pbg','ipc','deflatorSplice','ioma'],
    'Municipios':['transfers','muniCatalog','muniMonthly','population','schoolCatalog','geo','municipalFinance','bulletin','municipalDirectory']
  };
  const texts={
    project:'PDF oficial de 286 páginas. Los totales exactos salen de los artículos 4° y 7° y el gasto por naturaleza económica de la Planilla 1. En el Cuadro 8 se usa la cifra tabulada de Administración Gubernamental ($11.005.273 millones), que concilia con el total redondeado.',
    projectRecord:'Ficha legislativa del proyecto provincial. El texto original reúne el Mensaje, el articulado y las planillas desde la página 131.',
    presentation:'Se usa para cotejar el resultado primario, los intereses y la composición económica.',
    budget:'Administración Central, organismos descentralizados e instituciones previsionales. La cifra votada corresponde al presupuesto inicial de todo el ejercicio.',
    budget2026:'Planilla A del Presupuesto General 2026: finalidad, función y objeto del gasto del consolidado. Su total coincide con el votado de la Ley 15.557 ($43.021.244.867.935). Se extrae del PDF con el script del repositorio.',
    works2026:'Planilla H del Presupuesto General 2026: proyectos por partido, con crédito 2026 y previsión 2027–2028. La copia consultada no incluye a 19 partidos; en ellos se avisa la falta de datos. Las obras de «Varios municipios» no se asignan a un partido.',
    areas:'48 filas del artículo 5°, transcritas en el cuadro publicado por Diputados Bonaerenses. La suma coincide con el artículo 4°.',
    works:'Selección de filas revisadas en la Planilla 36 (perspectiva ambiental). Una obra compartida aparece en los partidos nombrados sin repartir su monto.',
    transfers:'Hoja Acumulado de las planillas de septiembre de 2026 y diciembre de 2025. Se muestra como último acumulado oficial.',
    muniMonthly:'Serie mensual de transferencias por partido y concepto. Mapa, ranking y ficha comparan enero–agosto de 2026 y de 2025. La variación real usa el cociente del IPC nacional de INDEC de esos meses ('+digits((mplus.priceRatio-1)*100,1)+'%).',
    population:'Proyección de población 2010–2025 por partido. Los indicadores por habitante de los municipios usan el Censo 2022 (columna 2022 del archivo); la serie provincial usa la proyección, con 2022 interpolado.',
    geo:'Polígonos de partidos de Georef (datos IGN), unidos a las planillas por nombre.',
    history:'Hoja Buenos Aires de la serie APNF 2005–2025. Recursos percibidos y gastos devengados, datos provisorios.',
    ipc:'Desde 2017, IPC general de la región Pampeana: cada monto anual se multiplica por IPC promedio 2025 / IPC promedio del año.',
    deflatorSplice:'Para 2005–2016 se usa el IPC 9 provincias empalmado que publica el sitio Gasto Público CABA, enlazado al IPC Pampeana por el cociente de los promedios de 2017. No es una serie oficial homogénea: se indica como estimación.',
    advance:'Columna Buenos Aires del consolidado APNF, acumulado enero a junio de 2026.',
    taxCatalog:'El CSV del catálogo mezcla valores en miles y millones; se toman las planillas tributarias con su unidad.',
    taxTables:'Suma mensual de la recaudación de origen provincial, 1999–2025 y enero–septiembre de 2026.',
    top:'Serie de recursos tributarios de origen provincial 1984–2025 (Dirección de Recursos Provinciales). Se usa sólo la composición por impuesto de cada año, que no depende de cambios de moneda.',
    employment:'Planta ocupada, cargos cada mil habitantes y gasto salarial medio mensual 1987–2025, Administración Central y organismos descentralizados de las 24 jurisdicciones. Hay cambios de cobertura en 2005 y 2017.',
    muniCatalog:'Coparticipación bruta anual por partido 2010–2025, en pesos de 2025 por habitante.',
    schoolCatalog:'Giros a los consejos escolares, enero a julio de cada año.',
    pbg:'Gasto devengado de la APNF dividido por el PBG a precios corrientes. Último PBG publicado: 2024.',
    functions:'Serie histórica por finalidad y función. En 2024 su total difiere del esquema de ejecución general.',
    municipalFinance:'Informe provincial de los 135 municipios: resultado y número de municipios con déficit o superávit.',
    bulletin:'Buscador de boletines municipales.',
    municipalDirectory:'Directorio externo para seguir explorando municipios.',
    ron:'Serie nacional 2003–2025 de recursos de origen nacional para Buenos Aires.',
    ronOctober:'Acumulado enero–octubre de 2025 y 2026, en pesos de cada período.',
    ioma:'Serie anual 2019–2024 de IOMA por tipo de erogación. IOMA tiene presupuesto propio.'
  };
  return intro('TRANSPARENCIA','Fuentes y metodología','Cada cifra tiene un documento de origen. Acá podés comprobar qué cubre y cómo se calculó.')+
    '<div class="grid-two"><article class="panel comparison"><h2 class="h3">Cómo se compara 2027 con 2026</h2><p>El monto nominal del proyecto se divide por '+digits(1+inflation,3)+' para expresarlo en pesos de 2026, con el supuesto de inflación promedio anual de '+inflationLabel+'. Luego se compara con el crédito inicial de la Ley 15.557. Los organismos se emparejan por nombre; las finalidades, por código.</p></article>'+
    '<article class="panel comparison"><h2 class="h3">Cómo se pasan los pesos a valores de hoy</h2><p>Las series históricas se expresan en pesos promedio de 2025. Para 2026 se usan diez meses observados del IPC Pampeana y se repite la variación de octubre ('+digits((monthlyFactor-1)*100,1)+'% mensual) en noviembre y diciembre; para 2027 se aplica el supuesto de '+inflationLabel+'.</p></article></div>'+
    Object.entries(groupsOfSources).map(([title,keys])=>'<section class="section">'+brief('Fuentes',title,'')+'<div class="source-list">'+keys.filter(k=>sources[k]).map(k=>'<article class="panel"><h3>'+source(k)+'</h3><p class="muted no-bottom">'+(texts[k]||'')+'</p></article>').join('')+'</div></section>').join('');
}

// ---------- Ficha de organismo ----------
function areaParams(input,group){
  const view=readRoute().q.get('composicion');
  return {vista:'gasto',...(view?{composicion:view}:{}),...(input?.value.trim()?{q:input.value.trim()}:{}),...(group?.value?{grupo:group.value}:{})};
}
function openArea(area,fromLink=false){
  if(!area)return;
  const input=document.querySelector('#area-query'), group=document.querySelector('#area-group');
  if(!fromLink)choose('presupuesto',{...areaParams(input,group),area:area.id});
  const base=priorAreas[area.id], now=in2026Pesos(area.amount);
  content.innerHTML='<p class="eyebrow">PROYECTO 2027 · '+groups[area.group]+'</p><h2 id="detail-title">'+esc(pretty(area.name))+'</h2><p class="metric">'+money(area.amount)+'</p><p class="muted">'+exact(area.amount)+' · '+share(area.amount,p.spending)+' del gasto propuesto.</p>'+
    (base?'<section class="comparison"><h3>'+signedPct(realChange(area.amount,base))+' real frente al votado 2026</h3>'+bars([['Votado 2026',base,Math.max(base,now),''],['Proyecto 2027, en pesos de 2026',now,Math.max(base,now),'income']])+'<p class="small compact">Diferencia: <strong>'+signedMoney(now-base)+'</strong> en pesos de 2026. Inflación promedio supuesta 2027: '+inflationLabel+'. '+source('budget','Ley 15.557 · art. 5°')+'</p></section>':'')+
    '<p class="small">'+source('project','Art. 5° del proyecto','#page=96')+' · '+source('areas','Ver cuadro, pág. '+area.page,'#page='+area.page)+'</p>';
  if(!dialog.open)dialog.showModal();
}

// ---------- Ruteo y eventos ----------
function render({focus=false, keepScroll=false}={}){
  const {id,q}=readRoute();
  if(dialog.open)dialog.close();
  document.querySelectorAll('.nav-inner a').forEach(a=>{
    if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  main.innerHTML=({inicio:()=>home(q),presupuesto:()=>province(q),municipio:()=>municipality(q),evolucion:()=>historyView(q),fuentes:methodology})[id]();
  mountFlow();
  document.title=sections[id]+' · Gasto Público PBA';
  if(id==='municipio')updateDistrict();
  if(document.querySelector('#area-list'))updateAreas();
  if(id==='presupuesto'&&q.has('area'))openArea(areas.find(x=>x.id===q.get('area')),true);
  if(!keepScroll)window.scrollTo({top:0,behavior:'instant'});
  if(!keepScroll&&id==='inicio'&&q.get('ir')==='flujo')document.querySelector('#flujo-fiscal').scrollIntoView();
  if(focus&&!dialog.open)main.focus({preventScroll:true});
}
function rerender(section,params,focusSelector){
  choose(section,params);render({keepScroll:true});
  if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
}
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus();});
document.querySelector('.theme').addEventListener('click',()=>{
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  setTheme(theme);
  try{localStorage.setItem('pba-theme',theme);}catch{}
});
function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  document.querySelector('.theme').setAttribute('aria-pressed',String(theme==='dark'));
}
try{setTheme(localStorage.getItem('pba-theme')||'light');}catch{setTheme('light');}
document.addEventListener('input',e=>{
  if(e.target.id==='area-query'){choose('presupuesto',areaParams(e.target,document.querySelector('#area-group')));updateAreas();}
});
const currentQuery=()=>Object.fromEntries(readRoute().q);
main.addEventListener('change',e=>{
  const id=e.target.id, q=currentQuery();
  if(id==='district-select'){muniState.id=e.target.value;updateDistrict(true);}
  if(id==='district-indicator'){muniState.indicator=e.target.value;updateDistrict(true);}
  if(id==='district-compare-select'){muniState.compare=e.target.value;updateDistrict(true);document.querySelector('#district-compare-select')?.focus();}
  if(id==='area-group'){choose('presupuesto',areaParams(document.querySelector('#area-query'),e.target));updateAreas();}
  if(id==='history-metric'){delete q.modo;delete q.desde;delete q.hasta;rerender('evolucion',{...q,serie:e.target.value},'#history-metric');}
  if(id==='history-from'||id==='history-to')rerender('evolucion',{...q,[id==='history-from'?'desde':'hasta']:e.target.value},'#'+id);
});
main.addEventListener('click',e=>{
  flowClick(e);
  const q=currentQuery();
  const b=e.target.closest('button,[data-district]');
  if(!b)return;
  const d=b.dataset;
  if(d.spendView)rerender('presupuesto',{...q,vista:'gasto',composicion:d.spendView},'[data-spend-view="'+d.spendView+'"]');
  if(d.changeGroup)rerender('presupuesto',{...q,vista:'cambios',agrupar:d.changeGroup},'[data-change-group="'+d.changeGroup+'"]');
  if(d.changeMetric)rerender('presupuesto',{...q,vista:'cambios',medida:d.changeMetric},'[data-change-metric="'+d.changeMetric+'"]');
  if(d.view2026)rerender('presupuesto',{...q,vista:'v2026',mirada:d.view2026},'[data-view-2026="'+d.view2026+'"]');
  if(d.historyMode)rerender('evolucion',{...q,modo:d.historyMode},'[data-history-mode="'+d.historyMode+'"]');
  if(d.historyComposition){choose('evolucion',{...q,composicion:d.historyComposition});document.querySelector('#composicion-historica').outerHTML=historyComposition(readRoute().q);document.querySelector('[data-history-composition="'+d.historyComposition+'"]')?.focus({preventScroll:true});}
  if(b.hasAttribute('data-ranking-all')){const list=document.querySelector('#district-ranking');list.dataset.all=list.dataset.all==='1'?'':'1';b.textContent=list.dataset.all?'Ver resumen':'Ver los 135';updateDistrict();}
  if(d.district){muniState.id=d.district;updateDistrict(true);if(narrow())document.querySelector('#district-info').scrollIntoView({block:'start'});}
  if(d.area)openArea(areas.find(a=>a.id===d.area));
  if(d.year&&readRoute().id==='evolucion')rerender('evolucion',{...q,hasta:d.year});
});
dialog.addEventListener('close',()=>{
  const {id,q}=readRoute();
  if(id==='presupuesto'&&q.has('area')){q.delete('area');choose(id,Object.fromEntries(q));}
});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
window.addEventListener('hashchange',()=>render({focus:true}));
matchMedia('(max-width: 560px)').addEventListener('change',()=>{if(['evolucion','presupuesto'].includes(readRoute().id))render({keepScroll:true});});
render();
