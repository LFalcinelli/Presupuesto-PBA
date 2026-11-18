'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const keys = ['project','areas','municipios','works','history','advance','sources','composition','prior-areas','fiscal-series','additional-fiscal','budget-2026','works-2026','municipal-plus','deflator','employment','tax-history','execution-2026'];
const datasets = Object.fromEntries(keys.map(k => [k,JSON.parse(fs.readFileSync(path.join(root,'data',k+'.json'),'utf8'))]));
fs.writeFileSync(path.join(root,'assets','data.js'),'/* Generado desde data/ por npm run build. */\nconst PBA_DATA = '+JSON.stringify(datasets)+';\n');
