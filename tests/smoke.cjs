'use strict';
// Recorrido visual con Playwright (no corre en GitHub Actions): npx playwright install chromium && node tests/smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.PBA_URL||pathToFileURL(path.join(__dirname,'../index.html')).href;
const output=process.env.PBA_SCREENSHOTS;
async function check(page, hash){
  await page.goto(base+hash);
  await page.locator('h1').first().waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),hash+' con desborde');
}
const mainChart=page=>page.locator('section.panel .chart').first();
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined});
  try{
    for(const width of [375,1440]){
      const page=await browser.newPage({viewport:{width,height:970},reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      for(const theme of ['light','dark']){
        // Inicio: cifras, flujo y claves
        await check(page,'#inicio');
        if(theme==='dark')await page.getByRole('button',{name:'Cambiar tema'}).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
        await page.getByRole('heading',{name:'Gasto Público PBA'}).waitFor();
        assert(await page.evaluate(async()=>{
          await document.fonts.load('700 16px "DM Sans"');
          return [...document.fonts].some(font=>font.family==='DM Sans'&&font.status==='loaded');
        }));
        assert((await page.locator('.metrics').innerText()).includes('58,65'));
        assert.equal(await page.locator('.key-card').count(),4);
        const flow=page.locator('#flujo-fiscal');
        assert.equal(await page.locator('.metrics + #flujo-fiscal').count(),1);
        assert.equal(await flow.locator('.flow-ribbons path').count(),width===375?0:11);
        await flow.getByRole('button',{name:/Impuestos provinciales/}).click();
        await flow.getByRole('button',{name:/Servicios sociales/}).click();
        assert.equal(await flow.locator('[aria-expanded="true"]').count(),2);
        await flow.getByRole('button',{name:'Cada $100',exact:true}).click();
        assert.match(await flow.locator('.flow-in').innerText(),/39,01/);
        await page.reload();
        assert.equal(await flow.locator('[aria-expanded="true"]').count(),2);
        if(output){fs.mkdirSync(output,{recursive:true});await flow.screenshot({path:path.join(output,`flujo-${width}-${theme}.png`)});}

        // Presupuesto 2027
        await check(page,'#presupuesto');
        assert.equal(await page.locator('.subnav a').count(),6);
        assert.equal(await page.locator('.waterfall rect').count(),6);
        await check(page,'#presupuesto?vista=gasto');
        assert.equal(await page.locator('.tm-tile').count(),5);
        assert.equal(await page.locator('.area-card').count(),48);
        await page.getByRole('button',{name:'Quién lo administra',exact:true}).click();
        assert.equal(await page.locator('.tm-tile').count(),48);
        assert(page.url().includes('composicion=who'));
        await page.locator('.tm-tile[data-area="direccion-general-de-cultura-y-educacion"]').click();
        await page.getByRole('dialog').waitFor();
        assert.match(await page.getByRole('dialog').innerText(),/14\.469\.635\.870\.000/);
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({state:'hidden'});
        await check(page,'#provincia?vista=gastos&area=ministerio-de-salud');
        await page.getByRole('dialog').getByRole('heading',{name:'Ministerio de Salud'}).waitFor();
        await page.getByRole('button',{name:'Cerrar'}).click();
        await check(page,'#presupuesto?vista=cambios');
        assert.equal(await page.locator('.diverging li').count(),16);
        assert.match(await page.locator('.metrics').innerText(),/\+12% real/);
        await page.getByRole('button',{name:'Finalidades',exact:true}).click();
        assert.equal(await page.locator('.diverging li').count(),5);
        await check(page,'#provincia?vista=ingresos');
        assert.equal(await page.locator('.tm-tile').count(),10);
        assert.match(await page.locator('main').innerText(),/12,94\s+billones/);
        assert.match(await page.locator('main').innerText(),/14,92\s+billones/);
        await check(page,'#provincia?vista=avance');
        assert.match(await page.locator('main').innerText(),/Qué se ejecutó en el primer semestre/);
        assert.match(await page.locator('main').innerText(),/876\.057\s+millones/);
        await page.getByRole('button',{name:'Diferencia en pesos de 2026',exact:true}).click();
        assert(page.url().includes('medida26=amount'));
        await check(page,'#presupuesto?vista=anexos');
        assert.match(await page.locator('main').innerText(),/531\.425/);
        assert.match(await page.getByRole('link',{name:'Abrir planillas'}).getAttribute('href'),/\.pdf#page=131$/);

        // Mi municipio
        await check(page,'#inicio');
        await page.getByRole('link',{name:'Buscar mi municipio'}).click();
        await page.getByRole('heading',{name:'¿Qué llega a mi municipio?'}).waitFor();
        assert.equal(await page.locator('.map path').count(),135);
        assert.equal(await page.locator('#district-select option').count(),135);
        await page.getByRole('heading',{name:'La Plata',exact:true}).waitFor();
        assert.match(await page.locator('#district-fiscal').innerText(),/Enero–julio/);
        assert.match(await page.locator('#district-works').innerText(),/Presupuesto 2026/);
        assert(await page.locator('#district-ranking li').count()>=20);
        if(output)await page.screenshot({path:path.join(output,`municipios-${width}-${theme}.png`),fullPage:true});
        await page.locator('#district-select').selectOption({label:'Bahía Blanca'});
        await page.getByRole('heading',{name:'Bahía Blanca',exact:true}).waitFor();
        await page.locator('#district-indicator').selectOption('real');
        await page.reload();
        await page.getByRole('heading',{name:'Bahía Blanca',exact:true}).waitFor();
        assert.equal(await page.locator('#district-indicator').inputValue(),'real');
        await page.locator('#district-compare-select').selectOption({label:'La Plata'});
        assert.match(await page.locator('#district-compare').innerText(),/La Plata/);

        // Historia
        await check(page,'#evolucion');
        assert.equal(await mainChart(page).locator('circle').count(),23);
        assert.equal(await mainChart(page).locator('circle.hollow').count(),2);
        await page.getByRole('button',{name:'% del PBG',exact:true}).click();
        assert.equal(await mainChart(page).locator('circle').count(),20);
        await check(page,'#evolucion?serie=pbgShare');
        assert.equal(await page.getByRole('button',{name:'% del PBG',exact:true}).getAttribute('aria-pressed'),'true');
        await page.locator('#history-metric').selectOption('staffCount');
        assert.equal(await mainChart(page).locator('circle').count(),39);
        await page.locator('#history-from').selectOption('2005');
        assert.match(await page.locator('.compare-years').innerText(),/2005 → 2025/);
        await page.getByRole('button',{name:'Recaudación propia',exact:true}).click();
        assert.equal(await page.locator('#composicion-historica .stacked path.area').count(),5);
        assert.equal(await page.locator('#empleo .ranking li').count(),24);
        if(output)await page.screenshot({path:path.join(output,`historia-${width}-${theme}.png`),fullPage:true});

        // Fuentes
        await check(page,'#fuentes');
        assert.equal(await page.locator('.source-list a').count(),Object.keys(require('../data/sources.json')).length);
        assert.equal(await page.locator('.source-list p').filter({hasText:'undefined'}).count(),0);
      }
      assert.deepEqual(errors,[]);
      await page.close();
    }
  }finally{await browser.close();}
  console.log('Cinco secciones, rutas anteriores, mapa e indicadores, composición, variaciones y series: 375/1440 px, claro/oscuro, sin errores.');
})().catch(e=>{console.error(e);process.exitCode=1;});
