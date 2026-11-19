import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5195','--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5195')).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5195');await page.waitForSelector('html[data-laboratorio="listo"]');await page.locator('#menu-soluto').click();await page.locator('#soluto-bote-comercial').click();
 const state=()=>page.evaluate(()=>{const d=document.querySelector('.cabinet-dialog'),l=document.querySelector('.cabinet-list'),a=document.querySelector('.cabinet-detail');return {dialog:d.scrollTop,list:l.scrollTop,left:l.scrollLeft,detail:a.scrollTop,header:document.querySelector('.cabinet-header').getBoundingClientRect().y};});
 let before=await state();let rect=await page.locator('.cabinet-detail').boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+100);await page.mouse.wheel(0,400);await page.waitForFunction(()=>document.querySelector('.cabinet-detail').scrollTop>100);let after=await state();assert.equal(after.list,before.list);assert.equal(after.dialog,0);assert.equal(after.header,before.header);
 before=after;rect=await page.locator('.cabinet-list').boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+100);await page.mouse.wheel(0,350);await page.waitForFunction(()=>document.querySelector('.cabinet-list').scrollTop>50);after=await state();assert.equal(after.detail,before.detail);assert.equal(after.dialog,0);assert.equal(after.header,before.header);
 await page.screenshot({path:'D:/VIRTUAL_LAB/output/cabinet-scroll-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.querySelector('.cabinet-detail').scrollTop=0;document.querySelector('.cabinet-list').scrollTop=0;});
 rect=await page.locator('.cabinet-detail').boundingBox();before=await state();await page.mouse.move(rect.x+rect.width/2,rect.y+70);await page.mouse.wheel(0,300);await page.waitForFunction(()=>document.querySelector('.cabinet-detail').scrollTop>100);after=await state();assert.equal(after.list,before.list);assert.equal(after.left,before.left);assert.equal(after.dialog,0);assert.equal(after.header,before.header);
 rect=await page.locator('.cabinet-list').boundingBox();before=after;await page.mouse.move(rect.x+rect.width/2,rect.y+70);await page.mouse.wheel(300,0);await page.waitForFunction(()=>document.querySelector('.cabinet-list').scrollLeft>20);after=await state();assert.equal(after.detail,before.detail);assert.equal(after.dialog,0);
 await page.screenshot({path:'D:/VIRTUAL_LAB/output/cabinet-scroll-mobile.png'});
 assert.deepEqual(errors,[]);await page.keyboard.press('Escape');assert.equal(await page.locator('.cabinet-dialog').isVisible(),false);
 console.log('OK: rueda independiente en lista y ficha, cabecera fija, móvil y Escape.');
}finally{await browser?.close();server.kill();}