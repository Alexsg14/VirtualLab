import {descargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {invalidarValoracion} from '../app/titration.js';
import {llaveBureta, cerrarLlaveBureta} from '../instruments/burette.js';
import { SOLUTOS, CAPACIDADES } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { getRecActivo, seleccionarMesa } from '../app/vessels.js';
import { guardarSnapshot } from '../app/history.js';
import { actualizarVolumen } from '../core/solution.ts';
import { grifo, cerrarGrifo } from '../instruments/water.js';
import { refrescarTrasDosificar } from '../instruments/dosing.js';
import { vertidoActivo } from '../instruments/pouring.js';

export function guardarReservaPersistente() {
  try {localStorage.setItem((labState.modulo==='acidbase'?'lab_reservas_acidbase_v1':'lab_reservas_v1'),JSON.stringify(labState.reservas));}
  catch(e) {document.getElementById('reserva-mensaje').textContent='La reserva está disponible en esta sesión, pero no se ha podido guardar para la próxima apertura.';}
}

export function cargarReservaPersistente() {
  try {
    const rows=JSON.parse(localStorage.getItem(labState.modulo==='acidbase'?'lab_reservas_acidbase_v1':'lab_reservas_v1')||'[]');
    if(Array.isArray(rows)) labState.reservas=rows.filter(x=>x && typeof x.nombre==='string' && x.rec && CAPACIDADES[x.rec.tipo] && SOLUTOS.some(s=>s.id===x.rec.soluteId) && ['masaG','molesN','volH2OMl','capacidadMax'].every(k=>Number.isFinite(x.rec[k]) && x.rec[k]>=0) && x.rec.capacidadMax>0).map(x=>{actualizarVolumen(x.rec);return x;});
  }catch(e){}
}

export function guardarDisolucion() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(vertidoActivo)return;
  const rec=getRecActivo();
  if(rec.volMl<=0 || rec.volH2OMl<=0) {document.getElementById('reserva-mensaje').textContent='Prepara primero una disolución o añade agua.';return;}
  if(grifo.timer!==null) cerrarGrifo();guardarSnapshot();
  const nombre=document.getElementById('reserva-nombre').value.trim() || SOLUTOS.find(s=>s.id===rec.soluteId).nombre+' · '+rec.volMl.toFixed(1)+' mL';
  labState.reservas.push({nombre,rec:{...structuredClone(rec),objetivoTemperatura:undefined,nombreReserva:nombre},fecha:new Date().toISOString()});
  const vacio={...rec,componentes:undefined,indicador:undefined,objetivoTemperatura:undefined,temperaturaC:25,nombreReserva:undefined,masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0};
  invalidarValoracion(rec);
  labState['r'+labState.mesaActiva]=vacio;
  document.getElementById('reserva-nombre').value='';
  document.getElementById('reserva-mensaje').textContent='Guardada. Hay un recipiente vacío listo para preparar otra.';
  guardarReservaPersistente();refrescarTrasDosificar();
}

export function recuperarDisolucion(index, mesaDestino = labState.mesaActiva) {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(vertidoActivo)return;
  const ficha=labState.reservas[index];if(!ficha)return;
  if(grifo.timer!==null) cerrarGrifo();guardarSnapshot();
  const rec=labState['r'+mesaDestino];
  if(rec.volMl>0 || rec.masaG>0) {
    const sol=SOLUTOS.find(s=>s.id===rec.soluteId);
    labState.reservas[index]={nombre:rec.nombreReserva || (sol ? sol.nombre : 'Preparación')+' · '+rec.volMl.toFixed(1)+' mL',rec:{...structuredClone(rec),objetivoTemperatura:undefined},fecha:new Date().toISOString()};
  }else labState.reservas.splice(index,1);
  invalidarValoracion(rec);
  labState['r'+mesaDestino]={...structuredClone(ficha.rec),objetivoTemperatura:undefined,nombreReserva:ficha.nombre};
  guardarReservaPersistente();seleccionarMesa(mesaDestino);
  document.getElementById('reserva-mensaje').textContent='Recuperada: '+ficha.nombre;
  refrescarTrasDosificar();
}

export function eliminarDisolucion(index) {
  const ficha=labState.reservas[index];if(!ficha||vertidoActivo)return;
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null)cerrarLlaveBureta();
  if(grifo.timer!==null)cerrarGrifo();
  guardarSnapshot();labState.reservas.splice(index,1);
  document.getElementById('reserva-mensaje').textContent='Eliminada: '+ficha.nombre+'. Puedes recuperarla con Deshacer.';
  guardarReservaPersistente();refrescarTrasDosificar();
}

export function renderizarReserva() {
  const shelf=document.getElementById('estante-reserva');if(!shelf)return;
  shelf.hidden=labState.reservas.length===0;
  for(const id of ['estante-lista','reserva-lista']) {
    const list=document.getElementById(id);list.replaceChildren();
    labState.reservas.forEach((ficha,i)=>{
      const rec=ficha.rec,sol=SOLUTOS.find(s=>s.id===rec.soluteId);
      const button=document.createElement('button');button.className='reserva-card';button.type='button';button.dataset.reservaIndex=String(i);
      button.title='Recuperar en el recipiente activo; su contenido actual se guarda en la reserva';
      const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=rec.tipo==='matraz' ? '⚗' : '▱';icon.style.cssText='font-size:32px;color:rgb('+sol.rgb.join(',')+')';
      const text=document.createElement('span');text.textContent=ficha.nombre+' · '+rec.volMl.toFixed(2)+' mL · '+(rec.volMl>0 ? rec.molesN/rec.volMl*1000 : 0).toFixed(4)+' mol/L';
      button.append(icon,text);button.addEventListener('click',()=>recuperarDisolucion(i));list.appendChild(button);
      if(id==='reserva-lista'){
        const eliminar=document.createElement('button');eliminar.type='button';eliminar.className='btn btn-gray';
        eliminar.textContent='Eliminar';eliminar.setAttribute('aria-label','Eliminar '+ficha.nombre);
        eliminar.addEventListener('click',()=>eliminarDisolucion(i));list.appendChild(eliminar);
      }
    });
    if(!labState.reservas.length)list.textContent='Todavía no hay disoluciones guardadas.';
  }
}
