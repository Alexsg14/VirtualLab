import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5193','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5193')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,channel:process.env.PLAYWRIGHT_EXECUTABLE_PATH?undefined:process.env.PLAYWRIGHT_CHANNEL||undefined,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(12000);const errors=[];const poll=async predicate=>{for(let i=0;i<300;i++){if(await page.evaluate(predicate))return;await delay(40);}throw Error('La condición no se cumplió');};page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5193');await page.waitForSelector('html[data-laboratorio="listo"]');
 await page.locator('#menu-dosificacion').click();await page.locator('#dos-tipo').selectOption('bureta');await page.locator('#dos-carga').fill('40');await page.locator('[onclick="cargarDosificador()"] ').click();await page.keyboard.press('Escape');await page.waitForSelector('#controles-instrumento-escena:not([hidden])');
 const project=async name=>page.evaluate(async name=>{const i=await import('/src/scene/instruments.js'),e=await import('/src/scene/engine.js'),THREE=await import('/node_modules/three/build/three.module.js');e.camera3D.updateMatrixWorld();i.instrumento3D.updateMatrixWorld(true);const mesh=i.instrumento3D.getObjectByName(name);const p=mesh.getWorldPosition(new THREE.Vector3()).project(e.camera3D),r=e.renderer3D.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},name);
 let before=await page.evaluate(async()=>{const i=await import('/src/scene/instruments.js');return {x:i.instrumento3D.position.x,y:i.instrumento3D.position.y,level:i.instrumento3D.userData.liquid.scale.y};});assert.equal(before.x,-2);assert.ok(before.y>2.4);
 let key=await project('llave-bureta');assert.ok(key.y>95&&key.y<900);await page.mouse.click(key.x,key.y);await page.waitForFunction(()=>document.getElementById('escena-llave').getAttribute('aria-pressed')==='true');await page.locator('#escena-apertura').fill('100');await poll(async()=>{const {labState}=await import('/src/state/laboratory.js');return labState.instrumentos.bureta.volMl<38.5;});
 const flowing=await page.evaluate(async()=>{const i=await import('/src/scene/instruments.js');return{level:i.instrumento3D.userData.liquid.scale.y,jet:i.instrumento3D.userData.jet.visible};});assert.ok(flowing.level<before.level);assert.ok(flowing.jet);
 if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT+'-bureta.png'});
 key=await project('llave-bureta');await page.mouse.click(key.x,key.y);await page.waitForFunction(()=>document.getElementById('escena-llave').getAttribute('aria-pressed')==='false');
 // At 1% the instrument delivers immediately and forms falling drops.
 const clearance=await page.evaluate(async()=>{const {instrumento3D:g}=await import('/src/scene/instruments.js');return {rod:g.getObjectByName('varilla-soporte-bureta').position.x,foot:g.getObjectByName('base-soporte-bureta').position.x-0.325};});assert.ok(clearance.rod>1.5&&clearance.foot>1.3,'Soporte fuera del volumen del vaso');
 const lowStart=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');return labState.r1.volMl;});
 await page.locator('#escena-apertura').fill('1');
 await page.waitForFunction(()=>document.getElementById('escena-apertura-texto').textContent.includes('0,020 mL/s'));
 await poll(async()=>{const {instrumento3D:g}=await import('/src/scene/instruments.js');return g.userData.pendant.visible&&!g.userData.jet.visible&&g.userData.pendant.scale.x>0.25;});
 await poll(async()=>{const {instrumento3D:g}=await import('/src/scene/instruments.js');return g.userData.drops.some(d=>d.visible&&d.position.y<-0.06);});
 const lowEnd=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');return labState.r1.volMl;});assert.ok(lowEnd>lowStart,'El destino recibe liquido al 1%');
 if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT+'-gotas.png'});
 await page.locator('#escena-llave').click();
 // 13% previously exhausted the eight-drop pool and produced bursts.
 const cadence=await page.evaluate(async()=>{
  const b=await import('/src/instruments/burette.js'),i=await import('/src/scene/instruments.js'),e=await import('/src/scene/engine.js');
  b.regularLlaveBureta(13);clearInterval(b.llaveBureta.timer);
  const u=i.instrumento3D.userData,t=performance.now()/1000,events=new Set();
  u.lastFlowTime=t;u.dropVolume=0;for(const d of u.drops)d.userData.born=null;
  // Include a long frame: timestamps must remain spaced, not bunch at resume.
  let elapsed=0;
  for(let k=0;k<240;k++){
   elapsed+=k===100?0.3:1/60;
   i.actualizarInstrumento3D(e.scene3D,e.camera3D,e.renderer3D.domElement,t+elapsed,{r1:e.liquidContainer1,r2:e.liquidContainer2});
   for(const d of u.drops)if(d.userData.born!=null)events.add(d.userData.born);
  }
  u.lastFlowTime=performance.now()/1000;u.dropVolume=0;for(const d of u.drops)d.userData.born=null;
  b.cerrarLlaveBureta();return [...events].sort((a,b)=>a-b);
 });
 assert.ok(cadence.length>35,'Goteo sostenido sin agotar las gotas disponibles');
 for(let k=1;k<cadence.length;k++)assert.ok(Math.abs(cadence[k]-cadence[k-1]-0.025/0.26)<1e-7,'Cadencia regular al 13%, sin rafagas');
 const conservation=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');return labState.r1.volMl+labState.instrumentos.bureta.volMl;});assert.ok(Math.abs(conservation-40)<1e-7);
 await page.locator('#menu-dosificacion').click();await page.locator('#dos-destino').selectOption('r2');await page.locator('#dos-tipo').selectOption('pipeta');await page.locator('#dos-carga').fill('10');await page.locator('[onclick="cargarDosificador()"] ').click();await page.keyboard.press('Escape');await poll(async()=>{const i=await import('/src/scene/instruments.js');return i.instrumento3D?.userData.tipo==='pipeta';});
 await page.locator('#escena-dosis').fill('2');const pump=await project('pulsador-pipeta');assert.ok(pump.y>95&&pump.y<900);await page.mouse.click(pump.x,pump.y);await poll(async()=>{const {descargaPipeta}=await import('/src/instruments/pipette.js');return descargaPipeta.timer!==null;});await page.waitForTimeout(120);
 let partial=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');return{source:labState.instrumentos.pipeta.volMl,target:labState.r2.volMl};});assert.ok(partial.source<10&&partial.source>8);assert.ok(partial.target>0&&partial.target<2);
 if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT+'-pipeta.png'});
 await poll(async()=>{const {descargaPipeta}=await import('/src/instruments/pipette.js');return descargaPipeta.timer===null;});
 let final=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');return{source:labState.instrumentos.pipeta.volMl,target:labState.r2.volMl};});assert.ok(Math.abs(final.source-8)<1e-7);assert.ok(Math.abs(final.target-2)<1e-7);
 await page.locator('#escena-gota').click();await poll(async()=>{const {labState}=await import('/src/state/laboratory.js');const {descargaPipeta}=await import('/src/instruments/pipette.js');return descargaPipeta.timer===null&&Math.abs(labState.r2.volMl-2.05)<1e-7;});
 await page.locator('#escena-dosis').fill('1');await page.locator('#escena-descargar').click();await poll(async()=>{const {descargaPipeta}=await import('/src/instruments/pipette.js');return descargaPipeta.timer!==null;});await page.waitForTimeout(80);await page.evaluate(()=>window.deshacerOperacion());
 let undone=await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');const {descargaPipeta}=await import('/src/instruments/pipette.js');return {s:labState.instrumentos.pipeta.volMl,v:labState.r2.volMl,running:descargaPipeta.timer!==null};});assert.ok(Math.abs(undone.s-7.95)<1e-7);assert.ok(Math.abs(undone.v-2.05)<1e-7);assert.equal(undone.running,false);
 await page.locator('#escena-dosis').fill('7.95');await page.locator('#escena-descargar').click();await poll(async()=>{const {labState}=await import('/src/state/laboratory.js');const {descargaPipeta}=await import('/src/instruments/pipette.js');return descargaPipeta.timer===null&&labState.instrumentos.pipeta.volMl<1e-8;});
 assert.equal(await page.evaluate(async()=>{const {instrumento3D}=await import('/src/scene/instruments.js');return instrumento3D.userData.liquid.visible;}),false);
 await page.locator('#escena-retirar').click();await page.waitForSelector('#controles-instrumento-escena[hidden]',{state:'attached'});
 assert.deepEqual(errors,[]);console.log('OK: bureta 3D encima del destino, llave por clic y caudal, nivel decreciente, chorro, pipeta por pulsador, descarga progresiva, gotas, conservación, retirada.');
}finally{if(browser)await browser.close();server.kill();}
