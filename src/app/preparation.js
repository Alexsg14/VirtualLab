import {descargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {invalidarValoracion} from './titration.js';
import {agregarAgua} from '../core/solution.ts';
import {llaveBureta, cerrarLlaveBureta} from '../instruments/burette.js';
import { SOLUTOS } from '../data/catalog.ts';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { guardarEnLocalStorage } from './lifecycle.js';
import { getRecActivo, getCapacidadMax } from './vessels.js';
import { mostrarError, limpiarError, validarPositivo } from '../ui/validation.js';
import { guardarSnapshot, agregarAlHistorial } from './history.js';
import { actualizarVolumen } from '../core/solution.ts';
import { grifo, cerrarGrifo } from '../instruments/water.js';
import { recalcular } from '../ui/results.js';
import { verificarLogro_primerExp, verificarLogro_analista } from '../education/achievements.js';
import { actualizarEscena3D, spawnBubbles, lanzarParticulas3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';
import { animarParticulas } from '../scene/particles.js';

export function agregarSoluto() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(labState.modulo==='acidbase')return;
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  const id = document.getElementById('sel-soluto').value;
  const s = SOLUTOS.find(x => x.id === id);
  const inpG = document.getElementById('inp-gramos');
  const inpM = document.getElementById('inp-moles');

  let masa = parseFloat(inpG.value);
  let moles = parseFloat(inpM.value);
  const usandoGramos = document.getElementById('radio-gramos').checked;

  if (usandoGramos) {
    if (!validarPositivo(masa, 'err-soluto')) return;
    moles = masa / s.M;
  } else {
    if (!validarPositivo(moles, 'err-soluto')) return;
    masa = moles * s.M;
  }

  const actual = getRecActivo();
  const masaPrevista = (actual.soluteId === id ? actual.masaG : 0) + masa;
  const previsto={...structuredClone(actual),soluteId:id,componentes:undefined,masaG:masaPrevista,molesN:masaPrevista/s.M};
  actualizarVolumen(previsto);
  if (previsto.volMl > getCapacidadMax(actual) + 1e-9) {
    mostrarError('err-soluto', 'El volumen resultante supera la capacidad. Usa un recipiente mayor.');
    return;
  }
  limpiarError('err-soluto');
  guardarSnapshot();

  const rec = getRecActivo();
  if (rec.soluteId !== id) {
    rec.soluteId = id;
    rec.masaG = 0;
    rec.molesN = 0;
  }

  rec.masaG  += masa;
  rec.molesN += moles;
  actualizarVolumen(rec);
  rec.tipo    = labState.recipiente;

  verificarLogro_primerExp();
  labState.contadorExp++;
  verificarLogro_analista();
  guardarEnLocalStorage();

  agregarAlHistorial({
    tipo: 'soluto',
    soluto: s.nombre,
    formula: s.formula,
    cantidad: usandoGramos ? masa.toFixed(3) + ' g' : moles.toFixed(5) + ' mol',
    unidad: usandoGramos ? 'g' : 'mol'
  });

  animarParticulas(0, 0, s.colorBase);
  lanzarParticulas3D(s.rgb);

  // Perturbación física al caer el soluto
  const mesa = labState.mesaActiva;
  if (mesa === 1) {
    fluidPhysics.sloshVelX1 += (Math.random() - 0.5) * 0.15;
    fluidPhysics.sloshVelZ1 += (Math.random() - 0.5) * 0.15;
    fluidPhysics.rippleAmp1 = 0.5;
  } else {
    fluidPhysics.sloshVelX2 += (Math.random() - 0.5) * 0.15;
    fluidPhysics.sloshVelZ2 += (Math.random() - 0.5) * 0.15;
    fluidPhysics.rippleAmp2 = 0.5;
  }

  inpG.value = '';
  inpM.value = '';

  recalcular();
  renderizarRecipienteSVG(labState.mesaActiva);
  actualizarEscena3D();
}

// ============================================================
// AGREGAR DISOLVENTE
// ============================================================

export function agregarDisolvente() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  const inp = document.getElementById('inp-disolvente');
  const ml = parseFloat(inp.value);
  if (!validarPositivo(ml, 'err-disolvente')) return;
  limpiarError('err-disolvente');

  const rec = getRecActivo();
  const capMax = getCapacidadMax(rec);

  const prevista=structuredClone(rec);agregarAgua(prevista,ml);
  if (prevista.volMl > capMax + 1e-9) {
    mostrarError('err-disolvente', `⚠ El recipiente solo tiene ${(capMax - rec.volMl).toFixed(1)} mL de espacio libre (Capacidad: ${capMax} mL)`);
    return;
  }

  guardarSnapshot();
  agregarAgua(rec,ml);

  // Actualizar objetivo de física para animación fluida de llenado
  if (labState.mesaActiva === 1) {
    fluidPhysics.targetVol1 = rec.volMl;
    fluidPhysics.sloshVelX1 += 0.2;
    fluidPhysics.sloshVelZ1 += 0.15;
    fluidPhysics.rippleAmp1 = 0.6;
    spawnBubbles(1, 12);
  } else {
    fluidPhysics.targetVol2 = rec.volMl;
    fluidPhysics.sloshVelX2 += 0.2;
    fluidPhysics.sloshVelZ2 += 0.15;
    fluidPhysics.rippleAmp2 = 0.6;
    spawnBubbles(2, 12);
  }

  agregarAlHistorial({
    tipo: 'disolvente',
    soluto: 'H₂O',
    formula: 'H₂O',
    cantidad: ml.toFixed(1) + ' mL',
    unidad: 'mL'
  });

  inp.value = '';
  recalcular();
  renderizarRecipienteSVG(labState.mesaActiva);
  actualizarEscena3D();
}

// ============================================================
// VACIAR RECIPIENTE
// ============================================================

export function vaciarRecipiente() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(grifo.timer!==null) cerrarGrifo();
  guardarSnapshot();
  const rec = getRecActivo();
  invalidarValoracion(rec);
  rec.masaG = 0;
  rec.molesN = 0;
  rec.componentes = undefined;
  rec.indicador = undefined;
  rec.objetivoTemperatura = undefined;
  rec.nombreReserva = undefined;
  rec.volH2OMl = 0;
  actualizarVolumen(rec);

  if (labState.mesaActiva === 1) {
    fluidPhysics.currentVol1 = 0;
    fluidPhysics.targetVol1 = 0;
  } else {
    fluidPhysics.currentVol2 = 0;
    fluidPhysics.targetVol2 = 0;
  }

  agregarAlHistorial({ tipo: 'vaciar', soluto: '—', formula: '—', cantidad: '—', unidad: '—' });
  recalcular();
  renderizarRecipienteSVG(labState.mesaActiva);
  actualizarEscena3D();
}

// ============================================================
// MEZCLAR RECIPIENTES
// ============================================================
// Vertido unidireccional. El reloj de transferencia funciona tambien en 2D.

export function agitarRecipiente() {
  const mesa = labState.mesaActiva;
  const rec = getRecActivo();

  if (rec.volMl <= 0 && rec.masaG <= 0) {
    mostrarError('err-disolvente', '⚠ El recipiente está vacío para agitar');
    return;
  }
  limpiarError('err-disolvente');

  if (mesa === 1) {
    fluidPhysics.sloshVelX1 = (Math.random() - 0.5) * 0.5 + 0.3;
    fluidPhysics.sloshVelZ1 = (Math.random() - 0.5) * 0.5 + 0.3;
    fluidPhysics.vortexIntensity1 = 1.0;
    fluidPhysics.rippleAmp1 = 0.8;
    spawnBubbles(1, 18);
  } else {
    fluidPhysics.sloshVelX2 = (Math.random() - 0.5) * 0.5 + 0.3;
    fluidPhysics.sloshVelZ2 = (Math.random() - 0.5) * 0.5 + 0.3;
    fluidPhysics.vortexIntensity2 = 1.0;
    fluidPhysics.rippleAmp2 = 0.8;
    spawnBubbles(2, 18);
  }

  agregarAlHistorial({
    tipo: 'agitacion',
    soluto: 'Agitación y remolino (vórtex)',
    formula: '🌀',
    cantidad: `${rec.volMl.toFixed(0)} mL`,
    unidad: 'mL'
  });

  recalcular();
}

// ============================================================
// DESHACER
// ============================================================
