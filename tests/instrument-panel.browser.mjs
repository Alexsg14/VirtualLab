import {chromium} from '@playwright/test';import {spawn} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5191','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5191')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5191');await page.waitForSelector('html[data-laboratorio="listo"]');
 await page.locator('#menu-dosificacion').click();await page.locator('#dos-tipo').selectOption('bureta');await page.locator('#dos-carga').fill('40');await page.locator('[onclick="cargarDosificador()"] ').click();await page.keyboard.press('Escape');await page.waitForSelector('#controles-instrumento-escena:not([hidden])');
 const result=await page.evaluate(async()=>{
  const e=await import('/src/scene/engine.js'),i=await import('/src/scene/instruments.js'),THREE=await import('/node_modules/three/build/three.module.js');
  const ui=document.getElementById('controles-instrumento-escena'),observer=new MutationObserver(()=>{});observer.observe(ui,{subtree:true,childList:true});const samples=[];
  for(let k=0;k<160;k++){
   e.camSpherical.theta+=.04;e.camSpherical.phi=.85+.12*Math.sin(k/20);e.actualizarPosicionCamara();
   i.actualizarInstrumento3D(e.scene3D,e.camera3D,e.renderer3D.domElement,performance.now()/1000,{r1:e.liquidContainer1,r2:e.liquidContainer2});
   // Compare against the same camera matrices used by the renderer, not the previous frame.
   e.camera3D.updateMatrixWorld(true);const p=i.instrumento3D.localToWorld(new THREE.Vector3(.25,.4,.15)).project(e.camera3D),canvas=e.renderer3D.domElement.getBoundingClientRect(),host=document.getElementById('panel-central').getBoundingClientRect();
   const x=Math.max(8,Math.min(host.width-ui.offsetWidth-8,canvas.left+(p.x+1)*canvas.width/2-host.left+20));
   const y=Math.max(54,Math.min(host.height-ui.offsetHeight-60,canvas.top+(1-p.y)*canvas.height/2-host.top-24));
   const s=getComputedStyle(ui),m=new DOMMatrix(s.transform==='none'?undefined:s.transform);const actualX=parseFloat(s.left)+m.m41,actualY=parseFloat(s.top)+m.m42;samples.push(Math.hypot(actualX-x,actualY-y));
  }
  const textMutations=observer.takeRecords().length;observer.disconnect();return {maxPixelError:Math.max(...samples),textMutations,samples:samples.length,transform:ui.style.transform};
 });
 console.log(JSON.stringify(result));assert.ok(result.maxPixelError<.1,'El cartel debe seguir la cámara actual en cada fotograma');assert.equal(result.textMutations,0,'Girar no debe reconstruir textos sin cambios');assert.ok(result.transform.startsWith('translate3d('));assert.deepEqual(errors,[]);
 console.log('OK: panel sincronizado con la cámara, transformación subpíxel y texto estable durante una vuelta completa.');
}finally{await browser?.close();server.kill();}