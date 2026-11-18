import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5192','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5192')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,channel:process.env.PLAYWRIGHT_EXECUTABLE_PATH?undefined:process.env.PLAYWRIGHT_CHANNEL||undefined,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5192');await page.waitForSelector('html[data-laboratorio="listo"]');
 await page.locator('#modulo-laboratorio').selectOption('acidbase');
 await page.locator('#menu-reactivos').click();assert.equal(await page.locator('#ab-metodo').inputValue(),'cantidad');
 await page.locator('#ab-cantidad').fill('0.04');await page.locator('#ab-preparar-boton').click();assert.match(await page.locator('#ab-ph').innerText(),/[—-]/);
 await page.keyboard.press('Escape');await page.locator('#menu-agua').click();await page.locator('#inp-enrase').fill('10');await page.locator('[onclick="enrasarHastaVolumen()"] ').click();assert.equal(await page.locator('#ab-ph').innerText(),'13.00');
 await page.keyboard.press('Escape');await page.locator('#menu-acidez').click();await page.locator('#ab-indicador').selectOption('fenolftaleina');await page.locator('[onclick="aplicarIndicador()"] ').click();assert.equal(await page.locator('#ab-color').evaluate(e=>e.style.backgroundColor),'rgb(245, 20, 145)');
 await page.keyboard.press('Escape');if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT+'-rosa.png'});
 await page.evaluate(()=>window.seleccionarMesa(2));await page.locator('#menu-reactivos').click();await page.locator('#ab-reactivo').selectOption('HCl');await page.locator('#ab-cantidad').fill('0.07292');await page.locator('#ab-preparar-boton').click();assert.match(await page.locator('#ab-forma-reactivo').innerText(),/gases/);
 await page.keyboard.press('Escape');await page.locator('#menu-agua').click();await page.locator('#inp-enrase').fill('20');await page.locator('[onclick="enrasarHastaVolumen()"] ').click();assert.equal(await page.locator('#ab-ph').innerText(),'1.00');
 await page.keyboard.press('Escape');await page.locator('#menu-dosificacion').click();await page.locator('#dos-tipo').selectOption('bureta');await page.locator('#dos-origen').selectOption('r2');await page.locator('#dos-carga').fill('20');await page.locator('[onclick="cargarDosificador()"] ').click();await page.locator('#dos-destino').selectOption('r1');await page.evaluate(()=>window.seleccionarMesa(1));
 await page.locator('#menu-curva').click();assert.ok(await page.locator('#flotante-dosificacion').isVisible());assert.ok(await page.locator('#ventana-curva').isVisible());
 const drive=async steps=>page.evaluate(async n=>{const b=await import('/src/instruments/burette.js');b.regularLlaveBureta(25);for(let i=0;i<n;i++){b.llaveBureta.ultimo=performance.now()-500;b.pasoLlaveBureta();}b.cerrarLlaveBureta();const {labState}=await import('/src/state/laboratory.js');return {v:labState.valoracion.volumenMl,count:labState.valoracion.puntos.length};},steps);
 let result=await drive(50);await page.locator('.spoiler-reveal').click();await page.locator('.spoiler-confirm').click();await page.locator('#curva-svg').waitFor({state:'visible'});assert.ok(Math.abs(result.v-5)<1e-8);assert.equal(result.count,51);assert.equal(await page.locator('#ab-ph').innerText(),'12.52');
 result=await drive(50);assert.ok(Math.abs(result.v-10)<1e-8);assert.equal(result.count,101);assert.equal(await page.locator('#ab-ph').innerText(),'7.00');assert.equal(await page.locator('#ab-color').evaluate(e=>e.style.backgroundColor),'rgb(240, 247, 252)');assert.match(await page.locator('#curva-equivalencia').innerText(),/10.000 mL/);
 await page.locator('#curva-poh').check();assert.ok(await page.locator('#curva-svg path').count()>10);await page.locator('.curve-theory summary').click();assert.match(await page.locator('.curve-theory').innerText(),/8,3/);assert.match(await page.locator('.curve-theory').innerText(),/semiequivalencia/);
 if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT+'-curva.png'});
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[onclick="exportarCurvaValoracion()"] ').click()]);assert.equal(download.suggestedFilename(),'curva_valoracion.csv');
 await page.evaluate(()=>window.deshacerOperacion());assert.match(await page.locator('#curva-estado').innerText(),/5.000 mL/);assert.equal(await page.locator('#ab-ph').innerText(),'12.52');
 await page.locator('#modulo-laboratorio').selectOption('disoluciones');assert.equal(await page.locator('#ventana-curva').isVisible(),false);await page.locator('#modulo-laboratorio').selectOption('acidbase');await page.locator('#menu-curva').click();assert.match(await page.locator('#curva-estado').innerText(),/5.000 mL/);
 await page.locator('[onclick="alternarCurvaValoracion()"] ').first().click();
 assert.deepEqual(errors,[]);console.log('OK: reactivos sin stock, preparación con agua, fenolftaleína rosa a pH 13 e incolora a 7, curva descendente, pausas, referencia, pOH, teoría, CSV, deshacer y módulos.');
} finally {if(browser)await browser.close();server.kill();}
