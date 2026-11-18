'use strict';
// Gráficos propios en SVG/HTML, sin dependencias: rectángulos de composición, líneas,
// barras divergentes, cascada y áreas apiladas al 100%. Sólo presentan: no redondean datos.
const chartEsc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chartPalette = n => 'var(--c'+(n%8)+')';

// --- Rectángulos de composición (treemap «squarified») ---
function squarify(items, x, y, w, h){
  const out=[], total=items.reduce((s,i)=>s+i.value,0);
  if(!items.length||total<=0)return out;
  const scale=w*h/total, rest=items.map(i=>({...i,area:i.value*scale}));
  let row=[], box={x,y,w,h};
  const worst=(r,len)=>{const s=r.reduce((a,b)=>a+b.area,0),mx=Math.max(...r.map(i=>i.area)),mn=Math.min(...r.map(i=>i.area));return Math.max(len*len*mx/(s*s),s*s/(len*len*mn));};
  const layout=r=>{
    const s=r.reduce((a,b)=>a+b.area,0), horizontal=box.w>=box.h;
    if(horizontal){const cw=s/box.h;let cy=box.y;for(const i of r){const ch=i.area/cw;out.push({...i,x:box.x,y:cy,w:cw,h:ch});cy+=ch;}box={x:box.x+cw,y:box.y,w:box.w-cw,h:box.h};}
    else{const ch=s/box.w;let cx=box.x;for(const i of r){const cw=i.area/ch;out.push({...i,x:cx,y:box.y,w:cw,h:ch});cx+=cw;}box={x:box.x,y:box.y+ch,w:box.w,h:box.h-ch};}
  };
  for(const item of rest){
    const len=Math.min(box.w,box.h);
    if(!row.length||worst([...row,item],len)<=worst(row,len))row.push(item);
    else{layout(row);row=[item];}
  }
  if(row.length)layout(row);
  return out;
}
// items: [{id,label,value,note?,color?}] — onClick se maneja por delegación con data-tile.
function treemap(items,{total,format,label='Composición',height=360,kind='tile',selected=''}={}){
  const sum=total||items.reduce((s,i)=>s+i.value,0);
  const rows=items.filter(i=>i.value>0).sort((a,b)=>b.value-a.value);
  const rects=squarify(rows,0,0,100,100);
  return '<div class="treemap" style="--tm-h:'+height+'px" role="list" aria-label="'+chartEsc(label)+'">'+rects.map((r,i)=>{
    const pct=100*r.value/sum, small=r.w*r.h<55, tiny=r.w<7||r.h<9;
    return '<button type="button" role="listitem" class="tm-tile'+(small?' small':'')+(tiny?' tiny':'')+(r.id===selected?' selected':'')+'" data-'+kind+'="'+chartEsc(r.id)+'" style="left:'+r.x.toFixed(3)+'%;top:'+r.y.toFixed(3)+'%;width:'+r.w.toFixed(3)+'%;height:'+r.h.toFixed(3)+'%;--tile:'+(r.color||chartPalette(i))+'" title="'+chartEsc(r.label+' · '+formatShare(pct)+' · '+format(r.value))+'">'+
      '<span class="tm-label">'+chartEsc(r.label)+'</span><span class="tm-pct">'+formatShare(pct)+'</span><span class="tm-value">'+format(r.value)+'</span></button>';
  }).join('')+'</div>'+
  '<details class="flow-fold"><summary>Ver como tabla</summary><div class="table-wrap"><table><thead><tr><th scope="col">Concepto</th><th scope="col" class="num">Importe</th><th scope="col" class="num">Participación</th></tr></thead><tbody>'+
  rows.map(r=>'<tr><th scope="row">'+chartEsc(r.label)+'</th><td class="num">'+format(r.value)+'</td><td class="num">'+formatShare(100*r.value/sum)+'</td></tr>').join('')+'</tbody></table></div></details>';
}

// --- Escala «linda» para ejes ---
function niceTicks(lo,hi,count=4){
  if(lo===hi){hi=lo+1;}
  const rough=(hi-lo)/count, pow=Math.pow(10,Math.floor(Math.log10(Math.abs(rough)||1)));
  const step=[1,2,2.5,5,10].map(x=>x*pow).find(x=>x>=rough)||10*pow;
  const a=Math.floor(lo/step)*step, b=Math.ceil(hi/step)*step;
  return Array.from({length:Math.round((b-a)/step)+1},(_,i)=>a+i*step);
}

// --- Líneas: varias series sobre los mismos años ---
// series: [{name, values:{year:value}, dashedFrom?, color?}], active: año resaltado
function lineChart({years,series,format,axisFormat=format,label,active,narrow=false,zero=true,height}){
  const width=narrow?340:760, h=height||(narrow?240:290), left=narrow?46:60, right=16, top=16, bottom=34;
  const all=series.flatMap(s=>years.map(y=>s.values[y]).filter(Number.isFinite));
  const ticks=niceTicks(Math.min(zero?0:Infinity,...all),Math.max(zero?0:-Infinity,...all));
  const lo=ticks[0], hi=ticks.at(-1);
  const x=i=>left+(years.length<2?0:i*(width-left-right)/(years.length-1)), y=v=>top+(hi-v)/(hi-lo||1)*(h-top-bottom);
  const every=Math.ceil(years.length/(narrow?5:11));
  let svg='<svg class="chart" viewBox="0 0 '+width+' '+h+'" role="img" aria-label="'+chartEsc(label)+'">';
  svg+=ticks.map(t=>'<line class="grid'+(t===0?' zero':'')+'" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(left-8)+'" y="'+(y(t)+4)+'" text-anchor="end">'+chartEsc(axisFormat(t))+'</text>').join('');
  const lastIdx=years.length-1;
  svg+=years.map((yr,i)=>((i%every===0&&(lastIdx-i>=every/2||i===lastIdx))||i===lastIdx)?'<text x="'+x(i)+'" y="'+(h-10)+'" text-anchor="middle"'+(yr===active?' class="stage-year"':'')+'>'+yr+'</text>':'').join('');
  series.forEach((s,si)=>{
    const color=s.color||chartPalette(si);
    const segments=[];let cur=[],dashed=[];
    years.forEach((yr,i)=>{const v=s.values[yr];if(!Number.isFinite(v)){if(cur.length)segments.push(cur);cur=[];return;}const pt=[x(i),y(v)];if(s.dashedFrom&&yr>=s.dashedFrom){if(!dashed.length&&cur.length)dashed.push(cur.at(-1));dashed.push(pt);}else cur.push(pt);});
    if(cur.length)segments.push(cur);
    svg+=segments.filter(g=>g.length>1).map(g=>'<path class="line" style="stroke:'+color+'" d="'+monotonePath(g)+'"/>').join('');
    if(dashed.length>1)svg+='<path class="line dashed" style="stroke:'+color+'" d="M'+dashed.map(p=>p.join(',')).join(' L')+'"/>';
    svg+=years.map((yr,i)=>{const v=s.values[yr];if(!Number.isFinite(v))return '';return '<circle data-year="'+yr+'" class="'+(yr===active?'active':'')+(s.dashedFrom&&yr>=s.dashedFrom?' hollow':'')+'" style="--dot:'+color+'" cx="'+x(i)+'" cy="'+y(v)+'" r="'+(years.length>24?2.6:years.length>13?3.4:4.5)+'"><title>'+chartEsc(s.name+' · '+yr+' · '+format(v))+'</title></circle>';}).join('');
  });
  svg+='</svg>';
  const legend=series.length>1||series.some(s=>s.dashedFrom)?'<ul class="chart-legend multi">'+series.map((s,si)=>'<li style="--dot:'+(s.color||chartPalette(si))+'">'+chartEsc(s.name)+(s.dashedFrom?' <span class="small">(punteado: '+s.dashedFrom+' en adelante, presupuesto)</span>':'')+'</li>').join('')+'</ul>':'';
  return legend+svg;
}

// --- Barras divergentes alrededor de cero ---
// rows: [{id,label,value,note?,href?}] — value en la unidad de format
function diverging(rows,{format,label,max}={}){
  const m=max||Math.max(...rows.map(r=>Math.abs(r.value)),1e-9);
  return '<ol class="diverging" aria-label="'+chartEsc(label)+'">'+rows.map(r=>{
    const w=Math.min(50,50*Math.abs(r.value)/m), neg=r.value<0;
    const name=r.href?'<a href="'+chartEsc(r.href)+'">'+chartEsc(r.label)+'</a>':chartEsc(r.label);
    return '<li><span class="dv-label">'+name+(r.note?'<small>'+chartEsc(r.note)+'</small>':'')+'</span><span class="dv-track" aria-hidden="true"><span class="dv-bar '+(neg?'neg':'pos')+'" style="'+(neg?'right:50%':'left:50%')+';width:'+w.toFixed(3)+'%"></span></span><strong class="dv-value '+(neg?'red':'green')+'">'+format(r.value)+'</strong></li>';
  }).join('')+'</ol>';
}

// --- Cascada: de los ingresos al resultado ---
// steps: [{label, value, kind:'total'|'up'|'down'}]
function waterfall(steps,{format,label,narrow=false}={}){
  const width=narrow?340:760, h=narrow?260:300, left=narrow?8:12, right=8, top=18, bottom=narrow?62:54;
  let run=0;const bars=steps.map(s=>{let a,b;if(s.kind==='total'){a=0;b=s.value;run=s.value;}else{a=run;b=run+s.value;run=b;}return {...s,a,b};});
  const vals=bars.flatMap(b=>[b.a,b.b]);const ticks=niceTicks(Math.min(0,...vals),Math.max(0,...vals));
  const lo=ticks[0],hi=ticks.at(-1),y=v=>top+(hi-v)/(hi-lo)*(h-top-bottom);
  const slot=(width-left-right)/bars.length, bw=slot*.62;
  let svg='<svg class="chart waterfall" viewBox="0 0 '+width+' '+h+'" role="img" aria-label="'+chartEsc(label)+'">';
  svg+='<line class="grid zero" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
  bars.forEach((b,i)=>{
    const x=left+i*slot+(slot-bw)/2, y1=y(Math.max(b.a,b.b)), y2=y(Math.min(b.a,b.b));
    const cls=b.kind==='total'?(b.b<0?'wf-neg-total':'wf-total'):b.value<0?'wf-down':'wf-up';
    svg+='<rect class="'+cls+'" x="'+x+'" y="'+y1+'" width="'+bw+'" height="'+Math.max(1.5,y2-y1)+'" rx="3"><title>'+chartEsc(b.label+' · '+format(b.value))+'</title></rect>';
    if(i<bars.length-1)svg+='<line class="wf-link" x1="'+(x+bw)+'" x2="'+(x+slot)+'" y1="'+y(b.b)+'" y2="'+y(b.b)+'"/>';
    const below=b.kind==='total'?b.b<0:b.value<0;
    svg+='<text class="wf-value" x="'+(x+bw/2)+'" y="'+(below?y2+15:y1-6)+'" text-anchor="middle">'+chartEsc(format(b.value))+'</text>';
    const words=b.label.split(' '),lines=[];let cur='';for(const w of words){if((cur+' '+w).trim().length>(narrow?11:16)){lines.push(cur.trim());cur=w;}else cur+=' '+w;}lines.push(cur.trim());
    svg+='<text class="wf-label" x="'+(x+bw/2)+'" y="'+(h-bottom+16)+'" text-anchor="middle">'+lines.slice(0,3).map((l,j)=>'<tspan x="'+(x+bw/2)+'" dy="'+(j?14:0)+'">'+chartEsc(l)+'</tspan>').join('')+'</text>';
  });
  return svg+'</svg>';
}

// --- Áreas apiladas al 100% ---
// series: [{name, values:{year:value}}]
function stacked100({years,series,label,narrow=false,active}){
  const width=narrow?340:760, h=narrow?230:280, left=narrow?34:44, right=12, top=10, bottom=30;
  const x=i=>left+i*(width-left-right)/(years.length-1), y=v=>top+(100-v)*(h-top-bottom)/100;
  const totals=years.map(yr=>series.reduce((s,ser)=>s+(ser.values[yr]||0),0));
  let base=years.map(()=>0);
  let svg='<svg class="chart stacked" viewBox="0 0 '+width+' '+h+'" role="img" aria-label="'+chartEsc(label)+'">';
  svg+=[0,25,50,75,100].map(t=>'<line class="grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(left-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+t+'%</text>').join('');
  series.forEach((s,si)=>{
    const tops=years.map((yr,i)=>base[i]+100*(s.values[yr]||0)/(totals[i]||1));
    const d='M'+years.map((_,i)=>x(i)+','+y(tops[i])).join(' L')+' L'+years.map((_,i)=>x(years.length-1-i)+','+y(base[years.length-1-i])).join(' L')+' Z';
    svg+='<path class="area" style="fill:'+(s.color||chartPalette(si))+'" d="'+d+'"><title>'+chartEsc(s.name)+'</title></path>';
    base=tops;
  });
  const every=Math.ceil(years.length/(narrow?5:10)), lastIdx=years.length-1;
  svg+=years.map((yr,i)=>((i%every===0&&lastIdx-i>=every/2)||i===lastIdx)?'<text x="'+x(i)+'" y="'+(h-9)+'" text-anchor="middle"'+(yr===active?' class="stage-year"':'')+'>'+yr+'</text>':'').join('');
  svg+='</svg>';
  return '<ul class="chart-legend multi swatch">'+series.map((s,si)=>'<li style="--dot:'+(s.color||chartPalette(si))+'">'+chartEsc(s.name)+'</li>').join('')+'</ul>'+svg;
}
