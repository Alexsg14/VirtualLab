import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const root=fileURLToPath(new URL('../',import.meta.url));
const built=process.env.LAB_TEST_BUILD==='1';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native',...(built?['preview']:[]),'--host','127.0.0.1','--port','5187','--strictPort'],{cwd:root,windowsHide:true,stdio:'pipe'});
let output='';server.stdout.on('data',x=>output+=x);server.stderr.on('data',x=>output+=x);
let browser;
try {
 const url='http://127.0.0.1:5187';let ready=false;
 for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,'Servidor disponible: '+output);
 browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_EXECUTABLE_PATH?undefined:process.env.PLAYWRIGHT_CHANNEL||undefined,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const external=[];page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(url);await page.waitForSelector('html[data-laboratorio="listo"]');
 assert.equal(await page.locator('#canvas-3d-container canvas').count(),1,'Escena WebGL');
 const open=async id=>{if(!await page.locator('#flotante-'+id).isVisible())await page.locator('#menu-'+id).click();};
 const close=()=>page.keyboard.press('Escape');
 // Volumen final: agua primero frente a enrase.
 await open('agua');await page.locator('#inp-disolvente').fill('100');await page.locator('[onclick="agregarDisolvente()"] ').click();await close();
 await open('soluto');await page.locator('#inp-gramos').fill('20');await page.locator('[onclick="agregarSoluto()"] ').click();
 assert.equal(await page.locator('#res-vol-disolucion').innerText(),'106.9 mL');
 assert.equal(await page.locator('#res-masica').innerText(),'187.100 g/L');await close();
 await open('acciones');await page.locator('[onclick="vaciarRecipiente()"] ').click();await close();
 await open('soluto');await page.locator('#inp-gramos').fill('20');await page.locator('[onclick="agregarSoluto()"] ').click();await close();
 await open('agua');await page.locator('#inp-enrase').fill('100');await page.locator('[onclick="enrasarHastaVolumen()"] ').click();
 assert.equal(await page.locator('#res-vol-disolucion').innerText(),'100.0 mL');assert.equal(await page.locator('#res-masica').innerText(),'200.000 g/L');await close();
 // Dosis de 0,05 mL desde una pipeta con una carga independiente.
 await open('dosificacion');await page.locator('#dos-origen').selectOption('r1');await page.locator('#dos-carga').fill('10');await page.locator('[onclick="cargarDosificador()"] ').click();await page.locator('#dos-destino').selectOption('r2');await page.locator('[onclick*="dos-gota"]').click();await page.waitForFunction(()=>document.getElementById('dos-estado').textContent.startsWith('9.950'));assert.match(await page.locator('#dos-estado').innerText(),/9[.,]950/);await close();
 // Vertido real desde vaso hacia matraz, parcial y reversible.
 await open('acciones');await page.locator('#vertido-ml').fill('20');await page.locator('#btn-verter').click();if(process.env.LAB_SCREENSHOT){await page.waitForTimeout(1000);await page.screenshot({path:process.env.LAB_SCREENSHOT});}await page.waitForFunction(()=>!document.querySelector('#btn-verter').disabled);assert.match(await page.locator('#estado-vertido').innerText(),/20[.,]00 mL/);await close();
 // Guardar y recuperar matraz, conservación después de recargar.
 await page.evaluate(()=>window.seleccionarMesa(2));await open('reserva');await page.locator('#reserva-nombre').fill('Preparación de prueba');await page.locator('[onclick="guardarDisolucion()"] ').click();assert.equal(await page.locator('#reserva-lista button.reserva-card').count(),1);assert.equal(await page.locator('#res-vol-disolucion').innerText(),'0.0 mL');await close();await page.reload();await page.waitForSelector('html[data-laboratorio="listo"]');assert.equal(await page.locator('#estante-lista button.reserva-card').count(),1);await page.evaluate(()=>window.seleccionarMesa(2));await page.locator('#estante-lista button.reserva-card').click();assert.ok(Math.abs(parseFloat(await page.locator('#res-vol-disolucion').innerText())-20.05)<=0.051,'Volumen recuperado, redondeado a una décima');
 // Desplazamiento Shift sin rotación en desarrollo.
 if(!built){const before=await page.evaluate(async()=>{const c=await import('/src/scene/engine.js');return {x:c.camTarget.x,y:c.camTarget.y,theta:c.camSpherical.theta};});const box=await page.locator('#canvas-3d-container canvas').boundingBox();await page.keyboard.down('Shift');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+20,{steps:5});await page.mouse.up();await page.keyboard.up('Shift');const after=await page.evaluate(async()=>{const c=await import('/src/scene/engine.js');return {x:c.camTarget.x,y:c.camTarget.y,theta:c.camSpherical.theta};});assert.notEqual(after.x,before.x);assert.equal(after.theta,before.theta);}
 await page.evaluate(()=>window.seleccionarMesa(1));await open('grifo');await page.locator('#grifo-limite').fill('75');await page.locator('#grifo-caudal').fill('50');await page.locator('#grifo-boton').click();await page.waitForFunction(()=>document.getElementById('grifo-estado').textContent.includes('alcanzado'));assert.equal(await page.locator('#res-vol-disolucion').innerText(),'75.0 mL');await close();
 await page.setViewportSize({width:390,height:844});await open('soluto');const bounds=await page.locator('#flotante-soluto').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);await close();
 if(!built){
 const checks=await page.evaluate(async()=>{
  const {labState}=await import('/src/state/laboratory.js'),c=await import('/src/core/solution.ts');const results=[];
  for(const id of ['NaCl','NaOH'])for(const enrasada of [false,true]){
   const r=c.crearDisolucion(id,.5,250);if(!enrasada){r.volH2OMl=250;c.actualizarVolumen(r);}
   Object.assign(labState.r1,r);window.seleccionarMesa(1);labState.desafioActivo={soluto:id,volMl:250,molL:.5};window.verificarDesafio();
   results.push({id,enrasada,aceptada:labState.desafioActivo===null,pista:document.getElementById('res-verificacion').textContent});
  }return results;
 });
 for(const r of checks){assert.equal(r.aceptada,r.enrasada);if(!r.enrasada)assert.match(r.pista,/volumen final/i);}
 }
 assert.deepEqual(errors,[],'Sin errores de JavaScript');assert.deepEqual(external,[],'Sin peticiones a CDNs');
 console.log('OK '+(built?'producción':'desarrollo')+': WebGL, menús, enrase, concentración, pipeta, vertido, reserva, grifo, cámara y móvil.');
} finally {if(browser)await browser.close();server.kill();}
