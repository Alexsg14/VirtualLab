/** Test the actual static distribution, including a project-path deployment and a real WASM PDF. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.pdf':'application/pdf'};
let server,browser;
try{
 let url=process.env.VIRTUAL_LAB_PAGES_URL;
 if(!url){
  server=createServer(async(req,res)=>{try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(!path.startsWith('/VirtualLab/')){res.writeHead(404).end();return;}
   const relative=decodeURIComponent(path.slice('/VirtualLab/'.length))||'index.html',file=resolve(root,relative);
   if(!file.startsWith(root)){res.writeHead(403).end();return;}
   const bytes=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/VirtualLab/`;
 }
 const target=new URL(url),channel=process.env.PLAYWRIGHT_CHANNEL;
 browser=await chromium.launch({headless:true,...(channel?{channel}:{}),args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==target.origin){external.push(u.href);return route.abort();}return route.continue();});
 await page.goto(target.href);await page.waitForSelector('html[data-laboratorio="listo"]');
 const manifest=await page.request.get(new URL('vendor/latex/manifest.json',target).href);assert.ok(manifest.ok(),'El despliegue debe incluir LaTeX preparado');assert.ok((await manifest.json()).workerSha);
 await page.locator('#menu-soluto').click();await page.locator('#soluto-bote-comercial').click();assert.equal(await page.locator('.cabinet-product').count(),4);assert.equal(await page.locator('[data-product="h2so4-98"]').count(),1);await page.keyboard.press('Escape');
 await page.evaluate(()=>{document.getElementById('inp-gramos').value='5.844';window.agregarSoluto();document.getElementById('inp-disolvente').value='150';window.agregarDisolvente();window.abrirDiario();});
 const pending=page.waitForEvent('download',{timeout:180000});await page.locator('#diary-pdf').click();const file=await pending;assert.equal((await readFile(await file.path())).subarray(0,5).toString(),'%PDF-');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('OK: web estática bajo /VirtualLab/, escena, cuatro botes y PDF compilado en navegador sin conexiones externas.');
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}