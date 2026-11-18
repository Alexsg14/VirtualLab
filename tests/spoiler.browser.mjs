import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5194','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5194')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5194');await page.waitForSelector('html[data-laboratorio="listo"]');await page.locator('#modulo-laboratorio').selectOption('acidbase');
 await page.evaluate(async()=>{const {labState}=await import('/src/state/laboratory.js');const c=await import('/src/core/solution.ts');Object.assign(labState.r1,c.crearDisolucion('HCl',.1,25));labState.r1.acidBase=true;Object.assign(labState.instrumentos.bureta,c.crearDisolucion('NaOH',.1,50));labState.instrumentos.bureta.acidBase=true;const t=await import('/src/app/titration.js');t.iniciarRegistroValoracion(labState.instrumentos.bureta,labState.r1,'r1');});
 await page.locator('#menu-curva').click();assert.equal(await page.locator('.curve-spoiler-cover').isVisible(),true);
 assert.equal(await page.locator('#curva-svg').isVisible(),false);
 await page.locator('.spoiler-reveal').click();assert.equal(await page.locator('.spoiler-dialog').isVisible(),true);
 if(process.env.LAB_SCREENSHOT)await page.screenshot({path:process.env.LAB_SCREENSHOT});
 await page.getByRole('button',{name:'Seguir experimentando'}).click();assert.equal(await page.locator('#curva-svg').isVisible(),false);
 await page.locator('.spoiler-reveal').click();await page.getByRole('button',{name:'Sí, visualizar',exact:true}).click();await page.locator('#curva-svg').waitFor({state:'visible'});
 await page.locator('.spoiler-hide').click();await page.locator('.spoiler-reveal').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#curva-svg').isVisible(),false);
 await page.locator('.spoiler-reveal').click();await page.getByRole('button',{name:'Sí, visualizar',exact:true}).click();
 await page.locator('#curva-svg').waitFor({state:'visible'});await page.evaluate(()=>window.alternarCurvaValoracion());await page.locator('#menu-curva').click();await page.locator('#curva-svg').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Nueva valoración',exact:true}).click();assert.equal(await page.locator('#curva-svg').isVisible(),false);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.spoiler-reveal').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('OK: spoiler, confirmacion, cancelar, Escape, revelar, ocultar y reinicio por valoracion.');
}finally{if(browser)await browser.close();server.kill();}