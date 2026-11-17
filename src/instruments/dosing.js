import {iniciarDescargaPipeta,descargaPipeta,detenerDescargaPipeta} from './pipette.js';
import {puedeCombinar} from '../core/solution.ts';
import {llaveBureta, actualizarLecturasBureta, cerrarLlaveBureta} from './burette.js';
import { SOLUTOS } from '../data/catalog.ts';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';
import { mostrarError, limpiarError } from '../ui/validation.js';
import { guardarSnapshot, agregarAlHistorial } from '../app/history.js';
import { actualizarVolumen, transferirAlicuota } from '../core/solution.ts';
import { grifo, cerrarGrifo } from './water.js';
import { recalcular } from '../ui/results.js';
import { actualizarEscena3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';

export function instrumentoActivo() {
  return labState.instrumentos[document.getElementById('dos-tipo').value];
}

export function actualizarDosificador() {
  const tipo=document.getElementById('dos-tipo').value;
  const ins=labState.instrumentos[tipo];if(!ins) return;
  document.getElementById('controles-pipeta').hidden=tipo!=='pipeta';
  document.getElementById('controles-bureta').hidden=tipo!=='bureta';
  actualizarLecturasBureta();
  const sol=SOLUTOS.find(x=>x.id===ins.soluteId);
  const contenido=Object.keys(ins.componentes||{}).length>1 ? 'Mezcla ácido-base' : ins.masaG>0 ? sol.nombre : 'Agua destilada';
  document.getElementById('dos-estado').textContent=ins.volMl.toFixed(3)+' / '+ins.capacidadMax+' mL · '+(ins.volMl>1e-9 ? contenido : 'Vacío')+(ins.masaG>0 ? ' · '+(ins.masaG/ins.volMl*1000).toFixed(2)+' g/L' : '');
  document.getElementById('dos-carga').max=ins.capacidadMax;
  document.getElementById('dos-capacidad').value=ins.capacidadMax;
  for(const option of document.getElementById('dos-tipo').options)option.textContent=(option.value==='bureta'?'Bureta':'Pipeta graduada')+' · '+labState.instrumentos[option.value].capacidadMax+' mL';
  const h=90*Math.min(1,ins.volMl/ins.capacidadMax);
  const color=ins.masaG>0 ? 'rgb('+sol.rgb.join(',')+')' : '#53c8ee';
  document.getElementById('dos-visual').innerHTML='<svg width="90" height="130" viewBox="0 0 90 130" aria-label="Nivel del instrumento"><rect x="32" y="8" width="26" height="96" rx="4" fill="#162836" stroke="#b9d5df"/><rect x="35" y="'+(101-h)+'" width="20" height="'+h+'" fill="'+color+'" opacity="0.75"/><path d="M39 104L45 122L51 104" fill="none" stroke="#b9d5df"/>'+[20,40,60,80].map(y=>'<path d="M48 '+y+'h10" stroke="#d6e3ed"/>').join('')+(tipo==='bureta' ? '<g transform="rotate('+llaveBureta.apertura*0.9+' 45 108)"><path d="M26 108h38" stroke="#00bcd4" stroke-width="5" stroke-linecap="round"/></g>' : '')+'</svg>';
}

export function refrescarTrasDosificar() {
  recalcular();renderizarRecipienteSVG(1);renderizarRecipienteSVG(2);actualizarEscena3D();
}
// Transferir componentes, conservando masa, moles y agua en ambos lados.

export function cargarDosificador() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  const ins=instrumentoActivo(),ml=Number(document.getElementById('dos-carga').value);
  const id=document.getElementById('dos-origen').value;
  if(!Number.isFinite(ml)||ml<=0||ml>ins.capacidadMax) {mostrarError('err-dosificador','Indica un volumen positivo dentro de la capacidad del instrumento.');return;}
  if(ins.volMl>1e-9) {mostrarError('err-dosificador','Vacía o utiliza la carga actual antes de volver a cargar.');return;}
  const origen=id==='agua' ? null : labState[id];
  if(origen && (origen.volH2OMl<=0 || ml>origen.volMl+1e-9)) {mostrarError('err-dosificador','El recipiente de origen no contiene suficiente disolución.');return;}
  if(grifo.timer!==null) cerrarGrifo();guardarSnapshot();
  if(origen) transferirAlicuota(origen,ins,Math.min(ml,origen.volMl));
  else {ins.masaG=0;ins.molesN=0;ins.componentes=undefined;ins.indicador=undefined;ins.volH2OMl=ml;ins.temperaturaC=25;actualizarVolumen(ins);}
  labState.montajeDosificador={tipo:document.getElementById('dos-tipo').value,destino:document.getElementById('dos-destino').value};
  if(document.getElementById('dos-tipo').value==='bureta') {ins.lecturaInicial=ins.capacidadMax-ins.volMl;ins.volumenEntregado=0;}
  limpiarError('err-dosificador');
  agregarAlHistorial({tipo:'instrumento',soluto:'Carga de '+document.getElementById('dos-tipo').value,formula:id,cantidad:ml.toFixed(3)+' mL',unidad:'mL'});
  refrescarTrasDosificar();
}

export function dosificar(ml) { iniciarDescargaPipeta(ml); }

export function descartarDosificador() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  const ins=instrumentoActivo();if(ins.volMl<=0) return;
  guardarSnapshot();
  agregarAlHistorial({tipo:'instrumento',soluto:'Descartado de '+document.getElementById('dos-tipo').value,formula:ins.soluteId,cantidad:ins.volMl.toFixed(3)+' mL',unidad:'mL'});
  ins.masaG=0;ins.molesN=0;ins.componentes=undefined;ins.indicador=undefined;ins.volH2OMl=0;ins.temperaturaC=25;ins.lecturaInicial=undefined;ins.volumenEntregado=0;actualizarVolumen(ins);
  limpiarError('err-dosificador');refrescarTrasDosificar();
}

export function cambiarInstrumentoDosificacion() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(labState.montajeDosificador)labState.montajeDosificador={tipo:document.getElementById('dos-tipo').value,destino:document.getElementById('dos-destino').value};
  if(llaveBureta.timer!==null) cerrarLlaveBureta('Llave cerrada al cambiar de instrumento');
  actualizarDosificador();
  actualizarEscena3D();
}

export function cambiarCapacidadDosificador() {
  const ins=instrumentoActivo(), capacidad=Number(document.getElementById('dos-capacidad').value);
  if(!Number.isFinite(capacidad)||capacidad<=0||capacidad<ins.volMl) {
    mostrarError('err-dosificador','La capacidad debe ser positiva y no puede ser menor que el volumen contenido.');
    actualizarDosificador();return;
  }
  if(capacidad===ins.capacidadMax)return;
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null)cerrarLlaveBureta();
  guardarSnapshot();
  const diferencia=capacidad-ins.capacidadMax;
  ins.capacidadMax=capacidad;
  if(document.getElementById('dos-tipo').value==='bureta' && ins.lecturaInicial!==undefined)ins.lecturaInicial+=diferencia;
  limpiarError('err-dosificador');refrescarTrasDosificar();
}
