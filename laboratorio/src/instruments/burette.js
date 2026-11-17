import {iniciarRegistroValoracion,registrarAdicionBureta} from '../app/titration.js';
import {puedeCombinar} from '../core/solution.ts';
import {labState, fluidPhysics} from '../state/laboratory.js';
import {getCapacidadMax} from '../app/vessels.js';
import {guardarSnapshot, agregarAlHistorial} from '../app/history.js';
import {transferirAlicuota,maximoTransferible} from '../core/solution.ts';
import {mostrarError, limpiarError} from '../ui/validation.js';
import {grifo, cerrarGrifo} from './water.js';
import {actualizarDosificador, refrescarTrasDosificar} from './dosing.js';
import {vertidoActivo} from './pouring.js';

export const llaveBureta = {apertura:0, timer:null, ultimo:0, destino:'r1', entregadoSesion:0};
// El porcentaje corresponde a la fracción del caudal máximo (2 mL/s).
export const caudalBureta = apertura => 2 * Math.max(0,Math.min(100,Number(apertura)||0)) / 100;
const numero = n => n.toLocaleString('es-ES', {minimumFractionDigits:3, maximumFractionDigits:3});

export function actualizarLecturasBureta() {
  const ins = labState.instrumentos.bureta;
  const actual = ins.capacidadMax - ins.volMl;
  document.getElementById('bureta-lectura-inicial').textContent = numero(ins.lecturaInicial ?? actual) + ' mL';
  document.getElementById('bureta-lectura-actual').textContent = numero(actual) + ' mL';
  document.getElementById('bureta-entregado').textContent = numero(ins.volumenEntregado || 0) + ' mL';
  document.getElementById('bureta-apertura').value = llaveBureta.apertura;
  document.getElementById('bureta-apertura-texto').textContent = llaveBureta.apertura + ' %';
  const abierta = llaveBureta.apertura > 0;
  const caudal = caudalBureta(llaveBureta.apertura);
  document.getElementById('bureta-caudal').textContent = (abierta ? 'Llave abierta' : 'Llave cerrada') + ' · ' + numero(caudal) + ' mL/s';
  const button = document.getElementById('bureta-llave');
  button.setAttribute('aria-pressed', String(abierta));
  button.style.setProperty('--giro-llave', (llaveBureta.apertura * 0.9) + 'deg');
  document.getElementById('bureta-llave-texto').textContent = abierta ? 'Cerrar llave' : 'Abrir llave';
  document.getElementById('aviso-bureta').hidden = !abierta;
  document.getElementById('bureta-aviso-texto').textContent = 'Bureta → R' + llaveBureta.destino.slice(1) + ' · ' + numero(ins.volumenEntregado || 0) + ' mL · ' + numero(caudal) + ' mL/s';
}

export function cerrarLlaveBureta(motivo = 'Llave cerrada') {
  if (llaveBureta.timer !== null) clearInterval(llaveBureta.timer);
  llaveBureta.timer = null;
  llaveBureta.apertura = 0;
  if (llaveBureta.entregadoSesion > 0) {
    agregarAlHistorial({tipo:'instrumento',soluto:'Bureta → R' + llaveBureta.destino.slice(1),formula:labState.instrumentos.bureta.soluteId,cantidad:llaveBureta.entregadoSesion.toFixed(3)+' mL',unidad:'mL'});
    llaveBureta.entregadoSesion = 0;
  }
  actualizarLecturasBureta();
  if (document.getElementById('dos-tipo').value === 'bureta') actualizarDosificador();
  document.getElementById('bureta-caudal').textContent = motivo;
}

export function regularLlaveBureta(valor) {
  const apertura = Math.max(0, Math.min(100, Number(valor) || 0));
  if (apertura === 0) { cerrarLlaveBureta(); return; }
  if (document.getElementById('dos-tipo').value !== 'bureta' || vertidoActivo) return;
  const ins = labState.instrumentos.bureta;
  const id = document.getElementById('dos-destino').value;
  const destino = labState[id];
  let error = '';
  if (ins.volMl <= 1e-9) error = 'Carga la bureta antes de abrir la llave.';
  else if (!destino || destino.volMl >= getCapacidadMax(destino) - 1e-9) error = 'El recipiente de destino está lleno.';
  else if (!puedeCombinar(ins,destino)) error = 'El destino contiene un soluto distinto.';
  if (error) { cerrarLlaveBureta(error); mostrarError('err-dosificador', error); return; }
  limpiarError('err-dosificador');
  if (llaveBureta.timer === null) {
    if (grifo.timer !== null) cerrarGrifo();
    guardarSnapshot();
    labState.montajeDosificador={tipo:'bureta',destino:id};
    iniciarRegistroValoracion(ins,destino,id);
    llaveBureta.destino = id;
    llaveBureta.entregadoSesion = 0;
    llaveBureta.ultimo = performance.now();
    llaveBureta.timer = setInterval(pasoLlaveBureta, 50);
  }
  llaveBureta.apertura = apertura;
  actualizarDosificador();
}

export function alternarLlaveBureta() {
  regularLlaveBureta(llaveBureta.apertura > 0 ? 0 : 25);
}

export function pasoLlaveBureta() {
  if (llaveBureta.timer === null) return;
  const ahora = performance.now();
  const dt = Math.max(0, Math.min(0.2, (ahora - llaveBureta.ultimo) / 1000));
  llaveBureta.ultimo = ahora;
  if (document.getElementById('dos-tipo').value !== 'bureta' || document.getElementById('dos-destino').value !== llaveBureta.destino || vertidoActivo) { cerrarLlaveBureta(); return; }
  const ins = labState.instrumentos.bureta, destino = labState[llaveBureta.destino];
  if (!puedeCombinar(ins,destino)) { cerrarLlaveBureta('Destino incompatible'); return; }
  const espacio = Math.max(0, getCapacidadMax(destino) - destino.volMl);
  const caudal = caudalBureta(llaveBureta.apertura);
  const ml = maximoTransferible(ins,destino,caudal*dt,getCapacidadMax(destino));
  if (ml > 0) {
    transferirAlicuota(ins, destino, ml);
    ins.volumenEntregado = (ins.volumenEntregado || 0) + ml;
    llaveBureta.entregadoSesion += ml;
    fluidPhysics['rippleAmp' + llaveBureta.destino.slice(1)] = 0.01;
    registrarAdicionBureta(ml,destino,llaveBureta.destino);
    refrescarTrasDosificar();
  }
  if(ml<=1e-10&&caudal>0)cerrarLlaveBureta('No queda capacidad para añadir esta disolución');
  else if (ins.volMl <= 1e-9) cerrarLlaveBureta('Bureta vacía: llave cerrada');
  else if (destino.volMl >= getCapacidadMax(destino) - 1e-9) cerrarLlaveBureta('Destino lleno: llave cerrada');
}
