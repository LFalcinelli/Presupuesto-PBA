'use strict';
const fs = require('node:fs');
const path = require('node:path');
require('./pack-data.cjs');
const root = path.resolve(__dirname,'..');
const dist = path.join(root,'dist');
const staticFiles = ['chart-paths.js','charts.js','data.js','favicon.svg','number-format.js','site.css','site.js','fiscal-flow.css','fiscal-flow.js','dm-sans-latin.woff2','dm-sans-OFL.txt'];
const sha = process.env.SITE_BUILD || '';
if (sha && !/^[a-f0-9]{40}$/.test(sha)) throw new Error('SITE_BUILD debe ser un SHA de Git');
fs.mkdirSync(path.join(dist,'assets'),{recursive:true});
for (const dest of [dist,path.join(dist,'assets')]) {
  const expected = dest === dist ? ['index.html','assets'] : staticFiles;
  for (const name of fs.readdirSync(dest)) {
    if (!expected.includes(name)) throw new Error('Archivo fuera del sitio estático: '+name);
  }
}
for (const name of staticFiles) fs.copyFileSync(path.join(root,'assets',name),path.join(dist,'assets',name));
let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
if (sha) {
  html = html.replace(/(\b(?:src|href)="assets\/[^"?#]+\.(?:js|css))"/g,(_,asset)=>asset+'?v='+sha+'"');
  html = html.replace('</head>','  <meta name="site-build" content="'+sha+'">\n</head>');
}
fs.writeFileSync(path.join(dist,'index.html'),html);
