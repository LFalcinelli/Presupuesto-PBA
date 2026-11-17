'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.PBA_URL||pathToFileURL(path.join(__dirname,'../index.html')).href;
const output=process.env.PBA_SCREENSHOTS;
async function check(page, hash){
  await page.goto(base+hash);
  await page.locator('h1').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),hash+' con desborde');
}
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined});
  try{
    for(const width of [375,1440]){
      const page=await browser.newPage({viewport:{width,height:970},reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      for(const theme of ['light','dark']){
        await check(page,'#inicio');
        if(theme==='dark')await page.getByRole('button',{name:'Cambiar tema'}).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
        await page.getByRole('heading',{name:'Gasto Público PBA'}).waitFor();
        assert((await page.locator('.metrics').innerText()).includes('58,65'));
        if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`inicio-${width}-${theme}.png`),fullPage:true});}
        await page.getByRole('link',{name:'Buscar mi municipio'}).click();
        await page.getByRole('heading',{name:'¿Qué llega a mi municipio?'}).waitFor();
        assert.equal(await page.locator('.map path').count(),135);
        assert.equal(await page.locator('#district-select option').count(),135);
        await page.getByRole('heading',{name:'La Plata',exact:true}).waitFor();
        assert.match(await page.locator('#district-works').innerText(),/Planta potabilizadora/);
        if(output)await page.screenshot({path:path.join(output,`municipios-${width}-${theme}.png`),fullPage:true});
        await page.locator('#district-select').selectOption({label:'Bahía Blanca'});
        await page.getByRole('heading',{name:'Bahía Blanca'}).waitFor();
        await page.locator('#district-period').selectOption('previous');
        assert.match(await page.locator('#district-info').innerText(),/diciembre 2025/i);
        await page.reload();
        await page.getByRole('heading',{name:'Bahía Blanca'}).waitFor();
        assert.equal(await page.locator('#district-period').inputValue(),'previous');
        await page.locator('.map path[data-district]:not(.selected)').first().dispatchEvent('click');
        assert.notEqual(await page.locator('#district-select').inputValue(),await page.locator('#district-select option').filter({hasText:'Bahía Blanca'}).getAttribute('value'));
        await check(page,'#provincia?vista=gastos');
        assert.equal(await page.locator('.area-card').count(),48);
        await page.getByRole('searchbox').fill('educacion');
        await page.getByRole('button',{name:/Dirección General de Cultura y Educación/}).click();
        await page.getByRole('dialog').waitFor();
        assert.match(await page.getByRole('dialog').innerText(),/14\.469\.635\.870\.000/);
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({state:'hidden'});
        await page.waitForFunction(()=>!location.hash.includes('&area='));
        await check(page,'#provincia?vista=gastos&area=ministerio-de-salud');
        await page.getByRole('dialog').getByRole('heading',{name:'Ministerio de Salud'}).waitFor();
        await page.getByRole('button',{name:'Cerrar'}).click();
        await check(page,'#provincia?vista=ingresos');
        assert.match(await page.locator('details[open]').first().innerText(),/Ingresos Brutos/);
        await check(page,'#provincia?vista=avance');
        assert.match(await page.locator('main').innerText(),/917\.484\s+millones/);
        await check(page,'#provincia?vista=resumen');
        assert.match(await page.locator('main').innerText(),/Déficit/);
        await check(page,'#evolucion');
        assert.equal(await page.locator('.chart circle').count(),9);
        await page.locator('#history-metric').selectOption('balance');
        assert.equal(await page.locator('.chart circle').count(),21);
        await page.locator('#history-year').selectOption('2005');
        assert.match(await page.locator('.chart-value').innerText(),/2005/);
        await check(page,'#fuentes');
        assert.equal(await page.locator('.source-list a').count(),10);
      }
      assert.deepEqual(errors,[]);
      await page.close();
    }
  }finally{await browser.close();}
  console.log('Cinco secciones, rutas directas, mapa y períodos, fichas y series: 375/1440 px, claro/oscuro, sin errores.');
})().catch(e=>{console.error(e);process.exitCode=1;});
