'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createServer } = require('node:http');
const root = path.resolve(__dirname,'..');
const port = Number(process.env.PBA_PORT||8772);
const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1');
    const reqPath=decodeURIComponent(url.pathname).replace(/^\/Presupuesto-PBA(?=\/|$)/,'');
    if(!['','/','/index.html'].includes(reqPath)&&!/^\/assets\/[a-z0-9._-]+$/i.test(reqPath)){
      res.writeHead(404).end('No encontrado');return;
    }
    const file=path.resolve(root,reqPath==='/'||reqPath===''?'index.html':'.'+reqPath);
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':type[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(body);
  } catch {res.writeHead(404).end('No encontrado');}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+'/Presupuesto-PBA/'));
