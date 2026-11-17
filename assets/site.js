'use strict';

const { project:p, areas, municipios:geo, works, history, sources } = PBA_DATA;
const main = document.querySelector('main');
const dialog = document.querySelector('#detail');
const content = document.querySelector('#detail-content');
const sections = {inicio:'Inicio',provincia:'Provincia',municipio:'Mi municipio',evolucion:'Evolución',fuentes:'Fuentes'};
const views = {resumen:'Resumen',gastos:'Gastos y áreas',ingresos:'Ingresos',avance:'Avance 2026'};
const groups = {central:'Administración Central',organismos:'Organismos descentralizados',prevision:'Instituciones de previsión social'};
const digits = (x,d=0) => formatNumber(x,d);
const exact = x => formatMoney(x);
const money = x => formatMoney(x,{style:'short'});
const million = 1e6;
const balance = p.income-p.spending;
const esc = x => String(x).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal = x => String(x).normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\w ]/g,' ').toLowerCase().trim();
const share = (x,base) => digits(100*x/base,1)+'%';
const source = (key,text,anchor='') => '<a href="'+esc(sources[key][1]+anchor)+'" target="_blank" rel="noopener">'+esc(text||sources[key][0])+' ↗</a>';
const route = (section, params={}) => '#'+section+(Object.keys(params).length?'?'+new URLSearchParams(params):'');
const budgetRoute = (view,extra={}) => route('provincia',{vista:view,...extra});
const sectionLink = (url,text,kind='') => '<a class="button '+kind+'" href="'+esc(url)+'">'+esc(text)+'</a>';
const intro = (over,title,text) => '<div class="section-head"><p class="eyebrow">'+over+'</p><h1>'+title+'</h1><p class="lead">'+text+'</p></div>';
const brief = (over,title,text) => '<div class="section-head"><p class="eyebrow">'+over+'</p><h2>'+title+'</h2><p class="muted">'+text+'</p></div>';
const card = (label,value,note,cls='') => '<article class="panel metric-card"><strong>'+label+'</strong><span class="metric '+cls+'">'+value+'</span><p class="small">'+note+'</p></article>';
const bars = rows => '<div class="chart-list">'+rows.map(([name,value,base,tone])=>{
  const pct = Math.max(0,Math.min(100,Math.abs(value/base)*100));
  return '<div><div class="bar-meta"><strong>'+esc(name)+'</strong><strong>'+money(value)+'</strong></div><div class="track" aria-hidden="true"><div class="fill '+(tone||'')+'" style="width:'+pct.toFixed(4)+'%"></div></div></div>';
}).join('')+'</div>';

function readRoute(){
  const [id,q] = location.hash.slice(1).split('?');
  return {id:Object.hasOwn(sections,id)?id:'inicio',q:new URLSearchParams(q)};
}
function choose(section, params){
  const hash=route(section,params);
  if(location.hash!==hash)historyState(hash);
}
function historyState(hash){
  window.history.replaceState(null,'',hash);
}
function pretty(label){
  return label.toLocaleLowerCase('es-AR').split(' ').map((s,i)=>i>0&&/^(de|del|la|las|los|el|y|a|en)$/.test(s)?s:s.charAt(0).toLocaleUpperCase('es-AR')+s.slice(1)).join(' ').replace(/\(([A-Za-z]+)\)/g,(_,w)=>'('+w.toUpperCase()+')');
}
function mapSvg(hero=false){
  const arrow=hero?' aria-hidden="true"':' aria-label="Mapa de partidos. Para elegir con el teclado, usá el selector de municipio."';
  return '<svg class="'+(hero?'hero-map':'map')+'" viewBox="'+geo.viewBox+'"'+arrow+' xmlns="http://www.w3.org/2000/svg">'+geo.districts.map((d,i)=>'<path d="'+d.path+'" '+(hero?'':'class="district" data-district="'+d.id+'" fill-rule="evenodd"')+'>'+(hero?'':'<title>'+esc(d.name)+'</title>')+'</path>').join('')+'</svg>';
}
function home(){
  return '<section class="hero"><div><span class="tag">Proyecto 2027 · enviado a la Legislatura</span><h1>Gasto Público PBA</h1><p>Seguí el presupuesto de la Provincia de Buenos Aires: de dónde salen los recursos, cómo se reparten y qué llega a tu municipio.</p><div class="actions">'+sectionLink(budgetRoute('resumen'),'Ver el Proyecto 2027','primary')+sectionLink('#municipio','Buscar mi municipio','secondary')+'</div></div>'+mapSvg(true)+'</section>'+
    '<div class="metrics">'+card('Gasto propuesto',money(p.spending),'Corriente y de capital · 2027')+card('Ingresos previstos',money(p.income),'Impuestos y otros recursos · 2027')+card('Déficit proyectado',money(balance),'Resultado después de intereses · 2027','red')+'</div>'+
    '<section class="section">'+brief('Explorá los datos','Tres formas de mirar el presupuesto','Elegí una pregunta para empezar.')+
    '<div class="paths">'+[
      [budgetRoute('gastos'),'01','¿Quién administra el gasto?','Buscá una de las '+areas.length+' jurisdicciones y organismos del proyecto.','Ver áreas'],
      ['#municipio','02','¿Qué llega a mi municipio?','Consultá transferencias giradas en los 135 partidos y una selección de obras previstas.','Abrir mapa'],
      ['#evolucion','03','¿Cómo cambiaron las cuentas?','Recorré la ejecución desde 2005 y el gasto reciente actualizado por inflación.','Ver evolución']
    ].map(([url,no,title,text,go])=>'<a class="panel story-link" href="'+esc(url)+'"><span class="route-no">'+no+'</span><h3>'+title+'</h3><p>'+text+'</p><span class="action">'+go+' →</span></a>').join('')+
    '</div></section>';
}
function summary(){
  return '<div class="metrics">'+card('Gasto propuesto',money(p.spending),'Gasto corriente y de capital')+card('Recursos previstos',money(p.income),'Ingresos corrientes y de capital')+card('Resultado financiero',money(balance),'Déficit de '+share(-balance,p.income)+' de los ingresos','red')+'</div>'+
    '<section class="section grid-two"><article class="panel"><h2>¿Alcanzan los ingresos?</h2><p class="muted">El déficit es la diferencia entre los recursos previstos y todo el gasto, incluidos los intereses.</p>'+
    bars([['Ingresos',p.income,p.spending,'income'],['Gastos',p.spending,p.spending,''],['Déficit',balance,p.spending,'deficit']])+
    '<p class="small compact no-bottom">'+source('project','Cuadro 5 del Mensaje')+' · '+source('presentation','Presentación del Ministerio')+'</p></article>'+
    '<article class="panel"><h2>Antes y después de intereses</h2><p class="muted">El proyecto prevé déficit incluso antes de pagar intereses.</p><table><tbody>'+
    [['Saldo antes de intereses',p.primaryMillions*million],['Intereses de la deuda',p.interestMillions*million],['Saldo después de intereses',balance]].map(([n,v])=>'<tr><th scope="row">'+n+'</th><td class="num">'+money(v)+'</td></tr>').join('')+
    '</tbody></table><p class="small compact no-bottom">El saldo y los intereses se comparan en la misma cuenta. El financiamiento se registra por separado.</p></article></section>'+
    '<section class="section grid-two"><article class="panel"><h3>¿Cuánto se destinaría a inversión?</h3>'+bars([['Gasto corriente',p.currentMillions*million,p.spending,''],['Gasto de capital',p.capitalMillions*million,p.spending,'income']])+'<p class="small compact no-bottom">El gasto de capital incluye inversión y transferencias de capital. '+source('presentation','Fuente')+'</p></article>'+
    '<article class="panel"><h3>¿Qué se votó para 2026?</h3><p class="metric moneyline">'+money(p.prior.spending)+'</p><p class="muted">Gasto aprobado al inicio de 2026. El monto puede haber cambiado durante el año. Los pesos son los de cada año.</p>'+sectionLink(budgetRoute('avance'),'Ver Avance 2026')+'</article></section>';
}
function income(){
  return '<section class="section">'+brief('Proyecto 2027','¿De dónde saldrían los recursos?','Abrí un grupo para ver qué incluye. Los importes son estimaciones del proyecto.')+
    '<div class="panel">'+bars(p.incomeGroups.map(r=>[r.name,r.millions*million,p.income,'income']))+
    '<p class="small compact no-bottom">'+source('project','Cuadro 6 del Mensaje')+' · Los rubros se publicaron redondeados a millones.</p></div>'+
    p.incomeGroups.map((r,i)=>'<details class="income-details" '+(!i?'open':'')+'><summary>'+esc(r.name)+'</summary><p class="small">'+esc(r.detail)+'</p>'+
      (r.children?bars(r.children.map(([label,m])=>[label,m*million,r.millions*million,'income'])):'')+'</details>').join('')+'</section>';
}
function areaView(q){
  return '<section class="section">'+brief('Proyecto 2027','Buscá un área de gobierno','Los importes muestran quién recibiría la autorización de gastar. Hacé clic para ver el monto exacto, su peso y la fuente.')+
    '<div class="panel"><h3>Cómo se distribuye el total</h3>'+bars(Object.keys(groups).map(g=>[groups[g],areas.filter(a=>a.group===g).reduce((acc,r)=>acc+r.amount,0),p.spending,'']))+
    '<p class="small compact no-bottom">Cobertura: Administración Provincial de los artículos 4° y 5°. Banco Provincia, IOMA y otros entes no consolidados tienen un tratamiento separado en el artículo 12.</p></div>'+
    '<div class="area-controls"><label class="field grow">Nombre del área <input type="search" id="area-query" placeholder="Por ejemplo: Educación, Salud o Vialidad" value="'+esc(q.get('q')||'')+'"></label><label class="field">Tipo de organismo<select id="area-group"><option value="">Todos</option>'+Object.entries(groups).map(([g,name])=>'<option value="'+g+'"'+(q.get('grupo')===g?' selected':'')+'>'+name+'</option>').join('')+'</select></label></div>'+
    '<p class="results" aria-live="polite" id="area-count"></p><div class="area-grid" id="area-list"></div></section>';
}
function updateAreas(){
  const input=document.querySelector('#area-query'), group=document.querySelector('#area-group');
  const query=normal(input.value), g=group.value;
  const rows=areas.filter(a=>(!g||g===a.group)&&query.split(/ +/).every(t=>normal(a.name).includes(t))).sort((a,b)=>b.amount-a.amount);
  document.querySelector('#area-count').textContent=rows.length+' de '+areas.length+' áreas';
  document.querySelector('#area-list').innerHTML=rows.length?rows.map(a=>'<button type="button" class="area-card" data-area="'+a.id+'"><span>'+groups[a.group]+'</span><strong>'+esc(pretty(a.name))+'</strong><span class="metric">'+money(a.amount)+'</span><span class="minor">'+share(a.amount,p.spending)+' del total →</span></button>').join(''):'<p class="muted">No encontramos áreas con esos filtros.</p>';
}
function advance(){
  const a=PBA_DATA.advance;
  return '<section class="section">'+brief('Ejecución y presupuesto','Qué pasó en 2026','Lo votado es una autorización para todo el año. El avance muestra los ingresos y gastos registrados en medio año.')+
    (a?'<div class="grid-two"><article class="panel"><h3>Votado para todo 2026</h3>'+bars([['Ingresos previstos',p.prior.income,p.prior.spending,'income'],['Gasto aprobado',p.prior.spending,p.prior.spending,'']])+'<p class="small compact no-bottom">'+source('budget')+'</p></article>'+
    '<article class="panel"><h3>Enero–junio 2026</h3>'+bars([['Ingresos percibidos',a.income,Math.max(a.income,a.spending),'income'],['Gasto devengado',a.spending,Math.max(a.income,a.spending),'']])+'<p class="small compact">Resultado financiero: <strong>'+money(a.balance)+'</strong>. Corte provisorio; no es el resultado anual.</p>'+source('advance','Ejecución provincial · segundo trimestre')+'</article></div>':
    '<article class="panel"><h3>Presupuesto votado para 2026</h3>'+bars([['Ingresos previstos',p.prior.income,p.prior.spending,'income'],['Gasto aprobado',p.prior.spending,p.prior.spending,'']])+'<p class="small compact no-bottom">'+source('budget')+' · '+source('history','Consultar ejecución al segundo trimestre')+'</p></article>')+
    '<p class="callout compact">El proyecto 2027 es otra etapa. Esta vista no calcula una variación real entre una autorización anual y un semestre ejecutado.</p></section>';
}
function province(q){
  const view=Object.hasOwn(views,q.get('vista'))?q.get('vista'):'resumen';
  return intro('PRESUPUESTO PROVINCIAL','Las cuentas de la Provincia','Seguí el proyecto de 2027 y el avance de 2026, con los períodos separados para que la comparación sea clara.')+
    '<nav class="subnav" aria-label="Datos provinciales">'+Object.entries(views).map(([v,label])=>'<a class="button" '+(v===view?'aria-current="page" ':'')+'href="'+budgetRoute(v)+'">'+label+'</a>').join('')+'</nav>'+
    ({resumen:summary,gastos:()=>areaView(q),ingresos:income,avance:advance}[view]());
}

const monthLabels = {current:'Enero–septiembre 2026',previous:'Enero–diciembre 2025'};
const districtById=new Map(geo.districts.map(x=>[x.id,x]));
const defaultDistrict=geo.districts.find(x=>x.name==='La Plata').id;
let muniState={id:defaultDistrict,period:'current'};
function municipality(q){
  muniState={id:districtById.has(q.get('partido'))?q.get('partido'):defaultDistrict,period:q.get('periodo')==='2025'?'previous':'current'};
  return intro('MAPA BONAERENSE','¿Qué llega a mi municipio?','Elegí uno de los 135 partidos. Las transferencias son fondos girados por la Provincia; las obras son créditos previstos para 2027.')+
    '<div class="area-controls"><label class="field grow">Elegí tu municipio<select id="district-select">'+geo.districts.map(d=>'<option value="'+d.id+'"'+(d.id===muniState.id?' selected':'')+'>'+esc(d.name)+'</option>').join('')+'</select></label>'+
    '<label class="field">Período de transferencias<select id="district-period">'+Object.entries(monthLabels).map(([k,v])=>'<option value="'+k+'"'+(k===muniState.period?' selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
    '<div class="map-grid"><div class="panel map-panel"><p class="eyebrow">Transferencias en pesos del período</p>'+mapSvg()+
    '<div class="map-legend" aria-label="Escala de colores"><small>Menor monto</small><span></span><span></span><span></span><span></span><span></span><small>Mayor monto</small></div><p class="small no-bottom">Cinco grupos por monto total, sin dividir por población. '+source('geo','Límites de los partidos')+'</p></div><div class="panel" id="district-info" aria-live="polite"></div></div>'+
    '<section class="section">'+brief('PROYECTO 2027','Obras provinciales identificadas','Selección de partidas con perspectiva ambiental. No es un inventario completo de las obras del municipio.')+'<div class="panel" id="district-works"></div></section>';
}
function updateDistrict(changeHash=false){
  const {id,period}=muniState, d=districtById.get(id), [total,copa,education]=d[period], others=total-copa-education;
  if(changeHash) choose('municipio',{partido:id,periodo:period==='current'?'2026':'2025'});
  document.querySelector('#district-select').value=id;
  document.querySelector('#district-period').value=period;
  const ranked=[...geo.districts].sort((a,b)=>a[period][0]-b[period][0]), bins=new Map(ranked.map((row,i)=>[row.id,Math.floor(i/27)]));
  document.querySelectorAll('.map path').forEach(path=>{
    const row=districtById.get(path.dataset.district);
    path.setAttribute('class','m'+bins.get(row.id)+(row.id===id?' selected':''));
    path.querySelector('title').textContent=row.name+' · '+money(row[period][0]);
  });
  document.querySelector('#district-info').innerHTML='<p class="eyebrow">'+monthLabels[period]+'</p><h2>'+esc(d.name)+'</h2><p class="metric moneyline" title="'+esc(exact(total))+'">'+money(total)+'</p><p class="muted">Transferencias provinciales informadas</p>'+bars([['Coparticipación bruta',copa,total,''],['Fondo de Financiamiento Educativo',education,total,''],['Otros fondos y transferencias',others,total,'']])+'<p class="small compact no-bottom">El total no incluye la recaudación propia del municipio. '+source('transfers','Planillas oficiales')+'</p>';
  const items=works.filter(w=>w.towns.includes(d.name)).sort((a,b)=>b.amount-a.amount);
  document.querySelector('#district-works').innerHTML=(items.length?'<ul class="work-list">'+items.map(w=>'<li><div><strong>'+esc(w.name)+'</strong><small>'+esc(w.towns.join(' · '))+(w.towns.length>1?' · monto compartido sin reparto por partido':'')+'</small><span class="detail-link">'+source('works','Ver partida '+w.code,'#page='+w.page)+'</span></div><strong class="amt" title="'+esc(exact(w.amount))+'">'+money(w.amount)+'</strong></li>').join('')+'</ul>':'<p class="no-bottom">Todavía no hay partidas cargadas para <strong>'+esc(d.name)+'</strong> en esta selección. Eso no significa que el municipio no tenga obras previstas.</p>')+'<p class="small compact no-bottom">'+source('works','Consultar la Planilla 36 completa')+'</p>';
}

const historicOptions={spending:'Gasto total',capital:'Gasto de capital',income:'Ingresos totales',balance:'Resultado financiero'};
function historyView(q){
  const metric=Object.hasOwn(historicOptions,q.get('serie'))?q.get('serie'):'spending';
  const last=history.at(-1);
  const rows=metric==='balance'?history:history.filter(x=>x.ipc);
  const val=r=>metric==='balance'?100*r.balance/r.income:r[metric]*last.ipc/r.ipc/1e12;
  function display(x){return metric==='balance'?digits(x,1)+'%':money(x*1e12);}
  const chosen=rows.find(r=>r.year===Number(q.get('anio')))||rows.at(-1);
  const span=Math.max(...rows.map(val))-Math.min(...rows.map(val));
  const rough=(Math.max(...rows.map(val),0)-Math.min(...rows.map(val),0))/4 || span/4 || 1;
  const pow=Math.pow(10,Math.floor(Math.log10(rough)));
  const step=[1,2,2.5,5,10].map(x=>x*pow).find(x=>x>=rough);
  const lo=Math.floor(Math.min(0,...rows.map(val))/step)*step, hi=Math.ceil(Math.max(0,...rows.map(val))/step)*step;
  const narrow=matchMedia('(max-width: 560px)').matches;
  const width=narrow?340:740, height=narrow?235:255, left=narrow?42:53, right=19, top=14, bottom=37;
  const y=v=>top+(hi-v)/(hi-lo)*(height-top-bottom), x=i=>left+i*(width-left-right)/(rows.length-1);
  const points=rows.map((r,i)=>[x(i),y(val(r))]);
  const ticks=Array.from({length:Math.round((hi-lo)/step)+1},(_,i)=>lo+i*step);
  const cx=rows.indexOf(chosen);
  return intro('EJECUCIÓN PROVINCIAL','Cómo cambiaron las cuentas','Recorré lo que efectivamente ingresó y lo que se devengó. Cada gráfico indica si mide pesos ajustados o el saldo sobre los ingresos.')+
    '<div class="history-controls"><label class="field">Qué querés ver<select id="history-metric">'+Object.entries(historicOptions).map(([k,v])=>'<option value="'+k+'"'+(k===metric?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="field">Consultar un año<select id="history-year">'+rows.map(r=>'<option value="'+r.year+'"'+(r===chosen?' selected':'')+'>'+r.year+'</option>').join('')+'</select></label></div>'+
    '<section class="panel"><h2>'+historicOptions[metric]+'</h2><p class="small">'+(metric==='balance'?'Saldo después de intereses, como porcentaje de los ingresos de cada año.':'Billones de pesos a precios promedio de 2025, ajustados con el IPC de la región Pampeana.')+'</p>'+
    '<svg class="chart" viewBox="0 0 '+width+' '+height+'" aria-label="'+historicOptions[metric]+', '+rows[0].year+' a 2025" role="img">'+ticks.map(t=>'<line class="grid'+(t===0?' zero':'')+'" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(left-8)+'" y="'+(y(t)+4)+'" text-anchor="end">'+digits(t,Number.isInteger(t)?0:1)+(metric==='balance'?'%':'')+'</text>').join('')+
    '<path class="line" d="'+monotonePath(points)+'"/>'+rows.map((r,i)=>'<circle '+(i===cx?'class="active" ':'')+'data-year="'+r.year+'" cx="'+points[i][0]+'" cy="'+points[i][1]+'" r="'+(rows.length>13?3.5:5)+'"><title>'+r.year+': '+display(val(r))+'</title></circle>'+((rows.length<13?(!narrow||i%2===0):i%4===0||i===rows.length-1)?'<text x="'+x(i)+'" y="'+(height-12)+'" text-anchor="middle">'+r.year+'</text>':'')).join('')+'</svg>'+
    '<div class="chart-value"><strong>'+chosen.year+' · '+historicOptions[metric]+'</strong><span class="metric '+(metric==='balance'&&val(chosen)<0?'red':'')+'">'+display(val(chosen))+'</span></div>'+
    '<p class="small chart-caption">'+source('history','Serie APNF de Nación')+(metric==='balance'?'':' · '+source('ipc','IPC de INDEC'))+' · Ejecución provisoria.</p></section>'+
    '<details class="income-details"><summary>Ver los datos del gráfico</summary><div class="table-wrap"><table><thead><tr><th scope="col">Año</th><th scope="col" class="num">'+historicOptions[metric]+'</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><th scope="row">'+r.year+'</th><td class="num">'+display(val(r))+'</td></tr>').join('')+'</tbody></table></div></details>';
}

function methodology(){
  const texts={
    project:'El Mensaje y el articulado son un proyecto, no una ley ni gasto ejecutado. Los totales exactos se toman de los artículos 4° y 7°. Los rubros redondeados proceden del Mensaje.',
    presentation:'Se usa para cotejar el resultado primario, los intereses y la composición económica. Los montos destacados no salariales no representan todo el gasto de cada área.',
    budget:'Administración Central, organismos descentralizados e instituciones previsionales. La cifra votada corresponde al presupuesto inicial de todo el ejercicio.',
    areas:'48 filas del artículo 5°, transcritas en el cuadro publicado por Diputados Bonaerenses. Se excluyen los desgloses internos y los entes no consolidados. La suma coincide con el artículo 4°. Los porcentajes del sitio se calculan sobre el gasto total del proyecto.',
    works:'Selección de filas revisadas en la Planilla 36. Se muestra el crédito de la etiqueta ambiental, con enlace a la página. Una obra compartida aparece en los partidos nombrados sin repartir su monto. No se suman las obras a las transferencias.',
    transfers:'Hoja Acumulado de las planillas de septiembre de 2026 y diciembre de 2025. Total, coparticipación bruta y Fondo de Financiamiento Educativo; el resto es la diferencia. Los cortes tienen distinta duración.',
    geo:'Polígonos de partidos de Buenos Aires de Georef (datos IGN), unidos a las planillas por nombre. Cuatro variantes de denominación se resolvieron explícitamente. Los colores agrupan montos en quintiles.',
    history:'Hoja Buenos Aires de la serie APNF 2005–2025. Recursos percibidos y gastos devengados, datos provisorios. Se evita empalmar esta ejecución con el proyecto 2027.',
    ipc:'Se usa el IPC general de la región Pampeana como referencia regional. Cada monto anual se multiplica por IPC promedio 2025 / IPC promedio del año. La serie real empieza en 2017, primer año con 12 meses de esta fuente.',
    advance:'Columna Buenos Aires del consolidado de la Administración Pública No Financiera (APNF). Acumulado enero a junio de 2026. Las adecuaciones metodológicas de Nación pueden diferir de una publicación provincial.'
  };
  return intro('TRANSPARENCIA','Fuentes y metodología','Cada cifra tiene un documento de origen. Acá podés comprobar qué cubre y cómo se calculó.')+
    '<div class="source-list">'+Object.keys(sources).map(k=>'<article class="panel"><h3>'+source(k)+'</h3><p class="muted no-bottom">'+texts[k]+'</p></article>').join('')+'</div>';
}
function areaParams(input,group){
  return {vista:'gastos',...(input.value.trim()?{q:input.value.trim()}:{}),...(group.value?{grupo:group.value}:{})};
}
function openArea(area,fromLink=false){
  if(!area) return;
  const input=document.querySelector('#area-query'), group=document.querySelector('#area-group');
  if(!fromLink)choose('provincia',{...areaParams(input,group),area:area.id});
  content.innerHTML='<p class="eyebrow">PROYECTO 2027 · '+groups[area.group]+'</p><h2 id="detail-title">'+esc(pretty(area.name))+'</h2><p class="metric">'+money(area.amount)+'</p><p class="muted">'+exact(area.amount)+' · '+share(area.amount,p.spending)+' del gasto total del proyecto.</p><p>Es el crédito propuesto para esta área. Puede incluir varios programas o gastos y todavía no fue ejecutado.</p><p class="small">'+source('project','Art. 5° del proyecto')+' · '+source('areas','Ver cuadro, pág. '+area.page,'#page='+area.page)+'</p>';
  if(!dialog.open)dialog.showModal();
}
function render({focus=false, keepScroll=false}={}){
  const {id,q}=readRoute();
  if(dialog.open)dialog.close();
  document.querySelectorAll('.nav-inner a').forEach(a=>{
    if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  main.innerHTML=({inicio:home,provincia:()=>province(q),municipio:()=>municipality(q),evolucion:()=>historyView(q),fuentes:methodology})[id]();
  document.title=sections[id]+' · Gasto Público PBA';
  if(id==='municipio')updateDistrict();
  if(document.querySelector('#area-list')){
    updateAreas();
    if(q.has('area'))openArea(areas.find(x=>x.id===q.get('area')),true);
  }
  if(!keepScroll)window.scrollTo({top:0,behavior:'instant'});
  if(focus&&!dialog.open)main.focus({preventScroll:true});
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
  if(e.target.id==='area-query'){
    const group=document.querySelector('#area-group');
    choose('provincia',areaParams(e.target,group));updateAreas();
  }
});
function historyChoice(metric,year,id){
  choose('evolucion',{serie:metric,...(year?{anio:year}:{})});render({keepScroll:true});
  if(id)document.getElementById(id)?.focus({preventScroll:true});
}
main.addEventListener('change',e=>{
  const id=e.target.id;
  if(id==='district-select'){muniState.id=e.target.value;updateDistrict(true);}
  if(id==='district-period'){muniState.period=e.target.value;updateDistrict(true);}
  if(id==='area-group'){choose('provincia',areaParams(document.querySelector('#area-query'),e.target));updateAreas();}
  if(id==='history-metric')historyChoice(e.target.value,null,id);
  if(id==='history-year')historyChoice(document.querySelector('#history-metric').value,e.target.value,id);
});
main.addEventListener('click',e=>{
  const district=e.target.closest('[data-district]'), area=e.target.closest('[data-area]'), point=e.target.closest('[data-year]');
  if(district){
    muniState.id=district.dataset.district;updateDistrict(true);
    if(matchMedia('(max-width: 560px)').matches)document.querySelector('#district-info').scrollIntoView({block:'start'});
  }
  if(area)openArea(areas.find(a=>a.id===area.dataset.area));
  if(point)historyChoice(document.querySelector('#history-metric').value,point.dataset.year);
});
dialog.addEventListener('close',()=>{
  const {id,q}=readRoute();
  if(id==='provincia'&&q.has('area')){q.delete('area');choose(id,Object.fromEntries(q));}
});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
window.addEventListener('hashchange',()=>render({focus:true}));
matchMedia('(max-width: 560px)').addEventListener('change',()=>{if(readRoute().id==='evolucion')render({keepScroll:true});});
render();
