import {compilarDiarioPDF} from './latex-browser.js';
import {generarDiarioLatex} from '../core/lab-report.ts';
import {getRecActivo} from '../app/vessels.js';
import {labState} from '../state/laboratory.js';
let dialog;
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function abrirDiario(){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='diary-dialog';dialog.setAttribute('aria-labelledby','diary-title');
  dialog.innerHTML='<form method="dialog"><h2 id="diary-title">Diario de laboratorio</h2><p>Estado de la disolución, operaciones registradas y cálculos con factores de conversión.</p><label>Título<input id="diary-name" class="lab-input" maxlength="150" value="Preparación de una disolución"></label><label>Autor (opcional)<input id="diary-author" class="lab-input" maxlength="100" autocomplete="name"></label><label>Observaciones<textarea id="diary-notes" class="lab-input" maxlength="2000" rows="3"></textarea></label><p id="diary-status" role="status"></p><div class="diary-actions"><button type="button" id="diary-pdf" class="btn btn-cyan">Descargar PDF</button><button type="button" id="diary-tex" class="btn btn-gray">Descargar LaTeX</button><button class="btn btn-gray" value="cancel">Cerrar</button></div></form>';
  document.body.append(dialog);
  const data=()=>({rec:structuredClone(getRecActivo()),mesa:labState.mesaActiva,historial:structuredClone(labState.historial.slice(-100)),titulo:document.getElementById('diary-name').value,autor:document.getElementById('diary-author').value,observaciones:document.getElementById('diary-notes').value,fecha:new Date().toISOString()});
  document.getElementById('diary-tex').addEventListener('click',()=>{try{download(new Blob([generarDiarioLatex(data())],{type:'application/x-tex;charset=utf-8'}),'diario_laboratorio.tex');document.getElementById('diary-status').textContent='Fuente LaTeX descargada.';}catch(e){document.getElementById('diary-status').textContent=e.message;}});
  document.getElementById('diary-pdf').addEventListener('click',async()=>{
   const button=document.getElementById('diary-pdf'),status=document.getElementById('diary-status');button.disabled=true;status.textContent='Preparando el diario y compilando los cálculos…';
   try{
    const source=generarDiarioLatex(data());
    const pdf=await compilarDiarioPDF(source,message=>{status.textContent=message;});
    download(pdf,'diario_laboratorio.pdf');status.textContent='Diario PDF generado con LaTeX en este ordenador.';
   }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
  });
 }
 document.getElementById('diary-status').textContent=labState.modulo==='acidbase'?'Primera versión: diario de disoluciones de un único soluto.':'';
  if(!dialog.querySelector('.diary-example')){
  const link=document.createElement('a');link.className='diary-example';link.textContent='Ver ejemplo de PDF';link.href=new URL(`${import.meta.env.BASE_URL}examples/diario_laboratorio_ejemplo.pdf`,location.href).href;link.target='_blank';link.rel='noopener';dialog.querySelector('form').append(link);
 }
 dialog.showModal();
}