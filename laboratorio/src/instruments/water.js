import {descargaPipeta,detenerDescargaPipeta} from './pipette.js';
import {agregarAgua,aguaParaEnrasar} from '../core/solution.ts';
import {llaveBureta, cerrarLlaveBureta} from './burette.js';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { getRecActivo, getCapacidadMax } from '../app/vessels.js';
import { mostrarError, limpiarError, validarPositivo } from '../ui/validation.js';
import { guardarSnapshot, agregarAlHistorial } from '../app/history.js';
import { actualizarVolumen } from '../core/solution.ts';
import { agregarDisolvente } from '../app/preparation.js';
import { recalcular } from '../ui/results.js';
import { actualizarEscena3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';

export function enrasarHastaVolumen() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(grifo.timer!==null) cerrarGrifo();
  const destino = Number(document.getElementById('inp-enrase').value);
  const rec = getRecActivo();
  if (!validarPositivo(destino, 'err-disolvente')) return;
  actualizarVolumen(rec);
  if (destino > getCapacidadMax(rec) || destino < rec.volMl - 1e-9) {
    mostrarError('err-disolvente', 'El volumen final debe ser al menos el actual y no superar la capacidad. Enrasar solo agrega agua.');
    return;
  }
  const agua = aguaParaEnrasar(rec,destino);
  if (agua <= 1e-9) { limpiarError('err-disolvente'); return; }
  document.getElementById('inp-disolvente').value = agua;
  agregarDisolvente();
}

export function enrasarHastaCapacidad() {
  document.getElementById('inp-enrase').value = getCapacidadMax(getRecActivo());
  enrasarHastaVolumen();
}
// El reloj del grifo funciona tambien en la vista 2D.

export const grifo = {timer:null, mesa:1, ultimo:0, aportado:0};

export function cerrarGrifo(motivo='Cerrado') {
  if(grifo.timer!==null) clearInterval(grifo.timer);
  grifo.timer=null;
  document.getElementById('grifo-boton').textContent='Abrir grifo';
  document.getElementById('grifo-estado').textContent=motivo;
  if(grifo.aportado>0) agregarAlHistorial({tipo:'disolvente',soluto:'Agua (grifo)',formula:'H2O',cantidad:grifo.aportado.toFixed(3)+' mL',unidad:'mL'});
  grifo.aportado=0;
  actualizarEscena3D();
}

export function limiteGrifo(rec) {
  const texto=document.getElementById('grifo-limite').value.trim();
  const limite=texto==='' ? getCapacidadMax(rec) : Number(texto);
  return Number.isFinite(limite) && limite>0 ? Math.min(limite,getCapacidadMax(rec)) : NaN;
}

export function alternarGrifo() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(grifo.timer!==null) {cerrarGrifo();return;}
  const rec=getRecActivo(), limite=limiteGrifo(rec);
  if(!Number.isFinite(limite) || limite<=rec.volMl) {
    mostrarError('err-disolvente','El límite debe superar el volumen actual.');return;
  }
  limpiarError('err-disolvente');guardarSnapshot();
  grifo.mesa=labState.mesaActiva;grifo.ultimo=performance.now();grifo.aportado=0;
  grifo.timer=setInterval(pasoGrifo,50);
  document.getElementById('grifo-boton').textContent='Cerrar grifo';
}

export function pasoGrifo() {
  if(labState.mesaActiva!==grifo.mesa) {cerrarGrifo('Cerrado al cambiar de recipiente');return;}
  const ahora=performance.now(), dt=Math.min((ahora-grifo.ultimo)/1000,0.2);
  grifo.ultimo=ahora;
  const rec=getRecActivo(),limite=limiteGrifo(rec);
  if(!Number.isFinite(limite)) {cerrarGrifo('Límite no válido');return;}
  const caudal=Math.max(0,Math.min(50,Number(document.getElementById('grifo-caudal').value)||0));
  const agua=limite>rec.volMl+1e-9?Math.max(0,Math.min(caudal*dt,aguaParaEnrasar(rec,limite))):0;
  if(agua>0) {
    agregarAgua(rec,agua);grifo.aportado+=agua;
    const k=grifo.mesa;
    fluidPhysics['rippleAmp'+k]=Math.min(0.035,caudal*0.0008);
    fluidPhysics['sloshVelX'+k]+=agua*0.002;
    recalcular();renderizarRecipienteSVG(k);actualizarEscena3D();
  }
  document.getElementById('grifo-estado').textContent='Abierto · '+caudal.toFixed(1)+' mL/s · '+rec.volMl.toFixed(2)+' / '+limite.toFixed(2)+' mL';
  if(rec.volMl>=limite-1e-9) cerrarGrifo('Límite alcanzado: '+rec.volMl.toFixed(2)+' mL');
}

// Ondas amortiguadas bajo gravedad: solo se deforma la capa superior.
// Modelo de superficie libre, sin rotar el volumen ni despegarlo del fondo.
