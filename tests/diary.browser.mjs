import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5197','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5197')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1'){external.push(u.href);await route.abort();}else await route.continue();});
 await page.goto('http://127.0.0.1:5197');await page.waitForSelector('html[data-laboratorio="listo"]');
 await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');const {crearDisolucion}=await import('/src/core/solution.ts');Object.assign(labState.r1,crearDisolucion('NaCl',.5,200));labState.mesaActiva=1;window.abrirDiario();});
 await page.locator('#diary-author').fill('Ensayo & cálculos');
 const texDownload=page.waitForEvent('download');await page.locator('#diary-tex').click();const file=await texDownload;const text=await readFile(await file.path(),'utf8');assert.ok(text.includes('5{,}844'));assert.ok(text.includes('Ensayo \\&'));
 const example=await page.request.get('http://127.0.0.1:5197/examples/diario_laboratorio_ejemplo.pdf');assert.equal(example.status(),200);assert.ok((await example.body()).subarray(0,5).toString()==='%PDF-');
 let hasAssets=false;try{const manifest=await page.request.get('http://127.0.0.1:5197/vendor/latex/manifest.json');hasAssets=manifest.ok()&&manifest.headers()['content-type']?.includes('json');}catch{}
 if(hasAssets){const pending=page.waitForEvent('download',{timeout:180000});await page.locator('#diary-pdf').click();const pdf=await pending;assert.equal((await readFile(await pdf.path())).subarray(0,5).toString(),'%PDF-');console.log('OK: PDF real compilado en navegador sin conexiones externas.');}
 else {await page.locator('#diary-pdf').click();await page.waitForFunction(()=>document.getElementById('diary-status').textContent.includes('preparar:latex'));console.log('OK: fuente LaTeX, ejemplo PDF y aviso de recursos pendientes. Compilacion WASM pendiente de preparar recursos.');}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{if(browser)await browser.close();server.kill();}